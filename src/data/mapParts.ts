// マップの見た目を、1 種類 1 枚のタイルではなく、複数の部品を組み合わせて描くための決まり。
// 通れるかどうか（TILES の blocked）とマップの文字（rows）は変えず、描き方だけを変える。
// 作り方と使い方は .claude/skills/map-composition/SKILL.md。
import { TILE_KINDS, tileAt, tileTextureKey, type MapDef, type TileKind, type TilesetId } from './maps';

/**
 * 部品の組み方。
 * - dual: 地形の境目（角の自動タイル）。表示のタイルをマスの境目に半マスずらして置き、4 隅の 4 マスがその地形かどうか
 *   （NW*8 + NE*4 + SW*2 + SE*1）で 16 枚から選ぶ。境目以外の部分は透明で、下の地形の上に重ねる。森・池・山・草むらなど。
 *   画像は 4 × 4 枚のシート（public/assets/tiles/<タイルセット>/<種類>_dual.png。scripts/mapkit/wang_sheet.py で作る）。
 * - edge: 構造物（辺の自動タイル）。マスごとに、上下左右が同じ仲間かどうか（N=1, E=2, S=4, W=8）で 16 枚から選ぶ。
 *   屋根の棟・軒先・端、壁の端の柱など。画像は 4 × 4 枚のシート（<種類>_edge.png。scripts/mapkit/slice_parts.py で 9 分割の絵から作る）。
 * - over: 背景が透明な 1 枚の印（ワールドマップの町・関所）。マスには under を敷き、印は dual をすべて重ねた後に上から描く。
 *   画像は今までどおりの 1 枚（tiles/<タイルセット>/<種類>.png）。
 */
export type PartsDef =
  | {
      rule: 'dual';
      /** この地形のマスの下に敷く種類（境目の透明な部分から見える地面）。 */
      under: TileKind;
      /** この地形として扱うほかの種類（例: 森の中の岩も森として縁取る）。 */
      joins?: readonly TileKind[];
    }
  | {
      rule: 'edge';
      /** 部品の透明な所（屋根の端の斜めなど）から見える地面。省くと何も敷かない。 */
      under?: TileKind;
      /** 同じ仲間として扱うほかの種類（例: 壁と戸をひと続きの壁にする）。マップの外も仲間とみなす（端で切れて見えるように）。 */
      joins?: readonly TileKind[];
    }
  | {
      rule: 'over';
      /** このマスに敷く種類。印の透明な所から見える（dual の joins に入れれば、その地形が印の下まで続く）。 */
      under: TileKind;
    };

/**
 * タイルセットごとに、部品で描く種類。ここにない種類は、今までどおり 1 枚の画像で描く。
 * dual は書いた順に下から重ねる（例: 草むら → 池 → 森）。
 */
