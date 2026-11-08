// 仮想パッドの十字キーとボタンの、DOM のイベントの扱い（Phaser に依存しない部分）。
import type { Facing } from '../systems/gameState';

/** 十字キーの中心からこの距離（px）より内側では、向きを決めない（押し始めは何も押さず、滑らせている途中は今の向きのまま）。 */
export const DPAD_DEAD_ZONE = 10;

/**
 * 十字キーの中心から指までのずれ（dx は右、dy は下が正）を向きにする。
 * 上下左右の 4 つの扇形に分けるので、腕と腕の間（斜め）にも隙間がなく、縦と横のずれの大きいほうの向きになる。
 * 十字の絵の外側の四隅も、同じく近いほうの腕として扱う（隙間をなくすため、わざと反応させている）。
 */
export function directionFromOffset(dx: number, dy: number, deadZone = DPAD_DEAD_ZONE): Facing | null {
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * 十字キーに触れている指を追い、指の位置から向きを決める。
 * 押したまま隣の腕へ滑らせると、止まらずに新しい向きに切り替わる。
 * 指が複数あるときは、向きの決まっている指のうち最後に触れたものに従い、その指を離すと残りの指の向きに戻る。
 */
export class DpadTracker {
  /** 触れている指ごとの向き。挿入順が触れた順。 */
  private readonly pointers = new Map<number, Facing | null>();
  private dir: Facing | null = null;

  /** 向きが変わったときに呼ぶ（prev は離す向き、next は押す向き。どちらも null がありうる）。 */
  constructor(
    private readonly onChange: (prev: Facing | null, next: Facing | null) => void,
    private readonly deadZone = DPAD_DEAD_ZONE,
  ) {}

  get direction(): Facing | null {
    return this.dir;
  }

  /** 指が触れた。 */
  start(pointerId: number, dx: number, dy: number): void {
    this.pointers.delete(pointerId);
    this.pointers.set(pointerId, directionFromOffset(dx, dy, this.deadZone));
    this.update();
  }

  /** 指が動いた。中心の近くでは今の向きを保つ（中心をまたぐときに一瞬止まらない）。 */
  move(pointerId: number, dx: number, dy: number): void {
    if (!this.pointers.has(pointerId)) return;
    const next = directionFromOffset(dx, dy, this.deadZone);
    if (!next) return;
    this.pointers.set(pointerId, next);
    this.update();
  }

  /** 指が離れた（または取り消された）。 */
  end(pointerId: number): void {
    if (!this.pointers.delete(pointerId)) return;
    this.update();
  }

  /** 指の有無にかかわらず離す（タブの切り替えなど）。 */
  reset(): void {
    this.pointers.clear();
    this.update();
  }

  private update(): void {
    let next: Facing | null = null;
    for (const d of this.pointers.values()) if (d) next = d;
    if (next === this.dir) return;
    const prev = this.dir;
    this.dir = next;
    this.onChange(prev, next);
  }
}

/** 押す・離すのイベントで、ブラウザの既定の動作を止める。十字キーにも決定・取消のボタンにも使う。 */
export const BLOCKED_DEFAULTS = ['touchstart', 'touchmove', 'touchend', 'contextmenu', 'selectstart'] as const;

/**
 * iOS の長押しの虫眼鏡・文字の選択・メニューを止める。
 * 虫眼鏡は pointerdown の preventDefault では止まらないので、touchstart でも止める（pointer のイベントは先に届くので操作は変わらない）。
 * touchend を止めると互換の click も出なくなるが、仮想パッドは pointer のイベントだけで動くので困らない。
 */
export function blockDefaults(el: EventTarget): void {
  const block = (e: Event) => e.preventDefault();
  for (const type of BLOCKED_DEFAULTS) el.addEventListener(type, block, { passive: false });
}

/** マウスの左ボタン以外（右クリック・ホイール押し）は、仮想パッドの操作として扱わない。 */
export function isPrimaryPress(e: Pick<PointerEvent, 'pointerType' | 'button'>): boolean {
  return e.pointerType !== 'mouse' || e.button === 0;
}

/** bindDpad が使う、十字キーの要素の性質。 */
export interface DpadElement extends EventTarget {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  querySelectorAll(selector: string): ArrayLike<{ dataset: { dir?: string }; classList: { add(c: string): void; remove(c: string): void } }>;
  setPointerCapture?(pointerId: number): void;
}

/** 向きを押す・離すときに呼ぶ処理。 */
export interface DpadSink {
  hold(dir: Facing): void;
  release(dir: Facing): void;
}

/**
 * 十字キーの全体で指を受け、指の位置から向きを決める。腕（data-dir）は光らせるだけで、指は受けない（CSS で pointer-events: none）。
 * blurTarget の blur で、押しっぱなしにならないように離す。
 */
export function bindDpad(dpad: DpadElement, sink: DpadSink, blurTarget: EventTarget): DpadTracker {
  const arms = new Map<string, { classList: { add(c: string): void; remove(c: string): void } }>();
  for (const el of Array.from(dpad.querySelectorAll('[data-dir]'))) {
    if (el.dataset.dir) arms.set(el.dataset.dir, el);
  }
  const tracker = new DpadTracker((prev, next) => {
    if (prev) {
      sink.release(prev);
      arms.get(prev)?.classList.remove('active');
    }
    if (next) {
      sink.hold(next);
      arms.get(next)?.classList.add('active');
    }
  });
  const offset = (e: PointerEvent): [number, number] => {
    const r = dpad.getBoundingClientRect();
    return [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)];
  };
  dpad.addEventListener('pointerdown', (ev) => {
    const e = ev as PointerEvent;
    e.preventDefault();
    if (!isPrimaryPress(e)) return;
    // 指が十字キーの外へ出ても追い続ける
    dpad.setPointerCapture?.(e.pointerId);
    tracker.start(e.pointerId, ...offset(e));
  });
  dpad.addEventListener('pointermove', (ev) => {
    const e = ev as PointerEvent;
    tracker.move(e.pointerId, ...offset(e));
  });
  const up = (ev: Event) => tracker.end((ev as PointerEvent).pointerId);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(type, up);
  blockDefaults(dpad);
  blurTarget.addEventListener('blur', () => tracker.reset());
  return tracker;
}

/** 押された向きを溜めるところ（input.ts の pad）。 */
export interface PadLike {
  readonly held: Set<Facing>;
  press(key: Facing): void;
}

/** 十字キーの向きを pad に伝える。押した瞬間（滑らせて変えたときも）はメニューのカーソル送りにも使う。 */
export function padSink(pad: PadLike): DpadSink {
  return {
    hold: (dir) => {
      pad.held.add(dir);
      pad.press(dir);
    },
    release: (dir) => pad.held.delete(dir),
  };
}

/** bindButton が使う、ボタンの要素の性質。 */
export interface ButtonElement extends EventTarget {
  classList: { add(c: string): void; remove(c: string): void };
}

/** 決定・取消のボタンに、押下・離しのイベントをつなぐ。押している間は光らせる。 */
export function bindButton(el: ButtonElement, onPress: () => void): void {
  el.addEventListener('pointerdown', (ev) => {
    const e = ev as PointerEvent;
    e.preventDefault();
    if (!isPrimaryPress(e)) return;
    el.classList.add('active');
    onPress();
  });
  const up = (e: Event) => {
    e.preventDefault();
    el.classList.remove('active');
  };
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(type, up);
  blockDefaults(el);
}
