import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, preventZoomGestures } from './preventZoom';

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
