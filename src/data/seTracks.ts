import { SE_IDS, type SeId } from '../systems/audio';

// 書き出した効果音の一覧。public/assets/audio/se/<id>.ogg（scripts/sfx/build.py が書く）のファイル名から作る。
// import.meta.glob の結果はファイル名を知るためだけに使い、音は読み込まない（ビルドではファイル名の一覧だけが残る）。

const files = Object.keys(import.meta.glob('../../public/assets/audio/se/*.ogg', { query: '?url' }));

function idOf(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.ogg$/, '');
}

function isSeId(id: string): id is SeId {
  return (SE_IDS as readonly string[]).includes(id);
}

/** 書き出してある効果音の ID。 */
export function availableSeIds(): SeId[] {
  return files.map(idOf).filter(isSeId);
}

/** 効果音のファイル（index.html からの相対パス）。 */
export function seUrl(id: SeId): string {
  return `assets/audio/se/${id}.ogg`;
}
