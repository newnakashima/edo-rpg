import { afterEach, describe, expect, it } from 'vitest';
import { playSe, resolveSe, SE_FALLBACK, SE_IDS, setAvailableSe, setSePlayer, type SeId } from './audio';

afterEach(() => {
  setAvailableSe([]);
  setSePlayer(() => {});
});

describe('効果音の呼び出し口', () => {
  it('効果音は docs/audio.md の一覧の 52 個で、重なりはない', () => {
    expect(SE_IDS).toHaveLength(52);
    expect(new Set(SE_IDS).size).toBe(52);
  });

  it('代わりは大筒 → 鉄砲、雷 → 術だけ', () => {
    expect(SE_FALLBACK).toEqual({ se_cannon: 'se_gun', se_thunder: 'se_magic' });
  });

  it('書き出してある効果音はそのまま、なければ代わり、代わりもなければ null', () => {
    const available = new Set<SeId>(['se_ok', 'se_gun']);
    expect(resolveSe('se_ok', available)).toBe('se_ok');
    expect(resolveSe('se_cannon', available)).toBe('se_gun');
    expect(resolveSe('se_thunder', available)).toBeNull();
    expect(resolveSe('se_cancel', available)).toBeNull();
    expect(resolveSe('se_cannon', new Set<SeId>(['se_cannon', 'se_gun']))).toBe('se_cannon');
  });

  it('playSe は書き出してある効果音（または代わり）だけを再生処理に渡す', () => {
    const played: SeId[] = [];
    setSePlayer((id) => played.push(id));
    setAvailableSe(['se_cursor', 'se_gun']);
    playSe('se_cursor');
    playSe('se_cancel');
    playSe('se_cannon');
    playSe('se_cursor');
    expect(played).toEqual(['se_cursor', 'se_gun', 'se_cursor']);
  });
});
