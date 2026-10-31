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

/** viewport を一時的に変えてから元に戻すまでの時間（ミリ秒）。iOS が viewport を読み直す間を空ける。 */
export const RESET_RESTORE_MS = 100;

export interface ViewportLike {
  readonly scale: number;
  addEventListener(type: 'resize', listener: () => void): void;
}

/**
 * 拡大されてしまったら、viewport の指定を設定し直して等倍に戻す。
 * 一度別の値にしてから戻すと、iOS が viewport を読み直して倍率を 1 に戻す。
 */
export function installZoomReset(
  viewport: ViewportLike,
  meta: { content: string },
  schedule: (fn: () => void, ms: number) => void = (fn, ms) => void setTimeout(fn, ms),
): void {
  const original = meta.content;
  let restoring = false;
  viewport.addEventListener('resize', () => {
    if (viewport.scale <= 1.01 || restoring) return;
    restoring = true;
    meta.content = `${original}, minimum-scale=1`;
    schedule(() => {
      meta.content = original;
      restoring = false;
    }, RESET_RESTORE_MS);
  });
}

export function resetZoomWhenScaled(win: Window = window): void {
  const meta = win.document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (win.visualViewport && meta) installZoomReset(win.visualViewport, meta);
}
