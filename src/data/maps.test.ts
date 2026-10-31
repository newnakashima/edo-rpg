import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { SHOPS } from './shops';
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

      it('イベント・店の参照先があり、乗るイベントの場所は通れる', () => {
        for (const npc of map.npcs) if (npc.event) expect(EVENTS[npc.event], npc.event).toBeDefined();
        for (const npc of map.npcs) if (npc.action === 'shop') expect(npc.shop && SHOPS[npc.shop], `${npc.id}: ${npc.shop}`).toBeTruthy();
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

/** ボスの待つ場所（triggers）を壁にしたマップ。そこを通らなければ奥へ行けないことを確かめる。 */
function wallTriggers(map: MapDef): MapDef {
  return {
    ...map,
    rows: map.rows.map((row, y) => {
      let r = row;
      for (const t of (map.triggers ?? []).filter((tr) => tr.y === y)) r = r.slice(0, t.x) + 'W' + r.slice(t.x + 1);
      return r;
    }),
  };
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
    expect(encounterAt(world, 42, 10, {})).toBe('suruga');
    expect(encounterAt(world, 24, 10, {})).toBeUndefined();
  });

  it('大井川の西の東海道では東海道の敵が出る', () => {
    // 範囲は x 25〜35、y 9〜12（大井川の渡し場 x 36 からは駿府・駿河の範囲）
    for (const [x, y] of [[25, 9], [35, 10], [25, 12], [35, 12]] as const) expect(encounterAt(world, x, y, {}), `${x},${y}`).toBe('tokaido');
    expect(encounterAt(world, 35, 13, {})).toBeUndefined();
    expect(encounterAt(world, 36, 10, {})).toBe('suruga');
    expect(encounterAt(world, 37, 10, { prologueCleared: true })).toBe('sunpu');
  });

  it('大井川の渡し場は oigawaOpen まで通れず、通れないときは川越しのイベントを行う。開けば名古屋へ行ける', () => {
    const gate = closedGateAt(world, 36, 10, {});
    expect(gate?.event).toBe('oigawa');
    expect(EVENTS.oigawa).toBeDefined();
    expect(closedGateAt(world, 36, 10, { oigawaOpen: true })).toBeUndefined();
    const nagoya = world.towns!.find((t) => t.name === '名古屋')!;
    expect(reachable(world, landing, {}).has(`${nagoya.x},${nagoya.y}`)).toBe(false);
    expect(reachable(world, landing, { oigawaOpen: true }).has(`${nagoya.x},${nagoya.y}`)).toBe(true);
    expect(townAction(world, nagoya.x, nagoya.y, 'ok', { oigawaOpen: true })).toEqual({ kind: 'enter', to: { mapId: 'nagoya', x: 28, y: 8 } });
  });

  it('関所のイベントは定義されている', () => {
    for (const gate of world.gates ?? []) if (gate.event) expect(EVENTS[gate.event], gate.event).toBeDefined();
  });

  it('清水湊から東の街道へ出ると、ワールドマップの清水湊の印の隣に出る', () => {
    expect(tileAt(world, landing.x, landing.y)?.blocked).toBe(false);
    expect(Math.abs(landing.x - shimizu.x) + Math.abs(landing.y - shimizu.y)).toBe(1);
  });

  it('町の印は乗っただけでは入らず、決定ボタンで入る（まだの町は案内を出す）', () => {
    expect(townAction(world, shimizu.x, shimizu.y, 'step', {})).toEqual({ kind: 'label', text: '清水湊（決定で入る）' });
    expect(townAction(world, shimizu.x, shimizu.y, 'ok', {})).toEqual({ kind: 'enter', to: shimizu.to });
    expect(shimizu.to?.mapId).toBe('shimizu');
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
    expect(townAction(world, sunpu.x, sunpu.y, 'ok', flags)).toEqual({ kind: 'enter', to: sunpu.to });
    expect(sunpu.to?.mapId).toBe('sunpu');
  });

  it('駿府のまわりの街道では、序章を終えたら駿府の敵、それまでは序章の敵が出る。清水湊のまわりはいつも序章の敵', () => {
    const cleared = { prologueCleared: true };
    expect(encounterAt(world, 38, 10, cleared)).toBe('sunpu');
    expect(encounterAt(world, 39, 11, cleared)).toBe('sunpu');
    expect(encounterAt(world, 38, 10, {})).toBe('suruga');
    expect(encounterAt(world, 39, 11, {})).toBe('suruga');
    expect(encounterAt(world, 41, 10, cleared)).toBe('suruga');
  });

  it('名古屋から街道へ出ると、名古屋の印の隣に出る', () => {
    const nagoya = world.towns!.find((t) => t.name === '名古屋')!;
    for (const exit of MAPS.nagoya!.exits.filter((e) => e.to === 'world')) {
      expect(Math.abs(exit.toX - nagoya.x) + Math.abs(exit.toY - nagoya.y)).toBe(1);
    }
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
    const sunpu = { mapId: 'sunpu', ...MAPS.sunpu!.respawn };
    const shimizu = { mapId: 'shimizu', ...MAPS.shimizu!.respawn };
    expect(respawnPoint('sunpu')).toEqual(sunpu);
    expect(respawnPoint('karakuriYashiki')).toEqual(sunpu);
    expect(respawnPoint('urayama')).toEqual(shimizu);
    expect(respawnPoint('nowhere')).toEqual(shimizu);
  });

  it('respawnMap・respawnZones の町には respawn がある', () => {
    for (const map of Object.values(MAPS)) {
      if (map.respawnMap) expect(MAPS[map.respawnMap]?.respawn, `${map.id} -> ${map.respawnMap}`).toBeDefined();
      for (const z of map.respawnZones ?? []) expect(MAPS[z.mapId]?.respawn, `${map.id} -> ${z.mapId}`).toBeDefined();
    }
  });

  it('ワールドマップでは、大井川の西（東海道）なら名古屋、それ以外は清水湊に戻る', () => {
    const nagoya = { mapId: 'nagoya', ...MAPS.nagoya!.respawn };
    const shimizu = { mapId: 'shimizu', ...MAPS.shimizu!.respawn };
    expect(respawnPoint('world', 34, 10)).toEqual(nagoya);
    expect(respawnPoint('world', 25, 9)).toEqual(nagoya);
    expect(respawnPoint('world', 36, 10)).toEqual(shimizu);
    expect(respawnPoint('world', 38, 10)).toEqual(shimizu);
    expect(respawnPoint('world')).toEqual(shimizu);
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
    const device = yashiki.npcs.find((n) => n.id === 'zenmaiDevice')!;
    expect(near(reachable(wallTriggers(yashiki), landing, {}, true), device.x, device.y)).toBe(false);
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


describe('第 2 章の名古屋', () => {
  const nagoya = MAPS.nagoya!;
  const start = MAPS.world!.towns!.find((t) => t.name === '名古屋')!.to!;
  const exitTo = (mapId: string) => nagoya.exits.filter((e) => e.to === mapId).map((e) => `${e.x},${e.y}`);

  it('凧屋には最初から入れ、堀川の荷蔵は金太に会う（kintaMet）まで荷車がふさぐ', () => {
    const before = reachable(nagoya, start, {}, true);
    expect(exitTo('takoya').some((k) => before.has(k))).toBe(true);
    expect(exitTo('horikawaKura').some((k) => before.has(k))).toBe(false);
    const after = reachable(nagoya, start, { kintaMet: true }, true);
    expect(exitTo('horikawaKura').every((k) => after.has(k))).toBe(true);
  });

  it('町の人には全員話しかけられる', () => {
    const area = reachable(nagoya, start, {}, true);
    for (const npc of nagoya.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('凧屋の金太に話しかけられる', () => {
    const takoya = MAPS.takoya!;
    const enter = nagoya.exits.find((e) => e.to === 'takoya')!;
    const kinta = takoya.npcs.find((n) => n.id === 'kinta')!;
    expect(near(reachable(takoya, { x: enter.toX, y: enter.toY }, {}, true), kinta.x, kinta.y)).toBe(true);
  });

  it('荷蔵の入口から奥の浪人の場所へ行け、そこを通らなければ奥の間には入れない。葛籠にはすべて近づける', () => {
    const kura = MAPS.horikawaKura!;
    const enter = nagoya.exits.find((e) => e.to === 'horikawaKura')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(kura, landing, {}, true);
    for (const t of kura.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('urokoClue');
    }
    for (const c of kura.npcs.filter((n) => n.event?.startsWith('horikawaChest'))) expect(near(area, c.x, c.y), c.id).toBe(true);
    const box = kura.npcs.find((n) => n.id === 'urokoBox')!;
    expect(near(area, box.x, box.y)).toBe(true);
    expect(near(reachable(wallTriggers(kura), landing, {}, true), box.x, box.y)).toBe(false);
  });

  it('大凧で着く天守の場所から金鯱の場所へ行け、そこを通らなければ大棟には上がれない。葛籠と下りる出口に行ける', () => {
    const tenshu = MAPS.tenshu!;
    const kite = { x: 8, y: 9 };
    const area = reachable(tenshu, kite, {}, true);
    for (const t of tenshu.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('kinshachiDefeated');
    }
    const chest = tenshu.npcs.find((n) => n.id === 'tenshuChest')!;
    expect(near(area, chest.x, chest.y)).toBe(true);
    expect(tenshu.exits.some((e) => area.has(`${e.x},${e.y}`))).toBe(true);
    const daiza = tenshu.npcs.find((n) => n.id === 'shachiDaiza')!;
    expect(near(area, daiza.x, daiza.y)).toBe(true);
    expect(near(reachable(wallTriggers(tenshu), kite, {}, true), daiza.x, daiza.y)).toBe(false);
  });

  it('凧屋・荷蔵・天守で全滅したら名古屋の旅籠の前に戻る', () => {
    for (const id of ['takoya', 'horikawaKura', 'tenshu']) expect(respawnPoint(id)).toEqual({ mapId: 'nagoya', ...MAPS.nagoya!.respawn });
  });
});

describe('第 3 章の京', () => {
  const kyo = MAPS.kyo!;
  const world = MAPS.world!;
  const town = world.towns!.find((t) => t.name === '京')!;
  const start = town.to!;
  const exitTo = (mapId: string) => kyo.exits.filter((e) => e.to === mapId).map((e) => `${e.x},${e.y}`);

  it('京は第 2 章を終える（chapter2Cleared）まで入れず、まわりの街道もそれまでは敵が出ない', () => {
    expect(townAction(world, town.x, town.y, 'ok', {})).toMatchObject({ kind: 'info' });
    expect(townAction(world, town.x, town.y, 'ok', { chapter2Cleared: true })).toEqual({ kind: 'enter', to: start });
    expect(encounterAt(world, 23, 10, {})).toBeUndefined();
    for (const [x, y] of [[21, 9], [24, 12], [23, 10]] as const) expect(encounterAt(world, x, y, { chapter2Cleared: true }), `${x},${y}`).toBe('kyoto');
    expect(encounterAt(world, 25, 10, { chapter2Cleared: true })).toBe('tokaido');
    expect(respawnPoint('world', 23, 10)).toEqual({ mapId: 'kyo', ...kyo.respawn });
  });

  it('京に入ると kyoEnter を行い、第 3 章を終えたら行わない', () => {
    expect(kyo.onEnter).toEqual({ event: 'kyoEnter', unless: 'chapter3Cleared' });
  });

  it('京から街道へ出ると、京の印の隣に出る', () => {
    for (const exit of kyo.exits.filter((e) => e.to === 'world')) {
      expect(Math.abs(exit.toX - town.x) + Math.abs(exit.toY - town.y)).toBe(1);
    }
  });

  it('羅生門跡には最初から行け、鬼の巣は羅生門の鬼を祓う（rashomonCleared）まで役人がふさぐ', () => {
    const before = reachable(kyo, start, {}, true);
    expect(exitTo('rashomon').every((k) => before.has(k))).toBe(true);
    expect(exitTo('oninosu').some((k) => before.has(k))).toBe(false);
    const after = reachable(kyo, start, { rashomonCleared: true }, true);
    expect(exitTo('oninosu').every((k) => after.has(k))).toBe(true);
  });

  it('町の人と河原の玄道には全員話しかけられる', () => {
    const area = reachable(kyo, start, {}, true);
    for (const npc of kyo.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('羅生門跡の鬼の場所は、通らなければ門の跡に近づけない', () => {
    const rashomon = MAPS.rashomon!;
    const enter = kyo.exits.find((e) => e.to === 'rashomon')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(rashomon, landing, {}, true);
    for (const t of rashomon.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('rashomonCleared');
    }
    const ishi = rashomon.npcs.find((n) => n.id === 'rashomonIshi')!;
    expect(near(area, ishi.x, ishi.y)).toBe(true);
    expect(near(reachable(wallTriggers(rashomon), landing, {}, true), ishi.x, ishi.y)).toBe(false);
  });

  it('鬼の巣の入口から大鬼の場所へ行け、そこを通らなければ本堂には入れない。葛籠にはすべて近づける', () => {
    const nest = MAPS.oninosu!;
    const enter = kyo.exits.find((e) => e.to === 'oninosu')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(nest, landing, {}, true);
    for (const t of nest.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('shutenDefeated');
    }
    for (const c of nest.npcs.filter((n) => n.event?.startsWith('oninosuChest'))) expect(near(area, c.x, c.y), c.id).toBe(true);
    const butsu = nest.npcs.find((n) => n.id === 'oninosuButsudan')!;
    expect(near(area, butsu.x, butsu.y)).toBe(true);
    expect(near(reachable(wallTriggers(nest), landing, {}, true), butsu.x, butsu.y)).toBe(false);
  });

  it('羅生門跡・鬼の巣で全滅したら京の旅籠の前に戻る', () => {
    for (const id of ['rashomon', 'oninosu']) expect(respawnPoint(id)).toEqual({ mapId: 'kyo', ...kyo.respawn });
  });

  it('辰五郎は第 3 章を終えると清水湊から姿を消す', () => {
    const tatsugoro = MAPS.shimizu!.npcs.find((n) => n.id === 'tatsugoro')!;
    expect(npcVisible(tatsugoro, { chapter2Cleared: true })).toBe(true);
    expect(npcVisible(tatsugoro, { chapter3Cleared: true })).toBe(false);
  });
});

describe('第 4 章の清水湊と伊賀上野', () => {
  const iga = MAPS.iga!;
  const world = MAPS.world!;
  const town = world.towns!.find((t) => t.name === '伊賀')!;
  const start = town.to!;
  const exitTo = (mapId: string) => iga.exits.filter((e) => e.to === mapId).map((e) => `${e.x},${e.y}`);

  it('清水湊に入ると shimizuEnter を行い（序章の始まりと辰五郎の弔い）、お凛が加わったら行わない。お凛は加わると清水湊から消える', () => {
    const shimizu = MAPS.shimizu!;
    expect(shimizu.onEnter).toEqual({ event: 'shimizuEnter', unless: 'orinJoined' });
    const orin = shimizu.npcs.find((n) => n.id === 'orin')!;
    expect(npcVisible(orin, { chapter3Cleared: true })).toBe(true);
    expect(npcVisible(orin, { orinJoined: true })).toBe(false);
  });

  it('伊賀はお凛が加わる（orinJoined）まで入れず、まわりの街道もそれまでは東海道の敵・名古屋に戻る', () => {
    expect(townAction(world, town.x, town.y, 'ok', { chapter3Cleared: true })).toMatchObject({ kind: 'info' });
    expect(townAction(world, town.x, town.y, 'ok', { orinJoined: true })).toEqual({ kind: 'enter', to: start });
    for (const [x, y] of [[26, 10], [27, 10], [28, 10]] as const) {
      expect(encounterAt(world, x, y, { chapter3Cleared: true }), `${x},${y}`).toBe('tokaido');
      expect(encounterAt(world, x, y, { orinJoined: true }), `${x},${y}`).toBe('iga');
      expect(respawnPoint('world', x, y, { chapter3Cleared: true }).mapId).toBe('nagoya');
      expect(respawnPoint('world', x, y, { orinJoined: true })).toEqual({ mapId: 'iga', ...iga.respawn });
    }
    expect(encounterAt(world, 25, 10, { orinJoined: true })).toBe('tokaido');
    expect(encounterAt(world, 29, 10, { orinJoined: true })).toBe('tokaido');
  });

  it('伊賀上野に入ると igaEnter を行い、着いたあとは行わない', () => {
    expect(iga.onEnter).toEqual({ event: 'igaEnter', unless: 'igaArrived' });
  });

  it('伊賀上野から街道へ出ると、伊賀の印の隣に出る', () => {
    for (const exit of iga.exits.filter((e) => e.to === 'world')) {
      expect(Math.abs(exit.toX - town.x) + Math.abs(exit.toY - town.y)).toBe(1);
    }
  });

  it('伊賀者の里には最初から行け、鍵屋の辻は朧を倒す（oboroDefeated）まで辻番がふさぐ', () => {
    const before = reachable(iga, start, {}, true);
    expect(exitTo('igaSato').every((k) => before.has(k))).toBe(true);
    expect(exitTo('kagiya').some((k) => before.has(k))).toBe(false);
    const after = reachable(iga, start, { oboroDefeated: true }, true);
    expect(exitTo('kagiya').every((k) => after.has(k))).toBe(true);
  });

  it('町の人には全員話しかけられる', () => {
    const area = reachable(iga, start, {}, true);
    for (const npc of iga.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('伊賀者の里の入口から朧の場所へ行け、そこを通らなければ広間には入れない。葛籠にはすべて近づける', () => {
    const sato = MAPS.igaSato!;
    const enter = iga.exits.find((e) => e.to === 'igaSato')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(sato, landing, {}, true);
    for (const t of sato.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('oboroDefeated');
    }
    for (const c of sato.npcs.filter((n) => n.event?.startsWith('igaSatoChest'))) expect(near(area, c.x, c.y), c.id).toBe(true);
    const kakejiku = sato.npcs.find((n) => n.id === 'igaKakejiku')!;
    expect(near(area, kakejiku.x, kakejiku.y)).toBe(true);
    expect(near(reachable(wallTriggers(sato), landing, {}, true), kakejiku.x, kakejiku.y)).toBe(false);
  });

  it('鍵屋の辻の権六の場所は、通らなければ石標に近づけない', () => {
    const kagiya = MAPS.kagiya!;
    const enter = iga.exits.find((e) => e.to === 'kagiya')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(kagiya, landing, {}, true);
    for (const t of kagiya.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('gonrokuDefeated');
    }
    const ishi = kagiya.npcs.find((n) => n.id === 'kagiyaIshi')!;
    expect(near(area, ishi.x, ishi.y)).toBe(true);
    expect(near(reachable(wallTriggers(kagiya), landing, {}, true), ishi.x, ishi.y)).toBe(false);
  });

  it('伊賀者の里・鍵屋の辻で全滅したら伊賀上野の旅籠の前に戻る', () => {
    for (const id of ['igaSato', 'kagiya']) expect(respawnPoint(id)).toEqual({ mapId: 'iga', ...iga.respawn });
  });
});

describe('第 5 章の大坂', () => {
  const osaka = MAPS.osaka!;
  const world = MAPS.world!;
  const town = world.towns!.find((t) => t.name === '大坂')!;
  const start = town.to!;
  const exitTo = (mapId: string) => osaka.exits.filter((e) => e.to === mapId).map((e) => `${e.x},${e.y}`);

  it('大坂は第 4 章を終える（chapter4Cleared）まで入れず、まわりの街道もそれまでは京の範囲のまま', () => {
    expect(townAction(world, town.x, town.y, 'ok', { orinJoined: true })).toMatchObject({ kind: 'info' });
    expect(townAction(world, town.x, town.y, 'ok', { chapter4Cleared: true })).toEqual({ kind: 'enter', to: start });
    const before = { chapter2Cleared: true };
    const after = { chapter2Cleared: true, chapter4Cleared: true };
    expect(encounterAt(world, 21, 10, before)).toBe('kyoto');
    expect(encounterAt(world, 18, 11, before)).toBeUndefined();
    for (const [x, y] of [[17, 11], [20, 11], [21, 10]] as const) {
      expect(encounterAt(world, x, y, after), `${x},${y}`).toBe('osaka');
      expect(respawnPoint('world', x, y, after)).toEqual({ mapId: 'osaka', ...osaka.respawn });
    }
    expect(respawnPoint('world', 21, 10, before).mapId).toBe('kyo');
    expect(encounterAt(world, 22, 10, after)).toBe('kyoto');
  });

  it('大坂に入ると osakaEnter を行い、第 5 章を終えたら行わない', () => {
    expect(osaka.onEnter).toEqual({ event: 'osakaEnter', unless: 'chapter5Cleared' });
  });

  it('大坂から街道へ出ると、大坂の印の隣に出る', () => {
    for (const exit of osaka.exits.filter((e) => e.to === 'world')) {
      expect(Math.abs(exit.toX - town.x) + Math.abs(exit.toY - town.y)).toBe(1);
    }
  });

  it('米蔵は兵庫が加わる（hyogoJoined）まで用心棒がふさぐ。兵庫は加わると私塾から消える', () => {
    const before = reachable(osaka, start, {}, true);
    expect(exitTo('komeKura').some((k) => before.has(k))).toBe(false);
    const after = reachable(osaka, start, { hyogoJoined: true }, true);
    expect(exitTo('komeKura').every((k) => after.has(k))).toBe(true);
    const juku = osaka.npcs.find((n) => n.id === 'hyogoJuku')!;
    expect(npcVisible(juku, { hyogoJoined: true })).toBe(false);
  });

  it('町の人には全員話しかけられる', () => {
    const area = reachable(osaka, start, {}, true);
    for (const npc of osaka.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('米蔵の地下の入口から百俵からくりの場所へ行け、そこを通らなければ奥には入れない。葛籠にはすべて近づける', () => {
    const kura = MAPS.komeKura!;
    const enter = osaka.exits.find((e) => e.to === 'komeKura')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(kura, landing, {}, true);
    for (const t of kura.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('hyakuhyoDefeated');
    }
    for (const c of kura.npcs.filter((n) => n.event?.startsWith('komeKuraChest'))) expect(near(area, c.x, c.y), c.id).toBe(true);
    const kikai = kura.npcs.find((n) => n.id === 'komeKuraKikai')!;
    expect(near(area, kikai.x, kikai.y)).toBe(true);
    expect(near(reachable(wallTriggers(kura), landing, {}, true), kikai.x, kikai.y)).toBe(false);
  });

  it('米蔵の地下で全滅したら大坂の旅籠の前に戻る', () => {
    expect(respawnPoint('komeKura')).toEqual({ mapId: 'osaka', ...osaka.respawn });
  });
});

describe('第 6 章の広島・長崎・島原', () => {
  const world = MAPS.world!;
  const townOf = (name: string) => world.towns!.find((t) => t.name === name)!;
  const hiroshima = MAPS.hiroshima!;
  const nagasaki = MAPS.nagasaki!;
  const ch5 = { chapter4Cleared: true, chapter5Cleared: true };

  it('広島は第 5 章を終える（chapter5Cleared）まで、長崎は霞が戻る（kasumiRejoined）まで、島原は南蛮寺跡の手がかり（shimabaraOpen）まで入れない', () => {
    for (const [name, flag] of [['広島', 'chapter5Cleared'], ['長崎', 'kasumiRejoined'], ['島原', 'shimabaraOpen']] as const) {
      const t = townOf(name);
      expect(townAction(world, t.x, t.y, 'ok', { chapter4Cleared: true }), name).toMatchObject({ kind: 'info' });
      expect(townAction(world, t.x, t.y, 'ok', { [flag]: true }), name).toEqual({ kind: 'enter', to: t.to });
    }
  });

  it('大坂より西の街道は、第 5 章を終えたら西国街道の敵・全滅で広島へ。長崎・島原のまわりは霞が戻ったら長崎の敵、長崎に着いたら全滅で長崎へ', () => {
    const roadW = { x: 12, y: 11 };
    expect(encounterAt(world, roadW.x, roadW.y, { chapter4Cleared: true })).toBeUndefined();
    expect(encounterAt(world, roadW.x, roadW.y, ch5)).toBe('saigoku');
    expect(respawnPoint('world', roadW.x, roadW.y, ch5)).toEqual({ mapId: 'hiroshima', ...hiroshima.respawn });
    const nearNagasaki = { x: 5, y: 16 };
    expect(encounterAt(world, nearNagasaki.x, nearNagasaki.y, ch5)).toBe('saigoku');
    expect(encounterAt(world, nearNagasaki.x, nearNagasaki.y, { ...ch5, kasumiRejoined: true })).toBe('nagasaki');
    expect(respawnPoint('world', nearNagasaki.x, nearNagasaki.y, { ...ch5, kasumiRejoined: true }).mapId).toBe('hiroshima');
    expect(respawnPoint('world', nearNagasaki.x, nearNagasaki.y, { ...ch5, kasumiRejoined: true, nagasakiArrived: true })).toEqual({ mapId: 'nagasaki', ...nagasaki.respawn });
    // 大坂のまわりは大坂の敵のまま
    expect(encounterAt(world, 18, 11, ch5)).toBe('osaka');
  });

  it('広島・長崎・原城跡からワールドマップへ出ると、それぞれの印の隣に出る', () => {
    for (const [mapId, name] of [['hiroshima', '広島'], ['nagasaki', '長崎'], ['harajo', '島原']] as const) {
      const t = townOf(name);
      for (const exit of MAPS[mapId]!.exits.filter((e) => e.to === 'world')) {
        expect(Math.abs(exit.toX - t.x) + Math.abs(exit.toY - t.y), `${mapId} ${exit.x},${exit.y}`).toBe(1);
      }
    }
  });

  it('広島に入ると hiroshimaEnter（霞が戻る）、長崎に入ると nagasakiEnter を行い、それぞれ済んだら行わない', () => {
    expect(hiroshima.onEnter).toEqual({ event: 'hiroshimaEnter', unless: 'kasumiRejoined' });
    expect(nagasaki.onEnter).toEqual({ event: 'nagasakiEnter', unless: 'chapter6Cleared' });
  });

  it('広島と長崎の町の人には全員話しかけられる（広島の城の門番は堀の橋をふさぐ）', () => {
    for (const map of [hiroshima, nagasaki]) {
      const t = world.towns!.find((x) => x.to?.mapId === map.id)!;
      const area = reachable(map, t.to!, {}, true);
      for (const npc of map.npcs) expect(near(area, npc.x, npc.y), `${map.id}/${npc.id}`).toBe(true);
    }
    const castle = reachable(hiroshima, townOf('広島').to!, {}, true);
    expect(castle.has('15,5')).toBe(false);
  });

  it('出島には最初から入れ、出島の人には全員話しかけられる', () => {
    const start = townOf('長崎').to!;
    const area = reachable(nagasaki, start, {}, true);
    const gate = nagasaki.exits.find((e) => e.to === 'dejima')!;
    expect(area.has(`${gate.x},${gate.y}`)).toBe(true);
    const dejima = MAPS.dejima!;
    const inside = reachable(dejima, { x: gate.toX, y: gate.toY }, {}, true);
    for (const npc of dejima.npcs) expect(near(inside, npc.x, npc.y), npc.id).toBe(true);
  });

  it('南蛮寺跡の石段は、通詞の話を聞く（dejimaHeard）まで役人がふさぐ', () => {
    const start = townOf('長崎').to!;
    const exit = nagasaki.exits.find((e) => e.to === 'nanbanji')!;
    expect(reachable(nagasaki, start, {}, true).has(`${exit.x},${exit.y}`)).toBe(false);
    expect(reachable(nagasaki, start, { dejimaHeard: true }, true).has(`${exit.x},${exit.y}`)).toBe(true);
  });

  it('南蛮寺跡の入口から礼拝堂の跡の前へ行け、そこを通らなければ祭壇に近づけない。葛籠と見どころにはすべて近づける', () => {
    const ruin = MAPS.nanbanji!;
    const enter = nagasaki.exits.find((e) => e.to === 'nanbanji')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(ruin, landing, {}, true);
    for (const t of ruin.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('shimabaraOpen');
    }
    for (const npc of ruin.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
    const saidan = ruin.npcs.find((n) => n.id === 'nanbanjiSaidan')!;
    expect(near(reachable(wallTriggers(ruin), landing, {}, true), saidan.x, saidan.y)).toBe(false);
  });

  it('原城跡の入口から本丸の奥の石段（研究所への出口）まで行け、葛籠と見どころにはすべて近づける', () => {
    const castle = MAPS.harajo!;
    const area = reachable(castle, townOf('島原').to!, {}, true);
    for (const e of castle.exits) expect(area.has(`${e.x},${e.y}`), `${e.to} ${e.x},${e.y}`).toBe(true);
    for (const npc of castle.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
  });

  it('研究所の入口から南蛮大筒からくりの場所へ行け、そこを通らなければ蘭斎の机に近づけない。葛籠と見どころにはすべて近づける', () => {
    const lab = MAPS.kenkyujo!;
    const enter = MAPS.harajo!.exits.find((e) => e.to === 'kenkyujo')!;
    const landing = { x: enter.toX, y: enter.toY };
    const area = reachable(lab, landing, {}, true);
    for (const t of lab.triggers!) {
      expect(area.has(`${t.x},${t.y}`)).toBe(true);
      expect(t.unless).toBe('nanbanOzutsuDefeated');
    }
    for (const npc of lab.npcs) expect(near(area, npc.x, npc.y), npc.id).toBe(true);
    const desk = lab.npcs.find((n) => n.id === 'ransaiTsukue')!;
    expect(near(reachable(wallTriggers(lab), landing, {}, true), desk.x, desk.y)).toBe(false);
  });

  it('出島・南蛮寺跡・原城跡・研究所で全滅したら長崎の旅籠の前に戻る', () => {
    for (const id of ['dejima', 'nanbanji', 'harajo', 'kenkyujo']) expect(respawnPoint(id), id).toEqual({ mapId: 'nagasaki', ...nagasaki.respawn });
  });

});

describe('マップの広さと使い回し（テストプレイの指摘: どの町もダンジョンも同じ・狭い）', () => {
  // まだ作り直していないマップ。作り直したら外す
  const NOT_YET_REMADE = ['nagoya', 'takoya', 'horikawaKura', 'tenshu', 'kyo', 'rashomon', 'oninosu', 'iga', 'igaSato', 'kagiya', 'osaka', 'komeKura'];
  /** 建物の中や、塀で囲まれた小さな区画（出島）。町・ダンジョンより狭くてよい。 */
  const SMALL = ['kobo', 'yoriki', 'takoya', 'dejima'];
  const maps = Object.values(MAPS).filter((m) => m.id !== 'world');
  const area = (m: MapDef) => m.rows.length * (m.rows[0]?.length ?? 0);

  it('町は 1100 マス以上、ダンジョン・野山は 750 マス以上、建物の中・小さな区画は 400 マス以上', () => {
    for (const m of maps.filter((x) => !NOT_YET_REMADE.includes(x.id))) {
      const min = SMALL.includes(m.id) ? 400 : m.respawn ? 1100 : 750;
      expect(area(m), m.id).toBeGreaterThanOrEqual(min);
    }
  });

  it('同じ大きさのマップどうしでも、半分以上のマスが同じものはない（形の使い回しがない）', () => {
    for (const [i, a] of maps.entries()) {
      for (const b of maps.slice(i + 1)) {
        if (NOT_YET_REMADE.includes(a.id) && NOT_YET_REMADE.includes(b.id)) continue;
        if (a.rows.length !== b.rows.length || a.rows[0]?.length !== b.rows[0]?.length) continue;
        let same = 0;
        a.rows.forEach((row, y) => [...row].forEach((ch, x) => (same += ch === b.rows[y]![x] ? 1 : 0)));
        expect(same / area(a), `${a.id} と ${b.id}`).toBeLessThan(0.5);
      }
    }
  });

  it('ほかのマップと同じ行（3 種類以上のタイルを含む行）が 3 割を超えない（大きさが違っても、写しを見つける）', () => {
    const varied = (row: string) => new Set(row).size >= 3;
    for (const a of maps) {
      for (const b of maps) {
        if (a === b || (NOT_YET_REMADE.includes(a.id) && NOT_YET_REMADE.includes(b.id))) continue;
        const rowsB = new Set(b.rows);
        const shared = a.rows.filter((r) => varied(r) && rowsB.has(r)).length;
        expect(shared / a.rows.length, `${a.id} の行が ${b.id} にある`).toBeLessThanOrEqual(0.3);
      }
    }
  });

  it('歩けるマスはすべてつながっている（宝箱や町の人が閉じた区画にいない。古いセーブの位置で閉じ込められない）', () => {
    for (const m of maps.filter((x) => !NOT_YET_REMADE.includes(x.id))) {
      const open: { x: number; y: number }[] = [];
      m.rows.forEach((row, y) => [...row].forEach((_, x) => (tileAt(m, x, y)?.blocked === false ? open.push({ x, y }) : undefined)));
      const all = Object.fromEntries((m.gates ?? []).map((g) => [g.flag, true]));
      const area = reachable(m, open[0]!, all);
      const lost = open.filter((p) => !area.has(`${p.x},${p.y}`));
      expect(lost.slice(0, 5), `${m.id}: ${lost.length} マスが離れている`).toEqual([]);
    }
  });
});
