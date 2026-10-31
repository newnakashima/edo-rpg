import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES } from './enemies';
import { EVENTS } from './events';
import { closedGateAt, encounterAt, MAPS, START_POSITION, tileAt, TILES, type MapDef } from './maps';

describe('マップのデータ', () => {
  for (const map of Object.values(MAPS)) {
    describe(map.id, () => {
      const width = map.rows[0]?.length ?? 0;

      it('全ての行の幅がそろい、知らないタイルがない', () => {
        for (const row of map.rows) {
          expect(row.length).toBe(width);
          for (const ch of row) expect(TILES[ch], `unknown tile "${ch}"`).toBeDefined();
        }
      });

      it('NPC は通れるタイルの上にいて、重ならない', () => {
        const seen = new Set<string>();
        for (const npc of map.npcs) {
          expect(tileAt(map, npc.x, npc.y)?.blocked, npc.id).toBe(false);
          const key = `${npc.x},${npc.y}`;
          expect(seen.has(key), npc.id).toBe(false);
          seen.add(key);
        }
      });

      it('出口の行き先は、通れて出口でも NPC でもない場所', () => {
        for (const exit of map.exits) {
          expect(tileAt(map, exit.x, exit.y)?.blocked).toBe(false);
          const dest = MAPS[exit.to];
          expect(dest, exit.to).toBeDefined();
          if (!dest) continue;
          expect(tileAt(dest, exit.toX, exit.toY)?.blocked).toBe(false);
          expect(dest.exits.some((e) => e.x === exit.toX && e.y === exit.toY)).toBe(false);
          expect(dest.npcs.some((n) => n.x === exit.toX && n.y === exit.toY)).toBe(false);
        }
      });

      it('イベントの参照先があり、乗るイベントの場所は通れる', () => {
        for (const npc of map.npcs) if (npc.event) expect(EVENTS[npc.event], npc.event).toBeDefined();
        if (map.onEnter) expect(EVENTS[map.onEnter.event], map.onEnter.event).toBeDefined();
        for (const t of map.triggers ?? []) {
          expect(EVENTS[t.event], t.event).toBeDefined();
          expect(tileAt(map, t.x, t.y)?.blocked).toBe(false);
        }
      });

      it('町の印・関所・出現範囲が正しい', () => {
        for (const town of map.towns ?? []) {
          expect(tileAt(map, town.x, town.y)?.kind, town.name).toBe('town');
          expect(town.to !== undefined || (town.lines?.length ?? 0) > 0, town.name).toBe(true);
          if (town.to) {
            const dest = MAPS[town.to.mapId];
            expect(dest, town.to.mapId).toBeDefined();
            if (dest) expect(tileAt(dest, town.to.x, town.to.y)?.blocked).toBe(false);
          }
        }
        for (const gate of map.gates ?? []) expect(tileAt(map, gate.x, gate.y)?.kind).toBe('gate');
        for (const z of map.encounterZones ?? []) expect(ENCOUNTERS[z.encounter], z.encounter).toBeDefined();
      });

      it('出現表と全滅時の戻り先が正しい', () => {
        if (map.encounter) {
          const table = ENCOUNTERS[map.encounter];
          expect(table).toBeDefined();
          for (const g of table?.groups ?? []) for (const id of g.members) expect(ENEMIES[id], id).toBeDefined();
        }
        if (map.respawn) expect(tileAt(map, map.respawn.x, map.respawn.y)?.blocked).toBe(false);
      });
    });
  }

  it('開始位置は通れる場所', () => {
    const map = MAPS[START_POSITION.mapId];
    expect(map && tileAt(map, START_POSITION.x, START_POSITION.y)?.blocked).toBe(false);
  });
});

/** 関所を通らずに歩いて行ける場所。 */
function reachable(map: MapDef, from: { x: number; y: number }, flags: Record<string, boolean>): Set<string> {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || tileAt(map, x, y)?.blocked !== false || closedGateAt(map, x, y, flags)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

describe('ワールドマップ', () => {
  const world = MAPS.world!;
  const shimizu = world.towns!.find((t) => t.name === '清水湊')!;
  // 町の印は乗っても入らない（決定ボタンで入る）ので、印の上も通り抜けられる
  const exit = MAPS.shimizu!.exits.find((e) => e.to === 'world')!;
  const landing = { x: exit.toX, y: exit.toY };

  it('清水湊の東の街道から出ると、関所を越えなければ清水湊と駿府にしか行けない', () => {
    const area = reachable(world, landing, {});
    const towns = world.towns!.filter((t) => area.has(`${t.x},${t.y}`)).map((t) => t.name);
    expect(towns.sort()).toEqual(['清水湊', '駿府'].sort());
  });

  it('関所が開けば、金沢（北前船で渡る）のほかはすべての町に街道でつながる', () => {
    const flags = Object.fromEntries(world.gates!.map((g) => [g.flag, true]));
    const area = reachable(world, landing, flags);
    const unreachable = world.towns!.filter((t) => !area.has(`${t.x},${t.y}`)).map((t) => t.name);
    expect(unreachable).toEqual(['金沢']);
  });

  it('清水湊のまわりの街道では敵が出る', () => {
    expect(encounterAt(world, 42, 10)).toBe('suruga');
    expect(encounterAt(world, 24, 10)).toBeUndefined();
  });

  it('清水湊から東の街道へ出るとワールドマップの清水湊の隣に出て、清水湊の印から町へ戻れる', () => {
    expect(tileAt(world, landing.x, landing.y)?.blocked).toBe(false);
    expect(Math.abs(landing.x - shimizu.x) + Math.abs(landing.y - shimizu.y)).toBe(1);
    expect(shimizu.to?.mapId).toBe('shimizu');
  });
});
