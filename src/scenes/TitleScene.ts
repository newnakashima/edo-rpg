import Phaser from 'phaser';
import { Controls } from '../ui/input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { SUBTITLE_TEXT, TITLE_TEXT, TITLE_TEXTURE } from '../ui/uiImages';
import { Menu, MessageWindow } from '../ui/widgets';
import { browserStorage, exportFileName, exportText, importText, listSlots, writeSaveData, type SaveData } from '../systems/save';
import { downloadText, pickTextFile } from '../ui/saveFile';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { setPendingEvent, setState } from '../state';
import { playBgm } from '../systems/audio';

export class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private active: { update(c: Controls): void; destroy(): void } | null = null;
  private message!: MessageWindow;
  /** ファイルを選ぶたびに増やす。前に開いた選ぶ画面の結果が遅れて届いても無視する。 */
  private pickId = 0;

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

    this.message = new MessageWindow(this, 8, GAME_HEIGHT - 66, GAME_WIDTH - 16, 58);
    this.openMain();
  }

  private openMain(select = 0): void {
    this.active?.destroy();
    this.controls.flush();
    const storage = browserStorage();
    const hasSave = storage !== null && listSlots(storage).some((s) => s.status === 'ok');
    const menu = new Menu(
      this,
      GAME_WIDTH / 2 - 60,
      140,
      120,
      [{ label: 'はじめから' }, { label: 'つづきから', enabled: hasSave }, { label: '記録のファイル', enabled: storage !== null }],
      (i) => {
        if (i === 0) this.scene.start('CharacterSelect');
        else if (i === 1) this.openLoad();
        else this.openFileMenu();
      },
    );
    menu.select(select);
    this.active = menu;
  }

  /** 結果を知らせてから、タイトルのメニュー（記録のファイルの行）へ戻る。 */
  private notify(pages: string[]): void {
    this.active?.destroy();
    this.active = null;
    this.controls.flush();
    this.message.show(pages, () => this.openMain(2));
  }

  /**
   * 記録をファイルに書き出す・ファイルから読み込む。ブラウザのデータを消すと記録も消えるので、手元にファイルで残せるようにする。
   */
  private openFileMenu(select = 0): void {
    const storage = browserStorage();
    if (!storage) return;
    this.active?.destroy();
    this.controls.flush();
    const hasSave = listSlots(storage).some((s) => s.status === 'ok');
    const menu = new Menu(
      this,
      GAME_WIDTH / 2 - 70,
      140,
      140,
      [{ label: 'ファイルに書き出す', enabled: hasSave }, { label: 'ファイルから読み込む' }],
      (i) => {
        if (i === 0) this.openExport();
        else this.pickImportFile(menu);
      },
      () => this.openMain(2),
    );
    menu.select(select);
    this.active = menu;
  }

  /**
   * ファイルを選ぶ画面を開く。取消されたらこのメニューのまま。
   * 読み終えるまでにメニューを離れた（取消でタイトルへ戻った、選び直した）ときは、結果を無視する。
   */
  private pickImportFile(menu: Menu): void {
    const id = ++this.pickId;
    const current = () => id === this.pickId && this.active === menu && this.scene.isActive();
    pickTextFile(
      (text) => {
        if (current()) this.onImportFile(text);
      },
      () => {
        if (current()) this.notify(['ファイルを読めませんでした。']);
      },
    );
  }

  private openExport(): void {
    const storage = browserStorage();
    if (!storage) return;
    this.active?.destroy();
    this.controls.flush();
    this.active = new SaveSlotMenu(this, storage, 'export', (result) => {
      if (result.kind !== 'picked' || result.info.status !== 'ok') {
        this.openFileMenu(0);
        return;
      }
      const ok = downloadText(exportFileName(result.slot), exportText(result.info.data));
      this.notify(ok ? [`記録 ${result.slot + 1} をファイルに書き出しました（ダウンロードした先を確かめてください）。`] : ['ファイルに書き出せませんでした。']);
    });
  }

  private onImportFile(text: string): void {
    const data = importText(text);
    if (!data) {
      this.notify(['この記録のファイルは読めません（壊れているか、このゲームの記録ではありません）。']);
      return;
    }
    this.openImportSlots(data);
  }

  /** 読み込んだファイルの記録を、どのスロットに入れるか選ぶ。 */
  private openImportSlots(data: SaveData): void {
    const storage = browserStorage();
    if (!storage) return;
    this.active?.destroy();
    this.controls.flush();
    this.message.show(['どの記録に読み込みますか？'], () => undefined);
    this.active = new SaveSlotMenu(this, storage, 'import', (result) => {
      this.message.advance();
      if (result.kind !== 'picked') {
        this.openFileMenu(1);
        return;
      }
      if (result.info.status === 'empty') this.importInto(result.slot, data);
      else this.confirmOverwrite(result.slot, data);
    });
  }

  private confirmOverwrite(slot: number, data: SaveData): void {
    this.active?.destroy();
    this.controls.flush();
    this.message.show([`記録 ${slot + 1} を上書きします。よろしいですか？`], () => undefined);
    const back = () => {
      this.message.advance();
      this.openImportSlots(data);
    };
    this.active = new Menu(
      this,
      GAME_WIDTH / 2 - 50,
      80,
      100,
      [{ label: '上書きする' }, { label: 'やめる' }],
      (i) => {
        if (i === 1) {
          back();
          return;
        }
        this.message.advance();
        this.importInto(slot, data);
      },
      back,
    );
  }

  private importInto(slot: number, data: SaveData): void {
    const storage = browserStorage();
    const ok = storage !== null && writeSaveData(storage, slot, data);
    this.notify(ok ? [`ファイルの記録を、記録 ${slot + 1} に読み込みました。`] : ['読み込めませんでした（ブラウザの保存領域が一杯か、使えません）。']);
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
    if (this.message.isOpen && this.active === null) {
      this.message.update(this.controls);
      return;
    }
    this.active?.update(this.controls);
  }
}
