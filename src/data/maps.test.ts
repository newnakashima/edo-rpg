import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES } from './enemies';
import { EVENTS } from './events';
import { MAPS, START_POSITION, tileAt, TILES } from './maps';

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
