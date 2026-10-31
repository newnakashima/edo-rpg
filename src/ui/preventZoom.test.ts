import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, installZoomReset, preventZoomGestures, RESET_RESTORE_MS } from './preventZoom';

function fire(target: EventTarget, type: string, extra: Record<string, unknown> = {}): boolean {
  const e = Object.assign(new Event(type, { cancelable: true }), extra);
  target.dispatchEvent(e);
  return e.defaultPrevented;
}

describe('preventZoomGestures', () => {
  it('iOS のピンチのイベントとダブルクリックを止める', () => {
    const target = new EventTarget();
    preventZoomGestures(target);
    for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
      expect(fire(target, type), type).toBe(true);
    }
  });

  it('2 本指の移動だけを止め、1 本指の移動は止めない', () => {
    const target = new EventTarget();
    preventZoomGestures(target);
    expect(fire(target, 'touchmove', { touches: [{}, {}] })).toBe(true);
    expect(fire(target, 'touchmove', { touches: [{}] })).toBe(false);
  });

  it('間を置かない 2 回目のタップだけを止める', () => {
    const target = new EventTarget();
    let t = 1000;
    preventZoomGestures(target, () => t);
    expect(fire(target, 'touchend')).toBe(false);
    t += DOUBLE_TAP_MS - 1;
    expect(fire(target, 'touchend')).toBe(true);
    t += DOUBLE_TAP_MS;
    expect(fire(target, 'touchend')).toBe(false);
  });
});

describe('リスナーの指定', () => {
  it('全てのリスナーを passive: false で登録する（passive だと preventDefault が無視される）', () => {
    const calls: { type: string; options?: AddEventListenerOptions }[] = [];
    preventZoomGestures({ addEventListener: (type, _l, options) => calls.push({ type, options }) });
    expect(calls.map((c) => c.type).sort()).toEqual(
      ['dblclick', 'gesturechange', 'gestureend', 'gesturestart', 'touchend', 'touchmove'].sort(),
    );
    for (const c of calls) expect(c.options?.passive, c.type).toBe(false);
  });
});

describe('installZoomReset', () => {
  function setup(scale: number) {
    let resize: () => void = () => undefined;
    const viewport = { scale, addEventListener: (_t: 'resize', l: () => void) => void (resize = l) };
    const meta = { content: 'width=device-width' };
    const scheduled: { fn: () => void; ms: number }[] = [];
    installZoomReset(viewport, meta, (fn, ms) => void scheduled.push({ fn, ms }));
    return { viewport, meta, scheduled, resize: () => resize() };
  }

  it('拡大されたら viewport を一時的に変え、少し待って元に戻す', () => {
    const t = setup(2);
    t.resize();
    expect(t.meta.content).toBe('width=device-width, minimum-scale=1');
    expect(t.scheduled).toHaveLength(1);
    expect(t.scheduled[0]?.ms).toBe(RESET_RESTORE_MS);
    t.scheduled[0]?.fn();
    expect(t.meta.content).toBe('width=device-width');
  });

  it('戻している途中の resize では重ねて変えない', () => {
    const t = setup(2);
    t.resize();
    t.resize();
    expect(t.scheduled).toHaveLength(1);
    expect(t.meta.content).toBe('width=device-width, minimum-scale=1');
  });

  it('等倍なら何もしない', () => {
    const t = setup(1);
    t.resize();
    expect(t.meta.content).toBe('width=device-width');
    expect(t.scheduled).toHaveLength(0);
  });
});
