/** 0 以上 1 未満の乱数を返す関数。テストでは固定値を返す関数に差し替える。 */
export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

/** min 以上 max 以下の実数を返す。 */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** min 以上 max 以下の整数を返す。 */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
