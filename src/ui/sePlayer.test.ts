import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seUrl } from '../data/seTracks';
import type { PlayerContext } from './bgmPlayer';
import { WebSePlayer } from './sePlayer';

interface FakeSource {
  buffer: { url: string } | null;
  startedAt?: number;
  stopped: boolean;
  stopAt?: number;
  onended: (() => void) | null;
  connect: (n: unknown) => unknown;
  start: (when: number) => void;
  stop: (when?: number) => void;
}

interface FakeGain {
  gain: { value: number; ramps: number[]; setValueAtTime: () => void; linearRampToValueAtTime: (v: number, t: number) => void };
  connect: (n: unknown) => unknown;
}

function fakeContext() {
  const sources: FakeSource[] = [];
  const gains: FakeGain[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    createGain: () => {
      const g: FakeGain = {
        gain: {
          value: 1,
          ramps: [],
          setValueAtTime: () => {},
          linearRampToValueAtTime(_v, t) {
            this.ramps.push(t);
          },
        },
        connect: (n: unknown) => n,
      };
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
        stop(when) {
          this.stopped = true;
          this.stopAt = when;
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
    expect(player.status().loaded.sort()).toEqual(['se_cursor', 'se_ok']);
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

  it('同じ効果音を 30 ms より短い間に続けて頼まれたら、2 つ目は鳴らさない', async () => {
    const { ctx, player, sources } = fakeContext();
    player.preload(['se_damage']);
    await loadAll();
    ctx.currentTime = 1;
    player.play('se_damage');
    ctx.currentTime = 1.029;
    player.play('se_damage');
    expect(sources).toHaveLength(1);
    ctx.currentTime = 1.031;
    player.play('se_damage');
    expect(sources).toHaveLength(2);
  });

  it('一度に鳴らす数が上限を超えたら、いちばん古い音を止める', async () => {
    const { ctx, player, sources, gains } = fakeContext();
    player.preload(['se_ok']);
    await loadAll();
    for (let i = 0; i < 9; i++) {
      ctx.currentTime = i;
      player.play('se_ok');
    }
    // いちばん古い音は、いきなり切らずに 5 ms で絞ってから止める
    expect(sources[0]!.stopped).toBe(true);
    expect(sources[0]!.stopAt).toBeCloseTo(8.005);
    expect(gains[1]!.gain.ramps).toEqual([8.005]);
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

  it('読み込みの途中で頼まれた音は、読み込めたときに遅れが 150 ms 以内なら鳴らし、超えたら鳴らさない', async () => {
    const { player, sources, tick } = fakeContext();
    player.play('se_ok');
    tick(150);
    await loadAll();
    expect(sounding(sources)).toEqual([seUrl('se_ok')]);

    player.play('se_cancel');
    tick(151);
    await loadAll();
    expect(sources).toHaveLength(1);
    // 読み込めたので、次からはすぐ鳴る
    player.play('se_cancel');
    expect(sounding(sources)).toEqual([seUrl('se_ok'), seUrl('se_cancel')]);
  });

  it('読み込みを待つ間に AudioContext が止まったら、読み込めても鳴らさない', async () => {
    const { ctx, player, sources } = fakeContext();
    player.play('se_ok');
    ctx.state = 'suspended';
    await loadAll();
    expect(sources).toHaveLength(0);
  });

  it('ファイルを取れなかった効果音は 1 度だけ知らせて鳴らさず、5 秒たつまでは取り直さない', async () => {
    const { player, sources, tick } = fakeContext();
    const count = () => fetched.filter((u) => u === seUrl('se_ok')).length;
    failing.add(seUrl('se_ok'));
    player.preload(['se_ok']);
    await loadAll();
    player.play('se_ok');
    await loadAll();
    expect(count()).toBe(1);
    tick(5000);
    player.play('se_ok');
    await loadAll();
    expect(count()).toBe(2);
    expect(sources).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    // 取れるようになれば鳴る
    failing.clear();
    tick(5000);
    player.play('se_ok');
    await loadAll();
    expect(sounding(sources)).toEqual([seUrl('se_ok')]);
  });

  it('音に伸ばせなかった効果音（Ogg Opus を読めないブラウザなど）は、もう読み直さない', async () => {
    const { ctx, player, sources, tick } = fakeContext();
    ctx.decodeAudioData = () => Promise.reject(new Error('unsupported'));
    player.preload(['se_ok']);
    await loadAll();
    tick(60000);
    player.play('se_ok');
    await loadAll();
    expect(fetched).toHaveLength(1);
    expect(sources).toHaveLength(0);
  });

  it('効果音の大きさは曲と同じ尺度の 0.6', () => {
    const { gains } = fakeContext();
    expect(gains[0]!.gain.value).toBe(0.6);
  });
});
