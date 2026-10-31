// メニューのカーソルと、見せる範囲の計算（Phaser に依存しない）。

/** カーソルを i に動かす（端から先は反対の端へ回る）。項目がなければ 0。 */
export function wrapIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return ((i % count) + count) % count;
}

/** カーソルが見える範囲に入るように、見せる先頭の項目を決める。 */
export function scrollOffset(cursor: number, offset: number, rows: number, count: number): number {
  if (count <= rows) return 0;
  if (cursor < offset) return cursor;
  if (cursor >= offset + rows) return cursor - rows + 1;
  return Math.min(offset, count - rows);
}
