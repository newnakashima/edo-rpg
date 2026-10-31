// フィールドのマップ。序章の清水湊と裏山、ワールドマップを用意する。
// タイルの文字の意味は TILES を参照。
import type { Facing } from '../systems/gameState';
import type { CharacterSpriteId } from './sprites';

/** タイルの種類。画像は public/assets/tiles/<種類>.png（PixelLab で生成。記録は public/assets/README.md）。 */
export const TILE_KINDS = ['ground', 'grass', 'road', 'tree', 'water', 'wall', 'roof', 'door', 'floor', 'rock', 'plain', 'town', 'gate'] as const;
export type TileKind = (typeof TILE_KINDS)[number];

export interface TileDef {
  kind: TileKind;
  blocked: boolean;
}

export const TILES: Record<string, TileDef> = {
  '.': { kind: 'ground', blocked: false },
  ',': { kind: 'grass', blocked: false },
  '=': { kind: 'road', blocked: false },
  T: { kind: 'tree', blocked: true },
  '~': { kind: 'water', blocked: true },
  W: { kind: 'wall', blocked: true },
  R: { kind: 'roof', blocked: true },
  D: { kind: 'door', blocked: true },
  _: { kind: 'floor', blocked: false },
  '^': { kind: 'rock', blocked: true },
  // ワールドマップ用: 街道（=）と町（O）・関所（G）だけを歩ける。野原（"）は通れない
  '"': { kind: 'plain', blocked: true },
  O: { kind: 'town', blocked: false },
  G: { kind: 'gate', blocked: false },
};

export type NpcAction = 'inn' | 'teahouse' | 'shop' | 'temple' | 'hikyaku';

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 画像ができるまでの仮の人の色（sprite がなければ使う）。 */
  color: number;
  /** 画像のある人はそのシート（src/data/sprites.ts）。 */
  sprite?: CharacterSpriteId;
  /** 最初の向き（sprite があるときだけ。既定は下）。 */
  facing?: Facing;
  /** 話しかけたときの台詞。1 要素が 1 ページ。event があれば使わない。 */
  lines?: string[];
  /** 台詞のあとに行う施設の処理。 */
  action?: NpcAction;
  /** action が 'shop' のときの店の ID（SHOPS）。 */
  shop?: string;
  /** このフラグが立っていたら、lines の代わりにこちらを話す。 */
  after?: { flag: string; lines: string[] };
  /** 話し終えたら立てるフラグ。 */
  setsFlag?: string;
  /** 話しかけたときに行うイベント（EVENTS の ID）。あれば lines などの代わりにこれを行う。 */
  event?: string;
}

/** マップに入ったとき、または決まった場所に乗ったときに行うイベント。unless のフラグが立っていれば行わない。 */
export interface EventTrigger {
  event: string;
  unless?: string;
}

export interface TownDef {
  x: number;
  y: number;
  name: string;
  to?: { mapId: string; x: number; y: number };
  /** まだ訪れられない町で出す台詞。 */
  lines?: string[];
}

export interface GateDef {
  x: number;
  y: number;
  flag: string;
  lines: string[];
}

export interface ExitDef {
  x: number;
  y: number;
  to: string;
  toX: number;
  toY: number;
}

export interface MapDef {
  id: string;
  name: string;
  rows: string[];
  npcs: NpcDef[];
  exits: ExitDef[];
  /** エンカウントの出現表の ID。町など戦闘のない場所は省略する。 */
  encounter?: string;
  /** 地域の敵レベル。宿代・茶屋の値段にも使う（docs/balance.md の「経済」）。 */
  areaLevel: number;
  /** 全滅したときに戻る場所（旅籠の前）。 */
  respawn?: { x: number; y: number };
  /** ワールドマップの町の印。印の上で決定ボタンを押すと to の場所へ入る（to がなければ lines を出す）。乗っただけでは入らない。 */
  towns?: TownDef[];
  /** 関所。flag が立つまで通れず、lines を出す。 */
  gates?: GateDef[];
  /** 範囲ごとの出現表（encounter より優先する）。 */
  encounterZones?: { x: number; y: number; w: number; h: number; encounter: string }[];
  /** マップに入ったときに行うイベント。 */
  onEnter?: EventTrigger;
  /** その場所に乗ったときに行うイベント。 */
  triggers?: (EventTrigger & { x: number; y: number })[];
}

