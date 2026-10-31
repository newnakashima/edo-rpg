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

  it('第 6 章（西国街道・長崎・島原）の敵と南蛮大筒からくりにも画像がある', () => {
    for (const id of ['nanbanHei', 'umibozu', 'boreiMusha', 'gehoTsukai', 'heikegani', 'nanbanOzutsu']) expect(ENEMIES[id]?.image, id).toBe(true);
  });

  it('テストプレイのフィードバックで足した序章〜京の敵にも画像がある', () => {
    for (const id of ['kamaitachi', 'mujina', 'inoshishi', 'karakasa', 'gomanohai', 'hitotsumeKozo', 'chahakobi', 'kappa', 'aooni', 'wanyudo']) {
      expect(ENEMIES[id]?.image, id).toBe(true);
    }
  });

  it('テクスチャのキー', () => {
    expect(enemyImageKey('onibi')).toBe('enemy-onibi');
  });
});

describe('雑魚敵の種類', () => {
  // テストプレイで「雑魚敵のバリエーションが少ない」と指摘されたため、地域ごとに 5 種類以上にする（伊賀より先は次の PR で足す）
  const kinds = (id: string) => new Set(ENCOUNTERS[id]!.groups.flatMap((g) => g.members)).size;

  it('序章〜京の出現表は 5 種類以上の敵が出る', () => {
    for (const id of ['urayama', 'suruga', 'sunpu', 'tokaido', 'nagoya', 'kyoto']) expect(kinds(id), id).toBeGreaterThanOrEqual(5);
  });

  it('出現表に入っていない雑魚敵はいない（呼ばれて出る敵を除く）', () => {
    const inTables = new Set(Object.values(ENCOUNTERS).flatMap((t) => t.groups.flatMap((g) => g.members)));
    const summoned = new Set(Object.values(SKILLS).flatMap((s) => (s.effect.kind === 'summon' ? [s.effect.enemy] : [])));
    for (const e of Object.values(ENEMIES)) {
      if (e.rewardScale !== undefined || summoned.has(e.id)) continue;
      expect(inTables.has(e.id), e.id).toBe(true);
    }
  });

  it('序章は主人公 1 人なので、2 体の組は Lv2 から', () => {
    for (const g of ENCOUNTERS.urayama!.groups) {
      expect(g.members.length).toBeLessThanOrEqual(2);
      if (g.members.length === 2) expect(g.minPartyLevel, g.members.join('+')).toBeGreaterThanOrEqual(2);
    }
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

describe('第 6 章（西国街道・長崎・島原）の敵の組', () => {
  it('3 つの表はどれも Lv19', () => {
    for (const id of ['saigoku', 'nagasaki', 'harajo']) expect(ENCOUNTERS[id]?.level, id).toBe(19);
  });

  it('西国街道は霞が戻る前の 3 人でも通るので 3 体まで。長崎・原城跡には 4 体の組がある', () => {
    expect(Math.max(...ENCOUNTERS.saigoku!.groups.map((g) => g.members.length))).toBe(3);
    for (const id of ['nagasaki', 'harajo']) expect(ENCOUNTERS[id]!.groups.some((g) => g.members.length === 4), id).toBe(true);
  });
});

describe('溜めの技', () => {
  it('charge の next は定義された技で、溜めの技は自分に使う', () => {
    const charges = Object.values(SKILLS).filter((s) => s.effect.kind === 'charge');
    expect(charges.map((s) => s.id)).toContain('soten');
    for (const s of charges) {
      expect(s.target, s.id).toBe('self');
      if (s.effect.kind === 'charge') {
        expect(SKILLS[s.effect.next], s.effect.next).toBeDefined();
        expect(SKILLS[s.effect.next]?.effect.kind, s.effect.next).not.toBe('charge');
      }
    }
  });
});
