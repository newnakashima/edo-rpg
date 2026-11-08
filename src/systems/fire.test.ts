import { describe, expect, it } from 'vitest';
import { MAPS, TILES } from '../data/maps';
import { FIRE_RANGE, fireAmong, isFireSource, nearFire } from './fire';

const teahouse = MAPS.shimizu!.npcs.find((n) => n.action === 'teahouse')!;
const at = (mapId: string, x: number, y: number, flags: Record<string, boolean> = {}) => ({ mapId, x, y, flags });

describe('火のある場所', () => {
  it('茶屋・旅籠（と居酒屋）の人と焚き火から FIRE_RANGE のマス以内（斜めも）が火のそば', () => {
    expect(nearFire(at('shimizu', teahouse.x + FIRE_RANGE, teahouse.y + FIRE_RANGE))).toBe(true);
    expect(nearFire(at('shimizu', teahouse.x, teahouse.y + FIRE_RANGE + 1))).toBe(false);
    const inn = MAPS.shimizu!.npcs.find((n) => n.action === 'inn')!;
    expect(nearFire(at('shimizu', inn.x - FIRE_RANGE, inn.y))).toBe(true);
  });

  it('居酒屋の人（燗をつける火）も火の元', () => {
    const izakaya = MAPS.shimizu!.npcs.find((n) => n.action === 'izakaya')!;
    expect(isFireSource(izakaya)).toBe(true);
    expect(nearFire(at('shimizu', izakaya.x + FIRE_RANGE, izakaya.y))).toBe(true);
  });

  it('ワールドマップのもぐりの宿の小屋（囲炉裏）も火の元', () => {
    const hut = MAPS.world!.npcs.find((n) => n.action === 'moguriInn')!;
    expect(isFireSource(hut)).toBe(true);
    expect(nearFire(at('world', hut.x, hut.y + 1))).toBe(true);
  });

  it('よろず屋・刀鍛冶・湯屋・賭場・妓楼の人は火の元でない。知らないマップは火がない', () => {
    for (const action of ['shop', 'yuya', 'tobaku', 'gyoro']) {
      const npc = MAPS.shimizu!.npcs.find((n) => n.action === action)!;
      expect(isFireSource(npc), action).toBe(false);
    }
    expect(nearFire(at('nowhere', 0, 0))).toBe(false);
  });

  it('焚き火は鬼の巣・南蛮寺跡・原城跡・清正の古井戸の底にあり、通れるマスに置いてあって、そばで火に当たれる', () => {
    const maps = Object.values(MAPS).filter((m) => m.npcs.some((n) => n.object === 'takibi'));
    expect(maps.map((m) => m.id).sort()).toEqual(['harajo', 'kiyomasaIdo', 'nanbanji', 'oninosu']);
    for (const map of maps) {
      for (const fire of map.npcs.filter((n) => n.object === 'takibi')) {
        expect(TILES[map.rows[fire.y]![fire.x]!]?.blocked, map.id).toBe(false);
        expect(map.exits.some((e) => e.x === fire.x && e.y === fire.y), map.id).toBe(false);
        expect(isFireSource(fire)).toBe(true);
        // 隣の立てるマス（上下左右）が 1 つ以上あり、どれからも火に当たれる
        const around = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: fire.x + dx!, y: fire.y + dy! })).filter((c) => TILES[map.rows[c.y]?.[c.x] ?? '']?.blocked === false);
        expect(around.length, map.id).toBeGreaterThan(0);
        for (const c of around) expect(nearFire(at(map.id, c.x, c.y)), `${map.id} ${c.x},${c.y}`).toBe(true);
      }
    }
  });

  it('いない人（showFlag がまだ・hideFlag が立った）の火には当たれない', () => {
    const fire = { id: 'f', name: '焚き火', x: 5, y: 5, color: 0, object: 'takibi' as const, hideFlag: 'gone', showFlag: 'lit' };
    expect(fireAmong([fire], 5, 6, { lit: true })).toBe(true);
    expect(fireAmong([fire], 5, 6, {})).toBe(false);
    expect(fireAmong([fire], 5, 6, { lit: true, gone: true })).toBe(false);
  });
});
