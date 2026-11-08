import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from './enemies';
import { MAPS } from './maps';
import { MOGURI_YADO, moguriYadoById } from './moguriYado';
import { signKind } from './signs';

const world = MAPS.world!;
const near = (a: { x: number; y: number }, b: { x: number; y: number }, d: number) => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

describe('もぐりの宿（非合法な旅籠）', () => {
  it('町の中にはなく、ワールドマップにだけ、街道ごとに 1 軒ずつある', () => {
    for (const map of Object.values(MAPS)) {
      const inns = map.npcs.filter((n) => n.action === 'moguriInn');
      expect(inns.map((n) => n.id).sort(), map.id).toEqual(map.id === 'world' ? MOGURI_YADO.map((d) => d.id).sort() : []);
    }
    expect(new Set(MOGURI_YADO.map((d) => d.id)).size).toBe(MOGURI_YADO.length);
    expect(MOGURI_YADO.length).toBeGreaterThanOrEqual(5);
  });

  it('小屋は街道から 1 マス延ばした脇道の行き止まりに建ち（街道をふさがない）、町の印・関所・ほかの物のすぐそばには建てない', () => {
    for (const def of MOGURI_YADO) {
      expect(world.rows[def.y]?.[def.x], def.place).toBe('=');
      const sides = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([dx, dy]) => world.rows[def.y + dy!]?.[def.x + dx!]);
      expect(sides.filter((c) => c === '='), def.place).toHaveLength(1);
      for (const town of world.towns ?? []) expect(near(town, def, 2), `${def.place} と ${town.name}`).toBe(false);
      for (const gate of world.gates ?? []) expect(near(gate, def, 2), def.place).toBe(false);
      const others = world.npcs.filter((n) => n.id !== def.id && near(n, def, 2));
      expect(others.map((n) => n.id), def.place).toEqual([]);
    }
  });

  it('値段のレベルは、小屋の建つ場所の雑魚敵のレベル（先に書いた範囲が優先。終盤にはその範囲の敵が出る）', () => {
    for (const def of MOGURI_YADO) {
      const zone = world.encounterZones!.find((z) => def.x >= z.x && def.x < z.x + z.w && def.y >= z.y && def.y < z.y + z.h);
      expect(zone, def.place).toBeDefined();
      expect(def.areaLevel, def.place).toBe(ENCOUNTERS[zone!.encounter]!.level);
    }
  });

  it('小屋は物の画像で描き、看板は掛けない', () => {
    for (const def of MOGURI_YADO) {
      const npc = world.npcs.find((n) => n.id === def.id)!;
      expect(npc.object).toBe('moguriYado');
      expect(signKind(npc)).toBeNull();
      expect(moguriYadoById(def.id)).toBe(def);
    }
  });
});
