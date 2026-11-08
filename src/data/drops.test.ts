// 敵のドロップ（docs/balance.md の「敵のドロップ」）。
import { describe, expect, it } from 'vitest';
import { addDrops, createBattle, dropPages, rollDrops, type BattleState } from '../systems/battle';
import { createMember } from '../systems/party';
import { CHARACTERS, type CharacterId } from './characters';
import { COMMON_DROP_RATE, ENEMY_DROPS, RARE_DROP_RATE } from './drops';
import { ENCOUNTERS, ENEMIES } from './enemies';
import { EQUIPMENT, STARTING_EQUIPMENT } from './equipment';
import { EVENTS } from './events';
import { ITEMS, MAX_ITEM_COUNT, isKnownItem } from './items';
import { SHOPS } from './shops';
import { SKILLS } from './skills';

const sold = new Set(Object.values(SHOPS).flatMap((shop) => shop.goods));
const rares = Object.values(ENEMY_DROPS).map((d) => d.rare);

/** 決まった順に値を返す乱数。 */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

/** 敵をすべて倒した戦闘。 */
function won(enemyIds: string[], level = 1): BattleState {
  const b = createBattle([createMember('hero', level + 3)], 'm', enemyIds, level, { canEscape: false });
  for (const c of b.combatants) if (c.side === 'enemy') c.hp = 0;
  return b;
}

describe('ドロップのデータ', () => {
  it('雑魚敵はすべて通常とレアのドロップを持ち、ボスは持たない', () => {
    for (const def of Object.values(ENEMIES)) {
      if (def.rewardScale) expect(ENEMY_DROPS[def.id], def.id).toBeUndefined();
      else expect(ENEMY_DROPS[def.id], def.id).toBeDefined();
    }
    for (const id of Object.keys(ENEMY_DROPS)) expect(ENEMIES[id], id).toBeDefined();
  });

  it('出現表に出る敵はどれもドロップを持つ', () => {
    for (const table of Object.values(ENCOUNTERS)) for (const g of table.groups) for (const id of g.members) expect(ENEMY_DROPS[id], id).toBeDefined();
  });

  it('通常のドロップは店で買える品', () => {
    for (const [id, d] of Object.entries(ENEMY_DROPS)) {
      expect(isKnownItem(d.common), id).toBe(true);
      expect(sold.has(d.common), `${id} ${d.common}`).toBe(true);
    }
  });

  it('レアのドロップはその敵だけが落とし、店・葛籠・初期装備では手に入らない', () => {
    expect(new Set(rares).size).toBe(rares.length);
    const events = JSON.stringify(EVENTS);
    const starting = (Object.keys(CHARACTERS) as CharacterId[]).flatMap((id) => Object.values(STARTING_EQUIPMENT[id]));
    for (const id of rares) {
      expect(isKnownItem(id), id).toBe(true);
      expect(sold.has(id), id).toBe(false);
      expect(events, id).not.toContain(`"${id}"`);
      expect(starting, id).not.toContain(id);
      for (const d of Object.values(ENEMY_DROPS)) expect(d.common, id).not.toBe(id);
    }
  });

  it('レアの装備は何度でも手に入るので売れ、戦闘の動きを変える特性は持たない', () => {
    for (const id of rares.filter((x) => EQUIPMENT[x])) {
      expect(EQUIPMENT[id]?.unsellable, id).toBeUndefined();
      expect(EQUIPMENT[id]?.traits, id).toBeUndefined();
    }
  });

  it('レアの道具は同じ効き目の店の品より大きく効く（蝦蟇の油は清水湊の傷薬より、河童の秘薬は朝鮮人参より）', () => {
    expect(ITEMS.gamaNoAbura?.effect).toEqual({ kind: 'healHp', amount: 100 });
    expect(ITEMS.kappaHiyaku?.effect).toEqual({ kind: 'revive', rate: 1 });
    expect(ITEMS.hyakumeRosoku?.battle).toBe(false);
  });

  it('確率は通常 1/8・レア 1/64。逃げる高報酬の敵だけ高い', () => {
    expect(COMMON_DROP_RATE).toBe(1 / 8);
    expect(RARE_DROP_RATE).toBe(1 / 64);
    for (const [id, d] of Object.entries(ENEMY_DROPS)) {
      const flees = ENEMIES[id]?.actions?.some((a) => SKILLS[a.skill]?.effect.kind === 'flee') ?? false;
      expect(d.commonRate !== undefined, id).toBe(flees);
      expect(d.rareRate !== undefined, id).toBe(flees);
      expect(d.rareRate ?? RARE_DROP_RATE, id).toBeLessThan(d.commonRate ?? COMMON_DROP_RATE);
    }
  });
});

