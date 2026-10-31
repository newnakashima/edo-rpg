// スマートフォンで画面が拡大されないようにする。
// iOS の Safari は viewport の user-scalable=no を無視するため、ピンチとダブルタップの拡大をイベントで止める。
// それでも拡大されてしまったとき（OS の操作など）は、viewport を設定し直して元の倍率に戻す。

/** 2 回目のタップをダブルタップとみなす間隔（ミリ秒）。 */
export const DOUBLE_TAP_MS = 350;

export interface ZoomGuardTarget {
  addEventListener(type: string, listener: (e: Event) => void, options?: AddEventListenerOptions): void;
}

/** ピンチ・ダブルタップによる拡大を止める。 */
export function preventZoomGestures(target: ZoomGuardTarget, now: () => number = () => Date.now()): void {
  const block = (e: Event) => e.preventDefault();
  const active = { passive: false };

  // iOS Safari 独自のピンチのイベント
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) target.addEventListener(type, block, active);

  // 2 本指での移動（ピンチ）
  target.addEventListener(
    'touchmove',
    (e) => {
      if ((e as TouchEvent).touches.length > 1) e.preventDefault();
    },
    active,
  );

  // ダブルタップ。2 回目の touchend の既定の動作（拡大）を止める。
  // タップそのものは touchstart / pointerdown で受けているので、ゲームの操作には影響しない。
  let lastTouchEnd = -Infinity;
  target.addEventListener(
    'touchend',
    (e) => {
      const t = now();
      if (t - lastTouchEnd < DOUBLE_TAP_MS) e.preventDefault();
      lastTouchEnd = t;
    },
    active,
  );

  target.addEventListener('dblclick', block, active);
}

/** 拡大されてしまったら、viewport の指定を設定し直して等倍に戻す。 */
export function resetZoomWhenScaled(win: Window = window): void {
  const vv = win.visualViewport;
  const meta = win.document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!vv || !meta) return;
  const original = meta.content;
  vv.addEventListener('resize', () => {
    if (vv.scale <= 1.01) return;
    // 一度別の値にしてから戻すと、iOS が viewport を読み直して倍率を 1 に戻す
    meta.content = `${original}, minimum-scale=1`;
    win.requestAnimationFrame(() => {
      meta.content = original;
    });
  });
}