export const MAPS: Record<string, MapDef> = {
  shimizu: {
    id: 'shimizu',
    name: '駿河・清水湊',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTT==TTTTTTTTTTTT',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T,RRRRR,RRRRR,==,RRRRRRRRR,T',
      'T,WWDWW,WWDWW,==,WWDWWWDWW,T',
      'T,.....,,,,,,,==,,,,,.....,T',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T===========================',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T,RRRRRRR,RRR,==RRR,RRRRR,,T',
      'T,WWWDWWW,WDW,==WDW,WWDWW,,T',
      'T,.......,,,,,==,,,,.....,,T',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T~~~~~~~~~~~~~~~~~~~~~~~~~~T',
      'T~~~~~~~~~~~~~~~~~~~~~~~~~~T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'tatsugoro',
        name: '辰五郎',
        x: 5,
        y: 10,
        color: 0x8a3b2e,
        sprite: 'tatsugoro',
        event: 'tatsugoro',
      },
      {
        id: 'innkeeper',
        name: '旅籠の主人',
        x: 23,
        y: 4,
        color: 0x5a6b8c,
        lines: ['旅籠の主人「お泊まりですかい。ゆっくり休んでいきなせえ」'],
        action: 'inn',
      },
      {
        id: 'teahouse',
        name: '茶屋の娘',
        x: 4,
        y: 4,
        color: 0xc76b8f,
        lines: ['茶屋の娘「いらっしゃいまし。お団子はいかが？」'],
        action: 'teahouse',
      },
      {
        id: 'yorozuya',
        name: 'よろず屋',
        x: 10,
        y: 4,
        color: 0x6b8c5a,
        lines: ['よろず屋「傷薬に毒消し、なんでもそろってますよ」'],
        action: 'shop',
        shop: 'shimizuYorozu',
      },
      {
        id: 'kaji',
        name: '刀鍛冶',
        x: 19,
        y: 4,
        color: 0x5a5a6b,
        lines: ['刀鍛冶「旅の御仁、得物の手入れは怠りなさんな」'],
        action: 'shop',
        shop: 'shimizuKaji',
      },
      {
        id: 'temple',
        name: '寺の住職',
        x: 11,
        y: 10,
        color: 0xb08a3e,
        lines: ['住職「迷える者よ、倒れた者があればお祓いをして進ぜよう」'],
        action: 'temple',
      },
      {
        id: 'hikyaku',
        name: '飛脚',
        x: 17,
        y: 10,
        color: 0x3e7cb0,
        lines: ['飛脚「へい、まいど！ 記録の言付けも、荷物の預かりも承りやす」'],
        action: 'hikyaku',
      },
      {
        id: 'nagaya',
        name: '長屋のおかみ',
        x: 22,
        y: 10,
        color: 0x9c8a5a,
        lines: ['長屋のおかみ「隣の与吉さんも、狐火を見たって言った晩にいなくなったんだよ。おお、こわい」'],
      },
      {
        id: 'orin',
        name: 'お凛',
        x: 8,
        y: 11,
        color: 0xd04a4a,
        sprite: 'orin',
        lines: ['お凛「おとっつぁんもおとっつぁんだよ。よそ者なんかに頼るなんて」'],
      },
    ],
    exits: [
      { x: 14, y: 0, to: 'urayama', toX: 10, toY: 12 },
      { x: 15, y: 0, to: 'urayama', toX: 11, toY: 12 },
      // 東の街道からワールドマップへ
      { x: 27, y: 6, to: 'world', toX: 41, toY: 10 },
    ],
    respawn: { x: 23, y: 5 },
    onEnter: { event: 'intro', unless: 'intro' },
  },
  urayama: {
    id: 'urayama',
    name: '清水湊・裏山',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T,,,,,TTT,,,,,,^^^,,,,,,,T',
      'T,,T,,,,,,,,T,,,^,,,,,,,,T',
      'T,,TT,,,^^,,,,,,,,T,,,,,,T',
      'T,,,,,,,^,,,TT,,,,,,,,,,,T',
      'T,T,,,,,,,,,,,,,^,,,,,,,,T',
      'T,,,,TT,,,,,,,,,^^,,,,,,,T',
      'T,,,,,,,,T,,,,,,,,,T,,,,,T',
      'T,^^,,,,,,,,TTT,,,,,,,,,,T',
      'T,,,,,,T,,,,,,,,,,,,,,,,,T',
      'T,,TT,,,,,,,,,,,T,,,,,,,,T',
      'T,,,,,,,,,,,,,,,,,,,,,,,,T',
      'T,,,,,,,,,,,,,,,,,,,,,,,,T',
      'TTTTTTTTTT==TTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'urayamaShrine',
        name: '祠',
        x: 4,
        y: 1,
        color: 0x8c8c7a,
        event: 'urayamaShrine',
      },
    ],
    exits: [
      { x: 10, y: 13, to: 'shimizu', toX: 14, toY: 1 },
      { x: 11, y: 13, to: 'shimizu', toX: 15, toY: 1 },
    ],
    encounter: 'urayama',
  },
};

/** 町に入る前の印（ワールドマップから町へ）。 */
const NOT_YET = (name: string, chapter: string): string[] => [`${name}。（${chapter}で訪れる）`];

