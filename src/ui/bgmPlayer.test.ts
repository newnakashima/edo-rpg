import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BGM_TRACKS } from '../data/bgmTracks';
import { loopPosition, WebBgmPlayer, type PlayerContext } from './bgmPlayer';

describe('ループの位置', () => {
  it('loopEnd までは頭からの時間のまま、過ぎたら loopStart からの繰り返しに入る', () => {
    expect(loopPosition(3, 6, 60)).toBe(3);
    expect(loopPosition(59, 6, 60)).toBe(59);
    expect(loopPosition(60, 6, 60)).toBe(6);
    expect(loopPosition(70, 6, 60)).toBe(16);
    expect(loopPosition(60 + 54 * 2 + 1, 6, 60)).toBeCloseTo(7);
  });
});

/** 鳴らした音源の記録。 */
interface FakeSource {
  url?: string;
  buffer: { duration: number; url: string } | null;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  offset?: number;
  stopped: boolean;
  /** stop に渡した時刻（すぐ止めたなら undefined）。 */
  stopAt?: number;
  onended: (() => void) | null;
  connect: (n: unknown) => unknown;
  start: (when: number, offset: number) => void;
  stop: (when?: number) => void;
}

function fakeGain() {
  return {
    gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} },
    connect: (n: unknown) => n,
  };
}

function fakeContext() {
  const sources: FakeSource[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    createGain: fakeGain,
    createBufferSource: () => {
      const s: FakeSource = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        stopped: false,
        onended: null,
        connect: (n) => n,
        start(_when, offset) {
          this.offset = offset;
          this.url = this.buffer?.url;
        },
        // 本物と同じく、止めると（そのとき付いている）onended が後で呼ばれる
        stop(when) {
          this.stopped = true;
          this.stopAt = when;
          const ended = this.onended;
          void Promise.resolve().then(() => ended?.());
        },
      };
      sources.push(s);
      return s;
    },
    // 偽のファイルの中身は URL の文字列。伸ばした音はその URL と、長い曲として 100 秒を持つ
    decodeAudioData: (file: ArrayBuffer) => Promise.resolve({ duration: 100, url: new TextDecoder().decode(file) }),
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
  };
  return { ctx, sources, player: new WebBgmPlayer(ctx as unknown as PlayerContext, new EventTarget(), { hidden: false, addEventListener: () => {} }) };
}

