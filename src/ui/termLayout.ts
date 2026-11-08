// メッセージウィンドウの用語の装飾の置き方（Phaser を使わない計算だけ。テストのため widgets.ts から分けた）。

/** 折り返した 1 行の中の、装飾を付ける範囲（start〜end、end は含まない）。 */
export interface TermSegment {
  line: number;
  start: number;
  end: number;
}

/**
 * 元の文 text の中の範囲 spans を、折り返した後の行 lines の中の範囲に移す。
 * 折り返しで消えた文字（改行・行頭の空白など）は飛ばして、文字を前から順に突き合わせる。
 * 1 つの言葉が行をまたいだら、行ごとに分けて返す。
 */
export function termSegments(text: string, lines: readonly string[], spans: readonly { start: number; end: number }[]): TermSegment[] {
  const segments: TermSegment[] = [];
  let origin = 0;
  lines.forEach((line, lineIndex) => {
    let current: TermSegment | null = null;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      while (origin < text.length && text[origin] !== ch) origin++;
      if (origin >= text.length) return;
      const at = origin;
      origin++;
      const inSpan = spans.some((s) => at >= s.start && at < s.end);
      // 隣り合う 2 つの言葉は別の範囲にする（下線を言葉ごとに分ける）
      const startsSpan = spans.some((s) => s.start === at);
      if (inSpan && current && !startsSpan) {
        current.end = col + 1;
      } else if (inSpan) {
        current = { line: lineIndex, start: col, end: col + 1 };
        segments.push(current);
      } else {
        current = null;
      }
    }
  });
  return segments;
}
