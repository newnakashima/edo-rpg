import { describe, expect, it } from 'vitest';
import { CURSOR_IMAGE_SIZE, CURSOR_SCALE, WINDOW_CORNER, WINDOW_IMAGE_SIZE, windowSliceFrames, windowSliceRects } from './uiImages';
import { MENU_LINE_HEIGHT } from './widgets';

/** PNG の幅と高さ（IHDR）。data URL の画像から読む。 */
function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
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
    const frames = Object.values(windowSliceFrames());
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
});
