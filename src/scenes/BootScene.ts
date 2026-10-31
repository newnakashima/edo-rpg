import Phaser from 'phaser';
import type { TileKind } from '../data/maps';
import { CHAR_FRAME, CHARACTER_SPRITES, FACINGS, spriteKey, walkAnimKey, walkFrame, WALK_FPS, WALK_FRAMES } from '../data/sprites';
import { TILE } from '../ui/theme';

/** 画像ができるまでの仮のタイルの色（docs/assets.md の配色）。 */
const TILE_COLORS: Record<TileKind, [number, number]> = {
  ground: [0xc9a96e, 0xb8955a],
  grass: [0x6f9a4a, 0x5f8a3e],
  road: [0xd8c08e, 0xc8ad78],
  tree: [0x2f5a2e, 0x244a24],
  water: [0x3a6ea5, 0x4a80b8],
  wall: [0xe8e0cc, 0x8a6a44],
  roof: [0x3b3b4f, 0x2b2b3d],
  door: [0x6a4a2e, 0x4a321e],
  floor: [0xb08a5a, 0xa07a4a],
  rock: [0x7a7a72, 0x5a5a54],
  plain: [0x8aa865, 0x7a9858],
  town: [0xd8c08e, 0x8a3b2e],
  gate: [0xd8c08e, 0x5a3a1e],
};

/** 画像を読み込み、まだ画像のないものは仮の画像をコードで描いてテクスチャにする。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const id of CHARACTER_SPRITES) {
      this.load.spritesheet(spriteKey(id), `assets/chars/${id}.png`, { frameWidth: CHAR_FRAME, frameHeight: CHAR_FRAME });
    }
  }

  create(): void {
    for (const id of CHARACTER_SPRITES) {
      for (const facing of FACINGS) {
        this.anims.create({
          key: walkAnimKey(id, facing),
          frames: this.anims.generateFrameNumbers(spriteKey(id), {
            frames: Array.from({ length: WALK_FRAMES }, (_, i) => walkFrame(facing, i)),
          }),
          frameRate: WALK_FPS,
          repeat: -1,
        });
      }
    }

    const g = this.add.graphics();
    for (const [kind, [base, accent]] of Object.entries(TILE_COLORS)) {
      g.clear();
      g.fillStyle(base, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(accent, 1);
      if (kind === 'tree') {
        g.fillCircle(8, 7, 6);
        g.fillStyle(0x5a3a1e, 1);
        g.fillRect(7, 12, 2, 4);
      } else if (kind === 'wall') {
        g.fillRect(0, 12, TILE, 4);
        g.fillRect(0, 0, 2, TILE);
      } else if (kind === 'roof') {
        for (let y = 2; y < TILE; y += 4) g.fillRect(0, y, TILE, 1);
      } else if (kind === 'town') {
        // 小さな家の印
        g.fillStyle(0xe8e0cc, 1);
        g.fillRect(4, 8, 8, 6);
        g.fillStyle(accent, 1);
        g.fillTriangle(2, 9, 14, 9, 8, 3);
      } else if (kind === 'gate') {
        // 関所の柵
        g.fillRect(2, 3, 2, 12);
        g.fillRect(12, 3, 2, 12);
        g.fillRect(1, 5, 14, 2);
      } else if (kind === 'water') {
        g.fillRect(2, 5, 5, 1);
        g.fillRect(9, 11, 5, 1);
      } else {
        g.fillRect(3, 4, 1, 1);
        g.fillRect(11, 9, 1, 1);
        g.fillRect(6, 13, 1, 1);
      }
      g.generateTexture(`tile-${kind}`, TILE, TILE);
    }

    // 人物（白で描き、色はティントで付ける）
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 6, 8, 9);
    g.fillCircle(8, 4, 4);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(4, 14, 8, 1);
    g.generateTexture('person', 16, 16);


    // 敵（白い塊をティントで色分けする）
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(24, 26, 40, 36);
    g.fillStyle(0x000000, 1);
    g.fillCircle(17, 22, 3);
    g.fillCircle(31, 22, 3);
    g.generateTexture('enemy', 48, 48);

    g.destroy();
    this.scene.start('Title');
  }
}
