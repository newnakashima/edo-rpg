import { afterEach, describe, expect, it, vi } from 'vitest';
import { availableSeIds } from '../data/seTracks';
import { playSe, setAvailableBgm, setAvailableSe, setBgmPlayer, setJinglePlayer, setSePlayer } from '../systems/audio';
import { startAudio } from './audioSetup';
import type { PlayerContext } from './bgmPlayer';

afterEach(() => {
  setAvailableBgm([]);
  setAvailableSe([]);
  setBgmPlayer(() => {});
  setJinglePlayer(() => {});
  setSePlayer(() => {});
  vi.unstubAllGlobals();
});

function fakeContext() {
  const listeners = new Map<string, () => void>();
  const ctx = {
    currentTime: 0,
    state: 'suspended' as AudioContextState,
    destination: {},
    createGain: () => ({ gain: { value: 1 }, connect: (n: unknown) => n }),
    createBufferSource: vi.fn(() => ({ buffer: null, connect: (n: unknown) => n, start: () => {}, stop: () => {}, onended: null })),
    decodeAudioData: () => Promise.resolve({}),
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
    suspend: () => Promise.resolve(),
  };
  const target = { addEventListener: (type: string, fn: () => void) => listeners.set(type, fn) } as unknown as EventTarget;
  return { ctx, listeners, target };
}

describe('曲と効果音の再生を始める', () => {
  it('AudioContext を 1 つだけ作り、最初の操作で動き出すと効果音も鳴る', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }));
    const { ctx, listeners, target } = fakeContext();
    const create = vi.fn(() => ctx as unknown as PlayerContext);
    const { se } = startAudio(create, target, { hidden: false, addEventListener: () => {} });
    expect(create).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(se.status().loaded).toHaveLength(availableSeIds().length));

    const id = availableSeIds()[0]!;
    playSe(id);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    // 曲の再生処理が、操作で共有の AudioContext を動かす
    listeners.get('pointerdown')?.();
    expect(ctx.resume).toHaveBeenCalled();
    playSe(id);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(se.status().playing).toEqual([id]);
  });
});
