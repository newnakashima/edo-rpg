import { describe, expect, it } from 'vitest';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS } from '../data/items';
import { itemIcon, slotIcon, WEAPON_ICONS } from './icons';

describe('道具・装備品のアイコン', () => {
  it('すべての道具・装備品にアイコンがある', () => {
    for (const id of [...Object.keys(ITEMS), ...Object.keys(EQUIPMENT)]) expect(itemIcon(id), id).toBeDefined();
    expect(itemIcon('nothing')).toBeUndefined();
  });

  it('道具と装備品の ID は重ならない（itemIcon は道具を先に引くため）', () => {
    for (const id of Object.keys(ITEMS)) expect(Object.hasOwn(EQUIPMENT, id), id).toBe(false);
  });

  it('状態異常を治す道具と気付けの道具は薬', () => {
    for (const item of Object.values(ITEMS).filter((i) => i.effect.kind === 'cure' || i.effect.kind === 'revive')) {
      // 梅干しは食べ物（酸っぱさで目が覚める）
      if (item.id !== 'umeboshi') expect(item.kind, item.id).toBe('medicine');
    }
  });

  it('道具は食べ物なら団子、薬なら薬包', () => {
    expect(itemIcon('dango')).toBe('dango');
    expect(itemIcon('kasutera')).toBe('dango');
    expect(itemIcon('kizugusuri')).toBe('kusuri');
    expect(itemIcon('kitsukegusuri')).toBe('kusuri');
    expect(itemIcon('dokukeshi')).toBe('kusuri');
  });

  it('武器は使う人の得物、防具は胴、装飾品はお守り', () => {
    expect(itemIcon('nagawakizashi')).toBe('katana');
    expect(itemIcon('kunai')).toBe('shuriken');
    expect(itemIcon('dokko')).toBe('shakujo');
    expect(itemIcon('hinawaju')).toBe('teppo');
    expect(itemIcon('hyogoKatana')).toBe('katana');
    expect(itemIcon('igaShozoku')).toBe('armor');
    expect(itemIcon('chochin')).toBe('omamori');
  });

  it('武器を付けられるのは 1 人だけ（アイコンをその人の得物で決めるため）', () => {
    for (const e of Object.values(EQUIPMENT).filter((e) => e.slot === 'weapon')) expect(e.wearers, e.id).toHaveLength(1);
  });

  it('装備の枠のアイコンは、武器なら付ける人の得物', () => {
    for (const [who, icon] of Object.entries(WEAPON_ICONS)) expect(slotIcon('weapon', who as keyof typeof WEAPON_ICONS)).toBe(icon);
    expect(slotIcon('armor', 'kasumi')).toBe('armor');
    expect(slotIcon('accessory', 'orin')).toBe('omamori');
  });
});
