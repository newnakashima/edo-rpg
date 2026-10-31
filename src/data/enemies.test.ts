import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES, enemyImageKey } from './enemies';
import { SKILLS } from './skills';
import { pickGroup } from '../systems/encounter';
import { seededRng } from '../systems/testUtils';

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

  it('第 1 章（駿府）の敵とボス鉄瓶にも画像がある', () => {
    for (const id of ['karakuriNingyo', 'gorotsuki', 'bakeChochin', 'tetsubin']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('第 2 章（東海道・名古屋）の敵とボス金鯱からくりにも画像がある', () => {
    for (const id of ['oihagiRonin', 'kawauso', 'zenmaiInu', 'kumosuke', 'kinshachi']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('第 3 章（京）の敵とボス酒呑の大鬼にも画像がある', () => {
    for (const id of ['akaoni', 'ittanmomen', 'namagusaBozu', 'karakuriGissha', 'shuten']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('第 4 章（伊賀）の敵と朧・権六にも画像がある', () => {
    for (const id of ['iganin', 'dokugumo', 'karakuriTaka', 'oboro', 'gonroku']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('第 5 章（大坂）の敵と百俵からくりにも画像がある', () => {
    for (const id of ['yojinbo', 'teppoAshigaru', 'karakuriTawara', 'bakeNezumi', 'hyakuhyo']) expect(ENEMIES[id]?.image, id).toBe(true);
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

describe('敵の行動', () => {
  it('行動の技はすべて定義されている（attack は通常攻撃）', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const a of e.actions ?? []) {
        expect(a.skill === 'attack' || SKILLS[a.skill] !== undefined, `${e.id}: ${a.skill}`).toBe(true);
        expect(a.weight, `${e.id}: ${a.skill}`).toBeGreaterThan(0);
      }
    }
  });

  it('呼ぶ技の敵は定義されていて、呼ばれる敵はボスではない', () => {
    for (const skill of Object.values(SKILLS)) {
      if (skill.effect.kind !== 'summon') continue;
      const called = ENEMIES[skill.effect.enemy];
      expect(called, skill.id).toBeDefined();
      expect(called?.rewardScale, skill.id).toBeUndefined();
    }
  });
});

describe('京の敵の組', () => {
  it('4 体の組は玄道が加わった 3 人からで、玄道に会う前の 2 人旅では 3 体まで', () => {
    const table = ENCOUNTERS.kyoto!;
    expect(table.groups.some((g) => g.members.length === 4)).toBe(true);
    const rng = seededRng(3);
    const sizes = (size: number) => Array.from({ length: 300 }, () => pickGroup(table, { size, maxLevel: 10 }, rng)?.length ?? 0);
    expect(Math.max(...sizes(2))).toBe(3);
    expect(Math.max(...sizes(3))).toBe(4);
  });
});

describe('伊賀の敵の組', () => {
  it('お凛が加わった 4 人で来るので、4 体の組がある', () => {
    const table = ENCOUNTERS.iga!;
    expect(table.level).toBe(13);
    const rng = seededRng(4);
    const sizes = Array.from({ length: 300 }, () => pickGroup(table, { size: 4, maxLevel: 13 }, rng)?.length ?? 0);
    expect(Math.max(...sizes)).toBe(4);
    expect(Math.min(...sizes)).toBe(2);
  });
});

describe('大坂の敵の組', () => {
  it('兵庫を入れた 4 人で来るので、4 体の組がある', () => {
    const table = ENCOUNTERS.osaka!;
    expect(table.level).toBe(16);
    const rng = seededRng(5);
    const sizes = Array.from({ length: 300 }, () => pickGroup(table, { size: 4, maxLevel: 18 }, rng)?.length ?? 0);
    expect(Math.max(...sizes)).toBe(4);
  });
});
