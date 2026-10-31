// キャラクターのスプライトシート（PixelLab で生成し、scripts/pack_character.py でまとめたもの）。
// 画像は public/assets/chars/ に置き、assets/README.md に生成の記録を残す。
import type { Facing } from '../systems/gameState';
import type { Gender } from './characters';

/** 1 コマの大きさ（キャラクター 24px。歩行の v3 アニメーションのキャンバス 40 × 40 に合わせる）。 */
export const CHAR_FRAME = 40;
/**
 * タイルの左上に置いたとき、コマのどの点をタイルの左上に合わせるか。
 * 左右はコマの中央（20）をタイルの中央（8）に、足元（コマの y = 33 付近）をタイルの下端（15）に合わせる。
 */
export const CHAR_DISPLAY_ORIGIN = { x: 12, y: 18 } as const;
/** 歩行のコマ数（列 1〜4。列 0 は立ち）。 */
export const WALK_FRAMES = 4;
/** 歩行アニメーションの速さ（コマ/秒）。1 歩（140ms）で約 2 コマ進む。 */
export const WALK_FPS = 14;

/** シートの行の並び（scripts/pack_character.py の ROWS と同じ順）。 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
export const FACINGS: Facing[] = ['down', 'left', 'right', 'up'];

/** シートがあるキャラクター。 */
export const CHARACTER_SPRITES = ['hero_m', 'hero_f'] as const;
export type CharacterSpriteId = (typeof CHARACTER_SPRITES)[number];

export function spriteKey(id: CharacterSpriteId): string {
  return `char-${id}`;
}

export function heroSprite(gender: Gender): CharacterSpriteId {
  return gender === 'm' ? 'hero_m' : 'hero_f';
}

/** 立ち姿のコマ番号。 */
export function idleFrame(facing: Facing): number {
  return ROW[facing] * (1 + WALK_FRAMES);
}

/** 歩行のコマ番号（i は 0〜WALK_FRAMES-1）。 */
export function walkFrame(facing: Facing, i: number): number {
  return idleFrame(facing) + 1 + i;
}

export function walkAnimKey(id: CharacterSpriteId, facing: Facing): string {
  return `${spriteKey(id)}-walk-${facing}`;
}
