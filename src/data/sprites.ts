// キャラクターのスプライトシート（PixelLab で生成し、scripts/pack_character.py でまとめたもの）。
// 画像は public/assets/chars/ に置き、public/assets/README.md に生成の記録を残す。
import type { Facing } from '../systems/gameState';
import type { Gender } from './characters';

/** 1 コマの大きさ（キャラクター 24px。歩行の v3 アニメーションのキャンバス 40 × 40 に合わせる）。 */
export const CHAR_FRAME = 40;
/**
 * タイルの左上に置いたとき、コマのどの点をタイルの左上に合わせるか。
 * 左右はコマの中央（20）をタイルの中央（8）に、足のいちばん下の行（コマの y = 32。scripts/pack_character.py の FOOT_Y - 1）を
 * タイルのいちばん下の行（15）に合わせる。
 */
export const CHAR_DISPLAY_ORIGIN = { x: 12, y: 17 } as const;
/** 歩行のコマ数（列 1〜4。列 0 は立ち）。 */
export const WALK_FRAMES = 4;
/** 歩行アニメーションの速さ（コマ/秒）。1 歩（140ms）で約 2 コマ進む。 */
export const WALK_FPS = 14;

/** シートの行の並び（scripts/pack_character.py の ROWS と同じ順）。 */
export const FACINGS: readonly Facing[] = ['down', 'left', 'right', 'up'];

/**
 * 町の人の類型ごとのシート（テストプレイで「主要人物以外に画像がない」と指摘されたため足した）。
 * 歩かないので、歩行のコマにも立ち姿を置いている（scripts/pack_character.py）。どの町の人にどれを使うかは maps.ts の sprite。
 */
export const NPC_SPRITES = [
  'npc_innkeeper',
  'npc_merchant',
  'npc_smith',
  'npc_hikyaku',
  'npc_yakunin',
  'npc_okami',
  'npc_kodomo',
  'npc_sendo',
  'npc_monban',
  'npc_musume',
  'npc_so',
  'npc_kannushi',
  'npc_ronin',
  'npc_roba',
  'npc_rojin',
  'npc_ninsoku',
  'npc_maiko',
  'npc_oranda',
  'npc_tojin',
  'npc_hikeshi',
] as const;

/** 敵方の人物（フィールドに立っている姿だけ。歩かないので歩行のコマにも立ち姿を置く）。 */
export const VILLAIN_SPRITES = ['yashamaru', 'oboro', 'borei', 'tenzen', 'washio'] as const;

/** 物語の専用の人物（町の人の類型で代えていた人。フィールドに立っている姿だけ。歩かないので歩行のコマにも立ち姿を置く）。 */
export const STORY_SPRITES = ['hyogo', 'kinta', 'sakon', 'kagaTono', 'kokichi', 'shogun', 'tatewaki'] as const;

/** シートがあるキャラクター。 */
export const CHARACTER_SPRITES = ['hero_m', 'hero_f', 'kasumi', 'gendo', 'orin', 'tatsugoro', ...NPC_SPRITES, ...VILLAIN_SPRITES, ...STORY_SPRITES] as const;
export type CharacterSpriteId = (typeof CHARACTER_SPRITES)[number];

/**
 * マップに置く物の画像（public/assets/objects/<ID>.png）。記録は public/assets/README.md。
 * - size: 1 コマの大きさ。16 はタイルに収まる（左上をタイルの左上に合わせる）。32 は町の人と釣り合う大きさで、
 *   下端の中央をタイルの下端の中央に合わせる（上と左右にはみ出す。通れないのはそのタイルだけ）。
 * - frames: 2 なら列 0 が閉じた姿、列 1 が開いた姿（葛籠）。1 なら姿は変わらない。
 * 葛籠は 16 × 16 のタイルに収めるため、PixelLab ではなく手で描いた。ほかの物はテストプレイで「人でない物に画像がない」と
 * 指摘されたため PixelLab で 32 × 32 に作った。
 */
