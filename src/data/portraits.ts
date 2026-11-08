// メニューのステータス画面に出す仲間の立ち絵（PixelLab で生成した 64 × 96。public/assets/portraits/<ID>.png）。記録は public/assets/README.md。
import type { CharacterId, Gender } from './characters';

/** 立ち絵の大きさ（テストで画像を確かめ、画面の配置にも使う）。 */
export const PORTRAIT_WIDTH = 64;
export const PORTRAIT_HEIGHT = 96;

/** 立ち絵の画像。主人公は男女で分ける。 */
export const PORTRAITS = ['hero_m', 'hero_f', 'kasumi', 'gendo', 'orin', 'hyogo'] as const;
export type PortraitId = (typeof PORTRAITS)[number];

/** 仲間の立ち絵の画像。 */
export function portraitFor(id: CharacterId, gender: Gender): PortraitId {
  return id === 'hero' ? `hero_${gender}` : id;
}

export function portraitKey(id: PortraitId): string {
  return `portrait_${id}`;
}
