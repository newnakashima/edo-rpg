import { describe, expect, it } from 'vitest';
import { EQUIPMENT } from './equipment';
import { addItem, ITEMS, MAX_ITEM_COUNT, ownedItems, removeItem } from './items';
import { SHOPS } from './shops';
import { ENEMY_DROPS } from './drops';

describe('所持品', () => {
  it('加えると増え、上限で止まる', () => {
    expect(addItem({}, 'kizugusuri', 2)).toEqual({ kizugusuri: 2 });
    expect(addItem({ kizugusuri: 98 }, 'kizugusuri', 5)).toEqual({ kizugusuri: MAX_ITEM_COUNT });
    expect(() => addItem({}, 'nope')).toThrow();
  });

  it('減らすと 0 個で消え、足りなければ null', () => {
    expect(removeItem({ kizugusuri: 2 }, 'kizugusuri')).toEqual({ kizugusuri: 1 });
    expect(removeItem({ kizugusuri: 1 }, 'kizugusuri')).toEqual({});
    expect(removeItem({}, 'kizugusuri')).toBeNull();
  });

  it('持っている道具を定義順に返す', () => {
    expect(ownedItems({ dokukeshi: 1, kizugusuri: 3 })).toEqual(['kizugusuri', 'dokukeshi']);
  });
});

describe('道具の品ぞろえ', () => {
  const sold = new Set(Object.values(SHOPS).flatMap((shop) => shop.goods));

  it('テストプレイで挙がった品（おむすび・団子・兵糧丸・わらじ・提灯・キセル）がある', () => {
    for (const id of ['omusubi', 'dango', 'hyorogan']) expect(ITEMS[id], id).toBeDefined();
    for (const id of ['waraji', 'chochin', 'kiseru']) expect(EQUIPMENT[id], id).toBeDefined();
  });

  it('どの道具もどこかの店で買える（敵のレアドロップは、その敵を倒したときだけ手に入る）', () => {
    const rares = new Set(Object.values(ENEMY_DROPS).map((d) => d.rare));
    for (const id of Object.keys(ITEMS)) expect(sold.has(id) !== rares.has(id), id).toBe(true);
  });

  it('店の品はすべて定義されていて、1 つの店に同じ品は並ばない', () => {
    for (const shop of Object.values(SHOPS)) {
      for (const id of shop.goods) expect(ITEMS[id] ?? EQUIPMENT[id], `${shop.id} ${id}`).toBeDefined();
      expect(new Set(shop.goods).size, shop.id).toBe(shop.goods.length);
    }
  });

  it('魔除けの香はどの町のよろず屋でも買え、戦闘中は使えない', () => {
    for (const shop of Object.values(SHOPS).filter((x) => x.name === 'よろず屋')) expect(shop.goods, shop.id).toContain('mayokeKo');
    expect(ITEMS.mayokeKo?.battle).toBe(false);
  });

  it('道しるべの札はどの町のよろず屋でも買える', () => {
    const yorozu = Object.values(SHOPS).filter((shop) => shop.name === 'よろず屋');
    expect(yorozu.length).toBeGreaterThan(0);
    for (const shop of yorozu) expect(shop.goods, shop.id).toContain('michishirube');
  });

  it('飲み物・食べ物はよろず屋に置かず、茶屋で売る（どの茶屋でも団子と甘酒を買える）', () => {
    const yorozu = Object.values(SHOPS).filter((shop) => shop.name === 'よろず屋');
    const chaya = Object.values(SHOPS).filter((shop) => shop.name === '茶屋');
    for (const shop of yorozu) for (const id of shop.goods) expect(ITEMS[id]?.kind, `${shop.id} ${id}`).not.toBe('food');
    for (const shop of chaya) {
      for (const id of shop.goods) expect(ITEMS[id]?.kind, `${shop.id} ${id}`).toBe('food');
      expect(shop.goods, shop.id).toEqual(expect.arrayContaining(['dango', 'amazake']));
    }
    // よろず屋のある町には茶屋がある
    for (const shop of yorozu) expect(SHOPS[shop.id.replace(/Yorozu$/, 'Chaya')]?.name, shop.id).toBe('茶屋');
  });

  it('同じ効き目の道具は、高いほど回復量が多い', () => {
    const byKind = (kind: 'healHp' | 'healMp') =>
      Object.values(ITEMS)
        .flatMap((i) => (i.effect.kind === kind ? [{ price: i.price, amount: i.effect.amount, id: i.id }] : []))
        .sort((a, b) => a.price - b.price || a.amount - b.amount);
    for (const kind of ['healHp', 'healMp'] as const) {
      const list = byKind(kind);
      for (let i = 1; i < list.length; i++) {
        const [a, b] = [list[i - 1]!, list[i]!];
        // 名物は少し割安にしてよいが、安い品が高い品より多く回復することはない
        if (a.price < b.price) expect(a.amount, `${a.id} < ${b.id}`).toBeLessThanOrEqual(b.amount);
      }
    }
  });
});
