import { describe, expect, it } from 'vitest';
import events from './events.ts?raw';
import maps from './maps.ts?raw';
import { findTerms, GLOSSARY, termsIn } from './glossary';

describe('TIPS（用語の解説）', () => {
  it('台詞の中の用語を、前から順に見つける', () => {
    const text = '旅籠の主人「お代が足りねえようで……」と長屋の隠居が言った。';
    expect(findTerms(text).map((m) => [m.entry.term, m.start, m.end])).toEqual([
      ['旅籠', 0, 2],
      ['長屋', 20, 22],
      ['隠居', 23, 25],
    ]);
  });

  it('同じ位置で当たる言葉が複数あれば、長い方を取る', () => {
    expect(findTerms('町奉行所へ行く').map((m) => m.entry.term)).toEqual(['奉行所']);
    expect(findTerms('公儀隠密の頭').map((m) => m.entry.term)).toEqual(['公儀隠密']);
    expect(findTerms('具足師の工房').map((m) => m.entry.term)).toEqual(['具足師']);
  });

  it('同じ言葉が何度出ても、すべてに装飾を付け、解説は 1 回だけ見せる', () => {
    const text = '茶屋で団子。また茶屋。';
    expect(findTerms(text)).toHaveLength(2);
    expect(termsIn(text).map((e) => e.term)).toEqual(['茶屋']);
  });

  it('用語がなければ何も返さない', () => {
    expect(findTerms('記録しました。')).toEqual([]);
    expect(termsIn('')).toEqual([]);
  });

  it('言葉は 2 文字以上で重複がなく、読みはひらがな、説明がある', () => {
    const terms = GLOSSARY.map((e) => e.term);
    expect(new Set(terms).size).toBe(terms.length);
    for (const e of GLOSSARY) {
      expect(e.term.length, e.term).toBeGreaterThanOrEqual(2);
      expect(e.reading, e.term).toMatch(/^[ぁ-ゖー]+$/);
      expect(e.description.length, e.term).toBeGreaterThan(0);
      // 解説の窓の 2 行に収まる長さ（1 行 30 字ほど）
      expect(e.description.length, e.term).toBeLessThanOrEqual(60);
    }
  });

  it('どの言葉も台詞（イベント・マップの人の台詞）に出てくる', () => {
    const text = events + maps;
    for (const e of GLOSSARY) expect(text.includes(e.term), e.term).toBe(true);
  });
});
