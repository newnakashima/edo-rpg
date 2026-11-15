import { BGM_IDS, type BgmId } from '../systems/audio';

// 書き出した曲の一覧とループの位置。music/midi/<id>.json（scripts/music/build.py が書く記録）から、要る値だけを読む。
// 曲の音は public/assets/audio/bgm/<id>.ogg にある（記録と音は build.py が一緒に書く。bgmTracks.test.ts で確かめる）。

const loops = import.meta.glob<boolean>('../../music/midi/*.json', { eager: true, import: 'loop' });
const loopStarts = import.meta.glob<number | null>('../../music/midi/*.json', { eager: true, import: 'loop_start_seconds' });
const lengths = import.meta.glob<number>('../../music/midi/*.json', { eager: true, import: 'length_seconds' });

export interface BgmTrack {
  id: BgmId;
  /** 音のファイル（index.html からの相対パス）。 */
  url: string;
  /** ループする曲か（ジングルは false）。 */
  loop: boolean;
  /** ループの始まりと終わり（秒）。前奏のある曲は前奏の後から、曲の終わりまでを繰り返す。 */
  loopStart: number;
  loopEnd: number;
}

function idOf(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '');
}

function isBgmId(id: string): id is BgmId {
  return (BGM_IDS as readonly string[]).includes(id);
}

export const BGM_TRACKS: Partial<Record<BgmId, BgmTrack>> = Object.fromEntries(
  Object.keys(lengths)
    .map((path) => ({ path, id: idOf(path) }))
    .filter((e): e is { path: string; id: BgmId } => isBgmId(e.id))
    .map(({ path, id }) => [
      id,
      {
        id,
        url: `assets/audio/bgm/${id}.ogg`,
        loop: loops[path] === true,
        loopStart: loopStarts[path] ?? 0,
        loopEnd: lengths[path],
      },
    ]),
);

/** 書き出してある曲の ID。 */
export function availableBgmIds(): BgmId[] {
  return Object.keys(BGM_TRACKS) as BgmId[];
}
