import { describe, expect, it } from 'vitest';
import { CURSOR_IMAGE_SIZE, CURSOR_SCALE, WINDOW_CORNER, WINDOW_IMAGE_SIZE, windowSliceRects } from './uiImages';
import { MENU_LINE_HEIGHT } from './widgets';
import { GAME_HEIGHT, GAME_WIDTH } from './theme';

/** PNG の幅と高さ（IHDR）。data URL の画像から読む。 */
function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
}

/** data URL の PNG（8 bit の RGBA、インターレースなし）を読み、画素を [r, g, b, a] の 2 次元の配列で返す。 */
async function decodePng(dataUrl: string): Promise<number[][][]> {
  const bin = atob(dataUrl.split(',')[1]!);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  const u32 = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  const w = u32(16);
  const h = u32(20);
  expect([bytes[24], bytes[25], bytes[28]], 'bit depth 8・RGBA・インターレースなし').toEqual([8, 6, 0]);
  const idat: Uint8Array[] = [];
  for (let at = 8; at < bytes.length; ) {
    const len = u32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === 'IDAT') idat.push(bytes.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = new Uint8Array(await new Response(new Blob(idat.map((part) => part.slice())).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const stride = w * 4;
  const out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]!;
    expect(filter, 'PNG のフィルタは 0〜4').toBeLessThanOrEqual(4);
    for (let i = 0; i < stride; i++) {
      const v = raw[y * (stride + 1) + 1 + i]!;
      const a = i >= 4 ? out[y * stride + i - 4]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + i]! : 0;
      const c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter]!;
      out[y * stride + i] = (v + pred) & 0xff;
    }
  }
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => Array.from(out.subarray(y * stride + x * 4, y * stride + x * 4 + 4))));
}

const inlined = import.meta.glob<string>('../../public/assets/ui/*.png', { eager: true, query: '?inline', import: 'default' });

describe('ウィンドウ枠とカーソルの画像', () => {
  it('ウィンドウ枠とカーソルの画像があり、大きさが定数と合う', () => {
    expect(pngSize(inlined['../../public/assets/ui/window.png']!)).toEqual({ w: WINDOW_IMAGE_SIZE, h: WINDOW_IMAGE_SIZE });
    expect(pngSize(inlined['../../public/assets/ui/cursor.png']!)).toEqual({ w: CURSOR_IMAGE_SIZE, h: CURSOR_IMAGE_SIZE });
  });

  it('カーソルは表示したときに 1 行の高さに収まる', () => {
    expect(CURSOR_IMAGE_SIZE * CURSOR_SCALE).toBeLessThan(MENU_LINE_HEIGHT);
  });
});

describe('ウィンドウ枠の 9 分割', () => {
  it('画像の 9 つの枠は重ならずに画像を埋める', () => {
    const frames = Object.values(windowSliceRects(WINDOW_IMAGE_SIZE, WINDOW_IMAGE_SIZE));
    expect(frames.reduce((s, r) => s + r.w * r.h, 0)).toBe(WINDOW_IMAGE_SIZE * WINDOW_IMAGE_SIZE);
    for (const r of frames) {
      expect(r.x + r.w).toBeLessThanOrEqual(WINDOW_IMAGE_SIZE);
      expect(r.y + r.h).toBeLessThanOrEqual(WINDOW_IMAGE_SIZE);
    }
  });

  it('四隅は元の大きさのまま、辺と中央がウィンドウの大きさまで伸びる', () => {
    const r = windowSliceRects(100, 22);
    expect(r.tl).toEqual({ x: 0, y: 0, w: WINDOW_CORNER, h: WINDOW_CORNER });
    expect(r.br).toEqual({ x: 100 - WINDOW_CORNER, y: 22 - WINDOW_CORNER, w: WINDOW_CORNER, h: WINDOW_CORNER });
    expect(r.mc).toEqual({ x: WINDOW_CORNER, y: WINDOW_CORNER, w: 100 - 2 * WINDOW_CORNER, h: 22 - 2 * WINDOW_CORNER });
    expect(Object.values(r).reduce((s, x) => s + x.w * x.h, 0)).toBe(100 * 22);
  });

  it('2c より小さいウィンドウでも、長さが負にならない', () => {
    for (const r of Object.values(windowSliceRects(5, 3))) {
      expect(r.w).toBeGreaterThanOrEqual(0);
      expect(r.h).toBeGreaterThanOrEqual(0);
    }
  });

  it('枠の画像は、引き伸ばす辺が伸ばす向きに一様で、中央が 1 色（伸ばしても柄が崩れない）', async () => {
    const px = await decodePng(inlined['../../public/assets/ui/window.png']!);
    const r = windowSliceRects(WINDOW_IMAGE_SIZE, WINDOW_IMAGE_SIZE);
    const at = (x: number, y: number) => px[y]![x]!.join(',');
    // 上下の辺は横に、左右の辺は縦に伸ばすので、その向きに同じ色が続く
    for (const name of ['tc', 'bc'] as const) {
      const { x, y, w, h } = r[name];
      for (let dy = 0; dy < h; dy++) for (let dx = 1; dx < w; dx++) expect(at(x + dx, y + dy), name).toBe(at(x, y + dy));
    }
    for (const name of ['ml', 'mr'] as const) {
      const { x, y, w, h } = r[name];
      for (let dx = 0; dx < w; dx++) for (let dy = 1; dy < h; dy++) expect(at(x + dx, y + dy), name).toBe(at(x + dx, y));
    }
    const { x, y, w, h } = r.mc;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) expect(at(x + dx, y + dy), 'mc').toBe(at(x, y));
    // デコーダーが正しく読めているか、既知の色で確かめる（地は不透明な藍、左上は墨）
    expect(at(x, y)).toBe('38,32,75,255');
    expect(at(0, 0)).toBe('34,34,37,255');
  });
});

describe('タイトルの背景の画像', () => {
  it('画面と同じ大きさ', () => {
    expect(pngSize(inlined['../../public/assets/ui/title.png']!)).toEqual({ w: GAME_WIDTH, h: GAME_HEIGHT });
  });

  it('題字（y 28）・副題（y 50）の行 y 8〜55 は 1 色の不透明な空（生成りの文字が絵に重ならない）', async () => {
    const px = await decodePng(inlined['../../public/assets/ui/title.png']!);
    const sky = px[8]![0]!.join(',');
    for (let y = 8; y <= 55; y++) for (let x = 0; x < GAME_WIDTH; x++) expect(px[y]![x]!.join(','), `${x},${y}`).toBe(sky);
    expect(sky).toBe('22,40,73,255');
  });
});
