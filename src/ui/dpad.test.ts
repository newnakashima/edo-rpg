import { describe, expect, it } from 'vitest';
import type { Facing } from '../systems/gameState';
import { DPAD_DEAD_ZONE, DpadTracker, directionFromOffset } from './dpad';

describe('directionFromOffset', () => {
  it('腕の上は、その向きになる', () => {
    expect(directionFromOffset(0, -40)).toBe('up');
    expect(directionFromOffset(0, 40)).toBe('down');
    expect(directionFromOffset(-40, 0)).toBe('left');
    expect(directionFromOffset(40, 0)).toBe('right');
  });

  it('腕と腕の間（斜め）でも、ずれの大きいほうの向きになり、隙間がない', () => {
    expect(directionFromOffset(30, -31)).toBe('up');
    expect(directionFromOffset(31, -30)).toBe('right');
    expect(directionFromOffset(-35, 34)).toBe('left');
    expect(directionFromOffset(20, 50)).toBe('down');
    // 中心から一定の距離の円を一周しても、向きが決まらない角度がない
    for (let deg = 0; deg < 360; deg += 1) {
      const rad = (deg * Math.PI) / 180;
      expect(directionFromOffset(Math.cos(rad) * 30, Math.sin(rad) * 30), `${deg}°`).not.toBeNull();
    }
  });

  it('中心の近くでは向きを決めない', () => {
    expect(directionFromOffset(0, 0)).toBeNull();
    expect(directionFromOffset(DPAD_DEAD_ZONE - 1, 0)).toBeNull();
  });
});

function track() {
  const log: [Facing | null, Facing | null][] = [];
  const tracker = new DpadTracker((prev, next) => log.push([prev, next]));
  return { tracker, log };
}

describe('DpadTracker', () => {
  it('押したまま隣の腕へ滑らせると、止まらずに新しい向きへ切り替わる', () => {
    const { tracker, log } = track();
    tracker.start(1, 40, 0);
    tracker.move(1, 35, -20);
    tracker.move(1, 20, -35);
    tracker.move(1, 0, -40);
    expect(log).toEqual([
      [null, 'right'],
      ['right', 'up'],
    ]);
    expect(tracker.direction).toBe('up');
  });

  it('滑らせて中心を通っても、途中で止まらない', () => {
    const { tracker, log } = track();
    tracker.start(1, -40, 0);
    tracker.move(1, -2, 0);
    tracker.move(1, 40, 0);
    expect(log).toEqual([
      [null, 'left'],
      ['left', 'right'],
    ]);
  });

  it('中心を押し始めたら、外へ滑らせたときに向きが決まる', () => {
    const { tracker, log } = track();
    tracker.start(1, 0, 0);
    expect(tracker.direction).toBeNull();
    tracker.move(1, 0, 30);
    expect(log).toEqual([[null, 'down']]);
  });

  it('十字キーの外へ指が出ても、向きを追い続ける', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.move(1, 10, 200);
    expect(tracker.direction).toBe('down');
  });

  it('指を離すと止まり、別の指の動きや離しは無視する', () => {
    const { tracker, log } = track();
    tracker.start(1, 40, 0);
    tracker.move(2, -40, 0);
    tracker.end(2);
    expect(tracker.direction).toBe('right');
    tracker.end(1);
    tracker.end(1);
    expect(tracker.direction).toBeNull();
    expect(log).toEqual([
      [null, 'right'],
      ['right', null],
    ]);
  });

  it('別の指で押し直すと、その指に持ち替える', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.start(2, 0, 40);
    expect(tracker.direction).toBe('down');
    tracker.end(1);
    expect(tracker.direction).toBe('down');
    tracker.end(2);
    expect(tracker.direction).toBeNull();
  });

  it('reset で指の有無にかかわらず離す', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.reset();
    expect(tracker.direction).toBeNull();
  });
});