/** fetch を、手で読み込みを終えられる偽物にする。 */
let pending: Map<string, () => void>;
let failing: Set<string>;
beforeEach(() => {
  pending = new Map();
  failing = new Set();
  vi.stubGlobal('fetch', (url: string) =>
    new Promise((resolve) => {
      pending.set(url, () => {
        pending.delete(url);
        const bytes = new TextEncoder().encode(url);
        resolve({ ok: !failing.has(url), status: failing.has(url) ? 503 : 200, arrayBuffer: () => Promise.resolve(bytes.buffer) });
      });
    }),
  );
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const url = (id: keyof typeof BGM_TRACKS) => BGM_TRACKS[id]!.url;

async function load(id: keyof typeof BGM_TRACKS): Promise<void> {
  pending.get(url(id))?.();
  await vi.waitFor(() => expect(pending.has(url(id))).toBe(false));
  // fetch → arrayBuffer → decode → 鳴らす、の Promise を進める
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

/** ジングルが鳴り終わる（偽の音源は自分では終わらないので、手で終える）。 */
function finish(source: FakeSource): void {
  source.stop();
}

/** いま鳴っている（止めていない）音源の URL。 */
const sounding = (sources: FakeSource[]) => sources.filter((s) => !s.stopped).map((s) => s.url);

describe('WebBgmPlayer', () => {
  it('ループする曲は前奏の後から曲の終わりまでを繰り返す', async () => {
    const { player, sources } = fakeContext();
    player.play('bgm_title');
    await load('bgm_title');
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ loop: true, loopStart: BGM_TRACKS.bgm_title!.loopStart, loopEnd: BGM_TRACKS.bgm_title!.loopEnd, offset: 0 });
  });

  it('ジングルの間は曲を止め、鳴り終えたら止めた位置から戻る', async () => {
    const { ctx, player, sources } = fakeContext();
    player.play('bgm_town');
    await load('bgm_town');
    ctx.currentTime = 12;
    player.playJingle('bgm_inn');
    await load('bgm_inn');
    expect(sounding(sources)).toEqual([url('bgm_inn')]);
    expect(sources[1]!.loop).toBe(false);
    ctx.currentTime = 20;
    finish(sources[1]!);
    await load('bgm_town');
    expect(sounding(sources)).toEqual([url('bgm_town')]);
    expect(sources[2]!.offset).toBe(12);
  });

  it('ジングルの間に次のジングルを鳴らすと、切ったジングルでは曲に戻らず、次のジングルの後に戻る', async () => {
    const { ctx, player, sources } = fakeContext();
    player.play('bgm_town');
    await load('bgm_town');
    ctx.currentTime = 7;
    player.playJingle('bgm_inn');
    await load('bgm_inn');
    player.playJingle('bgm_victory');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(sounding(sources)).toEqual([]);
    await load('bgm_victory');
    expect(sounding(sources)).toEqual([url('bgm_victory')]);
    finish(sources[2]!);
    await load('bgm_town');
    expect(sounding(sources)).toEqual([url('bgm_town')]);
    expect(sources[3]!.offset).toBe(7);
  });

  it('ジングルの間に別の曲を頼むと、ジングルを切ってその曲にし、元の曲には戻らない', async () => {
    const { player, sources } = fakeContext();
    player.play(null);
    player.playJingle('bgm_victory');
    await load('bgm_victory');
    player.play('bgm_road');
    await load('bgm_road');
    expect(sounding(sources)).toEqual([url('bgm_road')]);
    // 切ったジングルの onended（本物では止めた後に呼ばれる）で、ほかの曲を鳴らし直さない
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(sources).toHaveLength(2);
    expect(sounding(sources)).toEqual([url('bgm_road')]);
  });

  it('ジングルの読み込み中に別の曲を頼むと、読み込み終えたジングルは鳴らさない', async () => {
    const { player, sources } = fakeContext();
    player.play(null);
    player.playJingle('bgm_victory');
    player.play('bgm_road');
    await load('bgm_road');
    await load('bgm_victory');
    expect(sounding(sources)).toEqual([url('bgm_road')]);
  });

  it('曲を止める頼みではジングルを切らない（勝利のジングルは曲を止めてから鳴らす）', async () => {
    const { player, sources } = fakeContext();
    player.play('bgm_battle');
    await load('bgm_battle');
    player.play(null);
    player.playJingle('bgm_victory');
    await load('bgm_victory');
    player.play(null);
    expect(sounding(sources)).toEqual([url('bgm_victory')]);
    finish(sources[1]!);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(sources).toHaveLength(2);
    expect(sounding(sources)).toEqual([]);
  });

  it('読み込み待ちの間に頼みが替わったら、最後に頼んだ曲だけを鳴らす', async () => {
    const { player, sources } = fakeContext();
    player.play('bgm_town');
    player.play('bgm_road');
    await load('bgm_town');
    await load('bgm_road');
    expect(sounding(sources)).toEqual([url('bgm_road')]);
  });

  it('読み込みに失敗した曲は、次に頼まれたときに読み直す', async () => {
    const { player, sources } = fakeContext();
    failing.add(url('bgm_town'));
    player.play('bgm_town');
    await load('bgm_town');
    expect(sources).toHaveLength(0);
    failing.clear();
    player.play(null);
    player.play('bgm_town');
    await load('bgm_town');
    expect(sounding(sources)).toEqual([url('bgm_town')]);
  });

  it('音を出し始める前に曲を替えたら、前の曲はすぐ止める', async () => {
    const { ctx, player, sources } = fakeContext();
    ctx.state = 'suspended';
    player.play('bgm_title');
    await load('bgm_title');
    player.play('bgm_town');
    expect(sources[0]!.stopped).toBe(true);
    expect(sources[0]!.stopAt).toBeUndefined();
  });

  it('音を出しているときは、前の曲をフェードして止める', async () => {
    const { ctx, player, sources } = fakeContext();
    player.play('bgm_title');
    await load('bgm_title');
    ctx.currentTime = 5;
    player.play('bgm_town');
    expect(sources[0]!.stopAt).toBeCloseTo(5.3);
  });
});
