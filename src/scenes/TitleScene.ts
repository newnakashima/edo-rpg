import Phaser from 'phaser';
import { Controls } from '../ui/input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { Menu } from '../ui/widgets';
import { browserStorage, listSlots } from '../systems/save';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { setPendingEvent, setState } from '../state';
import { playBgm } from '../systems/audio';

export class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private active: { update(c: Controls): void; destroy(): void } | null = null;

  constructor() {
    super('Title');
  }

  create(): void {
    // 前のゲームの途中のイベントを持ち越さない
    setPendingEvent(null);
    setupCamera(this);
    playBgm('bgm_title');
    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor('#141420');
    // 富士と街道の仮の背景
    const g = this.add.graphics();
    g.fillStyle(0x2a3a5a, 1);
    g.fillTriangle(GAME_WIDTH / 2 - 120, 150, GAME_WIDTH / 2 + 120, 150, GAME_WIDTH / 2, 50);
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(GAME_WIDTH / 2 - 30, 73, GAME_WIDTH / 2 + 30, 73, GAME_WIDTH / 2, 50);
    g.fillStyle(0x2f4a2e, 1);
    g.fillRect(0, 150, GAME_WIDTH, GAME_HEIGHT - 150);
    g.fillStyle(0xc8ad78, 1);
    g.fillTriangle(GAME_WIDTH / 2 - 6, 150, GAME_WIDTH / 2 + 6, 150, GAME_WIDTH / 2 + 60, GAME_HEIGHT);
    g.fillTriangle(GAME_WIDTH / 2 - 6, 150, GAME_WIDTH / 2 + 60, GAME_HEIGHT, GAME_WIDTH / 2 - 30, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 28, '江戸からくり渡世録', textStyle(22, COLORS.text)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 50, '― 試作版 ―', textStyle(9, COLORS.dim)).setOrigin(0.5);

    this.openMain();
  }

  private openMain(): void {
    this.active?.destroy();
    const storage = browserStorage();
    const hasSave = storage !== null && listSlots(storage).some((s) => s.status === 'ok');
    this.active = new Menu(
      this,
      GAME_WIDTH / 2 - 50,
      150,
      100,
      [{ label: 'はじめから' }, { label: 'つづきから', enabled: hasSave }],
      (i) => {
        if (i === 0) this.scene.start('CharacterSelect');
        else this.openLoad();
      },
    );
  }

  private openLoad(): void {
    const storage = browserStorage();
    if (!storage) return;
    // 元のメニューは閉じる（タップで裏のメニューが選ばれないように）
    this.active?.destroy();
    this.controls.flush();
    this.active = new SaveSlotMenu(this, storage, 'load', (result) => {
      if (result.kind !== 'loaded') {
        this.openMain();
        return;
      }
      setState(result.data.state);
      this.scene.start('Field');
    });
  }

  update(): void {
    this.active?.update(this.controls);
  }
}