MAPS.world = {
  id: 'world',
  name: '日本',
  areaLevel: 1,
  rows: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~"""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~"""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~""""O""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~"""""""""""""""""~~~~~~~~~"""""""""""""~~~',
      '~~~~~~~~~~~~~~""""""""^^"""""""~~~~~~~~~"""""""TT"O""~~~',
      '~~~~~~~~~~""""""""""""""""""""^^"^""""^""""^""""""=""~~~',
      '~~~~~~~~~~""""""^^"""""""^^""""^^"""^^""""^"""""""=""~~~',
      '~~~~~~~~~~""TT""""""""""""""""""""""""""""""""""""="""~~',
      '~~~~~~~~~~"""""""""""===O=======O===G==O"====G====O"""~~',
      '~~~~~~~~~~====O======O"""""O"""""""""""==O""""""""""""~~',
      '~~~~~~~~~~="""""""""""""""""TT"""""T""""T"""""""""""""~~',
      '~"""""=====""""""""""""""""""""""""""""""""""""""""~~~~~',
      '~""====""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""="^"""~~~~""""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""O"^"""~~~~""T""^""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""T"~~~~""""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  npcs: [],
  exits: [],
  towns: [
    { x: 41, y: 11, name: '清水湊', to: { mapId: 'shimizu', x: 26, y: 6 } },
    { x: 39, y: 10, name: '駿府', lines: NOT_YET('駿府城下', '第 1 章') },
    { x: 32, y: 10, name: '名古屋', lines: NOT_YET('尾張名古屋', '第 2 章') },
    { x: 27, y: 11, name: '伊賀', lines: NOT_YET('伊賀上野', '第 4 章') },
    { x: 24, y: 10, name: '京', lines: NOT_YET('京', '第 3 章') },
    { x: 21, y: 11, name: '大坂', lines: NOT_YET('大坂', '第 5 章') },
    { x: 14, y: 11, name: '広島', lines: NOT_YET('広島', '第 6 章') },
    { x: 3, y: 16, name: '長崎', lines: NOT_YET('長崎・出島', '第 6 章') },
    // 金沢へは街道でつながず、第 7 章で長崎から北前船（イベント）で渡る
    { x: 24, y: 4, name: '金沢', lines: NOT_YET('加賀金沢', '第 7 章') },
    { x: 50, y: 10, name: '江戸', lines: NOT_YET('江戸', '第 8 章') },
    { x: 50, y: 6, name: '仙台', lines: NOT_YET('仙台', '第 8 章') },
  ],
  gates: [
    { x: 36, y: 10, flag: 'oigawaOpen', lines: ['大井川の渡し場だ。川越し人足「水かさが増えて、今は渡せねえよ」'] },
    { x: 45, y: 10, flag: 'hakoneTegata', lines: ['箱根の関所だ。役人「通行手形なき者は、通すわけにはいかぬ」'] },
  ],
  // 出現範囲は今は駿河だけ。ほかの地域の範囲は、その地域の敵を作るとき（フェーズ 4 の各章）に足す
  encounterZones: [{ x: 36, y: 9, w: 10, h: 4, encounter: 'suruga' }],
};

export const START_POSITION = { mapId: 'shimizu', x: 14, y: 7 };

export type TownAction =
  | { kind: 'enter'; to: { mapId: string; x: number; y: number } }
  | { kind: 'info'; lines: string[] }
  | { kind: 'label'; text: string };

/**
 * ワールドマップの町の印での動き。乗ったとき（step）は名前を出すだけで入らず、
 * 決定ボタン（ok）で入る（まだ入れない町は案内を出す）。印がなければ null。
 */
export function townAction(map: MapDef, x: number, y: number, by: 'step' | 'ok'): TownAction | null {
  const town = map.towns?.find((t) => t.x === x && t.y === y);
  if (!town) return null;
  if (by === 'step') return { kind: 'label', text: town.to ? `${town.name}（決定で入る）` : town.name };
  if (town.to) return { kind: 'enter', to: town.to };
  return { kind: 'info', lines: town.lines ?? [town.name] };
}

/** その場所の出現表の ID（範囲の指定が優先。なければマップ全体の encounter）。 */
export function encounterAt(map: MapDef, x: number, y: number): string | undefined {
  const zone = map.encounterZones?.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  return zone?.encounter ?? map.encounter;
}

/** 通れない関所（flag がまだ立っていない）。 */
export function closedGateAt(map: MapDef, x: number, y: number, flags: Record<string, boolean>): GateDef | undefined {
  return map.gates?.find((g) => g.x === x && g.y === y && !flags[g.flag]);
}

export function tileAt(map: MapDef, x: number, y: number): TileDef | undefined {
  const ch = map.rows[y]?.[x];
  return ch === undefined ? undefined : TILES[ch];
}
