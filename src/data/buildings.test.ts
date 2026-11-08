import { describe, expect, it } from 'vitest';
import { buildingTown, townOf } from './buildings';
import { JINGI_REQUEST_KINDS, pendingJingiRequest } from './jingiRequests';
import { canStep, MAPS, tileAt, type MapDef } from './maps';
import { isMinka } from './minka';
import { OYABUN } from './oyabun';

/** (x, y) から、人と通れないマスを避けて歩いて行けるマス。 */
function reachable(map: MapDef, from: { x: number; y: number }): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  for (let p = queue.shift(); p; p = queue.shift()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      const key = `${x},${y}`;
      if (seen.has(key) || tileAt(map, x, y)?.blocked !== false || map.npcs.some((n) => n.x === x && n.y === y)) continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

const buildings = Object.values(MAPS).filter((m) => buildingTown(m.id));

describe('施設・民家以外の建物の屋内（テストプレイの指摘: あらゆる建物に入れるようにすべき）', () => {
  // 屋内を足した町（町を足したらここにも足す）
  const TOWNS = ['shimizu', 'sunpu', 'nagoya', 'kyo', 'iga', 'osaka', 'hiroshima', 'nagasaki', 'kanazawa', 'sendai', 'hamamatsu'];
  // 鍵をかけた戸（入れなくてよい。ユーザーの決定「鍵をかけたもの以外のすべての建物に入れる」）
  const LOCKED: Record<string, [number, number][]> = {
    hiroshima: [[15, 4]], // 城の門（門番が堀の橋をふさぐ）
    kanazawa: [[28, 13]], // 城の門（ご家老の命で門番が固める）
    sendai: [[6, 13]], // 青葉城の門（門番が固める）
    hamamatsu: [[11, 5]], // 浜松城の門（門番が堀の橋をふさぐ）
  };
  // 戸のある建物がなく、通りに立つ店（町の通りに残る施設の人）
  const STREET_SHOPS = ['kakibune'];

  it('通りに残す店（牡蠣船）は、本当に町の通りに立っている', () => {
    expect(MAPS.hiroshima!.npcs.some((n) => n.id === 'kakibune' && n.action === 'shop')).toBe(true);
  });

  it.each(TOWNS)('%s の入口から、町の人をよけて、入れる戸すべての前まで歩ける（人が狭い路地をふさがない）', (townId) => {
    const town = MAPS[townId]!;
    const start = MAPS.world!.towns!.find((t) => t.to?.mapId === townId)!.to!;
    const area = reachable(town, start);
    for (const e of town.exits.filter((e) => town.rows[e.y]?.[e.x] === 'D')) {
      expect(area.has(`${e.x},${e.y + 1}`), `${townId} ${e.x},${e.y}`).toBe(true);
    }
  });

  it.each(TOWNS)('%s の戸（D）はすべて入れる（民家か、建物ごとの屋内。鍵をかけた戸を除く）', (townId) => {
    const town = MAPS[townId]!;
    town.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'D') return;
        if (LOCKED[townId]?.some(([lx, ly]) => lx === x && ly === y)) {
          expect(canStep(town, x, y), `${x},${y}`).toBe(false);
          return;
        }
        const entrance = town.exits.find((e) => e.x === x && e.y === y);
        expect(entrance, `${x},${y}`).toBeDefined();
        expect(canStep(town, x, y), `${x},${y}`).toBe(true);
        expect(isMinka(entrance!.to) || buildingTown(entrance!.to) === townId, `${x},${y}`).toBe(true);
      }),
    );
    // 民家でない戸口の数だけ、その町の建物の屋内がある（戸口と屋内が 1 対 1）
    const doors = town.exits.filter((e) => town.rows[e.y]?.[e.x] === 'D' && !isMinka(e.to));
    const inside = buildings.filter((m) => buildingTown(m.id) === townId).map((m) => m.id);
    expect(doors.map((e) => e.to).sort()).toEqual(inside.sort());
  });

  it.each(TOWNS)('%s の施設の人は、町の通りではなく建物の中に立つ', (townId) => {
    // 戸のある建物のない店（広島の水の上の牡蠣船）は通りに残る
    const outside = MAPS[townId]!.npcs.filter((n) => n.action && !STREET_SHOPS.includes(n.id)).map((n) => n.id);
    expect(outside).toEqual([]);
  });

  it('戸口から入ると出口の 1 マス奥に立ち、出口からはその戸口の前（通れて人のいないマス）へ戻る', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      const entrance = town.exits.find((e) => e.to === map.id)!;
      expect(map.exits, map.id).toHaveLength(1);
      const exit = map.exits[0]!;
      expect({ to: exit.to, x: exit.toX, y: exit.toY }, map.id).toEqual({ to: town.id, x: entrance.x, y: entrance.y + 1 });
      expect({ x: entrance.toX, y: entrance.toY }, map.id).toEqual({ x: exit.x, y: exit.y - 1 });
      // 出口は下の壁の切れ目
      expect(exit.y, map.id).toBe(map.rows.length - 1);
      expect(tileAt(map, exit.x, exit.y)?.blocked, map.id).toBe(false);
      expect(town.npcs.some((n) => n.x === exit.toX && n.y === exit.toY), map.id).toBe(false);
    }
  });

  it('屋内の名前は町の名前つきで、全滅したら町と同じ戻り先へ戻る（ダンジョンではない）', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      expect(map.name.startsWith(`${town.name}の`), map.id).toBe(true);
      expect(map.respawnMap, map.id).toBe(town.respawn ? town.id : town.respawnMap);
      expect(map.encounter, map.id).toBeUndefined();
    }
  });

  it('間取りは建物ごとに違う（使い回してよいのは民家だけ）', () => {
    expect(new Set(buildings.map((m) => m.rows.join('\n'))).size).toBe(buildings.length);
  });

  it('入ったところから、屋内の人と家具のすべてに話しかけられる', () => {
    for (const map of buildings) {
      const town = MAPS[buildingTown(map.id)!]!;
      const entrance = town.exits.find((e) => e.to === map.id)!;
      const area = reachable(map, { x: entrance.toX, y: entrance.toY });
      for (const n of map.npcs) {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => area.has(`${n.x + dx!},${n.y + dy!}`));
        expect(near, `${map.id} ${n.id}`).toBe(true);
      }
    }
  });

  it('町の ID は、建物の中では出口の行き先の町、それ以外ではマップの ID のまま', () => {
    for (const map of buildings) expect(townOf(map.id), map.id).toBe(map.exits[0]!.to);
    for (const map of Object.values(MAPS).filter((m) => !buildingTown(m.id))) expect(townOf(map.id), map.id).toBe(map.id);
  });

  it('建物の中の施設の人も、町の ID（townOf）で施設の頼みと親分の屋敷を引ける（FieldScene の施設のメニュー）', () => {
    let checked = 0;
    for (const map of buildings) {
      for (const n of map.npcs) {
        const town = townOf(map.id);
        if ((JINGI_REQUEST_KINDS as readonly (string | undefined)[]).includes(n.action)) {
          expect(pendingJingiRequest(town, n.action as (typeof JINGI_REQUEST_KINDS)[number], {}), `${map.id} ${n.id}`).not.toBeNull();
          // 屋内のマップの ID のままでは引けない（町の ID に直す必要がある）
          expect(pendingJingiRequest(map.id, n.action as (typeof JINGI_REQUEST_KINDS)[number], {}), `${map.id} ${n.id}`).toBeNull();
          checked++;
        }
        if (n.action === 'oyabun') {
          expect(OYABUN[town], `${map.id} ${n.id}`).toBeDefined();
          checked++;
        }
      }
    }
    // 清水湊・駿府・名古屋・京・伊賀上野・大坂・広島・長崎・金沢・仙台・浜松の賭場・居酒屋・妓楼・親分の屋敷（町を足すと増える）
    expect(checked).toBeGreaterThanOrEqual(TOWNS.length * 4);
  });

  it('伊賀上野の鍵屋の隠居は、通りではなく自分の家の中にいる（仇討ちのあとの台詞も家の中で聞ける）', () => {
    const rojin = MAPS.igaInkyo!.npcs.find((n) => n.id === 'kagiyaRojin');
    expect(rojin?.after?.flag).toBe('gonrokuDefeated');
    expect(MAPS.iga!.npcs.some((n) => n.id === 'kagiyaRojin')).toBe(false);
  });

  it('辰五郎とお凛は一家の屋敷の中にいる。辰五郎の話（序章の頼み）は屋敷に入って聞く', () => {
    const ids = MAPS.shimizuOyabun!.npcs.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['tatsugoro', 'orin', 'shimizuOyabun']));
    expect(MAPS.shimizu!.npcs.some((n) => ['tatsugoro', 'orin', 'shimizuOyabun'].includes(n.id))).toBe(false);
  });

  it('大坂の榊兵庫は長屋の私塾の中で門弟と会い、加わると私塾から消える。米問屋の番頭は大黒屋の店の中にいる', () => {
    const juku = MAPS.osakaJuku!;
    const hyogo = juku.npcs.find((n) => n.id === 'hyogoJuku');
    expect(hyogo?.event).toBe('hyogoMeet');
    expect(hyogo?.hideFlag).toBe('hyogoJoined');
    expect(juku.npcs.filter((n) => n.name.includes('門弟')).length).toBeGreaterThanOrEqual(2);
    expect(MAPS.osakaDaikokuya!.npcs.some((n) => n.id === 'daikokuya')).toBe(true);
    expect(MAPS.osaka!.npcs.some((n) => ['hyogoJuku', 'daikokuya', 'osakaShibaiChaya'].includes(n.id))).toBe(false);
  });

  it('広島の船頭は船宿の中、旅籠の主人は旅籠の中にいる', () => {
    expect(MAPS.hiroshimaFunayado!.npcs.some((n) => n.id === 'hiroshimaSendo')).toBe(true);
    expect(MAPS.hiroshimaYado!.npcs.find((n) => n.id === 'hiroshimaInn')?.action).toBe('inn');
    expect(MAPS.hiroshima!.npcs.some((n) => ['hiroshimaSendo', 'hiroshimaInn', 'hiroshimaTemple'].includes(n.id))).toBe(false);
  });

  it('長崎の奉行所の役人・蘭方医・唐寺の僧・旅籠の主人は、通りではなく建物の中にいる', () => {
    expect(MAPS.nagasakiBugyosho!.npcs.some((n) => n.id === 'bugyoYakunin')).toBe(true);
    expect(MAPS.nagasakiRanpoi!.npcs.some((n) => n.id === 'ranpoI')).toBe(true);
    expect(MAPS.nagasakiTera!.npcs.find((n) => n.id === 'nagasakiTemple')?.action).toBe('temple');
    expect(MAPS.nagasakiYado!.npcs.find((n) => n.id === 'nagasakiInn')?.action).toBe('inn');
    expect(MAPS.nagasaki!.npcs.some((n) => ['bugyoYakunin', 'ranpoI', 'nagasakiTemple', 'nagasakiInn'].includes(n.id))).toBe(false);
  });

  it('金沢の長瀬左近と女中は武家屋敷の中、寺町の僧は寺の中、旅籠の主人と飛脚は建物の中にいる', () => {
    const sakon = MAPS.kanazawaSakonYashiki!.npcs.find((n) => n.id === 'sakon');
    expect(sakon?.event).toBe('sakonMeet');
    expect(MAPS.kanazawaSakonYashiki!.npcs.some((n) => n.id === 'bukeJochu')).toBe(true);
    expect(MAPS.kanazawaTera!.npcs.some((n) => n.id === 'teramachiSo')).toBe(true);
    expect(MAPS.kanazawaYado!.npcs.find((n) => n.id === 'kanazawaInn')?.action).toBe('inn');
    expect(MAPS.kanazawaHikyakuya!.npcs.find((n) => n.id === 'kanazawaHikyaku')?.action).toBe('hikyaku');
    const moved = ['sakon', 'bukeJochu', 'teramachiSo', 'kanazawaInn', 'kanazawaHikyaku', 'kanazawaGeiko', 'chayaOkami'];
    expect(MAPS.kanazawa!.npcs.some((n) => moved.includes(n.id))).toBe(false);
  });

  it('仙台の片平帯刀は屋敷の中、神主は大崎八幡宮の中、旅籠の主人・店の人・大町の老人は建物の中にいる', () => {
    expect(MAPS.sendaiTatewakiYashiki!.npcs.find((n) => n.id === 'tatewaki')?.event).toBe('tatewaki');
    expect(MAPS.sendaiHachiman!.npcs.find((n) => n.id === 'sendaiKannushi')?.action).toBe('temple');
    expect(MAPS.sendaiYado!.npcs.find((n) => n.id === 'sendaiInn')?.action).toBe('inn');
    expect(MAPS.sendaiGusokushiIe!.npcs.some((n) => n.id === 'sendaiRojin')).toBe(true);
    const moved = ['tatewaki', 'sendaiKannushi', 'sendaiInn', 'sendaiRojin', 'sendaiTeahouse', 'sendaiHikyaku', 'sendaiYorozu', 'sendaiKaji'];
    expect(MAPS.sendai!.npcs.some((n) => moved.includes(n.id))).toBe(false);
  });

  it('浜松の寺の僧・凧師の弥平・大工の棟梁とおかみ・旅籠の主人・店の人・うなぎ屋は建物の中にいる', () => {
    expect(MAPS.hamamatsuTera!.npcs.find((n) => n.id === 'hamamatsuTemple')?.action).toBe('temple');
    expect(MAPS.hamamatsuTakoshiIe!.npcs.find((n) => n.id === 'yahei')?.after?.flag).toBe('hamamatsuTakoDone');
    expect(MAPS.hamamatsuToryoIe!.npcs.filter((n) => n.id === 'toryo' || n.id === 'toryoOkami')).toHaveLength(2);
    expect(MAPS.hamamatsuYado!.npcs.find((n) => n.id === 'hamamatsuInn')?.action).toBe('inn');
    expect(MAPS.hamamatsuUnagiya!.npcs.some((n) => n.id === 'unagiya')).toBe(true);
    const moved = ['hamamatsuTemple', 'yahei', 'toryo', 'toryoOkami', 'hamamatsuInn', 'hamamatsuTeahouse', 'hamamatsuHikyaku', 'hamamatsuYorozu', 'hamamatsuKaji', 'unagiya'];
    expect(MAPS.hamamatsu!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    // 張りかけの大凧は、弥平の家の前に干したまま
    expect(MAPS.hamamatsu!.npcs.some((n) => n.id === 'yaheiDako')).toBe(true);
  });
});