export const TILE_PARTS: Partial<Record<TilesetId, Partial<Record<TileKind, PartsDef>>>> = {
  /** 商人の町（名古屋・浜松・大坂）。記録は public/assets/README.md の「部品で描くタイル」。 */
  shoka: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 港町（清水湊・広島）。草・道・森は shoka と同じ部品（地面と草が共通の画像なので、そのまま使える）。
   * 水は港の海を石の護岸で囲んだもの、屋根・壁は漁師の家の絵から切り出した。記録は public/assets/README.md。
   */
  minato: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 武家の城下（駿府・与力の屋敷・仙台・彦根・熊本）。草・道・水・森は shoka と同じ部品（水は堀の石の護岸）、
   * 岩（城や屋敷を囲む石垣・庭石）は yama の岩場の部品で、下に草を敷いて草の縁でつなぐ。
   * 屋根・壁は黒い瓦となまこ壁の武家屋敷の絵から切り出した（壁は屋敷を囲む塀にも使う）。記録は public/assets/README.md。
   */
  bushi: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 京の町家（京）。草・道・水・森は shoka と同じ部品（鴨川は石の護岸の川）、岩（寺の庭石・北の山の岩）は yama の岩場の部品で、
   * 下に草を敷いて草の縁でつなぐ。屋根・壁は灰の瓦と紅殻格子の町家の絵から切り出した。記録は public/assets/README.md。
   */
  miyako: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 山里（伊賀上野・伊賀者の里・鍵屋の辻）。草・道・水・森は shoka と同じ部品、岩（屋敷を囲む石垣・修練場の岩）は yama の岩場の部品で、
   * 下に草を敷いて草の縁でつなぐ。屋根・壁は茅葺きと土壁の農家の絵から切り出した（壁は鍵屋の辻の板塀にも使う）。記録は public/assets/README.md。
   */
  sato: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 南蛮の町（長崎・出島）。草・道・森は shoka、水は minato の石の護岸で囲んだ港の海、岩（東の山の斜面）は yama の岩場の部品で、
   * 岩の下に草を敷いて草の縁でつなぐ。屋根・壁は赤い洋瓦と白壁・煉瓦の腰の商館の絵から切り出した（壁は出島を囲む塀にも使う）。
   * 記録は public/assets/README.md。
   */
  nanban: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 江戸の長屋（江戸）。草・道・水・森は shoka と同じ部品（外堀と日本橋川は石の護岸の堀・川）。
   * 屋根・壁は灰の板葺きと暗い板壁の長屋の絵から切り出した（壁は大手門の左右の櫓にも使う）。記録は public/assets/README.md。
   */
  nagaya: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree'] },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 雪の町と庭（加賀金沢・兼六園・会津若松）。地面の雪（ground。5 組の lower と同じ絵に差し替えた）の上に、
   * 雪から冬枯れの草がのぞく草地 → 踏み固めた雪道 → 石の縁の川・堀 → 雪をかぶった岩 → 雪の針葉樹の森 の順に重ねる。
   * 森・岩の下も雪なので、草の joins には入れない。屋根・壁は雪の積もった町家の絵から切り出した（壁は兼六園の外周の塀にも使う）。
   * 記録は public/assets/README.md。
   */
  snow: {
    grass: { rule: 'dual', under: 'ground' },
    road: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'ground' },
    tree: { rule: 'dual', under: 'ground' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground', joins: ['door'] },
  },
  /**
   * 屋内（一座の工房・金太の凧屋）。土間（ground。板の間の組の lower と同じ絵に差し替えた）の上に、一段高い板の間（floor）
   * → 畳の間（grass を畳に使う）の順に重ねる。畳の下には板の間を敷き、板の間の joins に畳を入れて、畳の縁の外も板の間にする。
   * 壁は梁の天端と漆喰の正面を、内装の壁の絵から切り出した。記録は public/assets/README.md。
   */
  interior: {
    floor: { rule: 'dual', under: 'ground', joins: ['grass'] },
    grass: { rule: 'dual', under: 'floor' },
    wall: { rule: 'edge' },
  },
  /**
   * 蔵（堀川の荷蔵）。土間（ground。板敷きの組の lower と同じ絵に差し替えた）の上に、一段高い板敷き（floor）→ 石の護岸の堀川（water）
   * の順に重ねる。道（=）は堀川を渡る欄干付きの板橋で、土間・板敷きを仲間とみなすので、欄干は堀川の側にだけ出る。
   * 壁は黒い板の天端と、漆喰と腰板の正面を、土蔵の壁の絵から切り出した。記録は public/assets/README.md。
   */
  kura: {
    floor: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    road: { rule: 'edge', joins: ['ground', 'floor'] },
    wall: { rule: 'edge' },
  },
  /**
   * からくりの工場（からくり屋敷・米蔵の地下・地下の研究所・からくり蔵）。廊下の石畳（ground。板の床の組の lower と同じ絵に差し替えた）の上に、
   * 部屋の一段高い板の床（floor）→ 石の縁の水路（water）の順に重ねる。道（=）は米蔵の地下で水路を渡る欄干付きの板橋（kura と同じ部品）。
   * 壁は鋲を打った鉄の帯の板壁、機械（roof の文字）は歯車の見える箱で、どちらも天端と正面を 1 枚の絵から切り出した。記録は public/assets/README.md。
   */
  karakuri: {
    floor: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'ground' },
    road: { rule: 'edge', joins: ['ground', 'floor'] },
    wall: { rule: 'edge' },
    roof: { rule: 'edge' },
  },
  /**
   * 廃墟（羅生門跡・鬼の巣・南蛮寺跡）。共通の地面の上に、草 → 石畳（floor）→ 池 → がれき（rock）→ 森 の順に重ねる。
   * 草・森は shoka、池・がれきは yama と同じ部品（池・がれき・森の下と縁は草）。石畳は割れて苔の生えた寺の敷石で、地面との境に縁石がある。
   * 屋根・壁は荒れ寺の絵から切り出した（壁は築地塀にも使う）。記録は public/assets/README.md。
   */
  ruins: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock', 'water'] },
    floor: { rule: 'dual', under: 'ground' },
    water: { rule: 'dual', under: 'grass' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground' },
  },
  /**
   * 船の上（北前船）。甲板（floor。船べりの組の lower と同じ絵に差し替えた）の上に、船べり（wall）→ 海（water）の順に重ねる。
   * 船べりは厚い板の縁で、船の外形の斜めの段も dual で丸くつなぐ（edge では段ごとに切れて見えるため）。
   * 海は船体に寄せた白い波の縁を持ち、船べりの外側の角を丸く覆う（船べりの下に敷いた甲板が外に見えないように）。
   * 屋形の屋根と積み荷（roof）は苫（とま）をかけた屋根の部品で、戸は屋形の絵の戸口。記録は public/assets/README.md。
   */
  ship: {
    wall: { rule: 'dual', under: 'floor' },
    water: { rule: 'dual', under: 'water' },
    roof: { rule: 'edge', under: 'floor' },
  },
  /**
   * 大火の町（神田の大火）。焼け跡の地面（ground。がれきの組の lower と同じ絵に差し替えた）の上に、焼け落ちた材木のがれき（rock）を重ねる。
   * 屋根・壁は燃える長屋の絵から切り出した（屋根は炎の上がる板葺き、壁は焦げた板壁で、外周の塀にも使う）。記録は public/assets/README.md。
   */
  fire: {
    rock: { rule: 'dual', under: 'ground' },
    roof: { rule: 'edge', under: 'ground' },
    wall: { rule: 'edge', under: 'ground' },
  },
  /**
   * 城の中（名古屋城 天守・江戸城 本丸御殿・松の廊下）。板の間（floor）の上に、本丸御殿の中庭の草 → 池 → 植え込みの森 の順に重ねる。
   * 草・森は shoka、池は yama の沢と同じ部品（池・森の下と縁は草、草の縁の外は板の間）。屋根（天守の屋根の上の道のまわり）は
   * 白い棟と破風の縁で囲んだ青灰色の本瓦の部品、壁は黒漆の天端と、黒漆の長押・腰板にはさまれた金の襖の正面を、御殿の壁の絵から切り出した。
   * 記録は public/assets/README.md。
   */
  castle: {
    grass: { rule: 'dual', under: 'floor', joins: ['tree', 'water'] },
    water: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
    roof: { rule: 'edge' },
    wall: { rule: 'edge' },
  },
  /**
   * 野山（清水湊の裏山・原城跡）。草・森は shoka と同じ部品。水は川石の岸の沢（原城跡では海にも使う）、
   * 岩は草の上の岩場（原城跡では崩れた石垣の列）。水・岩・森の下にも草を敷いて、縁を草でつなぐ。記録は public/assets/README.md。
   */
  yama: {
    grass: { rule: 'dual', under: 'ground', joins: ['tree', 'rock', 'water'] },
    water: { rule: 'dual', under: 'grass' },
    rock: { rule: 'dual', under: 'grass' },
    tree: { rule: 'dual', under: 'grass' },
  },
  /**
   * 洞窟（狐火の洞・清正の古井戸の底）。岩壁と地の下の水を、洞窟の床（ground。岩の組の lower と同じ絵に差し替えた）の上に重ねる。
   * 道（=）は清正の古井戸の底で地の下の川を渡る板の橋で、川や岩壁に接する辺にだけ欄干が出る（床は仲間とみなし、床へはそのまま続く）。
   * 記録は public/assets/README.md。
   */
  cave: {
    water: { rule: 'dual', under: 'ground' },
    rock: { rule: 'dual', under: 'ground' },
    road: { rule: 'edge', joins: ['ground'] },
  },
  /**
   * ワールドマップ。野（plain。4 組の lower と同じ絵に差し替えた）の上に、街道 → 海 → 山 → 森 の順に重ねる。
   * 海は砂浜と波打ち際の白い線で陸と分け、山・森は縁に影を落とす。町と関所の印は背景を透明にして街道の上に描き、
   * 街道は印の下まで続ける（街道の行き止まりの町で、道が印の手前で切れないように）。記録は public/assets/README.md。
   */
  field: {
    road: { rule: 'dual', under: 'plain', joins: ['town', 'gate'] },
    water: { rule: 'dual', under: 'plain' },
    rock: { rule: 'dual', under: 'plain' },
    tree: { rule: 'dual', under: 'plain' },
    town: { rule: 'over', under: 'plain' },
    gate: { rule: 'over', under: 'plain' },
  },
};

