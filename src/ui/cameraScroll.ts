// フィールドのカメラの位置。画面に依存しない純粋な計算。

/**
 * カメラの左（上）端の位置。主人公（center）が画面の真ん中に来るようにし、マップの端では止める。
 * マップが画面より小さい（民家の中など）ときは、マップを画面の真ん中に置く（位置は負になる）。
 */
export function cameraScroll(center: number, mapSize: number, viewSize: number): number {
  const max = mapSize - viewSize;
  if (max < 0) return max / 2;
  return Math.max(0, Math.min(center - viewSize / 2, max));
}
