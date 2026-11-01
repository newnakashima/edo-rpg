import Phaser from 'phaser';
import { FACE_MARGIN, messageTextLayout, TEXT_PADDING } from './messageLayout';
import { scrollOffset, wrapIndex } from './menuScroll';
import { COLORS, textStyle } from './theme';
import { CURSOR_SCALE, CURSOR_TEXTURE, ICON_SCALE, ICON_TEXTURE, iconFrame, WINDOW_SLICES, WINDOW_TEXTURE, windowSliceRects, type IconName } from './uiImages';
import type { Controls } from './input';

/**
 * 藍の地に生成りの縁と金の角金具のウィンドウ（public/assets/ui/window.png を 9 分割して並べる）。
 * 四隅は元の大きさのまま、辺と中央は引き伸ばす（縁の断面はどこも同じなので、伸ばしても柄は崩れない）。
 * 縁の太さは WINDOW_CORNER（4）。地は不透明（以前の Graphics の窓は 94% で、背景が少し透けていた）。
 */
export function drawWindow(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
  const rects = windowSliceRects(w, h);
  const parts = WINDOW_SLICES.map((name) => {
    const r = rects[name];
    return scene.add.image(r.x, r.y, WINDOW_TEXTURE, name).setOrigin(0, 0).setDisplaySize(r.w, r.h);
  });
  return scene.add.container(x, y, parts);
}

/**
 * ページ送りのメッセージウィンドウ。決定ボタンで次のページへ進む。
 * faceOf を渡すと、ページごとに顔のテクスチャのキーを引き、あれば左に顔を出して文字を右へずらす。
 */
