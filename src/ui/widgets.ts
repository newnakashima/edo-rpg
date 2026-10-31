import Phaser from 'phaser';
import { COLORS, textStyle } from './theme';
import type { Controls } from './input';

/** 黒地に生成りの縁のウィンドウ。 */
export function drawWindow(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.windowFill, 0.94);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, COLORS.windowBorder, 1);
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  return g;
}

/** ページ送りのメッセージウィンドウ。決定ボタンで次のページへ進む。 */
export class MessageWindow {
  private readonly container: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Text;
  private pages: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    const bg = drawWindow(scene, x, y, w, h);
    this.text = scene.add.text(x + 8, y + 6, '', { ...textStyle(11), wordWrap: { width: w - 16, useAdvancedWrap: true }, lineSpacing: 3 });
    this.arrow = scene.add.text(x + w - 14, y + h - 14, '▼', textStyle(8, COLORS.accent));
    this.container = scene.add.container(0, 0, [bg, this.text, this.arrow]).setScrollFactor(0).setDepth(100).setVisible(false);
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  show(pages: string[], onDone?: () => void): void {
    this.pages = pages.length > 0 ? pages : [''];
    this.index = 0;
    this.onDone = onDone ?? null;
    this.text.setText(this.pages[0] ?? '');
    this.container.setVisible(true);
  }

  /** 決定ボタンが押されたら呼ぶ。最後のページなら閉じて onDone を呼ぶ。 */
  advance(): void {
    if (!this.isOpen) return;
    this.index++;
    if (this.index < this.pages.length) {
      this.text.setText(this.pages[this.index] ?? '');
      return;
    }
    this.container.setVisible(false);
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  update(controls: Controls): void {
    if (this.isOpen && controls.okPressed()) this.advance();
  }

  destroy(): void {
    this.container.destroy();
  }
}

export interface MenuItem {
  label: string;
  /** 右寄せで出す補足（消費 MP、個数など）。 */
  note?: string;
  enabled?: boolean;
}

/** Menu の 1 行の高さ。 */
export const MENU_LINE_HEIGHT = 15;

/** n 行の Menu の高さ。 */
export function menuHeight(n: number): number {
  return n * MENU_LINE_HEIGHT + 10;
}

/** 縦に並んだ選択肢。上下で選び、決定で onSelect、取消で onCancel。 */
export class Menu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly cursor: Phaser.GameObjects.Text;
  private cursorIndex = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    private readonly items: MenuItem[],
    private readonly onSelect: (index: number) => void,
    private readonly onCancel?: () => void,
    /** カーソルが動いたとき（最初の表示を含む）に呼ぶ。説明文の表示などに使う。 */
    private readonly onMove?: (index: number) => void,
  ) {
    const lineH = MENU_LINE_HEIGHT;
    const bg = drawWindow(scene, x, y, width, menuHeight(items.length));
    this.labels = items.map((item, i) =>
      scene.add.text(x + 16, y + 5 + i * lineH, item.label, textStyle(11, item.enabled === false ? COLORS.dim : COLORS.text)),
    );
    const notes = items.flatMap((item, i) =>
      item.note === undefined
        ? []
        : [scene.add.text(x + width - 8, y + 5 + i * lineH, item.note, textStyle(11, item.enabled === false ? COLORS.dim : COLORS.text)).setOrigin(1, 0)],
    );
    this.cursor = scene.add.text(x + 5, y + 5, '▶', textStyle(9, COLORS.accent));
    this.container = scene.add.container(0, 0, [bg, ...this.labels, ...notes, this.cursor]).setScrollFactor(0).setDepth(110);
    this.labels.forEach((label, i) => {
      label.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.moveTo(i);
        this.confirm();
      });
    });
    this.moveTo(0);
  }

  get selected(): number {
    return this.cursorIndex;
  }

  private moveTo(i: number): void {
    this.cursorIndex = (i + this.items.length) % this.items.length;
    const label = this.labels[this.cursorIndex];
    if (label) this.cursor.setY(label.y + 1);
    this.onMove?.(this.cursorIndex);
  }

  private confirm(): void {
    if (this.items[this.cursorIndex]?.enabled === false) return;
    this.onSelect(this.cursorIndex);
  }

  update(controls: Controls): void {
    const dir = controls.pressedDirection();
    if (dir === 'up') this.moveTo(this.cursorIndex - 1);
    if (dir === 'down') this.moveTo(this.cursorIndex + 1);
    if (controls.okPressed()) this.confirm();
    else if (controls.cancelPressed()) this.onCancel?.();
  }

  destroy(): void {
    this.container.destroy();
  }
}
