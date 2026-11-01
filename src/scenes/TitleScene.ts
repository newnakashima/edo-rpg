import Phaser from 'phaser';
import { Controls } from '../ui/input';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { SUBTITLE_TEXT, TITLE_TEXT, TITLE_TEXTURE } from '../ui/uiImages';
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
    // 富士と街道の松並木（public/assets/ui/title.png。題字・副題は無地の藍の空の帯 TITLE_SKY_BAND に置く）
    this.add.image(0, 0, TITLE_TEXTURE).setOrigin(0, 0);

    this.add.text(GAME_WIDTH / 2, TITLE_TEXT.y, '江戸からくり渡世録', textStyle(TITLE_TEXT.size, COLORS.text)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, SUBTITLE_TEXT.y, '― 試作版 ―', textStyle(SUBTITLE_TEXT.size, COLORS.dim)).setOrigin(0.5);

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