export const OBJECT_DEFS = {
  tsuzura: { size: 16, frames: 2 },
  hokora: { size: 32, frames: 1 },
  kibako: { size: 32, frames: 1 },
  fuzukue: { size: 32, frames: 1 },
  ningyo: { size: 32, frames: 1 },
  ningyoTana: { size: 32, frames: 1 },
  zenmaiSochi: { size: 32, frames: 1 },
  niguruma: { size: 32, frames: 1 },
  oodako: { size: 32, frames: 1 },
  senryobako: { size: 32, frames: 1 },
  shachiDaiza: { size: 32, frames: 1 },
  sekihi: { size: 32, frames: 1 },
  butsuzo: { size: 32, frames: 1 },
  kakejiku: { size: 32, frames: 1 },
  jizo: { size: 32, frames: 1 },
  komeKikai: { size: 32, frames: 1 },
  ushi: { size: 32, frames: 1 },
  shoroAto: { size: 32, frames: 1 },
  haka: { size: 32, frames: 1 },
  saidan: { size: 32, frames: 1 },
  tsuka: { size: 32, frames: 1 },
  ishidan: { size: 32, frames: 1 },
  zenmaiTana: { size: 32, frames: 1 },
  jikkenDai: { size: 32, frames: 1 },
  ransaiTsukue: { size: 32, frames: 1 },
  toro: { size: 32, frames: 1 },
} as const satisfies Record<string, { size: 16 | 32; frames: 1 | 2 }>;
export type ObjectSpriteId = keyof typeof OBJECT_DEFS;
export const OBJECT_SPRITES = Object.keys(OBJECT_DEFS) as ObjectSpriteId[];

/** 物の画像のどの点をタイルの左上に合わせるか（16 はそのまま、32 は下端の中央をタイルの下端の中央に）。 */
export function objectDisplayOrigin(id: ObjectSpriteId): { x: number; y: number } {
  const size = OBJECT_DEFS[id].size;
  return { x: (size - 16) / 2, y: size - 16 };
}

export function objectKey(id: ObjectSpriteId): string {
  return `obj-${id}`;
}

export function spriteKey(id: CharacterSpriteId): string {
  return `char-${id}`;
}

export function heroSprite(gender: Gender): CharacterSpriteId {
  return gender === 'm' ? 'hero_m' : 'hero_f';
}

/** 反対の向き（話しかけられた人が、話しかけた人のほうを向く）。 */
export function oppositeFacing(facing: Facing): Facing {
  return ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[facing];
}

/**
 * 物の重なり順。32 × 32 の物は上のタイルの半分まで覆うので、上の行（奥）に立った人でも物より手前に描く
 * （そうしないと、祠や地蔵堂の真上に立った主人公が笠しか見えなくなる）。下の行の人はもちろん手前。
 */
export function objectDepth(tileY: number): number {
  return personDepth(tileY - 1.5);
}

/**
 * フィールドの人の重なり順。下（y が大きい）にいる人ほど手前に描く。
 * 頭が上のタイルにはみ出すため、上にいる人の足元に下の人の頭が重なる。町の名前の表示（5）より上にする。
 */
export function personDepth(tileY: number): number {
  return 10 + tileY / 1000;
}

/**
 * 1 歩のあいだ重なり順に使う行。下へ歩くときは歩き始めから移った先の行、上へ歩くときは着くまで元の行
 * （どちらも 2 行のうち下の行。上下の人に頭や足元が重なっても、手前・奥が入れ替わらないようにする）。
 */
export function walkDepthRow(fromY: number, toY: number): number {
  return Math.max(fromY, toY);
}

/** 立ち姿のコマ番号。 */
export function idleFrame(facing: Facing): number {
  return FACINGS.indexOf(facing) * (1 + WALK_FRAMES);
}

/** 歩行のコマ番号（i は 0〜WALK_FRAMES-1）。 */
export function walkFrame(facing: Facing, i: number): number {
  return idleFrame(facing) + 1 + i;
}

export function walkAnimKey(id: CharacterSpriteId, facing: Facing): string {
  return `${spriteKey(id)}-walk-${facing}`;
}

/**
 * 立ち姿に戻すか。歩いている途中（1 歩の移動中）は戻さない。
 * 止まっているときは、メニュー・会話・イベントの最中（busy）か、方向が押されていなければ戻す。
 */
export function shouldStandStill(s: { moving: boolean; busy: boolean; held: boolean }): boolean {
  return !s.moving && (s.busy || !s.held);
}
