// 民家の屋内（テストプレイで「あらゆる建物に入れるようにすべき」と指摘されたため足した）。
// 屋内の使い回しは民家だけに許し、民家も最低 3 種類に描き分ける（ユーザーの決定、2026-11-07）。
// 町家・長屋・農家の 3 つの間取りを用意し、民家の戸口ごとに間取りの写しを 1 つの屋内マップとして作る
// （出口がその戸口の前に戻るよう、戸口ごとに別のマップにする。ID は minka_<町>_<x>_<y>）。
// 戸口（町のマップの D のマス）は通れないままにし、出口を置いた戸口にだけ歩いて入れる（canStep）。
// 前に町の人が立っている戸口（入れない）と、寺社・城・屋敷・店などの民家でない建物は、ここに入れない
// （施設・民家以外の建物の屋内は、建物ごとに固有のマップを作る別の作業で扱う）。
import type { CharacterSpriteId } from './sprites';
import type { ExitDef, MapDef, NpcDef } from './maps';

const MINKA_PREFIX = 'minka_';

export const MINKA_KINDS = ['machiya', 'nagaya', 'noka'] as const;
export type MinkaKind = (typeof MINKA_KINDS)[number];

interface MinkaPlan {
  name: string;
  rows: string[];
  /** 入ったときに立つ場所（出口の 1 マス奥）。 */
  arrive: { x: number; y: number };
  /** 外へ出る出口（下の壁の切れ目）。 */
  exit: { x: number; y: number };
  /** 住人の立つ場所。 */
  resident: { x: number; y: number };
  /** 家具（話しかけると台詞を出す物）。 */
  furniture: Omit<NpcDef, 'id'>[];
}

const KAMADO_LINES = ['竈に釜が掛かっている。焚き口の火が、ちろちろと燃えている。'];
const TANSU_LINES = ['使い込まれた箪笥だ。黒い金具が、よく磨かれている。'];

/**
 * 間取り。タイルセットは interior（地面 . は土間、床 _ は板の間、草 , は畳）。
 * - 町家: 表から奥へ通り土間が抜け、右に店の間（板の間）と奥の座敷（畳）が並ぶ
 * - 長屋: 九尺二間の一間。表に土間と竈、奥に畳の間
 * - 農家: 広い土間に竈、板の間の真ん中に囲炉裏、奥に座敷
 */
const PLANS: Record<MinkaKind, MinkaPlan> = {
  machiya: {
    name: '町家',
    rows: [
      'WWWWWWWWWWWWW',
      'W...W,,,,,,,W',
      'W...W,,,,,,,W',
      'W...W,,,,,,,W',
      'W...,,,,,,,,W',
      'W...WWWW_WWWW',
      'W...W_______W',
      'W...________W',
      'W...W_______W',
      'W...W_______W',
      'WW.WWWWWWWWWW',
    ],
    arrive: { x: 2, y: 9 },
    exit: { x: 2, y: 10 },
    resident: { x: 8, y: 7 },
    furniture: [
      { name: '竈', x: 2, y: 1, color: 0xb09070, object: 'kamado', lines: KAMADO_LINES },
      { name: '箪笥', x: 11, y: 1, color: 0x7a4a24, object: 'tansu', lines: TANSU_LINES },
      { name: '帳場の文机', x: 10, y: 8, color: 0x7a5a3a, object: 'fuzukue', lines: ['帳場の文机だ。大福帳と算盤が載っている。'] },
    ],
  },
  nagaya: {
    name: '長屋',
    rows: [
      'WWWWWWWWWW',
      'W,,,,,,,,W',
      'W,,,,,,,,W',
      'W,,,,,,,,W',
      'W________W',
      'W____....W',
      'W____....W',
      'WWWWWW.WWW',
    ],
    arrive: { x: 6, y: 6 },
    exit: { x: 6, y: 7 },
    resident: { x: 3, y: 2 },
    furniture: [
      { name: '竈', x: 8, y: 5, color: 0xb09070, object: 'kamado', lines: KAMADO_LINES },
      { name: '箪笥', x: 8, y: 1, color: 0x7a4a24, object: 'tansu', lines: TANSU_LINES },
    ],
  },
  noka: {
    name: '農家',
    rows: [
      'WWWWWWWWWWWWWWWW',
      'W......W,,,,,,,W',
      'W......W,,,,,,,W',
      'W......W,,,,,,,W',
      'W......WWWW_WWWW',
      'W......________W',
      'W......________W',
      'W......________W',
      'W......________W',
      'W......________W',
      'WWWWWW.WWWWWWWWW',
    ],
    arrive: { x: 6, y: 9 },
    exit: { x: 6, y: 10 },
    resident: { x: 12, y: 7 },
    furniture: [
      { name: '竈', x: 2, y: 1, color: 0xb09070, object: 'kamado', lines: KAMADO_LINES },
      { name: '木箱', x: 5, y: 1, color: 0x8a6a40, object: 'kibako', lines: ['木箱に、農具と藁が詰まっている。'] },
      {
        name: '囲炉裏',
        x: 10,
        y: 7,
        color: 0x5a4a3a,
        object: 'irori',
        lines: ['囲炉裏に炭が赤く熾っている。自在鉤に掛けた鉄瓶が、湯気を立てている。'],
      },
      { name: '箪笥', x: 13, y: 1, color: 0x7a4a24, object: 'tansu', lines: TANSU_LINES },
    ],
  },
};

