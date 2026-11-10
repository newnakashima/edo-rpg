import { describe, expect, it } from 'vitest';
import { CANCEL, CANCEL_DISABLED, fieldCancelLabel, menuCancelLabel, type FieldContext } from './cancelLabel';

const walking: FieldContext = { messageOpen: false, pageHasTerms: false, tipsOpen: false, overlay: false, overlayCancels: true, eventRunning: false };

describe('フィールドの取消ボタンの表示', () => {
  it('マップを歩いている間は「状態」（メニューを開く）', () => {
    expect(fieldCancelLabel(walking)).toEqual({ label: '状態', enabled: true });
  });

  it('イベントの途中は「状態」を薄く出す', () => {
    expect(fieldCancelLabel({ ...walking, eventRunning: true })).toEqual({ label: '状態', enabled: false });
  });

  it('メニューが重なっている間は「取消」', () => {
    expect(fieldCancelLabel({ ...walking, overlay: true })).toEqual(CANCEL);
  });

  it('取消で戻れないもの（イベントの選択肢）が重なっている間は「取消」を薄く出す', () => {
    expect(fieldCancelLabel({ ...walking, overlay: true, overlayCancels: false, eventRunning: true })).toEqual({ label: '取消', enabled: false });
  });

  it('戦闘などのメニューは、取消で戻れるときだけ「取消」を濃く出す', () => {
    expect(menuCancelLabel(true)).toEqual(CANCEL);
    expect(menuCancelLabel(false)).toEqual(CANCEL_DISABLED);
  });

  it('メッセージを読んでいる間は「用語」。ページに用語がなければ薄く出す', () => {
    expect(fieldCancelLabel({ ...walking, messageOpen: true, pageHasTerms: true })).toEqual({ label: '用語', enabled: true });
    expect(fieldCancelLabel({ ...walking, messageOpen: true, pageHasTerms: false })).toEqual({ label: '用語', enabled: false });
    // 選択肢の前の問いかけなど、メニューと重なっていてもメッセージが先
    expect(fieldCancelLabel({ ...walking, messageOpen: true, overlay: true, pageHasTerms: true }).label).toBe('用語');
  });

  it('解説を見ている間は「取消」（閉じる）', () => {
    expect(fieldCancelLabel({ ...walking, messageOpen: true, pageHasTerms: true, tipsOpen: true })).toEqual(CANCEL);
  });
});