export function partsTextureKey(tileset: TilesetId, kind: TileKind): string {
  return `parts-${tileset}-${kind}`;
}

export function partsFile(tileset: TilesetId, kind: TileKind, def: Extract<PartsDef, { rule: 'dual' | 'edge' }>): string {
  return `assets/tiles/${tileset}/${kind}_${def.rule}.png`;
}

/** 読み込む部品の画像の一覧（BootScene が使う）。どれも 16 × 16 のコマを 4 × 4 に並べたシート。 */
export function allPartsImages(): { key: string; file: string }[] {
  const list: { key: string; file: string }[] = [];
  for (const [set, defs] of Object.entries(TILE_PARTS) as [TilesetId, Partial<Record<TileKind, PartsDef>>][]) {
    for (const kind of TILE_KINDS) {
      const def = defs[kind];
      // over は今までどおりの 1 枚の画像（TILESETS の差し替えで読み込む）なので、部品のシートはない
      if (def && def.rule !== 'over') list.push({ key: partsTextureKey(set, kind), file: partsFile(set, kind, def) });
    }
  }
  return list;
}

/** 描く 1 枚。x, y は左上のピクセル座標。frame がなければ 1 枚の画像。 */
export interface TileImage {
  key: string;
  frame?: number;
  x: number;
  y: number;
}

