// 施設の看板（テストプレイで「看板がないと各施設を見分けることが非常に困難」と指摘されたため足した）。
// 施設の人（maps.ts の NpcDef の action）が立つ戸口の隣の壁に、施設の種類ごとの看板（板の色と漢字 1 字）を掛ける。
// 画像は public/assets/signs/<種類>.png（16 × 16。scripts/draw_signs.py で描いた。記録は public/assets/README.md）。
import { MAPS, type MapDef, type NpcDef } from './maps';

/** 看板の種類（scripts/draw_signs.py の SIGNS と同じ）。 */
export const SIGN_KINDS = ['yado', 'chaya', 'yorozu', 'kaji', 'hikyaku', 'tera', 'yashiro', 'shokan', 'kinpaku', 'renkon'] as const;
export type SignKind = (typeof SIGN_KINDS)[number];

/** 看板の字（画像に描いた字。テストと説明のため）。 */
export const SIGN_GLYPHS: Record<SignKind, string> = {
  yado: '宿',
  chaya: '茶',
  yorozu: '万',
  kaji: '刀',
  hikyaku: '飛',
  tera: '寺',
  yashiro: '社',
  shokan: '商',
  kinpaku: '金',
  renkon: '蓮',
};

/** よろず屋・刀鍛冶以外の店の看板（SHOPS の ID）。 */
const SHOP_SIGNS: Record<string, SignKind> = {
  dejimaShop: 'shokan',
  kanazawaKinpaku: 'kinpaku',
  kumamotoRenkon: 'renkon',
};

export interface SignDef {
  x: number;
  y: number;
  kind: SignKind;
}

export function signKey(kind: SignKind): string {
  return `sign-${kind}`;
}

/** 施設の人の看板の種類。施設でない人と、看板の決まっていない店は null。 */
export function signKind(npc: NpcDef): SignKind | null {
  switch (npc.action) {
    case 'inn':
      return 'yado';
    case 'teahouse':
      return 'chaya';
    case 'hikyaku':
      return 'hikyaku';
    case 'temple':
      return npc.sprite === 'npc_kannushi' ? 'yashiro' : 'tera';
    case 'shop':
      if (!npc.shop) return null;
      if (npc.shop.endsWith('Yorozu')) return 'yorozu';
      if (npc.shop.endsWith('Kaji')) return 'kaji';
      return SHOP_SIGNS[npc.shop] ?? null;
    default:
      return null;
  }
}

function cell(map: MapDef, x: number, y: number): string | undefined {
  return map.rows[y]?.[x];
}

/**
 * 施設の人の看板の位置。人の真上（なければ斜め上）の戸の左隣の壁、左が壁でなければ右隣の壁
 * （人が戸の斜め下に立つときは、頭で隠れないよう人の真上でない側を先に選ぶ）。
 * npc.sign があればその位置（false なら看板なし）。戸の隣に壁がなければ null。
 */
export function signPosition(map: MapDef, npc: NpcDef): { x: number; y: number } | null {
  if (npc.sign === false) return null;
  if (npc.sign) return npc.sign;
  const y = npc.y - 1;
  const doorX = [npc.x, npc.x - 1, npc.x + 1].find((x) => cell(map, x, y) === 'D');
  if (doorX === undefined) return null;
  const sides = [doorX - 1, doorX + 1].sort((a, b) => Number(a === npc.x) - Number(b === npc.x));
  const x = sides.find((x) => cell(map, x, y) === 'W');
  return x === undefined ? null : { x, y };
}

/** そのマップの看板（姿を消す人・あとから現れる人の施設は、マップの見た目を変えないよう常に掛けておく）。 */
export function mapSigns(map: MapDef): SignDef[] {
  const signs: SignDef[] = [];
  for (const npc of map.npcs) {
    const kind = signKind(npc);
    const pos = kind && signPosition(map, npc);
    if (kind && pos) signs.push({ ...pos, kind });
  }
  return signs;
}

/** すべてのマップの看板（テスト用）。 */
export function allSigns(): { map: MapDef; sign: SignDef }[] {
  return Object.values(MAPS).flatMap((map) => mapSigns(map).map((sign) => ({ map, sign })));
}
