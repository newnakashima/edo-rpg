// 仮想パッドの取消ボタンの表示。取消として働かない場面では、その場で押したときに起きることを出す。

export interface CancelLabel {
  label: string;
  /** false なら押しても何も起きないので薄く出す。 */
  enabled: boolean;
}

export const CANCEL: CancelLabel = { label: '取消', enabled: true };

export interface FieldContext {
  /** メッセージウィンドウが開いている。 */
  messageOpen: boolean;
  /** 開いているページに用語がある（取消で解説を見られる）。 */
  pageHasTerms: boolean;
  /** 用語の解説を見ている（取消で閉じる）。 */
  tipsOpen: boolean;
  /** メニューや店の一覧が重なっている（取消で一つ戻る）。 */
  overlay: boolean;
  /** イベントの途中（画面の切り替え待ちなど。取消を押しても何も起きない）。 */
  eventRunning: boolean;
}

/**
 * フィールドでの取消ボタンの表示。
 * - メッセージを読んでいる間は「用語」（ページに用語がなければ薄く）。解説を見ている間は閉じるので「取消」
 * - メニューなどが重なっている間は「取消」
 * - マップを歩いている間はメニュー（仲間の状態・道具・装備など）を開くので「状態」。イベントの途中は薄く
 */
export function fieldCancelLabel(c: FieldContext): CancelLabel {
  if (c.messageOpen) {
    if (c.tipsOpen) return CANCEL;
    return { label: '用語', enabled: c.pageHasTerms };
  }
  if (c.overlay) return CANCEL;
  return { label: '状態', enabled: !c.eventRunning };
}
