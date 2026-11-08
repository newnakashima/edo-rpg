import { describe, expect, it } from 'vitest';
import { EventRunner } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { JINGI_RENOWN } from '../systems/jingi';
import { EQUIPMENT } from './equipment';
import { EVENTS } from './events';
import { MAX_ITEM_COUNT, itemCount } from './items';
import { OYABUN } from './oyabun';
import { OYABUN_GIFTS, OYABUN_GIFT_EVENTS, oyabunGiftId, pendingOyabunGift } from './oyabunGifts';
import { SHOPS } from './shops';
import { ENEMY_DROPS } from './drops';

const start = { mapId: 'shimizu', x: 1, y: 1 };

/** イベントを最後まで進め、出た台詞も返す。 */
function run(id: string, state: GameState) {
  const runner = new EventRunner(EVENTS[id]!.steps);
  const pages: string[] = [];
  let r = runner.next(state);
  for (let i = 0; i < 50 && r.request.kind !== 'done'; i++) {
    if (r.request.kind === 'say') pages.push(...r.request.pages);
    r = runner.next(r.state);
  }
  return { state: r.state, pages };
}

const renowned = (s: GameState = newGame('m', start)): GameState => ({ ...s, jingi: JINGI_RENOWN });

describe('名が通ったときの親分の贈り物', () => {
  it('屋敷のある 15 町すべてにあり、品はどれも別の、店に置かず敵も落とさない売れない装飾品', () => {
    expect(Object.keys(OYABUN_GIFTS).sort()).toEqual(Object.keys(OYABUN).sort());
    expect(Object.keys(OYABUN_GIFT_EVENTS)).toHaveLength(15);
    const items = Object.values(OYABUN_GIFTS);
    expect(new Set(items).size).toBe(items.length);
    const dropped = Object.values(ENEMY_DROPS).flatMap((d) => [d.common, d.rare]);
    for (const [town, id] of Object.entries(OYABUN_GIFTS)) {
      const def = EQUIPMENT[id];
      expect(def?.slot, town).toBe('accessory');
      expect(def?.unsellable, id).toBe(true);
      for (const shop of Object.values(SHOPS)) expect(shop.goods, `${shop.id} ${id}`).not.toContain(id);
      expect(dropped, id).not.toContain(id);
      expect(EVENTS[oyabunGiftId(town)]?.id).toBe(oyabunGiftId(town));
    }
  });

  it('名が通っている（90 以上）あいだだけ、まだ受け取っていない町の屋敷のメニューに出る', () => {
    const s = newGame('m', start);
    expect(pendingOyabunGift('kyo', { ...s, jingi: JINGI_RENOWN - 1 })).toBeNull();
    expect(pendingOyabunGift('kyo', renowned(s))).toEqual({ id: oyabunGiftId('kyo'), label: '親分の贈り物を受け取る' });
    expect(pendingOyabunGift('kyo', { ...renowned(s), flags: { [oyabunGiftId('kyo')]: true } })).toBeNull();
    expect(pendingOyabunGift('world', renowned(s))).toBeNull();
  });

  it('受け取ると品が増えてフラグが立ち、ポイントは減らない。ほかの町の贈り物は残る', () => {
    const id = oyabunGiftId('edo');
    const { state, pages } = run(id, renowned());
    expect(itemCount(state.items, 'kazariMatoi')).toBe(1);
    expect(state.flags[id]).toBe(true);
    expect(state.jingi).toBe(JINGI_RENOWN);
    expect(pages).toContain('飾り纏を受け取った。');
    expect(pages.some((p) => p.includes('浅草一家の名折れ') && p.includes('親分が'))).toBe(true);
    expect(pendingOyabunGift('edo', state)).toBeNull();
    expect(pendingOyabunGift('osaka', state)?.id).toBe(oyabunGiftId('osaka'));
  });

  it('持ちきれなければ渡さずフラグも立てず、また受け取れる', () => {
    const id = oyabunGiftId('osaka');
    const s = { ...renowned(), items: { naniwaSoroban: MAX_ITEM_COUNT } };
    const { state, pages } = run(id, s);
    expect(state.flags[id]).toBeUndefined();
    expect(pages.some((p) => p.includes('お荷物がいっぱい'))).toBe(true);
    expect(pendingOyabunGift('osaka', state)?.id).toBe(id);
  });

  it('清水湊では、辰五郎が殺されたあとは「親分が」ではなく一家から渡す', () => {
    const id = oyabunGiftId('shimizu');
    const before = run(id, renowned()).pages;
    expect(before.some((p) => p.includes('親分が'))).toBe(true);
    const flag = OYABUN.shimizu!.welcomeAfter!.flag;
    const after = run(id, { ...renowned(), flags: { [flag]: true } }).pages;
    expect(after.some((p) => p.includes('親分が'))).toBe(false);
    expect(after.some((p) => p.includes('一家から'))).toBe(true);
  });

  it('話すのは若い衆だけ（画面に出ない親分には喋らせない）', () => {
    for (const town of Object.keys(OYABUN_GIFTS)) {
      const text = JSON.stringify(OYABUN_GIFT_EVENTS[oyabunGiftId(town)]!.steps);
      const speakers = [...text.matchAll(/"([^"「]+)「/g)].map((m) => m[1]);
      for (const sp of speakers) expect(sp, town).toBe('若い衆');
    }
  });
});