/** 4 隅（NW, NE, SW, SE）がその地形かどうかから、dual のシートのコマ番号。 */
export function dualMask(nw: boolean, ne: boolean, sw: boolean, se: boolean): number {
  return (nw ? 8 : 0) | (ne ? 4 : 0) | (sw ? 2 : 0) | (se ? 1 : 0);
}

/** 上下左右（N, E, S, W）が同じ仲間かどうかから、edge のシートのコマ番号。 */
export function edgeMask(n: boolean, e: boolean, s: boolean, w: boolean): number {
  return (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0);
}

/**
 * マップの地形を描く画像を、下から描く順に返す。
 * 1. マスごとの地面（dual・over のマスは under の種類、edge はその部品、ほかは 1 枚の画像）
 * 2. dual の地形を、TILE_PARTS に書いた順に重ねる（半マスずらした位置）
 * 3. over の印（町・関所）を、マスの位置に上から描く（TILE_PARTS の順には関係しない）
 * dual はマップの外へ半マスはみ出して描く（カメラはマップの内側しか映さないので見えない。
 * 端のマスの外側半分を描くため）。マップの行の長さはそろっている前提（そろわないと、短い行の外にも dual を描く）。
 */
export function mapTileImages(map: MapDef, tile: number): TileImage[] {
  const set = map.tileset;
  const defs = (set && TILE_PARTS[set]) || {};
  const kindAt = (x: number, y: number): TileKind | undefined => tileAt(map, x, y)?.kind;
  const height = map.rows.length;
  const width = Math.max(...map.rows.map((r) => r.length));
  const images: TileImage[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < (map.rows[y]?.length ?? 0); x++) {
      const kind = kindAt(x, y);
      if (!kind) continue;
      const def = defs[kind];
      const px = x * tile;
      const py = y * tile;
      if (!def || !set) {
        images.push({ key: tileTextureKey(set, kind), x: px, y: py });
      } else if (def.rule === 'dual' || def.rule === 'over') {
        images.push({ key: tileTextureKey(set, def.under), x: px, y: py });
      } else {
        if (def.under) images.push({ key: tileTextureKey(set, def.under), x: px, y: py });
        const group = new Set<TileKind>([kind, ...(def.joins ?? [])]);
        const same = (nx: number, ny: number): boolean => {
          const k = kindAt(nx, ny);
          return k === undefined || group.has(k);
        };
        images.push({ key: partsTextureKey(set, kind), frame: edgeMask(same(x, y - 1), same(x + 1, y), same(x, y + 1), same(x - 1, y)), x: px, y: py });
      }
    }
  }

  if (!set) return images;
  // dual は TILE_PARTS に書いた順に下から重ねる
  for (const [kind, def] of Object.entries(defs) as [TileKind, PartsDef][]) {
    if (def.rule !== 'dual') continue;
    const group = new Set<TileKind>([kind, ...(def.joins ?? [])]);
    // マップの外は、いちばん近い端のマスと同じとみなす（端で森や池が切れて見えないように）
    const inside = (x: number, y: number): boolean => {
      const cy = Math.min(Math.max(y, 0), height - 1);
      const row = map.rows[cy] ?? '';
      const cx = Math.min(Math.max(x, 0), row.length - 1);
      const k = kindAt(cx, cy);
      return k !== undefined && group.has(k);
    };
    for (let y = -1; y < height; y++) {
      for (let x = -1; x < width; x++) {
        const mask = dualMask(inside(x, y), inside(x + 1, y), inside(x, y + 1), inside(x + 1, y + 1));
        if (mask === 0) continue;
        images.push({ key: partsTextureKey(set, kind), frame: mask, x: x * tile + tile / 2, y: y * tile + tile / 2 });
      }
    }
  }
  // over の印は、dual をすべて重ねた後に上から描く
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < (map.rows[y]?.length ?? 0); x++) {
      const kind = kindAt(x, y);
      if (kind && defs[kind]?.rule === 'over') images.push({ key: tileTextureKey(set, kind), x: x * tile, y: y * tile });
    }
  }
  return images;
}
