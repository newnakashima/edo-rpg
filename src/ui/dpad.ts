// 仮想パッドの十字キーで、指の位置から向きを決める（DOM と Phaser に依存しない部分）。
import type { Facing } from '../systems/gameState';

/** 十字キーの中心からこの距離（px）より内側では、向きを決めない（押し始めは何も押さず、滑らせている途中は今の向きのまま）。 */
export const DPAD_DEAD_ZONE = 10;

/**
 * 十字キーの中心から指までのずれ（dx は右、dy は下が正）を向きにする。
 * 上下左右の 4 つの扇形に分けるので、腕と腕の間（斜め）にも隙間がなく、縦と横のずれの大きいほうの向きになる。
 */
export function directionFromOffset(dx: number, dy: number, deadZone = DPAD_DEAD_ZONE): Facing | null {
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * 十字キーを押している指を 1 本だけ追い、指の位置から向きを決める。
 * 押したまま隣の腕へ滑らせると、止まらずに新しい向きに切り替わる。
 */
export class DpadTracker {
  private pointerId: number | null = null;
  private dir: Facing | null = null;

  /** 向きが変わったときに呼ぶ（prev は離す向き、next は押す向き。どちらも null がありうる）。 */
  constructor(
    private readonly onChange: (prev: Facing | null, next: Facing | null) => void,
    private readonly deadZone = DPAD_DEAD_ZONE,
  ) {}

  get direction(): Facing | null {
    return this.dir;
  }

  /** 指が触れた。別の指で押していたら、新しい指に持ち替える。 */
  start(pointerId: number, dx: number, dy: number): void {
    this.pointerId = pointerId;
    this.set(directionFromOffset(dx, dy, this.deadZone));
  }

  /** 指が動いた。中心の近くでは今の向きを保つ（中心をまたぐときに一瞬止まらない）。 */
  move(pointerId: number, dx: number, dy: number): void {
    if (pointerId !== this.pointerId) return;
    const next = directionFromOffset(dx, dy, this.deadZone);
    if (next) this.set(next);
  }

  /** 指が離れた（または取り消された）。 */
  end(pointerId: number): void {
    if (pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.set(null);
  }

  /** 指の有無にかかわらず離す（タブの切り替えなど）。 */
  reset(): void {
    this.pointerId = null;
    this.set(null);
  }

  private set(next: Facing | null): void {
    if (next === this.dir) return;
    const prev = this.dir;
    this.dir = next;
    this.onChange(prev, next);
  }
}
