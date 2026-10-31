import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { closedGateAt, encounterAt, MAPS, npcVisible, respawnPoint, START_POSITION, TILE_KINDS, tileAt, TILES, townAction, type MapDef } from './maps';

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

/** 関所を通らずに歩いて行ける場所。withNpcs なら、いる NPC（hideFlag で消えていない人）も通れないものとする。 */
function reachable(map: MapDef, from: { x: number; y: number }, flags: Record<string, boolean>, withNpcs = false): Set<string> {
  const npcs = new Set(withNpcs ? map.npcs.filter((n) => npcVisible(n, flags)).map((n) => `${n.x},${n.y}`) : []);
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || tileAt(map, x, y)?.blocked !== false || closedGateAt(map, x, y, flags) || npcs.has(key)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

/** その場所の上下左右のどれかに行けるか（話しかけられるか）。 */
const near = (area: Set<string>, x: number, y: number) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => area.has(`${x + dx!},${y + dy!}`));

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
    expect(encounterAt(world, 42, 10, {})).toBe('suruga');
    expect(encounterAt(world, 24, 10, {})).toBeUndefined();
  });

  it('清水湊から東の街道へ出ると、ワールドマップの清水湊の印の隣に出る', () => {
    expect(tileAt(world, landing.x, landing.y)?.blocked).toBe(false);
    expect(Math.abs(landing.x - shimizu.x) + Math.abs(landing.y - shimizu.y)).toBe(1);
  });

  it('町の印は乗っただけでは入らず、決定ボタンで入る（まだの町は案内を出す）', () => {
    expect(townAction(world, shimizu.x, shimizu.y, 'step', {})).toEqual({ kind: 'label', text: '清水湊（決定で入る）' });
    expect(townAction(world, shimizu.x, shimizu.y, 'ok', {})).toEqual({ kind: 'enter', to: { mapId: 'shimizu', x: 26, y: 6 } });
    expect(townAction(world, 24, 10, 'step', {})).toEqual({ kind: 'label', text: '京' });
    expect(townAction(world, 24, 10, 'ok', {})).toMatchObject({ kind: 'info' });
    expect(townAction(world, landing.x, landing.y, 'ok', {})).toBeNull();
  });

  it('駿府は序章を終える（prologueCleared）まで入れず、終えたら入れる', () => {
    const sunpu = world.towns!.find((t) => t.name === '駿府')!;
    expect(townAction(world, sunpu.x, sunpu.y, 'step', {})).toEqual({ kind: 'label', text: '駿府' });
    expect(townAction(world, sunpu.x, sunpu.y, 'ok', {})).toMatchObject({ kind: 'info' });
    const flags = { prologueCleared: true };
    expect(townAction(world, sunpu.x, sunpu.y, 'step', flags)).toEqual({ kind: 'label', text: '駿府（決定で入る）' });
    expect(townAction(world, sunpu.x, sunpu.y, 'ok', flags)).toEqual({ kind: 'enter', to: { mapId: 'sunpu', x: 28, y: 8 } });
  });

  it('駿府のまわりの街道では、序章を終えたら駿府の敵、それまでは序章の敵が出る。清水湊のまわりはいつも序章の敵', () => {
    const cleared = { prologueCleared: true };
    expect(encounterAt(world, 38, 10, cleared)).toBe('sunpu');
    expect(encounterAt(world, 39, 11, cleared)).toBe('sunpu');
    expect(encounterAt(world, 38, 10, {})).toBe('suruga');
    expect(encounterAt(world, 39, 11, {})).toBe('suruga');
    expect(encounterAt(world, 41, 10, cleared)).toBe('suruga');
  });

  it('駿府から街道へ出ると、駿府の印の隣に出る', () => {
    const sunpu = world.towns!.find((t) => t.name === '駿府')!;
    for (const exit of MAPS.sunpu!.exits.filter((e) => e.to === 'world')) {
      expect(Math.abs(exit.toX - sunpu.x) + Math.abs(exit.toY - sunpu.y)).toBe(1);
    }
  });
});

describe('NPC の出入りと全滅時の戻り先', () => {
  it('hideFlag が立った NPC はいなくなる', () => {
    const kasumi = MAPS.kobo!.npcs.find((n) => n.id === 'koboKasumi')!;
    expect(npcVisible(kasumi, {})).toBe(true);
    expect(npcVisible(kasumi, { kasumiJoined: true })).toBe(false);
    const innkeeper = MAPS.shimizu!.npcs.find((n) => n.id === 'innkeeper')!;
    expect(npcVisible(innkeeper, { kasumiJoined: true })).toBe(true);
  });

  it('町では旅籠の前、ダンジョンでは respawnMap の町、どちらもなければ清水湊に戻る', () => {
    expect(respawnPoint('sunpu')).toEqual({ mapId: 'sunpu', x: 25, y: 8 });
    expect(respawnPoint('karakuriYashiki')).toEqual({ mapId: 'sunpu', x: 25, y: 8 });
    expect(respawnPoint('urayama')).toEqual({ mapId: 'shimizu', x: 23, y: 5 });
    expect(respawnPoint('nowhere')).toEqual({ mapId: 'shimizu', x: 23, y: 5 });
  });

  it('respawnMap の町には respawn がある', () => {
    for (const map of Object.values(MAPS)) {
      if (map.respawnMap) expect(MAPS[map.respawnMap]?.respawn, `${map.id} -> ${map.respawnMap}`).toBeDefined();
    }
  });

  it('hideFlag はどこかのイベントの setFlag で立つ', () => {
    const set = new Set<string>();
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
    for (const map of Object.values(MAPS)) for (const npc of map.npcs) if (npc.hideFlag) expect(set.has(npc.hideFlag), `${map.id}/${npc.id}`).toBe(true);
  });
});

