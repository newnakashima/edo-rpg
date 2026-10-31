// フィールドのマップ。フェーズ 1 では仮のタイルで、序章の清水湊と裏山だけを用意する。
// タイルの文字の意味は TILES を参照。

export type TileKind = 'ground' | 'grass' | 'road' | 'tree' | 'water' | 'wall' | 'roof' | 'door' | 'floor' | 'rock';

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
};

export type NpcAction = 'inn' | 'teahouse' | 'shop' | 'temple' | 'hikyaku';

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  /** 話しかけたときの台詞。1 要素が 1 ページ。 */
  lines: string[];
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
      'T=========================,T',
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
        lines: [],
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
        lines: ['お凛「おとっつぁんもおとっつぁんだよ。よそ者なんかに頼るなんて」'],
      },
    ],
    exits: [
      { x: 14, y: 0, to: 'urayama', toX: 10, toY: 12 },
      { x: 15, y: 0, to: 'urayama', toX: 11, toY: 12 },
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
          lines: [],
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

export const START_POSITION = { mapId: 'shimizu', x: 14, y: 7 };

export function tileAt(map: MapDef, x: number, y: number): TileDef | undefined {
  const ch = map.rows[y]?.[x];
  return ch === undefined ? undefined : TILES[ch];
}
