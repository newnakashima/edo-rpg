import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES, enemyImageKey } from './enemies';

describe('敵の画像', () => {
  it('image のある敵の画像が public/assets/enemies/ にあり、画像のファイルは全て使われている', () => {
    const files = Object.keys(import.meta.glob('../../public/assets/enemies/*.png'));
    const withImage = Object.values(ENEMIES).filter((e) => e.image);
    for (const e of withImage) expect(files, e.id).toContain(`../../public/assets/enemies/${e.id}.png`);
    expect(files.length).toBe(withImage.length);
  });

  it('序章の敵には全て画像がある', () => {
    for (const id of ['onibi', 'yamainu', 'ogaeru']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('序章のボス野狐にも画像がある', () => {
    expect(ENEMIES.yako?.image).toBe(true);
  });

  it('テクスチャのキー', () => {
    expect(enemyImageKey('onibi')).toBe('enemy-onibi');
  });
});

describe('ボス', () => {
  it('ボス（rewardScale のある敵）は出現表に入れない', () => {
    const bosses = Object.values(ENEMIES).filter((e) => e.rewardScale !== undefined).map((e) => e.id);
    expect(bosses).toContain('yako');
    for (const table of Object.values(ENCOUNTERS)) for (const g of table.groups) for (const id of g.members) expect(bosses).not.toContain(id);
  });
});
