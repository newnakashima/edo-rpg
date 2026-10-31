import Phaser from 'phaser';
import { characterName, type Gender } from '../data/characters';
import { START_POSITION } from '../data/maps';
import { newGame } from '../systems/gameState';
import { setState } from '../state';
import { Controls } from '../ui/input';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { drawWindow } from '../ui/widgets';

/** 主人公の男女を選ぶ。性能は同じで、見た目と一部の台詞が変わる（docs/story.md）。 */
export class CharacterSelectScene extends Phaser.Scene {
  private controls!: Controls;
  private choice: Gender = 'm';
  private cursor!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.choice = 'm';
    this.cameras.main.setBackgroundColor('#141420');
    this.add.text(GAME_WIDTH / 2, 24, '主人公を選んでください', textStyle(13)).setOrigin(0.5);

    const options: { gender: Gender; x: number; desc: string }[] = [
      { gender: 'm', x: GAME_WIDTH / 2 - 80, desc: '男の渡世人\n一人称「あっし」' },
      { gender: 'f', x: GAME_WIDTH / 2 + 80, desc: '女の渡世人\n一人称「あたし」' },
    ];
    this.cursor = this.add.rectangle(0, 100, 120, 120).setStrokeStyle(1, 0xe8b04a);
    for (const o of options) {
      drawWindow(this, o.x - 56, 44, 112, 112);
      this.add.image(o.x, 78, `hero-${o.gender}`).setScale(3);
      this.add.text(o.x, 110, characterName('hero', o.gender), textStyle(13, COLORS.accent)).setOrigin(0.5);
      this.add.text(o.x, 134, o.desc, { ...textStyle(9), align: 'center' }).setOrigin(0.5);
      const zone = this.add.zone(o.x, 100, 112, 112).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (this.choice === o.gender) this.confirm();
        else this.select(o.gender);
      });
    }
    this.add.text(GAME_WIDTH / 2, 176, '性能は同じです。左右で選び、決定で始めます', textStyle(9, COLORS.dim)).setOrigin(0.5);
    this.select('m');
  }

  private select(gender: Gender): void {
    this.choice = gender;
    this.cursor.setX(gender === 'm' ? GAME_WIDTH / 2 - 80 : GAME_WIDTH / 2 + 80);
  }

  private confirm(): void {
    setState(newGame(this.choice, START_POSITION));
    this.scene.start('Field');
  }

  update(): void {
    const dir = this.controls.pressedDirection();
    if (dir === 'left') this.select('m');
    if (dir === 'right') this.select('f');
    if (this.controls.okPressed()) this.confirm();
    else if (this.controls.cancelPressed()) this.scene.start('Title');
  }
}
