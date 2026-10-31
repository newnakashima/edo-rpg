import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from './characters';
import { canEquip, EQUIP_SLOTS, equipmentBonus, EQUIPMENT, STARTING_EQUIPMENT } from './equipment';
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
