import { describe, expect, it } from 'vitest';
import { JINGLES } from '../systems/audio';
import { loopPosition } from '../ui/bgmPlayer';
import { availableBgmIds, BGM_TRACKS } from './bgmTracks';

describe('書き出した曲', () => {
  it('記録のある曲は、どれも public に音のファイルがある', () => {
    const files = Object.keys(import.meta.glob('../../public/assets/audio/bgm/*.ogg', { query: '?url' })).map((p) => p.replace('../../public/', ''));
    expect(availableBgmIds().length).toBeGreaterThan(0);
    expect(availableBgmIds().map((id) => BGM_TRACKS[id]?.url).sort()).toEqual(files.sort());
  });

  it('ジングルはループせず、ほかの曲はループし、ループの位置は曲の中にある', () => {
    for (const id of availableBgmIds()) {
      const track = BGM_TRACKS[id]!;
      expect(track.loop, id).toBe(!(JINGLES as readonly string[]).includes(id));
      expect(track.loopStart, id).toBeGreaterThanOrEqual(0);
      expect(track.loopEnd, id).toBeGreaterThan(track.loopStart);
    }
  });

  it('前奏のある曲は前奏の後からループする（bgm_title は 2 小節の前奏）', () => {
    expect(BGM_TRACKS.bgm_title?.loopStart).toBeCloseTo(6.3158, 3);
    expect(BGM_TRACKS.bgm_town?.loopStart).toBe(0);
  });
});

describe('ループの位置', () => {
  it('loopEnd までは頭からの時間のまま、過ぎたら loopStart からの繰り返しに入る', () => {
    expect(loopPosition(3, 6, 60)).toBe(3);
    expect(loopPosition(59, 6, 60)).toBe(59);
    expect(loopPosition(60, 6, 60)).toBe(6);
    expect(loopPosition(70, 6, 60)).toBe(16);
    expect(loopPosition(60 + 54 * 2 + 1, 6, 60)).toBeCloseTo(7);
  });
});
