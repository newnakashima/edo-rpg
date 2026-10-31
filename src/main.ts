import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { FieldScene } from './scenes/FieldScene';
import { TitleScene } from './scenes/TitleScene';
import { getState } from './state';
import { bindVirtualPad } from './ui/input';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './ui/theme';

const padRoot = document.getElementById('pad');
if (padRoot) bindVirtualPad(padRoot);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * RENDER_SCALE,
  height: GAME_HEIGHT * RENDER_SCALE,
  backgroundColor: '#0d0d14',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, CharacterSelectScene, FieldScene, BattleScene],
});

// 動作確認用: 開発サーバーで ?debug を付けて開いたときだけ、コンソールからゲームを触れるようにする
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug')) {
  Object.assign(window, { __game: game, __getState: getState });
}
