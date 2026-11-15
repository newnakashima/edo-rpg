import { describe, expect, it } from 'vitest';
import { JINGLES } from '../systems/audio';
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

  it('ループの位置と長さは、曲の記録（music/midi/<id>.json）のとおり', () => {
    const records = import.meta.glob<{ id: string; loop_start_seconds: number | null; length_seconds: number }>('../../music/midi/*.json', { eager: true, import: 'default' });
    for (const r of Object.values(records)) {
      const track = BGM_TRACKS[r.id as keyof typeof BGM_TRACKS];
      expect(track?.loopStart, r.id).toBe(r.loop_start_seconds ?? 0);
      expect(track?.loopEnd, r.id).toBe(r.length_seconds);
    }
  });
});
