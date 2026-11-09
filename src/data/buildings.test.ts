import { describe, expect, it } from 'vitest';
import { buildingTown, townOf } from './buildings';
import { JINGI_REQUEST_KINDS, pendingJingiRequest } from './jingiRequests';
import { canStep, MAPS, tileAt, type MapDef } from './maps';
import { isMinka } from './minka';
import { OYABUN } from './oyabun';
import { oyabunRequestId } from './oyabunRequests';

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
  const TOWNS = ['shimizu', 'sunpu', 'nagoya', 'kyo', 'iga', 'osaka', 'hiroshima', 'nagasaki', 'kanazawa', 'sendai', 'hamamatsu', 'hikone', 'kumamoto', 'aizu', 'edo'];
  // 鍵をかけた戸（入れなくてよい。ユーザーの決定「鍵をかけたもの以外のすべての建物に入れる」）
  const LOCKED: Record<string, [number, number][]> = {
    hiroshima: [[15, 4]], // 城の門（門番が堀の橋をふさぐ）
    kanazawa: [[28, 13]], // 城の門（ご家老の命で門番が固める）
    sendai: [[6, 13]], // 青葉城の門（門番が固める）
    hamamatsu: [[11, 5]], // 浜松城の門（門番が堀の橋をふさぐ）
    hikone: [[14, 5]], // 彦根城の門（門番が堀の橋をふさぐ）
    kumamoto: [[18, 5]], // 熊本城の門（門番が堀の橋をふさぐ）
    aizu: [[24, 6]], // 鶴ヶ城の門（門番が堀の橋をふさぐ）
    edo: [[32, 5]], // 江戸城の大手門（門番が堀の橋をふさぐ。門が開いたあとは橋の出口から本丸御殿へ入る）
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
      // 戸口の 1 マス下へ戻る（東を向く北前船の屋形の戸だけは、戸の東のマス）
      const front = map.id === 'kitamaeYakata' ? { x: entrance.x + 1, y: entrance.y } : { x: entrance.x, y: entrance.y + 1 };
      expect({ to: exit.to, x: exit.toX, y: exit.toY }, map.id).toEqual({ to: town.id, ...front });
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
    // 清水湊・駿府・名古屋・京・伊賀上野・大坂・広島・長崎・金沢・仙台・浜松・彦根・熊本・会津若松・江戸の賭場・居酒屋・妓楼・親分の屋敷（町を足すと増える）
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

  it('彦根の埋木舎の老女・具足師の甚兵衛・旅籠の主人・店の人・近江商人・寺の僧は建物の中にいる。甚兵衛の弟子は工房の前に残る', () => {
    expect(MAPS.hikoneGusokushiKobo!.npcs.find((n) => n.id === 'jinbei')?.event).toBe('hikoneJinbei');
    expect(MAPS.hikoneUmoregi!.npcs.some((n) => n.id === 'umoregiRoba')).toBe(true);
    expect(MAPS.hikoneOmiShoka!.npcs.some((n) => n.id === 'omiShonin')).toBe(true);
    expect(MAPS.hikoneYado!.npcs.find((n) => n.id === 'hikoneInn')?.action).toBe('inn');
    expect(MAPS.hikoneTera!.npcs.find((n) => n.id === 'hikoneTemple')?.action).toBe('temple');
    const moved = ['umoregiRoba', 'jinbei', 'hikoneInn', 'hikoneTeahouse', 'hikoneHikyaku', 'hikoneYorozu', 'hikoneKaji', 'omiShonin', 'hikoneTemple'];
    expect(MAPS.hikone!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    // 弟子は工房の戸 (40, 4) の脇に立ち、戸の前はふさがない
    const deshi = MAPS.hikone!.npcs.find((n) => n.id === 'jinbeiDeshi')!;
    expect(deshi.y).toBe(5);
    expect(deshi.x).not.toBe(40);
    // 居酒屋の漁師は、芹川一家の親分の頼み（網を切る荒くれ）を果たすと台詞が変わる
    expect(MAPS.hikoneIzakaya!.npcs.find((n) => n.id === 'hikoneIzakayaKyaku1')?.after?.flag).toBe(oyabunRequestId('hikone'));
  });

  it('熊本の旅籠の主人・店の人・畳屋・寺の僧は建物の中にいる。井戸の水が戻ると、屋内の人の台詞も変わる', () => {
    expect(MAPS.kumamotoYado!.npcs.find((n) => n.id === 'kumamotoInn')?.action).toBe('inn');
    expect(MAPS.kumamotoTera!.npcs.find((n) => n.id === 'kumamotoTemple')?.action).toBe('temple');
    expect(MAPS.kumamotoRenkonya!.npcs.find((n) => n.id === 'kumamotoRenkon')?.shop).toBe('kumamotoRenkon');
    expect(MAPS.kumamotoTatamiyaIe!.npcs.some((n) => n.id === 'kumamotoTatamiya')).toBe(true);
    const moved = ['kumamotoInn', 'kumamotoTeahouse', 'kumamotoHikyaku', 'kumamotoYorozu', 'kumamotoKaji', 'kumamotoRenkon', 'kumamotoTatamiya', 'kumamotoTemple'];
    expect(MAPS.kumamoto!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    for (const [map, id] of [['kumamotoYado', 'kumamotoYadoJochu'], ['kumamotoYuya', 'kumamotoYuyaSansuke'], ['kumamotoTera', 'kumamotoTeraKozo'], ['kumamotoOyabunYashiki', 'kumamotoOyabunAnesan']] as const) {
      expect(MAPS[map]!.npcs.find((n) => n.id === id)?.after?.flag, id).toBe('kumamotoIdoFound');
    }
    // 居酒屋の人足と一家の子分は、白川一家の親分の頼み（普請場の浪人）を果たすと台詞が変わる
    expect(MAPS.kumamotoIzakaya!.npcs.find((n) => n.id === 'kumamotoIzakayaKyaku1')?.after?.flag).toBe(oyabunRequestId('kumamoto'));
    expect(MAPS.kumamotoOyabunYashiki!.npcs.find((n) => n.id === 'kumamotoOyabunKobun')?.after?.flag).toBe(oyabunRequestId('kumamoto'));
  });

  it('会津若松の旅籠の主人・店の人・造り酒屋の番頭・寺の僧・藩士・塗師は建物の中にいる。平太が戻る・什の一件が済む・親分の頼みを果たすと、屋内の人の台詞も変わる', () => {
    expect(MAPS.aizuYado!.npcs.find((n) => n.id === 'aizuInn')?.action).toBe('inn');
    expect(MAPS.aizuTera!.npcs.find((n) => n.id === 'aizuTemple')?.action).toBe('temple');
    expect(MAPS.aizuSakagura!.npcs.some((n) => n.id === 'aizuBanto')).toBe(true);
    expect(MAPS.aizuHanshiYashiki!.npcs.some((n) => n.id === 'aizuHanshi')).toBe(true);
    expect(MAPS.aizuNushiIe!.npcs.some((n) => n.id === 'aizuNushi')).toBe(true);
    const moved = ['aizuInn', 'aizuTeahouse', 'aizuHikyaku', 'aizuYorozu', 'aizuKaji', 'aizuBanto', 'aizuTemple', 'aizuHanshi', 'aizuNushi'];
    expect(MAPS.aizu!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    // 店の人は、店の ID と施設の種類をそのまま持つ
    const everyone = Object.values(MAPS).filter((m) => buildingTown(m.id) === 'aizu').flatMap((m) => m.npcs);
    for (const [id, action, shop] of [['aizuTeahouse', 'teahouse', 'aizuChaya'], ['aizuYorozu', 'shop', 'aizuYorozu'], ['aizuKaji', 'shop', 'aizuKaji'], ['aizuHikyaku', 'hikyaku', undefined]] as const) {
      const npc = everyone.find((n) => n.id === id);
      expect({ action: npc?.action, shop: npc?.shop }, id).toEqual({ action, shop });
    }
    // 七日町通りの南の長屋の戸 (15, 28) は民家。前に立っていたおかみは 1 マス左へずらした
    expect(MAPS.aizu!.exits.find((e) => e.x === 15 && e.y === 28)?.to).toBe('minka_aizu_15_28');
    expect(MAPS.aizu!.npcs.find((n) => n.id === 'aizuOkami')).toMatchObject({ x: 14, y: 29 });
    expect(MAPS.aizuChayaMise!.npcs.find((n) => n.id === 'aizuTeahouse')?.after?.flag).toBe('heitaFound');
    expect(MAPS.aizuNisshinkan!.npcs.find((n) => n.id === 'aizuNisshinkanShosei2')?.after?.flag).toBe('heitaFound');
    for (const [map, id] of [['aizuNisshinkan', 'aizuNisshinkanShihan'], ['aizuTera', 'aizuTeraSankei']] as const) {
      expect(MAPS[map]!.npcs.find((n) => n.id === id)?.after?.flag, id).toBe('aizuJuuDone');
    }
    // 旅籠の商人・居酒屋の馬方・賭場の馬喰・一家の子分は、猪苗代一家の親分の頼み（峠の盗賊）を果たすと台詞が変わる
    for (const [map, id] of [['aizuYado', 'aizuYadoKyaku1'], ['aizuIzakaya', 'aizuIzakayaUmakata'], ['aizuTobakuba', 'aizuTobakuKyaku2'], ['aizuOyabunYashiki', 'aizuOyabunKobun']] as const) {
      expect(MAPS[map]!.npcs.find((n) => n.id === id)?.after?.flag, id).toBe(oyabunRequestId('aizu'));
    }
  });

  it('江戸の旅籠の主人・店の人・呉服屋の商人・寺の僧・火消しの頭・お鈴は建物の中にいる。源兵衛・小吉・お春は通りの戸の脇に立つ', () => {
    expect(MAPS.edoYado!.npcs.find((n) => n.id === 'edoInn')?.action).toBe('inn');
    expect(MAPS.edoTera!.npcs.find((n) => n.id === 'edoSo')?.action).toBe('temple');
    expect(MAPS.edoBanya!.npcs.find((n) => n.id === 'hikeshiGashira')?.event).toBe('hikeshiGashira');
    expect(MAPS.edoGenbeiIe!.npcs.find((n) => n.id === 'osuzu')?.showFlag).toBe('kokichiReport');
    expect(MAPS.edoGofukuya!.npcs.some((n) => n.id === 'edoShonin')).toBe(true);
    const moved = ['edoInn', 'edoTeahouse', 'edoHikyaku', 'edoYorozu', 'edoKaji', 'edoShonin', 'edoSo', 'hikeshiGashira', 'osuzu'];
    expect(MAPS.edo!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    // 店の人は、店の ID と施設の種類をそのまま持つ
    const everyone = Object.values(MAPS).filter((m) => buildingTown(m.id) === 'edo').flatMap((m) => m.npcs);
    for (const [id, action, shop] of [['edoTeahouse', 'teahouse', 'edoChaya'], ['edoYorozu', 'shop', 'edoYorozu'], ['edoKaji', 'shop', 'edoKaji'], ['edoHikyaku', 'hikyaku', undefined]] as const) {
      const npc = everyone.find((n) => n.id === id);
      expect({ action: npc?.action, shop: npc?.shop }, id).toEqual({ action, shop });
    }
    // 話しかけると戸口・路地・店先の場面になる源兵衛・小吉・お春は、それぞれの家の戸の脇に残す（戸の前はあける）
    expect(MAPS.edo!.npcs.find((n) => n.id === 'nagayaOoya')).toMatchObject({ x: 11, y: 15 });
    expect(MAPS.edo!.npcs.find((n) => n.id === 'kokichi')).toMatchObject({ x: 23, y: 15 });
    expect(MAPS.edo!.npcs.find((n) => n.id === 'oharu')).toMatchObject({ x: 52, y: 32 });
    expect(MAPS.edo!.exits.find((e) => e.x === 10 && e.y === 14)?.to).toBe('edoGenbeiIe');
    expect(MAPS.edo!.exits.find((e) => e.x === 22 && e.y === 14)?.to).toBe('edoKokichiIe');
    expect(MAPS.edo!.exits.find((e) => e.x === 51 && e.y === 31)?.to).toBe('edoYaoya');
    // 神田の長屋の 3 戸は民家
    for (const [x, y] of [[4, 14], [4, 19], [16, 19]] as const) expect(MAPS.edo!.exits.find((e) => e.x === x && e.y === y)?.to, `${x},${y}`).toBe(`minka_edo_${x}_${y}`);
    // 町と建物の中の人で、旅籠・茶屋・店・寺・飛脚・湯屋・賭場・居酒屋・妓楼・親分の屋敷がそろう
    expect(new Set([...MAPS.edo!.npcs, ...everyone].map((n) => n.action).filter(Boolean))).toEqual(
      new Set(['inn', 'teahouse', 'shop', 'temple', 'hikyaku', 'yuya', 'tobaku', 'izakaya', 'gyoro', 'oyabun']),
    );
    // 屋内の人も、神田の大火・火車からくり・浅草一家の親分の頼み（縁日の旗本奴）で台詞が変わる
    // 大火のさなかの台詞（taikaStarted）は、火車からくりを倒すと（kashaDefeated）鎮火のあとの台詞に変わる
    const all = Object.values(MAPS).filter((m) => buildingTown(m.id) === 'edo').flatMap((m) => m.npcs);
    for (const n of all.filter((n) => n.after?.flag === 'taikaStarted')) expect(n.later?.flag, n.id).toBe('kashaDefeated');
    expect(MAPS.edoBanya!.npcs.find((n) => n.id === 'edoBanyaMatoimochi')?.after?.flag).toBe('taikaStarted');
    expect(MAPS.edoTera!.npcs.find((n) => n.id === 'edoTeraKoshou')?.after?.flag).toBe('kashaDefeated');
    for (const [map, id] of [['edoIzakaya', 'edoIzakayaYashi'], ['edoOyabunYashiki', 'edoOyabunKobun']] as const) {
      expect(MAPS[map]!.npcs.find((n) => n.id === id)?.after?.flag, id).toBe(oyabunRequestId('edo'));
    }
  });
});

describe('町でないマップの建物の屋内（与力・黒田の屋敷、出島、北前船）', () => {
  // マップ → そこへ入ったときに立つマスと、すべての戸の前まで歩けるようになるフラグ
  const OUTER: Record<string, { start: { x: number; y: number }; flags: Record<string, boolean> }> = {
    yoriki: { start: { x: 17, y: 22 }, flags: { meiboFound: true } },
    dejima: { start: { x: 30, y: 9 }, flags: {} },
    kitamaebune: { start: { x: 11, y: 10 }, flags: {} },
  };

  it.each(Object.keys(OUTER))('%s の戸（D）はすべて入れ、入口から戸の前まで歩ける。戸口と屋内は 1 対 1', (mapId) => {
    const map = MAPS[mapId]!;
    const area = reachable(map, OUTER[mapId]!.start);
    const doors: string[] = [];
    map.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'D') return;
        const entrance = map.exits.find((e) => e.x === x && e.y === y);
        expect(entrance, `${x},${y}`).toBeDefined();
        expect(canStep(map, x, y), `${x},${y}`).toBe(true);
        expect(buildingTown(entrance!.to), `${x},${y}`).toBe(mapId);
        // 戸の外に立つマス（屋内の出口の戻り先）まで歩ける
        const inside = MAPS[entrance!.to]!;
        expect(area.has(`${inside.exits[0]!.toX},${inside.exits[0]!.toY}`), `${x},${y}`).toBe(true);
        doors.push(entrance!.to);
      }),
    );
    expect(doors.sort()).toEqual(buildings.filter((m) => buildingTown(m.id) === mapId).map((m) => m.id).sort());
  });

  it('黒田の屋敷の女中、出島のカピタン・通詞・商館の手代・医者・蔵番は建物の中にいる。用人は庭に残る', () => {
    expect(MAPS.yorikiHokoninNagaya!.npcs.some((n) => n.id === 'yorikiJochu')).toBe(true);
    expect(MAPS.yoriki!.npcs.map((n) => n.id)).toEqual(['yorikiYonin']);
    expect(MAPS.dejimaTsujiBeya!.npcs.find((n) => n.id === 'tsuji')?.event).toBe('tsujiMeet');
    expect(MAPS.dejimaKapitanBeya!.npcs.some((n) => n.id === 'kapitan')).toBe(true);
    expect(MAPS.dejimaShokan!.npcs.find((n) => n.id === 'dejimaShop')).toMatchObject({ action: 'shop', shop: 'dejimaShop' });
    expect(MAPS.dejimaIshaBeya!.npcs.some((n) => n.id === 'dejimaDoctor')).toBe(true);
    expect(MAPS.dejimaNigura!.npcs.some((n) => n.id === 'dejimaKura')).toBe(true);
    const moved = ['kapitan', 'tsuji', 'dejimaShop', 'dejimaDoctor', 'dejimaKura'];
    expect(MAPS.dejima!.npcs.some((n) => moved.includes(n.id))).toBe(false);
    // 商館の看板は、今までどおり商館の戸の左の壁に掛かる
    expect(MAPS.dejima!.exits.find((e) => e.to === 'dejimaShokan')?.sign).toBe('shokan');
  });

  it('黒田の屋敷の蔵の戸の前はごろつきのイベントのマスで、蔵には名簿が見つかった（meiboFound）あとにだけ入れる', () => {
    const yoriki = MAPS.yoriki!;
    const entrance = yoriki.exits.find((e) => e.to === 'yorikiKuraNaka')!;
    const front = { x: entrance.x, y: entrance.y + 1 };
    expect(yoriki.triggers!.find((t) => t.x === front.x && t.y === front.y)).toMatchObject({ event: 'yorikiKura', unless: 'meiboFound' });
    // 戸へは、その前のマスからしか入れない
    const neighbors = [[1, 0], [-1, 0], [0, -1]].filter(([dx, dy]) => tileAt(yoriki, entrance.x + dx!, entrance.y + dy!)?.blocked === false);
    expect(neighbors).toEqual([]);
  });

  it('北前船の屋形の戸は東を向き、屋形から出ると戸の東の甲板に立つ。屋形の中には敵が出ず、全滅したら長崎へ', () => {
    const ship = MAPS.kitamaebune!;
    const entrance = ship.exits.find((e) => e.to === 'kitamaeYakata')!;
    expect({ x: entrance.x, y: entrance.y }).toEqual({ x: 9, y: 10 });
    expect(MAPS.kitamaeYakata!.exits[0]).toMatchObject({ to: 'kitamaebune', toX: 10, toY: 10 });
    expect(tileAt(ship, 9, 11)?.blocked).toBe(true);
    expect(MAPS.kitamaeYakata!.encounter).toBeUndefined();
    expect(MAPS.kitamaeYakata!.respawnMap).toBe('nagasaki');
  });
});
