import Phaser from 'phaser';
import { ENEMIES, enemyImageKey } from '../data/enemies';
import { TILE_KINDS } from '../data/maps';
import { CHAR_FRAME, CHARACTER_SPRITES, FACINGS, OBJECT_FRAME, OBJECT_SPRITES, objectKey, spriteKey, walkAnimKey, walkFrame, WALK_FPS, WALK_FRAMES } from '../data/sprites';

/**
 * 画像を読み込み、まだ画像のないもの（仮の NPC・画像のない敵）は仮の画像をコードで描いてテクスチャにする。
 * 読み込みに失敗したときの代わりの画像は用意していない（画像はビルドに同梱する静的なファイルで、CI の build で配置を確かめるため）。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const kind of TILE_KINDS) this.load.image(`tile-${kind}`, `assets/tiles/${kind}.png`);
    for (const enemy of Object.values(ENEMIES)) {
      if (enemy.image) this.load.image(enemyImageKey(enemy.id), `assets/enemies/${enemy.id}.png`);
    }
    for (const id of CHARACTER_SPRITES) {
      this.load.spritesheet(spriteKey(id), `assets/chars/${id}.png`, { frameWidth: CHAR_FRAME, frameHeight: CHAR_FRAME });
    }
    for (const id of OBJECT_SPRITES) {
      this.load.spritesheet(objectKey(id), `assets/objects/${id}.png`, { frameWidth: OBJECT_FRAME, frameHeight: OBJECT_FRAME });
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
