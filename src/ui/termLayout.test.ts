import { describe, expect, it } from 'vitest';
import { nextTipIndex, termSegments } from './termLayout';

describe('用語の装飾の置き方', () => {
  it('折り返した行の中の位置に移す', () => {
    const text = 'ここは旅籠。茶屋もある。';
    const lines = ['ここは旅籠。', '茶屋もある。'];
    expect(termSegments(text, lines, [{ start: 3, end: 5 }, { start: 6, end: 8 }])).toEqual([
      { line: 0, start: 3, end: 5 },
      { line: 1, start: 0, end: 2 },
    ]);
  });

  it('行をまたいだ言葉は、行ごとに分ける', () => {
    const text = 'あいう火の見櫓';
    const lines = ['あいう火の', '見櫓'];
    expect(termSegments(text, lines, [{ start: 3, end: 7 }])).toEqual([
      { line: 0, start: 3, end: 5 },
      { line: 1, start: 0, end: 2 },
    ]);
  });

  it('改行や折り返しで消えた空白は飛ばして突き合わせる', () => {
    const text = '一行目\n旅籠 の話';
    const lines = ['一行目', '旅籠', 'の話'];
    expect(termSegments(text, lines, [{ start: 4, end: 6 }])).toEqual([{ line: 1, start: 0, end: 2 }]);
  });

  it('隣り合う 2 つの言葉は別の範囲にする', () => {
    expect(termSegments('長屋隠居', ['長屋隠居'], [{ start: 0, end: 2 }, { start: 2, end: 4 }])).toEqual([
      { line: 0, start: 0, end: 2 },
      { line: 0, start: 2, end: 4 },
    ]);
  });
});

describe('解説の窓の送り', () => {
  it('決定で次の用語へ進み、最後の用語で閉じる', () => {
    expect(nextTipIndex(0, 3)).toBe(1);
    expect(nextTipIndex(1, 3)).toBe(2);
    expect(nextTipIndex(2, 3)).toBeNull();
    expect(nextTipIndex(0, 1)).toBeNull();
  });

  it('閉じていれば閉じたまま', () => {
    expect(nextTipIndex(null, 3)).toBeNull();
  });
});