describe('第 1 章の駿府', () => {
  const sunpu = MAPS.sunpu!;
  const world = MAPS.world!;
  const town = world.towns!.find((t) => t.name === '駿府')!;
  const start = town.to!;
  const exitTo = (mapId: string) => sunpu.exits.filter((e) => e.to === mapId).map((e) => `${e.x},${e.y}`);

  it('工房には最初から入れ、与力の屋敷は霞が加わるまで、からくり屋敷は名簿が見つかるまで見張りがふさぐ', () => {
    const before = reachable(sunpu, start, {}, true);
    expect(exitTo('kobo').some((k) => before.has(k))).toBe(true);
    expect(exitTo('yoriki').some((k) => before.has(k))).toBe(false);
    expect(exitTo('karakuriYashiki').some((k) => before.has(k))).toBe(false);
    const withKasumi = reachable(sunpu, start, { kasumiJoined: true }, true);
    expect(exitTo('yoriki').some((k) => withKasumi.has(k))).toBe(true);
    expect(exitTo('karakuriYashiki').some((k) => withKasumi.has(k))).toBe(false);
    const withMeibo = reachable(sunpu, start, { kasumiJoined: true, meiboFound: true }, true);
    expect(exitTo('karakuriYashiki').every((k) => withMeibo.has(k))).toBe(true);
  });

  it('町の人には全員話しかけられる（見張りがどいたあとも）', () => {
    const flags = { kasumiJoined: true, meiboFound: true };
    const area = reachable(sunpu, start, flags, true);
    for (const npc of sunpu.npcs.filter((n) => npcVisible(n, flags))) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('工房の霞、与力の屋敷の蔵の前に行ける', () => {
    const kobo = MAPS.kobo!;
    const koboIn = sunpu.exits.find((e) => e.to === 'kobo')!;
    const kasumi = kobo.npcs.find((n) => n.id === 'koboKasumi')!;
    expect(near(reachable(kobo, { x: koboIn.toX, y: koboIn.toY }, {}, true), kasumi.x, kasumi.y)).toBe(true);
    const yoriki = MAPS.yoriki!;
    const yorikiIn = sunpu.exits.find((e) => e.to === 'yoriki')!;
    const area = reachable(yoriki, { x: yorikiIn.toX, y: yorikiIn.toY }, {}, true);
    for (const t of yoriki.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('meiboFound');
    }
  });

  it('からくり屋敷の入口から鉄瓶の場所へ行け、そこを通らなければ奥の間には入れない。葛籠にはすべて近づける', () => {
    const yashiki = MAPS.karakuriYashiki!;
    const entrance = sunpu.exits.find((e) => e.to === 'karakuriYashiki')!;
    const landing = { x: entrance.toX, y: entrance.toY };
    const area = reachable(yashiki, landing, {}, true);
    for (const t of yashiki.triggers!) {
      expect(area.has(`${t.x},${t.y}`), `${t.x},${t.y}`).toBe(true);
      expect(t.unless).toBe('tetsubinDefeated');
    }
    for (const c of yashiki.npcs.filter((n) => n.event?.startsWith('yashikiChest'))) expect(near(area, c.x, c.y), c.id).toBe(true);
    // 鉄瓶の場所を壁にすると、奥の間（装置）に届かない
    const walled: MapDef = {
      ...yashiki,
      rows: yashiki.rows.map((row, y) => {
        let r = row;
        for (const t of yashiki.triggers!.filter((tr) => tr.y === y)) r = r.slice(0, t.x) + 'W' + r.slice(t.x + 1);
        return r;
      }),
    };
    const device = yashiki.npcs.find((n) => n.id === 'zenmaiDevice')!;
    expect(near(reachable(walled, landing, {}, true), device.x, device.y)).toBe(false);
  });
});

describe('序章の狐火の洞', () => {
  const urayama = MAPS.urayama!;
  const cave = MAPS.kitsunebiCave!;
  const entrance = urayama.exits.find((e) => e.to === 'kitsunebiCave')!;
  const landing = { x: entrance.toX, y: entrance.toY };
  const trigger = cave.triggers!.find((t) => t.event === 'yako')!;
  const crate = cave.npcs.find((n) => n.id === 'cavecrate')!;

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
