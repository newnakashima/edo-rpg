// 仮想パッドの取消ボタンの表示。取消として働かない場面では、その場で押したときに起きることを出す。

export interface CancelLabel {
  label: string;
  /** false なら押しても何も起きないので薄く出す。 */
  enabled: boolean;
}

export const CANCEL: CancelLabel = { label: '取消', enabled: true };
/** 取消が働かないメニュー（イベントの選択肢・戦闘の最初の仲間のコマンド）で薄く出す。 */
export const CANCEL_DISABLED: CancelLabel = { label: '取消', enabled: false };

/** メニューの取消ボタンの表示（取消で戻れるメニューなら「取消」、戻れなければ薄い「取消」）。 */
export function menuCancelLabel(cancelable: boolean): CancelLabel {
  return cancelable ? CANCEL : CANCEL_DISABLED;
}

export interface FieldContext {
  /** メッセージウィンドウが開いている。 */
  messageOpen: boolean;
  /** 開いているページに用語がある（取消で解説を見られる）。 */
  pageHasTerms: boolean;
  /** 用語の解説を見ている（取消で閉じる）。 */
  tipsOpen: boolean;
  /** メニューや店の一覧が重なっている（取消で一つ戻る）。 */
  overlay: boolean;
  /** 重なっているいちばん上のものが取消で戻る（イベントの選択肢は戻れないので false）。 */
  overlayCancels: boolean;
  /** イベントの途中（画面の切り替え待ちなど。取消を押しても何も起きない）。 */
  eventRunning: boolean;
}

/**
 * フィールドでの取消ボタンの表示。
 * - メッセージを読んでいる間は「用語」（ページに用語がなければ薄く）。解説を見ている間は閉じるので「取消」
 * - メニューなどが重なっている間は「取消」（イベントの選択肢など、取消で戻れないものは薄く）
 * - マップを歩いている間はメニュー（仲間の状態・道具・装備など）を開くので「状態」。イベントの途中は薄く
 */
export function fieldCancelLabel(c: FieldContext): CancelLabel {
  if (c.messageOpen) {
    if (c.tipsOpen) return CANCEL;
    return { label: '用語', enabled: c.pageHasTerms };
  }
  if (c.overlay) return c.overlayCancels ? CANCEL : CANCEL_DISABLED;
  return { label: '状態', enabled: !c.eventRunning };
}
