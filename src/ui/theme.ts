// 画面の大きさと UI の見た目。docs/assets.md の方針（内部解像度 384 × 216、タイル 16 px）。
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;
export const TILE = 16;

/**
 * 実際のキャンバスは内部解像度の何倍で描くか。ドット絵はカメラのズームで拡大し、
 * 文字だけはこの倍率の解像度で描いて、小さい文字でもにじまないようにする。
 */
export const RENDER_SCALE = 3;

/** シーンのカメラを内部解像度の座標系に合わせる。全てのシーンの create の最初で呼ぶ。 */
export function setupCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  return scene.cameras.main.setZoom(RENDER_SCALE).setOrigin(0, 0);
}

export const COLORS = {
  windowFill: 0x1b1b2f,
  windowBorder: 0xe8dcc0,
  text: '#f4ecd8',
  dim: '#8a8476',
  accent: '#e8b04a',
  danger: '#e86a5a',
};

export const FONT_FAMILY = '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';

export function textStyle(size = 11, color = COLORS.text): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, resolution: RENDER_SCALE };
}
