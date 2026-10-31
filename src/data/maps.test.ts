import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { closedGateAt, encounterAt, MAPS, START_POSITION, TILE_KINDS, tileAt, TILES, townAction, type MapDef } from './maps';

describe('タイルの画像', () => {
  it('全ての種類の画像が public/assets/tiles/ にあり、全ての種類が使われている', () => {
    const files = Object.keys(import.meta.glob('../../public/assets/tiles/*.png'));
    for (const kind of TILE_KINDS) expect(files, kind).toContain(`../../public/assets/tiles/${kind}.png`);
    expect(new Set(Object.values(TILES).map((t) => t.kind))).toEqual(new Set(TILE_KINDS));
  });
});

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

      it('NPC の ID は重ならず、向きは画像のある NPC だけに指定する', () => {
        const ids = map.npcs.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const npc of map.npcs) {
          if (npc.facing) expect(npc.sprite, `${npc.id} has facing but no sprite`).toBeDefined();
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

  it('NPC の after のフラグは、どこかの setsFlag かイベントの setFlag で立つ', () => {
    const set = new Set<string>();
    for (const map of Object.values(MAPS)) for (const npc of map.npcs) if (npc.setsFlag) set.add(npc.setsFlag);
    const walk = (steps: readonly EventStep[]): void => {
      for (const st of steps) {
        if (st.type === 'setFlag' && st.value !== false) set.add(st.flag);
        if (st.type === 'if') {
          walk(st.then);
          walk(st.else ?? []);
        }
        if (st.type === 'choice') for (const o of st.options) walk(o.steps);
        if (st.type === 'battle') walk(st.ifLose ?? []);
        if (st.type === 'giveItem') walk(st.ifFull ?? []);
      }
    };
    for (const ev of Object.values(EVENTS)) walk(ev.steps);
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs) if (npc.after) expect(set.has(npc.after.flag), `${map.id}/${npc.id}: ${npc.after.flag}`).toBe(true);
      for (const t of [...(map.triggers ?? []), ...(map.onEnter ? [map.onEnter] : [])]) {
        if (t.unless) expect(set.has(t.unless), `${map.id}/${t.event}: ${t.unless}`).toBe(true);
      }
    }
  });

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

  it('清水湊から東の街道へ出ると、ワールドマップの清水湊の印の隣に出る', () => {
    expect(tileAt(world, landing.x, landing.y)?.blocked).toBe(false);
    expect(Math.abs(landing.x - shimizu.x) + Math.abs(landing.y - shimizu.y)).toBe(1);
  });

  it('町の印は乗っただけでは入らず、決定ボタンで入る（まだの町は案内を出す）', () => {
    expect(townAction(world, shimizu.x, shimizu.y, 'step')).toEqual({ kind: 'label', text: '清水湊（決定で入る）' });
    expect(townAction(world, shimizu.x, shimizu.y, 'ok')).toEqual({ kind: 'enter', to: { mapId: 'shimizu', x: 26, y: 6 } });
    expect(townAction(world, 39, 10, 'step')).toEqual({ kind: 'label', text: '駿府' });
    expect(townAction(world, 39, 10, 'ok')).toMatchObject({ kind: 'info' });
    expect(townAction(world, landing.x, landing.y, 'ok')).toBeNull();
  });
});

describe('序章の狐火の洞', () => {
  const urayama = MAPS.urayama!;
  const cave = MAPS.kitsunebiCave!;
  const entrance = urayama.exits.find((e) => e.to === 'kitsunebiCave')!;
  const landing = { x: entrance.toX, y: entrance.toY };
  const trigger = cave.triggers!.find((t) => t.event === 'yako')!;
  const crate = cave.npcs.find((n) => n.id === 'cavecrate')!;
  const near = (area: Set<string>, x: number, y: number) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => area.has(`${x + dx!},${y + dy!}`));

  it('清水湊から裏山を通って洞へ行ける', () => {
    const shimizu = MAPS.shimizu!;
    const toUrayama = shimizu.exits.find((e) => e.to === 'urayama')!;
    expect(reachable(urayama, { x: toUrayama.toX, y: toUrayama.toY }, {}).has(`${entrance.x},${entrance.y}`)).toBe(true);
  });

  it('洞の入口から野狐の待つ場所へ行け、そこを通らなければ奥の木箱には近づけない', () => {
    const area = reachable(cave, landing, {});
    expect(area.has(`${trigger.x},${trigger.y}`)).toBe(true);
    expect(trigger.unless).toBe('yakoDefeated');
    expect(near(area, crate.x, crate.y)).toBe(true);
    // 野狐の場所を壁にすると、木箱のまわりに届かない
    const walled: MapDef = {
      ...cave,
      rows: cave.rows.map((row, y) => (y === trigger.y ? row.slice(0, trigger.x) + '^' + row.slice(trigger.x + 1) : row)),
    };
    expect(tileAt(walled, trigger.x, trigger.y)?.blocked).toBe(true);
    const blocked = reachable(walled, landing, {});
    expect(blocked.has(`${trigger.x},${trigger.y}`)).toBe(false);
    expect(near(blocked, crate.x, crate.y)).toBe(false);
  });
});
