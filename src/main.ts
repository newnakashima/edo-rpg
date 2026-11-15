import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { EndingScene } from './scenes/EndingScene';
import { FieldScene } from './scenes/FieldScene';
import { TitleScene } from './scenes/TitleScene';
import { getState, setState } from './state';
import { MAPS, TILES } from './data/maps';
import { newGame } from './systems/gameState';
import { setAvailableBgm, setAvailableSe, setBgmPlayer, setJinglePlayer, setSePlayer } from './systems/audio';
import { availableBgmIds } from './data/bgmTracks';
import { availableSeIds } from './data/seTracks';
import { createAudioContext, WebBgmPlayer } from './ui/bgmPlayer';
import { WebSePlayer } from './ui/sePlayer';
import { bindVirtualPad } from './ui/input';
import { preventZoomGestures, resetZoomWhenScaled } from './ui/preventZoom';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './ui/theme';

// スマートフォンで画面が拡大されて操作できなくなるのを防ぐ
preventZoomGestures(document);
resetZoomWhenScaled();

const padRoot = document.getElementById('pad');
if (padRoot) bindVirtualPad(padRoot);

// 曲と効果音の再生（docs/audio.md）。書き出した曲・効果音を教え、まだないものは代わりを鳴らす（代わりもなければ無音）
// 曲と効果音は 1 つの AudioContext を共に使う。Web Audio を使えない環境では、音を鳴らさずにゲームを進める
let bgmPlayer: WebBgmPlayer | null = null;
let sePlayer: WebSePlayer | null = null;
try {
  const ctx = createAudioContext();
  bgmPlayer = new WebBgmPlayer(ctx);
  sePlayer = new WebSePlayer(ctx);
} catch (error) {
  console.warn('音を鳴らせない', error);
}
if (bgmPlayer) {
  const player = bgmPlayer;
  setAvailableBgm(availableBgmIds());
  setBgmPlayer((id) => player.play(id));
  setJinglePlayer((id) => player.playJingle(id));
}
if (sePlayer) {
  const se = sePlayer;
  const seIds = availableSeIds();
  setAvailableSe(seIds);
  se.preload(seIds);
  setSePlayer((id) => se.play(id));
}

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
  scene: [BootScene, TitleScene, CharacterSelectScene, FieldScene, BattleScene, EndingScene],
});

// 動作確認用: 開発サーバーで ?debug を付けて開いたときだけ、コンソールからゲームを触れるようにする
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug')) {
  // __setState・__newGame・__MAPS・__TILES は scripts/mapkit/map_shot.mjs（マップ全体の撮影）が使う
  Object.assign(window, { __game: game, __getState: getState, __setState: setState, __newGame: newGame, __MAPS: MAPS, __TILES: TILES, __bgm: bgmPlayer, __se: sePlayer });
}