/** 住人の顔ぶれ（戸口の順に回して選ぶ。どの町にいてもおかしくない台詞にする）。 */
const RESIDENTS: { name: string; sprite: CharacterSpriteId; color: number; lines: string[] }[] = [
  { name: 'おかみさん', sprite: 'npc_okami', color: 0x8a5a6a, lines: ['おかみさん「あら、旅の人かい。何もない家だけど、ひと休みしておいき」'] },
  { name: '隠居', sprite: 'npc_rojin', color: 0x8a8070, lines: ['隠居「わしも若い頃は方々を歩いたもんじゃ。足が達者なうちに、いろいろ見ておくがええ」'] },
  { name: '大工', sprite: 'npc_ninsoku', color: 0x8a7a6a, lines: ['大工「今日は普請場が休みでな。たまにゃ家でごろごろするのも悪かねえや」'] },
  { name: '子ども', sprite: 'npc_kodomo', color: 0xc08a5a, lines: ['子ども「おっかあは井戸端だよ。おいらは留守番してるんだ」'] },
  { name: '娘', sprite: 'npc_musume', color: 0xc06a7a, lines: ['娘「針仕事の途中で、散らかっていてすみません。どうぞ、お気になさらず」'] },
  { name: '棒手振り', sprite: 'npc_merchant', color: 0x4a6a8a, lines: ['棒手振り「明日も夜明け前から売り歩きでさ。天秤棒が肩に食い込むのなんの」'] },
  { name: '婆さま', sprite: 'npc_roba', color: 0x7a7070, lines: ['婆さま「近ごろ物騒だねえ。旅の人も、夜道には気をつけなされや」'] },
  { name: '浪人', sprite: 'npc_ronin', color: 0x3a3030, lines: ['浪人「傘張りの内職で、どうにか食いつないでおる。武士は食わねど高楊枝、よ」'] },
];

/** 町ごとの民家の戸口と間取り（maps.ts の rows の D のマス。前の 1 マスが通れて、人が立っていない戸口だけ）。 */
type MinkaDoor = { x: number; y: number; kind: MinkaKind };
const m = (x: number, y: number): MinkaDoor => ({ x, y, kind: 'machiya' });
const n = (x: number, y: number): MinkaDoor => ({ x, y, kind: 'nagaya' });
const k = (x: number, y: number): MinkaDoor => ({ x, y, kind: 'noka' });

export const MINKA_DOORS: Record<string, MinkaDoor[]> = {
  // 南の長屋の二棟（湯屋・賭場・居酒屋・妓楼と同じ棟に並ぶ家も長屋）
  shimizu: [n(3, 20), n(9, 20), n(16, 20), n(19, 20), n(22, 20), n(6, 23), n(19, 23)],
  // 南の町家。北東の二つの戸口が並ぶ家（14, 27・15, 27）は、一軒として西の戸口だけを入口にする
  nagoya: [m(14, 27), m(19, 27), m(23, 27), m(37, 27), m(41, 27), m(15, 33), m(21, 33), m(31, 33), m(39, 33)],
  kyo: [m(46, 16), m(50, 16), m(2, 22), m(29, 22), m(5, 28), m(21, 28), m(32, 28), m(3, 34), m(12, 34), m(22, 34), m(30, 34)],
  igaSato: [k(7, 14), k(14, 14), k(28, 14)],
  kagiya: [k(6, 5), k(22, 5), k(32, 5), k(6, 16), k(24, 16)],
  // 船場の町家と、南西の長屋の二棟
  osaka: [m(29, 11), n(3, 23), n(6, 23), n(9, 23), n(15, 23), m(46, 23), n(3, 26), n(6, 26), n(9, 26), n(12, 26), n(15, 26)],
  hiroshima: [m(2, 3), m(2, 10), m(6, 10), m(6, 17), m(38, 17)],
  kanazawa: [m(6, 21), m(52, 21), m(8, 35), m(41, 35)],
  kumamoto: [m(9, 30)],
};

/** 民家の屋内マップの ID。 */
export function minkaMapId(town: string, door: { x: number; y: number }): string {
  return `${MINKA_PREFIX}${town}_${door.x}_${door.y}`;
}

/** 民家の屋内マップを作る（間取りの写しに、その戸口の前へ戻る出口と住人を足す）。residentIndex で住人を選ぶ。 */
export function minkaMap(town: MapDef, door: MinkaDoor, residentIndex: number): MapDef {
  const plan = PLANS[door.kind];
  const id = minkaMapId(town.id, door);
  const resident = RESIDENTS[residentIndex % RESIDENTS.length]!;
  return {
    id,
    name: plan.name,
    tileset: 'interior',
    areaLevel: town.areaLevel,
    rows: [...plan.rows],
    npcs: [
      ...plan.furniture.map((f, i) => ({ ...f, id: `${id}_furniture${i}` })),
      { id: `${id}_resident`, ...plan.resident, ...resident, lines: [...resident.lines] },
    ],
    exits: [{ x: plan.exit.x, y: plan.exit.y, to: town.id, toX: door.x, toY: door.y + 1 }],
    // 全滅したら町（の旅籠の前）へ戻る。ダンジョンの中の里（伊賀者の里）は、その里の戻り先に合わせる
    respawnMap: town.respawn ? town.id : town.respawnMap,
  };
}

/** 町の戸口から民家へ入る出口（戸口のマスに置く。戸口は通れないが、出口のある戸口には入れる）。 */
export function minkaEntrance(town: string, door: MinkaDoor): ExitDef {
  const plan = PLANS[door.kind];
  return { x: door.x, y: door.y, to: minkaMapId(town, door), toX: plan.arrive.x, toY: plan.arrive.y };
}

/** 民家の屋内マップか。 */
export function isMinka(mapId: string): boolean {
  return mapId.startsWith(MINKA_PREFIX);
}