describe('ドロップの判定', () => {
  it('まずレアを判定し、外れたら通常のドロップを判定する', () => {
    // 鬼火のレアは鬼火の玉、通常は甘酒
    expect(rollDrops(won(['onibi']), sequence(0))).toEqual([{ enemy: '鬼火', item: 'onibiDama', rare: true }]);
    expect(rollDrops(won(['onibi']), sequence(RARE_DROP_RATE, 0))).toEqual([{ enemy: '鬼火', item: 'amazake', rare: false }]);
    expect(rollDrops(won(['onibi']), sequence(RARE_DROP_RATE, COMMON_DROP_RATE))).toEqual([]);
  });

  it('倒した敵 1 体ごとに判定する（1 体が落とすのは 1 つまで）', () => {
    const drops = rollDrops(won(['onibi', 'yamainu', 'onibi']), sequence(0.9, 0, 0.9, 0.9, 0));
    expect(drops).toEqual([
      { enemy: '鬼火', item: 'amazake', rare: false },
      { enemy: '鬼火', item: 'onibiDama', rare: true },
    ]);
  });

  it('呼ばれた敵・逃げた敵とボスは落とさない', () => {
    const b = won(['onibi', 'yamainu']);
    b.combatants.find((c) => c.key === 'e0')!.summoned = true;
    const e1 = b.combatants.find((c) => c.key === 'e1')!;
    e1.hp = 10;
    e1.fled = true;
    expect(rollDrops(b, sequence(0))).toEqual([]);
    expect(rollDrops(won(['yako'], 4), sequence(0))).toEqual([]);
  });

  it('逃げる高報酬の敵は 1/3 で通常、1/16 でレアを落とす', () => {
    expect(rollDrops(won(['karakuriTaka'], 13), sequence(1 / 17))).toEqual([{ enemy: 'からくり鷹', item: 'takaBane', rare: true }]);
    expect(rollDrops(won(['karakuriTaka'], 13), sequence(0.5, 0.3))).toEqual([{ enemy: 'からくり鷹', item: 'tomegane', rare: false }]);
  });

  it('ドロップを所持品に加え、上限で止める', () => {
    const drops = [
      { enemy: '鬼火', item: 'amazake', rare: false },
      { enemy: '鬼火', item: 'amazake', rare: false },
      { enemy: '山犬', item: 'yamainuKiba', rare: true },
    ];
    expect(addDrops({ amazake: 1 }, drops)).toEqual({ amazake: 3, yamainuKiba: 1 });
    expect(addDrops({ amazake: MAX_ITEM_COUNT }, drops.slice(0, 1))).toEqual({ amazake: MAX_ITEM_COUNT });
  });

  it('ドロップの文は 2 つずつのページにし、レアには「めずらしい」と添える', () => {
    expect(dropPages([], {})).toEqual([]);
    const drops = [
      { enemy: '鬼火', item: 'amazake', rare: false },
      { enemy: '山犬', item: 'yamainuKiba', rare: true },
      { enemy: '大蛙', item: 'dokukeshi', rare: false },
    ];
    expect(dropPages(drops, {})).toEqual([
      '鬼火は「甘酒」を落としていった！\n山犬はめずらしい「山犬の牙」を落としていった！',
      '大蛙は「毒消し」を落としていった！',
    ]);
  });

  it('1 種類 99 個の上限で増えなかった品は「持ちきれなかった」と出す', () => {
    const drops = [
      { enemy: '鬼火', item: 'amazake', rare: false },
      { enemy: '鬼火', item: 'amazake', rare: false },
    ];
    expect(dropPages(drops, { amazake: MAX_ITEM_COUNT - 1 })).toEqual([
      '鬼火は「甘酒」を落としていった！\n鬼火は「甘酒」を落としていったが、持ちきれなかった。',
    ]);
  });
});
