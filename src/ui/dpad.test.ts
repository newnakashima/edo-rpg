import { describe, expect, it } from 'vitest';
import type { Facing } from '../systems/gameState';
import html from '../../index.html?raw';
import { BLOCKED_DEFAULTS, bindButton, bindDpad, padSink, blockDefaults, DPAD_DEAD_ZONE, DpadTracker, directionFromOffset, isPrimaryPress } from './dpad';

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

  it('別の指で押し直すとその指に従い、離すと残っている指の向きに戻る', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.start(2, 0, 40);
    expect(tracker.direction).toBe('down');
    tracker.end(2);
    expect(tracker.direction).toBe('right');
    tracker.move(1, 0, -40);
    expect(tracker.direction).toBe('up');
    tracker.end(1);
    expect(tracker.direction).toBeNull();
  });

  it('後から中心に置いた指は、先の指の向きを止めない', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.start(2, 0, 0);
    expect(tracker.direction).toBe('right');
    tracker.move(2, -40, 0);
    expect(tracker.direction).toBe('left');
  });

  it('reset で指の有無にかかわらず離す', () => {
    const { tracker } = track();
    tracker.start(1, 40, 0);
    tracker.reset();
    expect(tracker.direction).toBeNull();
  });
});

/** 十字キーの要素の代わり。中心が (100, 100) の 128px 四方。 */
class FakeDpad extends EventTarget {
  readonly captured: number[] = [];
  readonly arms = (['up', 'down', 'left', 'right'] as const).map((dir) => {
    const classes = new Set<string>();
    return { dataset: { dir }, classes, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
  });
  getBoundingClientRect() {
    return { left: 36, top: 36, width: 128, height: 128 };
  }
  querySelectorAll(selector: string) {
    return selector === '[data-dir]' ? this.arms : [];
  }
  setPointerCapture(id: number) {
    this.captured.push(id);
  }
  active(): string[] {
    return this.arms.filter((a) => a.classes.has('active')).map((a) => a.dataset.dir);
  }
}

function pointer(target: EventTarget, type: string, init: { id?: number; x?: number; y?: number; pointerType?: string; button?: number } = {}): boolean {
  const e = Object.assign(new Event(type, { cancelable: true }), {
    pointerId: init.id ?? 1,
    clientX: init.x ?? 100,
    clientY: init.y ?? 100,
    pointerType: init.pointerType ?? 'touch',
    button: init.button ?? 0,
  });
  target.dispatchEvent(e);
  return e.defaultPrevented;
}

function bind() {
  const dpad = new FakeDpad();
  const held = new Set<Facing>();
  const pressed: Facing[] = [];
  const win = new EventTarget();
  bindDpad(
    dpad,
    {
      hold: (d) => {
        held.add(d);
        pressed.push(d);
      },
      release: (d) => held.delete(d),
    },
    win,
  );
  return { dpad, held, pressed, win };
}

describe('bindDpad', () => {
  it('要素の中心からの位置で向きを決め、腕を光らせ、指を捕まえる', () => {
    const { dpad, held, pressed } = bind();
    expect(pointer(dpad, 'pointerdown', { x: 140, y: 100 })).toBe(true);
    expect([...held]).toEqual(['right']);
    expect(dpad.active()).toEqual(['right']);
    expect(dpad.captured).toEqual([1]);
    // 斜めの隙間を通って上の腕へ滑らせる
    pointer(dpad, 'pointermove', { x: 130, y: 69 });
    expect([...held]).toEqual(['up']);
    expect(dpad.active()).toEqual(['up']);
    expect(pressed).toEqual(['right', 'up']);
    pointer(dpad, 'pointerup');
    expect(held.size).toBe(0);
    expect(dpad.active()).toEqual([]);
  });

  it('pointercancel・lostpointercapture・blur でも離す', () => {
    const { dpad, held, win } = bind();
    for (const release of ['pointercancel', 'lostpointercapture']) {
      pointer(dpad, 'pointerdown', { x: 60 });
      expect([...held]).toEqual(['left']);
      pointer(dpad, release);
      expect(held.size, release).toBe(0);
    }
    pointer(dpad, 'pointerdown', { y: 150 });
    win.dispatchEvent(new Event('blur'));
    expect(held.size).toBe(0);
    expect(dpad.active()).toEqual([]);
  });

  it('マウスの右クリックでは動かない', () => {
    const { dpad, held } = bind();
    pointer(dpad, 'pointerdown', { x: 140, pointerType: 'mouse', button: 2 });
    expect(held.size).toBe(0);
    pointer(dpad, 'pointerdown', { x: 140, pointerType: 'mouse', button: 0 });
    expect([...held]).toEqual(['right']);
  });

  it('タッチの既定の動作（iOS の虫眼鏡など）を止める', () => {
    const { dpad } = bind();
    for (const type of ['touchstart', 'touchmove', 'touchend', 'contextmenu', 'selectstart']) {
      const e = new Event(type, { cancelable: true });
      dpad.dispatchEvent(e);
      expect(e.defaultPrevented, type).toBe(true);
    }
  });
});

describe('blockDefaults / isPrimaryPress', () => {
  it('決定・取消のボタンでもタッチの既定の動作を止める', () => {
    const el = new EventTarget();
    blockDefaults(el);
    for (const type of BLOCKED_DEFAULTS) {
      const e = new Event(type, { cancelable: true });
      el.dispatchEvent(e);
      expect(e.defaultPrevented, type).toBe(true);
    }
  });

  it('タッチ・ペン・マウスの左ボタンだけを押したとみなす', () => {
    expect(isPrimaryPress({ pointerType: 'touch', button: 0 })).toBe(true);
    expect(isPrimaryPress({ pointerType: 'pen', button: 0 })).toBe(true);
    expect(isPrimaryPress({ pointerType: 'mouse', button: 0 })).toBe(true);
    expect(isPrimaryPress({ pointerType: 'mouse', button: 2 })).toBe(false);
  });
});

describe('index.html の十字キー', () => {

  it('腕は data-dir を持ち、指を受けない（十字キー全体で受ける）', () => {
    for (const dir of ['up', 'down', 'left', 'right']) expect(html).toContain(`data-dir="${dir}"`);
    expect(html).not.toMatch(/data-key="(up|down|left|right)"/);
    expect(html).toMatch(/\.dpad \.btn \{[^}]*pointer-events: none/);
  });

  it('十字キーとボタンで、スクロール・文字の選択・長押しのメニューを切る', () => {
    for (const sel of ['\\.dpad', '\\.btn']) {
      const rule = html.match(new RegExp(`\\n\\s*${sel} \\{([^}]*)\\}`))?.[1] ?? '';
      expect(rule, sel).toContain('touch-action: none');
      expect(rule, sel).toContain('-webkit-user-select: none');
      expect(rule, sel).toContain('-webkit-touch-callout: none');
    }
  });
});

describe('padSink / bindButton', () => {
  it('十字キーの向きを pad の held と「押した瞬間」に伝える', () => {
    const held = new Set<Facing>();
    const pressed: Facing[] = [];
    const dpad = new FakeDpad();
    bindDpad(dpad, padSink({ held, press: (k) => pressed.push(k) }), new EventTarget());
    pointer(dpad, 'pointerdown', { x: 140 });
    pointer(dpad, 'pointermove', { y: 150, x: 100 });
    expect([...held]).toEqual(['down']);
    expect(pressed).toEqual(['right', 'down']);
    pointer(dpad, 'pointerup');
    expect(held.size).toBe(0);
  });

  it('ボタンは押した瞬間を伝えて光り、離すと消える。右クリックは無視し、タッチの既定の動作を止める', () => {
    const classes = new Set<string>();
    const el = Object.assign(new EventTarget(), { classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } });
    let presses = 0;
    bindButton(el, () => presses++);
    pointer(el, 'pointerdown', { pointerType: 'mouse', button: 2 });
    expect(presses).toBe(0);
    expect(pointer(el, 'pointerdown')).toBe(true);
    expect(presses).toBe(1);
    expect(classes.has('active')).toBe(true);
    for (const release of ['pointerup', 'pointercancel', 'pointerleave']) {
      classes.add('active');
      pointer(el, release);
      expect(classes.has('active'), release).toBe(false);
    }
    const e = new Event('touchstart', { cancelable: true });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});
