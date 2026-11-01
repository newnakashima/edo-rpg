// ウィンドウ枠・カーソル・タイトルの背景・仮想パッドの画像（public/assets/ui/。生成の記録は public/assets/README.md）。

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
/** タイトル画面の題字・副題の中心の y と文字の大きさ（TitleScene が使い、背景の無地の帯に収まるかをテストで確かめる）。 */
export const TITLE_TEXT = { y: 28, size: 22 } as const;
export const SUBTITLE_TEXT = { y: 50, size: 9 } as const;
/** タイトルの背景の、無地の藍の空の帯（y の上端と下端。両端を含む）。題字・副題はこの中に置く。 */
export const TITLE_SKY_BAND = { top: 8, bottom: 55 } as const;

/**
 * 仮想パッド（index.html の #pad。DOM の要素の背景に CSS で敷く）の画像の一辺と、表示する倍率。
 * 十字キーは 1 枚の絵の上に、上下左右の押せる区画（3 × 3 の格子の上・左・右・下）を重ねる。
 * 決定・取消は同じ形の丸い漆塗りのボタンの色違い（朱・藍）で、中央の無地の面に HTML の文字を重ねる。
 */
export const PAD_DPAD_IMAGE_SIZE = 64;
export const PAD_BUTTON_IMAGE_SIZE = 32;
export const PAD_IMAGE_SCALE = 2;
/** 丸いボタンの中央の無地の面の半径（画像の px）。文字はこの中に置く。 */
export const PAD_BUTTON_FACE_RADIUS = 9;

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
