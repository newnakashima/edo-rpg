import Phaser from 'phaser';
import { ENDING_FIN } from '../data/ending';
import { setPendingEvent } from '../state';
import { Controls } from '../ui/input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';

/** 「終劇」が浮かび上がるまで（ms）。 */
const FIN_FADE = 1600;
/** 「終劇」が出始めてから、決定ボタンでタイトルへ戻れるようになるまで（ms）。最後の戦闘や台詞を送っていた入力で、「終劇」を見ずに戻らないようにする。 */
const FIN_INPUT_DELAY = 2000;

/**
 * エンディング。エンドロールは流さず、黒い画面に「終劇」とだけ出す（テストプレイの指摘）。
 * 少したってから決定ボタンを押す（画面をタップする）とタイトルへ戻る。
 */
export class EndingScene extends Phaser.Scene {
  private controls!: Controls;
  /** 決定ボタンでタイトルへ戻れるか。 */
  private canLeave = false;
  private leaving = false;

  constructor() {
    super('Ending');
  }

  create(): void {
    setPendingEvent(null);
    setupCamera(this);
    this.controls = new Controls(this);
    this.canLeave = false;
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#000000');
    const fin = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, ENDING_FIN, textStyle(24, COLORS.text)).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: fin, alpha: 1, duration: FIN_FADE });
    this.time.delayedCall(FIN_INPUT_DELAY, () => {
      this.controls.flush();
      this.canLeave = true;
    });
    // タップでもタイトルへ戻る
    this.input.on('pointerdown', () => this.leave());
  }

  private leave(): void {
    if (!this.canLeave || this.leaving) return;
    this.leaving = true;
    this.scene.start('Title');
  }

  update(): void {
    if (this.controls.okPressed()) this.leave();
  }
}
