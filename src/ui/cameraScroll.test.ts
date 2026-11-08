import { describe, expect, it } from 'vitest';
import { cameraScroll } from './cameraScroll';

describe('カメラの位置', () => {
  it('画面より大きいマップでは主人公を真ん中に置き、マップの端で止める', () => {
    expect(cameraScroll(500, 1000, 384)).toBe(308);
    expect(cameraScroll(50, 1000, 384)).toBe(0);
    expect(cameraScroll(990, 1000, 384)).toBe(616);
  });

  it('画面と同じ大きさなら動かない', () => {
    expect(cameraScroll(100, 384, 384)).toBe(0);
  });

  it('画面より小さいマップ（民家の中）は、主人公の位置によらず画面の真ん中に置く', () => {
    expect(cameraScroll(10, 160, 384)).toBe(-112);
    expect(cameraScroll(150, 160, 384)).toBe(-112);
  });
});
