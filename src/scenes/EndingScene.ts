import Phaser from 'phaser';
import { ENDING_FIN, ENDING_ROLL } from '../data/ending';
import { setPendingEvent } from '../state';
import { Controls } from '../ui/input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';

/** 1 行の高さ（px）。 */
const LINE_HEIGHT = 16;
/** 流れる速さ（px / 秒）。決定ボタンを押している間は速くする。 */
const SCROLL_SPEED = 18;
const FAST_SCROLL_SPEED = 90;

/**
 * エンディング。仲間たちの行く末と、力を貸してくれた人々を下から上へ流し、最後に「完」を出す。
 * 流れている間に決定ボタンを押すと速く流れ、「完」が出たあとに決定ボタンを押すとタイトルへ戻る。
 */
export class EndingScene extends Phaser.Scene {
  private controls!: Controls;
  private roll!: Phaser.GameObjects.Container;
  private rollHeight = 0;
  private finished = false;
  private fast = false;

  constructor() {
    super('Ending');
  }

  create(): void {
    setPendingEvent(null);
    setupCamera(this);
    this.controls = new Controls(this);
    this.finished = false;
    this.fast = false;
    this.cameras.main.setBackgroundColor('#0d0d14');
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.roll = this.add.container(0, GAME_HEIGHT);
    ENDING_ROLL.forEach((line, i) => {
      const title = i === 0;
      const heading = line.startsWith('―');
      const style = textStyle(title ? 18 : 11, title || heading ? COLORS.accent : COLORS.text);
      this.roll.add(this.add.text(GAME_WIDTH / 2, i * LINE_HEIGHT, line, style).setOrigin(0.5, 0));
    });
    this.rollHeight = ENDING_ROLL.length * LINE_HEIGHT;
    // タップでも速く流す・タイトルへ戻る
    this.input.on('pointerdown', () => this.onOk());
  }

  private onOk(): void {
    if (this.finished) this.scene.start('Title');
    else this.fast = true;
  }

  private showFin(): void {
    this.finished = true;
    this.roll.setVisible(false);
    const fin = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, ENDING_FIN, textStyle(20, COLORS.text)).setOrigin(0.5).setAlpha(0);
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '決定でタイトルへ', textStyle(9, COLORS.dim)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [fin, hint], alpha: 1, duration: 1200 });
    this.controls.flush();
  }

  update(_time: number, delta: number): void {
    if (this.controls.okPressed()) this.onOk();
    if (this.finished) return;
    const speed = this.fast ? FAST_SCROLL_SPEED : SCROLL_SPEED;
    this.roll.y -= (speed * delta) / 1000;
    // 最後の行が画面の上へ抜けたら「完」
    if (this.roll.y + this.rollHeight < 0) this.showFin();
  }
}
