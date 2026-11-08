// 湯屋・賭場・居酒屋・妓楼（テストプレイで「施設を追加したほうが良い」と指摘されたため足した）。
// 武器屋（刀鍛冶）か道具屋（よろず屋）のあるすべての町に、4 つの施設を 1 つずつ置く（ユーザーの決定、2026-11-07）。
// 施設の人は戸口の真下（店先）に立つか、屋内のある町（src/data/buildings.ts）では建物の中に立つ。
// 看板（src/data/signs.ts）はどちらも戸の隣の壁に掛かる。施設の処理は src/systems/facilities.ts。
import type { CharacterSpriteId } from './sprites';
import type { NpcDef } from './maps';

export const TOWN_FACILITY_KINDS = ['yuya', 'tobaku', 'izakaya', 'gyoro'] as const;
export type TownFacilityKind = (typeof TOWN_FACILITY_KINDS)[number];

interface FacilityLook {
  /** ID の後ろに付ける語（<町>Yuya など）。 */
  suffix: string;
  name: string;
  sprite: CharacterSpriteId;
  color: number;
  lines: string[];
}

const LOOKS: Record<TownFacilityKind, FacilityLook> = {
  yuya: {
    suffix: 'Yuya',
    name: '湯屋の番頭',
    sprite: 'npc_merchant',
    color: 0x4a8a9a,
    lines: ['湯屋の番頭「へい、いらっしゃい。旅の垢を落として、さっぱりしていきなせえ」'],
  },
  tobaku: {
    suffix: 'Tobaku',
    name: '賭場の中盆',
    sprite: 'npc_ronin',
    color: 0x3a3030,
    lines: ['中盆「さあ、張った張った。丁か半か、度胸の見せどころだ」'],
  },
  izakaya: {
    suffix: 'Izakaya',
    name: '居酒屋の亭主',
    sprite: 'npc_innkeeper',
    color: 0x7a4a24,
    lines: ['亭主「らっしゃい。熱いのをつけやすぜ。一杯やれば、気も晴れまさあ」'],
  },
  gyoro: {
    suffix: 'Gyoro',
    name: '妓楼の女将',
    sprite: 'npc_okami',
    color: 0x962030,
    lines: ['女将「おいでなさいまし。お座敷で、三味線と唄でおもてなしいたしますよ」'],
  },
};

/**
 * 町ごとの施設の戸口（maps.ts の rows の D のマス）。施設の人はその真下に立つ。
 */
type TownDoors = Record<TownFacilityKind, { x: number; y: number }>;

const d = (x: number, y: number) => ({ x, y });

export const TOWN_FACILITY_DOORS: Record<string, TownDoors> = {
  shimizu: { yuya: d(3, 23), tobaku: d(9, 23), izakaya: d(16, 23), gyoro: d(22, 23) },
  sunpu: { yuya: d(21, 19), tobaku: d(26, 19), izakaya: d(22, 23), gyoro: d(27, 23) },
  nagoya: { yuya: d(15, 21), tobaku: d(29, 21), izakaya: d(38, 21), gyoro: d(46, 21) },
  kyo: { yuya: d(13, 16), tobaku: d(23, 16), izakaya: d(11, 22), gyoro: d(21, 22) },
  iga: { yuya: d(39, 21), tobaku: d(39, 25), izakaya: d(9, 15), gyoro: d(16, 22) },
  osaka: { yuya: d(29, 19), tobaku: d(38, 19), izakaya: d(47, 19), gyoro: d(39, 23) },
  hiroshima: { yuya: d(11, 16), tobaku: d(19, 16), izakaya: d(25, 16), gyoro: d(31, 16) },
  nagasaki: { yuya: d(15, 11), tobaku: d(27, 24), izakaya: d(21, 11), gyoro: d(29, 24) },
  kanazawa: { yuya: d(7, 27), tobaku: d(16, 27), izakaya: d(23, 27), gyoro: d(39, 27) },
  // 仙台は、民家と同じ棟の二つの戸のうち西の戸（看板が戸の左の壁に掛かり、二つの戸の間に掛からないように。東の戸は民家）
  sendai: { yuya: d(36, 25), tobaku: d(44, 25), izakaya: d(19, 33), gyoro: d(26, 33) },
  // 浜松も、同じ棟の二つの戸のうち西の戸（東の戸は、賭場の棟がうなぎ屋、居酒屋・妓楼の棟が民家）
  hamamatsu: { yuya: d(15, 24), tobaku: d(46, 18), izakaya: d(32, 24), gyoro: d(44, 24) },
  // 彦根は、どれも長屋と同じ棟の西の戸（看板が二つの戸の間に掛からないように。東の戸は長屋の民家。src/data/buildingsHikone.ts）
  hikone: { yuya: d(7, 24), tobaku: d(18, 24), izakaya: d(32, 24), gyoro: d(44, 24) },
  kumamoto: { yuya: d(10, 22), tobaku: d(17, 22), izakaya: d(7, 30), gyoro: d(11, 30) },
  aizu: { yuya: d(19, 28), tobaku: d(34, 28), izakaya: d(42, 19), gyoro: d(48, 19) },
  edo: { yuya: d(16, 14), tobaku: d(10, 19), izakaya: d(22, 19), gyoro: d(59, 16) },
};

/** 町ごとの台詞の差し替え（土地の色を出す。書かない施設は LOOKS の台詞）。 */
const TOWN_LINES: Record<string, Partial<Record<TownFacilityKind, string[]>>> = {
  kyo: { gyoro: ['女将「島原の太夫は、和歌も舞もたしなむ京の華。お座敷で、ゆるりとお過ごしやす」'] },
  osaka: { gyoro: ['女将「新町の座敷は、浪花一の賑わいだす。三味線と唄で、旅の疲れを忘れておくれやす」'] },
  nagasaki: { gyoro: ['女将「丸山のお座敷へようこそ。唐人さんも阿蘭陀さんも、ここでは同じお客さまですよ」'] },
  kanazawa: { gyoro: ['女将「ひがしの茶屋町の座敷は、金箔の屏風が自慢でございます。どうぞ、おあがりなさいまし」'] },
  edo: { gyoro: ['女将「吉原の大門をくぐったら、浮き世の憂さは忘れておくんなまし」'] },
};

/**
 * その町の施設の人。at を省くと戸口の真下（店先）に立つ。屋内のある施設（src/data/buildings.ts）は、屋内の立つ場所を at に渡す。
 */
export function townFacilityNpc(town: string, kind: TownFacilityKind, at?: { x: number; y: number }): NpcDef {
  const door = TOWN_FACILITY_DOORS[town]![kind];
  const look = LOOKS[kind];
  return {
    id: `${town}${look.suffix}`,
    name: look.name,
    x: at?.x ?? door.x,
    y: at?.y ?? door.y + 1,
    color: look.color,
    sprite: look.sprite,
    lines: TOWN_LINES[town]?.[kind] ?? look.lines,
    action: kind,
  };
}

/** その町の湯屋・賭場・居酒屋・妓楼の人（施設がない町は空）。どれも戸口の真下に立つ。 */
export function townFacilityNpcs(town: string): NpcDef[] {
  if (!TOWN_FACILITY_DOORS[town]) return [];
  return TOWN_FACILITY_KINDS.map((kind) => townFacilityNpc(town, kind));
}
