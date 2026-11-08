import { describe, expect, it } from 'vitest';
import { MAPS, TILES } from '../data/maps';
import { townOf } from '../data/buildings';
import { FIRE_RANGE, fireAmong, isFireSource, nearFire } from './fire';

/** 清水湊（と、その建物の中）で、その施設の人と、その人のいるマップ。 */
function shimizuNpc(action: string) {
  const map = Object.values(MAPS).find((m) => townOf(m.id) === 'shimizu' && m.npcs.some((n) => n.action === action))!;
  return { mapId: map.id, npc: map.npcs.find((n) => n.action === action)! };
}
const teahouse = shimizuNpc('teahouse');
const at = (mapId: string, x: number, y: number, flags: Record<string, boolean> = {}) => ({ mapId, x, y, flags });

describe('火のある場所', () => {
  it('茶屋・旅籠（と居酒屋）の人と焚き火から FIRE_RANGE のマス以内（斜めも）が火のそば', () => {
    const { mapId, npc } = teahouse;
    expect(nearFire(at(mapId, npc.x + FIRE_RANGE, npc.y + FIRE_RANGE))).toBe(true);
    // 茶屋の娘からも竈からも離れた、店の右下の隅は火のそばでない
    const map = MAPS[mapId]!;
    const corner = { x: map.rows[0]!.length - 2, y: map.rows.length - 2 };
    expect(map.npcs.filter(isFireSource).every((n) => Math.max(Math.abs(n.x - corner.x), Math.abs(n.y - corner.y)) > FIRE_RANGE)).toBe(true);
    expect(nearFire(at(mapId, corner.x, corner.y))).toBe(false);
    const inn = shimizuNpc('inn');
    expect(nearFire(at(inn.mapId, inn.npc.x - FIRE_RANGE, inn.npc.y))).toBe(true);
  });

  it('居酒屋の人（燗をつける火）も火の元', () => {
    const { mapId, npc } = shimizuNpc('izakaya');
    expect(isFireSource(npc)).toBe(true);
    expect(nearFire(at(mapId, npc.x + FIRE_RANGE, npc.y))).toBe(true);
  });

  it('ワールドマップのもぐりの宿の小屋（囲炉裏）も火の元', () => {
    const hut = MAPS.world!.npcs.find((n) => n.action === 'moguriInn')!;
    expect(isFireSource(hut)).toBe(true);
    expect(nearFire(at('world', hut.x, hut.y + 1))).toBe(true);
  });

  it('よろず屋・刀鍛冶・湯屋・賭場・妓楼の人は火の元でない。知らないマップは火がない', () => {
    for (const action of ['shop', 'yuya', 'tobaku', 'gyoro']) {
      expect(isFireSource(shimizuNpc(action).npc), action).toBe(false);
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
