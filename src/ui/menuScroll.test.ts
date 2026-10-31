import { describe, expect, it } from 'vitest';
import { scrollOffset, wrapIndex } from './menuScroll';

describe('メニューのカーソル', () => {
  it('端から先は反対の端へ回る', () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(2, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('メニューの見せる範囲', () => {
  it('全部見えるときは先頭から', () => {
    expect(scrollOffset(4, 0, 9, 5)).toBe(0);
  });

  it('カーソルが下にはみ出たら、最後の行に来るようにずらす', () => {
    expect(scrollOffset(9, 0, 9, 20)).toBe(1);
    expect(scrollOffset(19, 0, 9, 20)).toBe(11);
  });

  it('カーソルが上にはみ出たら、先頭の行に来るようにずらす', () => {
    expect(scrollOffset(3, 5, 9, 20)).toBe(3);
  });

  it('末尾から先頭へ回ったら、先頭から見せる', () => {
    expect(scrollOffset(wrapIndex(20, 20), 11, 9, 20)).toBe(0);
  });

  it('見える範囲の中で動くときはずらさない', () => {
    expect(scrollOffset(6, 2, 9, 20)).toBe(2);
  });
});
