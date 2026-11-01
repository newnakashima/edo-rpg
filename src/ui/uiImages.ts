// ウィンドウ枠・カーソル・タイトルの背景の画像（public/assets/ui/。生成の記録は public/assets/README.md）。

/** ウィンドウ枠のテクスチャ。16 × 16 を 9 つに分け、四隅はそのまま、辺と中央は引き伸ばす。 */
export const WINDOW_TEXTURE = 'ui-window';
/** ウィンドウ枠の画像の一辺。 */
export const WINDOW_IMAGE_SIZE = 16;
/** 四隅の大きさ（縁の太さ）。 */
export const WINDOW_CORNER = 4;

/** カーソル（右を向いた扇子）のテクスチャ。 */
export const CURSOR_TEXTURE = 'ui-cursor';
/** カーソルの画像の一辺。 */
export const CURSOR_IMAGE_SIZE = 32;
/**
 * カーソルを表示する倍率。32 px の絵を 1/3 にすると、内部解像度では約 11 px（1 行 15 px に収まる）、
 * 実際のキャンバス（RENDER_SCALE 3 倍）では元の絵の 1 ドットが 1 px になり、細部が潰れない。
 */
export const CURSOR_SCALE = 1 / 3;

/** タイトル画面の背景（富士と街道の松並木）のテクスチャ。画面と同じ大きさ。 */
export const TITLE_TEXTURE = 'ui-title';

/** 9 分割の枠の名前（行: 上・中・下、列: 左・中・右）。 */
export const WINDOW_SLICES = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const;
export type WindowSlice = (typeof WINDOW_SLICES)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 3 つの区間（始まり・長さ）。端 c、中 size − 2c、端 c。 */
function spans(size: number, c: number): [number, number][] {
  return [
    [0, c],
    [c, size - 2 * c],
    [size - c, c],
  ];
}

/**
 * 幅 w・高さ h を 9 つに分けた枠（左上を 0, 0 として）。四隅は c × c、辺と中央は残りの長さ。
 * 画像の中のフレーム（w = h = WINDOW_IMAGE_SIZE）にも、ウィンドウに並べる位置と大きさにも使う。
 * w・h が 2c より小さいと中の長さが負になる（画像が裏返る）ので、2c に切り上げる。
 */
export function windowSliceRects(w: number, h: number, c = WINDOW_CORNER): Record<WindowSlice, Rect> {
  const out = {} as Record<WindowSlice, Rect>;
  const cols = spans(Math.max(w, 2 * c), c);
  const rows = spans(Math.max(h, 2 * c), c);
  WINDOW_SLICES.forEach((name, i) => {
    const [x, sw] = cols[i % 3]!;
    const [y, sh] = rows[Math.floor(i / 3)]!;
    out[name] = { x, y, w: sw, h: sh };
  });
  return out;
}