export class MessageWindow {
  private readonly container: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Text;
  private readonly face: Phaser.GameObjects.Image | null;
  private readonly x: number;
  private readonly w: number;
  private readonly faceOf: ((page: string) => string | undefined) | undefined;
  private pages: string[] = [];
  private index = 0;
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, faceOf?: (page: string) => string | undefined) {
    this.x = x;
    this.w = w;
    this.faceOf = faceOf;
    const bg = drawWindow(scene, x, y, w, h);
    this.text = scene.add.text(x + TEXT_PADDING, y + 6, '', { ...textStyle(11), wordWrap: { width: w - TEXT_PADDING * 2, useAdvancedWrap: true }, lineSpacing: 3 });
    this.arrow = scene.add.text(x + w - 14, y + h - 14, '▼', textStyle(8, COLORS.accent));
    // 顔はウィンドウの縦の中央に置く（フィールドの高さ 58 なら、縁 4 の内側 50 に 48 の顔が収まり、上下に 1 ずつ空く）
    this.face = faceOf ? scene.add.image(x + FACE_MARGIN, y + Math.floor(h / 2), '__DEFAULT').setOrigin(0, 0.5).setVisible(false) : null;
    const parts: Phaser.GameObjects.GameObject[] = [bg, this.text, this.arrow];
    if (this.face) parts.push(this.face);
    this.container = scene.add.container(0, 0, parts).setScrollFactor(0).setDepth(100).setVisible(false);
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  show(pages: string[], onDone?: () => void): void {
    this.pages = pages.length > 0 ? pages : [''];
    this.index = 0;
    this.onDone = onDone ?? null;
    this.showPage(this.pages[0] ?? '');
    this.container.setVisible(true);
  }

  /** 決定ボタンが押されたら呼ぶ。最後のページなら閉じて onDone を呼ぶ。 */
  advance(): void {
    if (!this.isOpen) return;
    this.index++;
    if (this.index < this.pages.length) {
      this.showPage(this.pages[this.index] ?? '');
      return;
    }
    this.container.setVisible(false);
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  private showPage(page: string): void {
    const key = this.faceOf?.(page);
    const hasFace = !!this.face && key !== undefined && this.face.scene.textures.exists(key);
    if (hasFace) this.face!.setTexture(key);
    this.face?.setVisible(hasFace);
    const { left, wrapWidth } = messageTextLayout(this.w, hasFace ? this.face!.width : undefined);
    this.text.setX(this.x + left);
    this.text.setWordWrapWidth(wrapWidth, true);
    this.text.setText(page);
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
  /** 名前の左に出すアイコン（道具・装備品・技）。1 つでもあれば、全部の行の名前をアイコンの分だけ右へずらす。 */
  icon?: IconName;
}

/** Menu の名前の左端（窓の左端から。カーソルの扇子の右）。 */
export const MENU_LABEL_LEFT = 16;
/** アイコンを出すときに名前をずらす幅（アイコン約 11 px と間 2 px）。 */
export const MENU_ICON_SPACE = 13;

/** アイコン（1/3 で表示）。x, y は左端と縦の中央。 */
export function addIcon(scene: Phaser.Scene, x: number, y: number, name: IconName): Phaser.GameObjects.Image {
  return scene.add.image(x, y, ICON_TEXTURE, iconFrame(name)).setOrigin(0, 0.5).setScale(ICON_SCALE);
}

/** Menu の 1 行の高さ。 */
export const MENU_LINE_HEIGHT = 15;

/** n 行の Menu の高さ。 */
export function menuHeight(n: number): number {
  return n * MENU_LINE_HEIGHT + 10;
}

/** 縦 top〜bottom の間に収まる Menu の行数（長い一覧はこの行数だけ見せてずらす）。 */
export function maxMenuRows(top: number, bottom: number): number {
  return Math.max(1, Math.floor((bottom - top - menuHeight(0)) / MENU_LINE_HEIGHT));
}

/** 縦に並んだ選択肢。上下で選び、決定で onSelect、取消で onCancel。 */
export class Menu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly notes: (Phaser.GameObjects.Text | undefined)[];
  private readonly icons: (Phaser.GameObjects.Image | undefined)[];
  private readonly cursor: Phaser.GameObjects.Image;
  private readonly moreUp: Phaser.GameObjects.Text;
  private readonly moreDown: Phaser.GameObjects.Text;
  /** 一度に見せる行数。項目がこれより多いときは、カーソルに合わせてずらして見せる。 */
  private readonly rows: number;
  private readonly top: number;
  private cursorIndex = 0;
  /** 見せている先頭の項目。 */
  private offset = 0;
  /** 上に別のメニューが重なっている間は false（クリックも受け付けない）。 */
  private active = true;

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
    /** 一度に見せる最大の行数（省くとすべて）。 */
    maxRows = Infinity,
  ) {
    this.rows = Math.max(1, Math.min(items.length, maxRows));
    this.top = y;
    const bg = drawWindow(scene, x, y, width, menuHeight(this.rows));
    const labelX = x + MENU_LABEL_LEFT + (items.some((item) => item.icon) ? MENU_ICON_SPACE : 0);
    this.labels = items.map((item) => scene.add.text(labelX, y, item.label, textStyle(11, item.enabled === false ? COLORS.dim : COLORS.text)));
    // 選べない行のアイコンは、文字と同じく薄くする
    this.icons = items.map((item) => (item.icon ? addIcon(scene, x + MENU_LABEL_LEFT, y, item.icon).setAlpha(item.enabled === false ? 0.5 : 1) : undefined));
    this.notes = items.map((item) =>
      item.note === undefined
        ? undefined
        : scene.add.text(x + width - 8, y, item.note, textStyle(11, item.enabled === false ? COLORS.dim : COLORS.text)).setOrigin(1, 0),
    );
    this.cursor = scene.add.image(x + 4, y, CURSOR_TEXTURE).setOrigin(0, 0.5).setScale(CURSOR_SCALE);
    this.moreUp = scene.add.text(x + width / 2, y - 2, '▲', textStyle(8, COLORS.accent)).setOrigin(0.5, 0);
    this.moreDown = scene.add.text(x + width / 2, y + menuHeight(this.rows) - 9, '▼', textStyle(8, COLORS.accent)).setOrigin(0.5, 0);
    const notes = this.notes.filter((n): n is Phaser.GameObjects.Text => n !== undefined);
    const icons = this.icons.filter((n): n is Phaser.GameObjects.Image => n !== undefined);
    this.container = scene.add
      .container(0, 0, [bg, ...this.labels, ...notes, ...icons, this.cursor, this.moreUp, this.moreDown])
      .setScrollFactor(0)
      .setDepth(110);
    this.labels.forEach((label, i) => {
      label.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (!this.active || !label.visible) return;
        this.moveTo(i);
        this.confirm();
      });
    });
    this.moveTo(0);
  }

  get selected(): number {
    return this.cursorIndex;
  }

  /** 上に別のメニューを重ねるときは false、戻ってきたら true にする。 */
  setActive(active: boolean): void {
    this.active = active;
  }

  /** 今のカーソル位置で onMove を呼び直す（戻ってきたときに説明を出し直す）。 */
  refresh(): void {
    this.onMove?.(this.cursorIndex);
  }

  /** カーソルを i 番目に置く（開き直したときに元の位置へ戻すなど）。 */
  select(i: number): void {
    this.moveTo(Math.max(0, Math.min(i, this.items.length - 1)));
  }

  private layout(): void {
    this.labels.forEach((label, i) => {
      const row = i - this.offset;
      const visible = row >= 0 && row < this.rows;
      const y = this.top + 5 + row * MENU_LINE_HEIGHT;
      label.setVisible(visible).setY(y);
      this.notes[i]?.setVisible(visible).setY(y);
      this.icons[i]?.setVisible(visible).setY(Math.round(y + label.height / 2));
    });
    this.moreUp.setVisible(this.offset > 0);
    this.moreDown.setVisible(this.offset + this.rows < this.items.length);
  }

  private moveTo(i: number): void {
    if (this.items.length === 0) return;
    this.cursorIndex = wrapIndex(i, this.items.length);
    this.offset = scrollOffset(this.cursorIndex, this.offset, this.rows, this.items.length);
    this.layout();
    const label = this.labels[this.cursorIndex];
    // 文字の行（高さ約 15）の縦の中央に扇子を置く
    if (label) this.cursor.setY(Math.round(label.y + label.height / 2));
    this.onMove?.(this.cursorIndex);
  }

  private confirm(): void {
    if (this.items[this.cursorIndex]?.enabled === false) return;
    this.onSelect(this.cursorIndex);
  }

  update(controls: Controls): void {
    if (!this.active) return;
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
