import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seUrl } from '../data/seTracks';
import type { PlayerContext } from './bgmPlayer';
import { WebSePlayer } from './sePlayer';

interface FakeSource {
  buffer: { url: string } | null;
  startedAt?: number;
  stopped: boolean;
  onended: (() => void) | null;
  connect: (n: unknown) => unknown;
  start: (when: number) => void;
  stop: () => void;
}

function fakeContext() {
  const sources: FakeSource[] = [];
  const gains: { gain: { value: number } }[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    createGain: () => {
      const g = { gain: { value: 1 }, connect: (n: unknown) => n };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const s: FakeSource = {
        buffer: null,
        stopped: false,
        onended: null,
        connect: (n) => n,
        start(when) {
          this.startedAt = when;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(s);
      return s;
    },
    decodeAudioData: (file: ArrayBuffer) => Promise.resolve({ url: new TextDecoder().decode(file) }),
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
  };
  let clock = 0;
  const player = new WebSePlayer(ctx as unknown as PlayerContext, () => clock);
  return { ctx, sources, gains, player, tick: (ms: number) => (clock += ms) };
}

let pending: Map<string, () => void>;
let failing: Set<string>;
let fetched: string[];
beforeEach(() => {
  pending = new Map();
  failing = new Set();
  fetched = [];
  vi.stubGlobal('fetch', (url: string) => {
    fetched.push(url);
    return new Promise((resolve) => {
      pending.set(url, () => {
        pending.delete(url);
        const bytes = new TextEncoder().encode(url);
        resolve({ ok: !failing.has(url), status: failing.has(url) ? 404 : 200, arrayBuffer: () => Promise.resolve(bytes.buffer) });
      });
    });
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

async function loadAll(): Promise<void> {
  for (const done of [...pending.values()]) done();
  await settle();
}

const sounding = (sources: FakeSource[]) => sources.filter((s) => !s.stopped).map((s) => s.buffer?.url);

describe('WebSePlayer', () => {
  it('先に読み込んだ効果音は、頼まれたその時に鳴る。同じ音も別の音も重ねて鳴らせる', async () => {
    const { ctx, player, sources } = fakeContext();
    player.preload(['se_ok', 'se_cursor']);
    expect(fetched.sort()).toEqual([seUrl('se_cursor'), seUrl('se_ok')]);
    await loadAll();
    ctx.currentTime = 1;
    player.play('se_ok');
    ctx.currentTime = 1.2;
    player.play('se_ok');
    player.play('se_cursor');
    expect(sounding(sources)).toEqual([seUrl('se_ok'), seUrl('se_ok'), seUrl('se_cursor')]);
    expect(sources.map((s) => s.startedAt)).toEqual([1, 1.2, 1.2]);
    expect(player.status().playing).toEqual(['se_ok', 'se_ok', 'se_cursor']);
  });

  it('鳴り終えた音は、鳴らしている音から外れる', async () => {
    const { player, sources } = fakeContext();
    player.preload(['se_ok']);
    await loadAll();
    player.play('se_ok');
    sources[0]!.onended?.();
    expect(player.status().playing).toEqual([]);
  });

  it('同じ効果音をごく短い間に続けて頼まれたら、2 つ目は鳴らさない', async () => {
    const { ctx, player, sources } = fakeContext();
    player.preload(['se_damage']);
    await loadAll();
    player.play('se_damage');
    ctx.currentTime = 0.01;
    player.play('se_damage');
    expect(sources).toHaveLength(1);
  });

  it('一度に鳴らす数が上限を超えたら、いちばん古い音を止める', async () => {
    const { ctx, player, sources } = fakeContext();
    player.preload(['se_ok']);
    await loadAll();
    for (let i = 0; i < 9; i++) {
      ctx.currentTime = i;
      player.play('se_ok');
    }
    expect(sources[0]!.stopped).toBe(true);
    expect(sources.slice(1).every((s) => !s.stopped)).toBe(true);
    expect(player.status().playing).toHaveLength(8);
  });

  it('AudioContext が動いていない間（操作の前・画面が隠れている間）は鳴らさない', async () => {
    const { ctx, player, sources } = fakeContext();
    player.preload(['se_ok']);
    await loadAll();
    ctx.state = 'suspended';
    player.play('se_ok');
    expect(sources).toHaveLength(0);
  });

  it('読み込みの途中で頼まれた音は、読み込めたときに遅れが小さければ鳴らし、大きければ鳴らさない', async () => {
    const { player, sources, tick } = fakeContext();
    player.play('se_ok');
    tick(50);
    await loadAll();
    expect(sounding(sources)).toEqual([seUrl('se_ok')]);

    player.play('se_cancel');
    tick(500);
    await loadAll();
    expect(sources).toHaveLength(1);
    // 読み込めたので、次からはすぐ鳴る
    player.play('se_cancel');
    expect(sounding(sources)).toEqual([seUrl('se_ok'), seUrl('se_cancel')]);
  });

  it('読み込めなかった効果音は 1 度だけ知らせて鳴らさず、次に頼まれたときに読み直す', async () => {
    const { player, sources } = fakeContext();
    failing.add(seUrl('se_ok'));
    player.preload(['se_ok']);
    await loadAll();
    player.play('se_ok');
    await loadAll();
    expect(sources).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(fetched.filter((u) => u === seUrl('se_ok'))).toHaveLength(2);
  });

  it('効果音の大きさは曲と同じ尺度の 0.6', () => {
    const { gains } = fakeContext();
    expect(gains[0]!.gain.value).toBe(0.6);
  });
});
