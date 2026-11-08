import type { Rng } from './random';

/** 決まった値を順に返す乱数（尽きたら最後の値を返し続ける）。 */
export function seqRng(...values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[Math.min(i, values.length - 1)] ?? 0.5;
    i++;
    return v;
  };
}

/** 再現できる疑似乱数（mulberry32）。 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PNG の幅と高さ（IHDR）。data URL の画像（import.meta.glob の ?inline）から読む。 */
export function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
}
