// 施設・民家以外の建物の屋内（テストプレイで「あらゆる建物に入れるようにすべき」と指摘されたため足した）。
// 民家（src/data/minka.ts）と違い、建物ごとに固有の間取りを描き、決して使い回さない（ユーザーの決定、2026-11-07）。
// 町ごとのファイル（buildingsShimizu.ts など）に建物を書き、ここで町のマップへ入口と出口をつなぐ。
// - 町の戸口（D のマス）に屋内への出口を置く（出口のある戸口には歩いて入れる。maps.ts の canStep）
// - 屋内の出口（下の壁の切れ目）からは、その戸口の 1 マス下（front があればそのマス）へ戻る
// - 町でないマップ（与力・黒田の屋敷、出島、北前船）の建物も、同じ仕組みでつなぐ（src/data/buildingsOuter.ts）
// - 施設の人（店の主人・住職など）は屋内に立つ。看板は、屋内の施設の人の種類で、町の戸口の隣の壁に掛ける（src/data/signs.ts）
import type { ExitDef, MapDef, NpcDef, TilesetId } from './maps';
import { signKind } from './signs';
import { townRespawnMap } from './minka';

export interface BuildingDef {
  /** 町のマップの戸口（rows の D のマス）。 */
  door: { x: number; y: number };
  /** 屋内から出たときに立つ、戸口の外のマス。省くと戸口の 1 マス下（戸が横を向く北前船の屋形などで指定する）。 */
  front?: { x: number; y: number };
  /** 屋内マップの ID（町の ID を頭に付ける。shimizuYorozuya など）。 */
  id: string;
  /** 屋内マップの名前（町の名前のあとに続ける。「よろず屋」なら「駿河・清水湊のよろず屋」）。 */
  name: string;
  /** 間取り（タイルセット interior なら、地面 . は土間、床 _ は板の間、草 , は畳）。下の壁の切れ目を出口にする。 */
  rows: string[];
  /** 外へ出る出口（下の壁の切れ目）。入ったときは、その 1 マス上に立つ。 */
  exit: { x: number; y: number };
  /** 屋内の人と家具。 */
  npcs: NpcDef[];
  /** 省くと interior。 */
  tileset?: TilesetId;
}

export const ANDON_LINES = ['行灯の紙ごしに、菜種油の火がやわらかく灯っている。'];

/** 家具（話しかけると台詞を出す物）。ID は建物の ID と通し番号から作る。 */
export function furniture(building: string, list: Omit<NpcDef, 'id' | 'color'>[]): NpcDef[] {
  return list.map((f, i) => ({ id: `${building}Kagu${i}`, color: 0x7a5a3a, ...f }));
}

/** 屋内マップの ID → その建物のある町の ID。 */
const BUILDING_TOWN: Record<string, string> = {};

/** その建物のある町（建物の屋内マップでなければ undefined。建物の屋内かどうかの判定にも使う）。 */
export function buildingTown(mapId: string): string | undefined {
  return BUILDING_TOWN[mapId];
}

/** そのマップのある町（建物の屋内ならその建物のある町、それ以外はマップの ID のまま）。施設の頼み・親分の屋敷を町ごとに引くのに使う。 */
export function townOf(mapId: string): string {
  return BUILDING_TOWN[mapId] ?? mapId;
}

/** 屋内から出たときに立つ、戸口の外のマス（指定がなければ戸口の 1 マス下）。 */
export function buildingFront(b: Pick<BuildingDef, 'door' | 'front'>): { x: number; y: number } {
  return b.front ?? { x: b.door.x, y: b.door.y + 1 };
}

/** 建物の屋内マップを作る。 */
function buildingMap(town: MapDef, b: BuildingDef): MapDef {
  return {
    id: b.id,
    name: `${town.name}の${b.name}`,
    tileset: b.tileset ?? 'interior',
    areaLevel: town.areaLevel,
    rows: [...b.rows],
    npcs: b.npcs,
    exits: [{ x: b.exit.x, y: b.exit.y, to: town.id, toX: buildingFront(b).x, toY: buildingFront(b).y }],
    // 全滅したら町（の旅籠の前）へ戻る
    respawnMap: townRespawnMap(town),
  };
}

/** 町の戸口から屋内へ入る出口。屋内に施設の人がいれば、その看板を戸の隣に掛ける。 */
function buildingEntrance(b: BuildingDef): ExitDef {
  const sign = b.npcs.map(signKind).find((k) => k !== null);
  return { x: b.door.x, y: b.door.y, to: b.id, toX: b.exit.x, toY: b.exit.y - 1, ...(sign ? { sign } : {}) };
}

/** 町に建物の屋内をつなぐ（屋内マップを maps に足し、町の戸口に入口を置く）。 */
export function addBuildings(maps: Record<string, MapDef>, townId: string, buildings: readonly BuildingDef[]): void {
  const town = maps[townId]!;
  for (const b of buildings) {
    maps[b.id] = buildingMap(town, b);
    BUILDING_TOWN[b.id] = townId;
    town.exits.push(buildingEntrance(b));
  }
}
