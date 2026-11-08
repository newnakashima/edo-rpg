// キーボードと画面上の仮想パッド（DOM のボタン）の入力をまとめる。
import Phaser from 'phaser';
import type { Facing } from '../systems/gameState';
import { DpadTracker } from './dpad';

export type Button = 'ok' | 'cancel';

/** 仮想パッドの状態。DOM のイベントで更新し、シーンから読む。 */
class PadState {
  readonly held = new Set<Facing>();
  private readonly pressed = new Set<Button | Facing>();

  press(key: Button | Facing): void {
    this.pressed.add(key);
  }

  /** 押された瞬間を 1 回だけ取り出す。 */
  consume(key: Button | Facing): boolean {
    return this.pressed.delete(key);
  }

  clear(): void {
    this.held.clear();
    this.pressed.clear();
  }

  clearPressed(): void {
    this.pressed.clear();
  }
}

export const pad = new PadState();

const DIRECTIONS: Facing[] = ['up', 'down', 'left', 'right'];

/** 押す・離すのイベントで、ブラウザの既定の動作（iOS の長押しの虫眼鏡・文字の選択・メニュー）を止める。 */
function blockDefaults(el: HTMLElement): void {
  const block = (e: Event) => e.preventDefault();
  // iOS の虫眼鏡は pointerdown の preventDefault では止まらないので、touchstart でも止める（pointer のイベントは届き続ける）
  for (const type of ['touchstart', 'touchmove', 'touchend', 'contextmenu', 'selectstart']) {
    el.addEventListener(type, block, { passive: false });
  }
}

/** 十字キーの全体で指を受け、指の位置から向きを決める。 */
function bindDpad(dpad: HTMLElement): void {
  const arms = new Map<Facing, HTMLElement>();
  for (const el of Array.from(dpad.querySelectorAll<HTMLElement>('[data-dir]'))) arms.set(el.dataset.dir as Facing, el);
  const tracker = new DpadTracker((prev, next) => {
    if (prev) {
      pad.held.delete(prev);
      arms.get(prev)?.classList.remove('active');
    }
    if (next) {
      pad.held.add(next);
      pad.press(next);
      arms.get(next)?.classList.add('active');
    }
  });
  const offset = (e: PointerEvent): [number, number] => {
    const r = dpad.getBoundingClientRect();
    return [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)];
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // 指が十字キーの外へ出ても追い続ける
    dpad.setPointerCapture?.(e.pointerId);
    tracker.start(e.pointerId, ...offset(e));
  });
  dpad.addEventListener('pointermove', (e) => tracker.move(e.pointerId, ...offset(e)));
  const up = (e: PointerEvent) => tracker.end(e.pointerId);
  dpad.addEventListener('pointerup', up);
  dpad.addEventListener('pointercancel', up);
  dpad.addEventListener('lostpointercapture', up);
  blockDefaults(dpad);
  window.addEventListener('blur', () => tracker.reset());
}

/** index.html の #pad の十字キーとボタンに、押下・離しのイベントをつなぐ。 */
export function bindVirtualPad(root: HTMLElement): void {
  const dpad = root.querySelector<HTMLElement>('.dpad');
  if (dpad) bindDpad(dpad);
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-key]'))) {
    const key = el.dataset.key as Button;
    const down = (e: Event) => {
      e.preventDefault();
      el.classList.add('active');
      pad.press(key);
    };
    const up = (e: Event) => {
      e.preventDefault();
      el.classList.remove('active');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    blockDefaults(el);
  }
  // タブを切り替えたときに押しっぱなしにならないようにする
  window.addEventListener('blur', () => pad.clear());
}

const KEY_MAP: Record<string, Button | Facing> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyZ: 'ok',
  Enter: 'ok',
  NumpadEnter: 'ok',
  Space: 'ok',
  KeyX: 'cancel',
  Escape: 'cancel',
};

/**
 * シーンごとに作る入力。キーボードと仮想パッドを区別せずに読む。
 * 押された瞬間は keydown イベントで溜めておく（同じフレームで押して離しても取りこぼさない）。
 */
export class Controls {
  private readonly held = new Set<Facing>();
  private readonly pressed = new Set<Button | Facing>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('keyboard plugin is not available');
    const onDown = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (!key) return;
      e.preventDefault();
      if ((DIRECTIONS as string[]).includes(key)) this.held.add(key as Facing);
      // 決定・取消の押しっぱなしによる連打は受け付けない（方向はメニューのカーソル送りのために受け付ける）
      if (e.repeat && (key === 'ok' || key === 'cancel')) return;
      this.pressed.add(key);
    };
    const onUp = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (key && (DIRECTIONS as string[]).includes(key)) this.held.delete(key as Facing);
    };
    const onBlur = () => {
      this.held.clear();
      this.pressed.clear();
    };
    kb.on('keydown', onDown);
    kb.on('keyup', onUp);
    window.addEventListener('blur', onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onDown);
      kb.off('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    });
    // 前のシーンで押された入力を持ち越さない（押し続けている方向は持ち越す）
    pad.clearPressed();
  }

  /**
   * 溜まっている「押された瞬間」の入力を捨てる。メニューを開くときや演出の後に呼び、
   * 歩いている間や演出中に押した入力でカーソルが動いたり選択されたりしないようにする。
   */
  flush(): void {
    this.pressed.clear();
    pad.clearPressed();
  }

  private consume(key: Button | Facing): boolean {
    // 両方から取り出して、片方に溜まり続けないようにする
    const fromKeys = this.pressed.delete(key);
    const fromPad = pad.consume(key);
    return fromKeys || fromPad;
  }

  /** 押し続けている方向（移動用）。 */
  heldDirection(): Facing | null {
    return DIRECTIONS.find((d) => this.held.has(d) || pad.held.has(d)) ?? null;
  }

  /** 押された瞬間の方向（メニューのカーソル用）。 */
  pressedDirection(): Facing | null {
    const pressed = DIRECTIONS.filter((d) => this.consume(d));
    return pressed[0] ?? null;
  }

  okPressed(): boolean {
    return this.consume('ok');
  }

  cancelPressed(): boolean {
    return this.consume('cancel');
  }
}
