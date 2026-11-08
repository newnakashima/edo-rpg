import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from './characters';
import { canEquip, EQUIP_SLOTS, equipmentBonus, EQUIPMENT, STARTING_EQUIPMENT, traitSource } from './equipment';
import { MAPS } from './maps';
import { EVENTS } from './events';
import { SHOPS } from './shops';
import { addItem, isKnownItem, itemName, ownedEquipment } from './items';

describe('装備のデータ', () => {
  it('ID とキーが一致し、付けられる人物がいる', () => {
    for (const [key, def] of Object.entries(EQUIPMENT)) {
      expect(def.id).toBe(key);
      expect(def.wearers.length).toBeGreaterThan(0);
    }
  });

  it('初期装備は実在し、本人が付けられ、枠も合う', () => {
    for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
      for (const slot of EQUIP_SLOTS) {
        const equipId = STARTING_EQUIPMENT[id][slot];
        if (!equipId) continue;
        expect(EQUIPMENT[equipId]?.slot).toBe(slot);
        expect(canEquip(id, equipId)).toBe(true);
      }
    }
  });

  it('装備の能力値を合計する', () => {
    expect(equipmentBonus({ weapon: 'shakujo', armor: 'kusarikatabira', accessory: 'inro' })).toEqual({
      maxHp: 10,
      maxMp: 0,
      atk: 6,
      def: 5,
      mag: 4,
      spd: 0,
      luck: 0,
    });
    expect(equipmentBonus({})).toEqual({ maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, spd: 0, luck: 0 });
  });

  it('お凛の銃は弾の威力になる術力も足す（攻撃より小さい）', () => {
    const guns = Object.values(EQUIPMENT).filter((e) => e.slot === 'weapon' && e.wearers.includes('orin'));
    expect(guns.length).toBeGreaterThan(0);
    for (const gun of guns) {
      expect(gun.bonus.mag ?? 0).toBeGreaterThan(0);
      expect(gun.bonus.mag ?? 0).toBeLessThan(gun.bonus.atk ?? 0);
    }
  });

  it('付けられる人物を判定する', () => {
    expect(canEquip('hero', 'dotanuki')).toBe(true);
    expect(canEquip('kasumi', 'dotanuki')).toBe(false);
    expect(canEquip('hero', 'nope')).toBe(false);
  });

  it('所持品に装備品も入れられ、名前を引ける', () => {
    expect(isKnownItem('dotanuki')).toBe(true);
    expect(isKnownItem('nope')).toBe(false);
    expect(addItem({}, 'dotanuki')).toEqual({ dotanuki: 1 });
    expect(ownedEquipment({ kizugusuri: 2, omamori: 1, dotanuki: 1 })).toEqual(['dotanuki', 'omamori']);
    expect(itemName('dotanuki')).toBe('胴田貫');
    expect(itemName('kizugusuri')).toBe('傷薬');
  });
});

describe('レア装備', () => {
  const RARE = {
    kodamaJuzu: { chest: 'worldChestKoyaJuzu', flag: 'chapter4Cleared' },
    idatenMamori: { chest: 'worldChestIzumoIdaten', flag: 'chapter5Cleared' },
    kagebunshin: { chest: 'worldChestAsoKagebunshin', flag: 'kasumiRejoined' },
  } as const;

  it('店には置かず売れもせず、章が進むと現れる脇道の行き止まりの葛籠で手に入る', () => {
    for (const [id, { chest, flag }] of Object.entries(RARE)) {
      for (const shop of Object.values(SHOPS)) expect(shop.goods, `${shop.id} ${id}`).not.toContain(id);
      expect(EQUIPMENT[id]?.unsellable, id).toBe(true);
      expect(JSON.stringify(EVENTS[chest]?.steps), id).toContain(`"item":"${id}"`);
      const npc = MAPS.world!.npcs.find((n) => n.event === chest);
      expect(npc?.showFlag, id).toBe(flag);
    }
  });

  it('2 回攻撃・術の 2 回発動の特性を持ち、素早さの守りは素早さを大きく上げる', () => {
    expect(EQUIPMENT.kagebunshin?.traits).toEqual(['doubleAttack']);
    expect(EQUIPMENT.kagebunshin?.wearers).toEqual(['kasumi']);
    expect(EQUIPMENT.kodamaJuzu?.traits).toEqual(['doubleCast']);
    expect(EQUIPMENT.kodamaJuzu?.wearers).toContain('orin');
    expect(EQUIPMENT.idatenMamori?.wearers).toContain('orin');
    // 店で買える装飾の素早さ（最大 +3）より桁違いに大きい
    expect(EQUIPMENT.idatenMamori?.bonus.spd).toBe(30);
    for (const def of Object.values(EQUIPMENT)) if (!(def.id in RARE)) expect(def.traits, def.id).toBeUndefined();
  });

  it('特性を与える装備を引ける', () => {
    expect(traitSource({ weapon: 'kunai', accessory: 'kagebunshin' }, 'doubleAttack')).toBe('kagebunshin');
    expect(traitSource({ weapon: 'kunai' }, 'doubleAttack')).toBeUndefined();
    expect(traitSource({ accessory: 'kodamaJuzu' }, 'doubleCast')).toBe('kodamaJuzu');
    expect(traitSource({ accessory: 'kodamaJuzu' }, 'doubleAttack')).toBeUndefined();
  });
});
