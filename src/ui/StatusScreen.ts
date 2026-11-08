// メニューのステータス画面。仲間の立ち絵・能力値・装備・使える技を 1 枚に出す。
// 左右で仲間を替え、上下で装備・技を選ぶと、説明を下の窓に出す（説明の窓は FieldMenu が持つ）。
import Phaser from 'phaser';
import { PORTRAIT_HEIGHT, PORTRAIT_WIDTH, portraitFor, portraitKey } from '../data/portraits';
import { statusSheet, type StatusEntry } from '../systems/fieldMenu';
import { getState } from '../state';
import { SKILL_ICON, slotIcon } from './icons';
import type { Controls } from './input';
import { COLORS, GAME_WIDTH, textStyle } from './theme';
import { CURSOR_SCALE, CURSOR_TEXTURE } from './uiImages';
import { addIcon, drawWindow, MENU_ICON_SPACE } from './widgets';

const X = 8;
const Y = 8;
const W = GAME_WIDTH - 16;
/** 能力値の列。 */
const STATS_X = 96;
const STATS_VALUE_X = 192;
/** 装備・技の列。 */
const LIST_X = 206;
const LINE_H = 12;
const TOP = 32;

export class StatusScreen {
  private container: Phaser.GameObjects.Container | null = null;
  private cursor: Phaser.GameObjects.Image | null = null;
  /** カーソルを置ける行（装備、技の順）と、その縦の中央。 */
  private rows: { entry: StatusEntry; y: number }[] = [];
  private row = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /** 窓の高さ（下の説明の窓に重ならないように FieldMenu が決める）。 */
    private readonly height: number,
    private index: number,
    private readonly setInfo: (text: string) => void,
    private readonly onClose: () => void,
  ) {
    this.render();
  }

  /** 今の仲間の画面を作り直す。 */
  private render(): void {
    this.container?.destroy();
    const state = getState();
    const count = state.party.length;
    this.index = Math.max(0, Math.min(this.index, count - 1));
    const member = state.party[this.index];
    const objs: Phaser.GameObjects.GameObject[] = [drawWindow(this.scene, X, Y, W, this.height)];
    this.rows = [];
    if (!member) {
      this.container = this.scene.add.container(0, 0, objs).setScrollFactor(0).setDepth(115);
      return;
    }
    const sheet = statusSheet(member, state.gender);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      objs.push(o);
      return o;
    };
    const text = (x: number, y: number, s: string, size = 10, color: string = COLORS.text) => add(this.scene.add.text(x, y, s, textStyle(size, color)));

    // 見出し: 名前・職・レベルと、仲間を替える矢印
    const name = text(16, 13, sheet.name, 12, COLORS.accent);
    text(name.x + name.width + 8, 15, `${sheet.job}  Lv ${sheet.level}`);
    if (count > 1) {
      const right = text(X + W - 10, 14, '▶', 10, COLORS.accent).setOrigin(1, 0);
      const page = text(right.x - right.width - 4, 14, `${this.index + 1}/${count}`, 10, COLORS.dim).setOrigin(1, 0);
      const left = text(page.x - page.width - 4, 14, '◀', 10, COLORS.accent).setOrigin(1, 0);
      left.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.switchMember(-1));
      right.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.switchMember(1));
    }

    // 立ち絵
    const key = portraitKey(portraitFor(member.id, state.gender));
    if (this.scene.textures.exists(key)) add(this.scene.add.image(16 + (72 - PORTRAIT_WIDTH) / 2, TOP, key).setOrigin(0, 0));
    // 倒れている仲間は立ち絵の下に書く
    if (member.hp <= 0) text(16 + 36, TOP + PORTRAIT_HEIGHT + 4, '戦闘不能', 10, COLORS.danger).setOrigin(0.5, 0);

    // 能力値
    const statLines: [string, string, string?][] = [
      ['体力', sheet.hp, member.hp <= 0 ? COLORS.danger : undefined],
      ['気力', sheet.mp],
      ...sheet.stats.map((s): [string, string] => [s.label, String(s.value)]),
      ['経験', String(sheet.exp)],
      ['次', sheet.next === null ? '――' : String(sheet.next)],
    ];
    let y = TOP;
    statLines.forEach(([label, value, color], i) => {
      // 体力・気力、能力値、経験値の間を少し空ける
      if (i === 2 || i === 2 + sheet.stats.length) y += 6;
      text(STATS_X, y, label, 10, COLORS.dim);
      text(STATS_VALUE_X, y, value, 10, color).setOrigin(1, 0);
      y += LINE_H;
    });

    // 装備と技
    const labelX = LIST_X + 12;
    const entryLine = (entry: StatusEntry, rowY: number, icon: Parameters<typeof addIcon>[3]) => {
      add(addIcon(this.scene, labelX, rowY + 7, icon));
      const label = text(labelX + MENU_ICON_SPACE, rowY, entry.label, 10, entry.label === '――' ? COLORS.dim : COLORS.text);
      if (entry.note !== undefined) text(X + W - 10, rowY, entry.note, 10).setOrigin(1, 0);
      const rowIndex = this.rows.length;
      this.rows.push({ entry, y: rowY + 7 });
      label.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.moveTo(rowIndex));
    };
    y = TOP - 2;
    text(LIST_X, y, '装備', 10, COLORS.dim);
    y += LINE_H;
    for (const e of sheet.equipment) {
      entryLine(e, y, slotIcon(e.slot!, member.id));
      y += LINE_H;
    }
    y += 4;
    text(LIST_X, y, '技', 10, COLORS.dim);
    text(X + W - 10, y, '気力', 10, COLORS.dim).setOrigin(1, 0);
    y += LINE_H;
    if (sheet.skills.length === 0) text(labelX, y, 'まだ覚えていない', 10, COLORS.dim);
    for (const e of sheet.skills) {
      entryLine(e, y, SKILL_ICON);
      y += LINE_H;
    }

    this.cursor = add(this.scene.add.image(LIST_X, 0, CURSOR_TEXTURE).setOrigin(0, 0.5).setScale(CURSOR_SCALE));
    this.container = this.scene.add.container(0, 0, objs).setScrollFactor(0).setDepth(115);
    // 仲間を替えて行が減ったときは、いちばん下の行に置く
    this.moveTo(Math.min(this.row, this.rows.length - 1));
  }

  private moveTo(i: number): void {
    if (this.rows.length === 0) return;
    this.row = ((i % this.rows.length) + this.rows.length) % this.rows.length;
    const r = this.rows[this.row]!;
    this.cursor?.setY(r.y);
    this.setInfo(r.entry.description);
  }

  private switchMember(delta: number): void {
    const count = getState().party.length;
    if (count <= 1) return;
    this.index = (this.index + delta + count) % count;
    this.render();
  }

  update(controls: Controls): void {
    const dir = controls.pressedDirection();
    if (dir === 'left') this.switchMember(-1);
    else if (dir === 'right') this.switchMember(1);
    else if (dir === 'up') this.moveTo(this.row - 1);
    else if (dir === 'down') this.moveTo(this.row + 1);
    // 決定では何もしない（取消で戻る）
    controls.okPressed();
    if (controls.cancelPressed()) this.onClose();
  }

  destroy(): void {
    this.container?.destroy();
    this.container = null;
  }
}
