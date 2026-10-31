import { describe, expect, it } from 'vitest';
import { addItem, MAX_ITEM_COUNT, ownedItems, removeItem } from './items';

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
