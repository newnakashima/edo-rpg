import { describe, expect, it } from 'vitest';
import { MAPS, TILES, TILESETS, type MapDef, type TileKind, type TilesetId } from './maps';
import { allPartsImages, dualMask, edgeMask, mapTileImages, partsTextureKey, TILE_PARTS } from './mapParts';

const T = 16;

function map(rows: string[], tileset: TilesetId = 'shoka'): MapDef {
  return { id: 'test', name: 'test', rows, npcs: [], exits: [], tileset, areaLevel: 1 };
}

describe('部品で描くタイル', () => {
  it('部品の画像がそろい、どれも 16 × 16 のコマを 4 × 4 に並べた 64 × 64 のシート', () => {
    const files = import.meta.glob<string>('../../public/assets/tiles/*/*_{dual,edge}.png', { eager: true, query: '?inline', import: 'default' });
    const sizes = new Map(
      Object.entries(files).map(([f, url]) => {
        // PNG の IHDR（16 バイト目から幅と高さ）
        const bytes = Uint8Array.from(atob(url.split(',')[1]!).slice(0, 24), (c) => c.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        return [f.replace('../../public/', ''), [view.getUint32(16), view.getUint32(20)]];
      }),
    );
    expect(allPartsImages().length).toBeGreaterThan(0);
    for (const parts of allPartsImages()) expect(sizes.get(parts.file), parts.file).toEqual([T * 4, T * 4]);
  });

  it('部品で描く種類は、そのタイルセットのマップに出てくる種類だけ（使わない部品を作らない）', () => {
    for (const [set, defs] of Object.entries(TILE_PARTS) as [TilesetId, Record<string, unknown>][]) {
      expect(Object.keys(TILESETS)).toContain(set);
      const used = new Set(Object.values(MAPS).filter((m) => m.tileset === set).flatMap((m) => m.rows.flatMap((r) => [...r].map((ch) => TILES[ch]!.kind))));
      for (const kind of Object.keys(defs) as TileKind[]) expect(used.has(kind), `${set}/${kind}`).toBe(true);
    }
  });

  it('角と辺のマスクは決めた並び（dual: NW=8 NE=4 SW=2 SE=1、edge: N=1 E=2 S=4 W=8）', () => {
    expect(dualMask(true, false, false, false)).toBe(8);
    expect(dualMask(false, false, false, true)).toBe(1);
    expect(dualMask(true, true, true, true)).toBe(15);
    expect(edgeMask(true, false, false, false)).toBe(1);
    expect(edgeMask(false, false, false, true)).toBe(8);
    expect(edgeMask(false, true, false, true)).toBe(10);
  });

  it('dual は TILE_PARTS に書いた順（草 → 道 → 水 → 森）に下から重ね、草は森のマスも草として縁取る', () => {
    // 左から草・森・道・水
    const images = mapTileImages(map([',T=~', ',T=~']), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const first = (kind: TileKind) => order.indexOf(partsTextureKey('shoka', kind));
    const last = (kind: TileKind) => order.lastIndexOf(partsTextureKey('shoka', kind));
    expect(last('grass')).toBeLessThan(first('road'));
    expect(last('road')).toBeLessThan(first('water'));
    expect(last('water')).toBeLessThan(first('tree'));
    // 草と森の境目（x = 0 と 1 の間）は、草の dual では全面が草
    const grassAt = (px: number) => images.find((i) => i.key === partsTextureKey('shoka', 'grass') && i.x === px && i.y === T / 2);
    expect(grassAt(T / 2)?.frame).toBe(15);
    // 森と道の境目（x = 1 と 2 の間）は、左半分だけ草
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(true, false, true, false));
    // 森のマスの下には草を敷く
    expect(images).toContainEqual({ key: 'tile-grass', x: T, y: 0 });
  });

  it('野山（yama）は 草 → 水 → 岩 → 森 の順に重ね、草は水・岩・森のマスも草として縁取り、その下に草を敷く', () => {
    // 左から地面・水・岩・森
    const images = mapTileImages(map(['.~^T', '.~^T'], 'yama'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const first = (kind: TileKind) => order.indexOf(partsTextureKey('yama', kind));
    const last = (kind: TileKind) => order.lastIndexOf(partsTextureKey('yama', kind));
    for (const kind of ['grass', 'water', 'rock', 'tree'] as const) expect(first(kind), kind).toBeGreaterThanOrEqual(0);
    expect(last('grass')).toBeLessThan(first('water'));
    expect(last('water')).toBeLessThan(first('rock'));
    expect(last('rock')).toBeLessThan(first('tree'));
    // 地面と水の境目（x = 0 と 1 の間）は右半分だけ草、水・岩・森の間は全面が草
    const grassAt = (px: number) => images.find((i) => i.key === partsTextureKey('yama', 'grass') && i.x === px && i.y === T / 2);
    expect(grassAt(T / 2)?.frame).toBe(dualMask(false, true, false, true));
    expect(grassAt(T + T / 2)?.frame).toBe(15);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    // 水・岩・森のマスの下には草、地面のマスは共通の地面
    for (const x of [1, 2, 3]) expect(images).toContainEqual({ key: 'tile-grass', x: x * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: 0, y: 0 });
  });

  it('dual の地形は、マスに下の地面を敷き、境目に半マスずらして重ねる', () => {
    // 3 × 3 の真ん中だけ水
    const images = mapTileImages(map(['...', '.~.', '...']), T);
    const water = images.filter((i) => i.key === partsTextureKey('shoka', 'water'));
    // 真ん中のマスを角に持つ 4 枚（左上・右上・左下・右下）だけ
    expect(water.map((i) => [i.x, i.y, i.frame])).toEqual([
      [T / 2, T / 2, 1],
      [T + T / 2, T / 2, 2],
      [T / 2, T + T / 2, 4],
      [T + T / 2, T + T / 2, 8],
    ]);
    // 水のマスの下には地面
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: T });
  });

  it('dual は、マップの外を端のマスと同じとみなす（端で森が切れて見えない）', () => {
    const images = mapTileImages(map(['TT', 'TT']), T);
    const trees = images.filter((i) => i.key === partsTextureKey('shoka', 'tree'));
    // 外にはみ出す分も含めて 3 × 3 枚、どれも全面が森
    expect(trees).toHaveLength(9);
    expect(trees.every((i) => i.frame === 15)).toBe(true);
  });

  it('edge の構造物は、上下左右の同じ仲間で部品を選び、joins の種類も仲間にする', () => {
    // 屋根 2 段・壁 1 段（真ん中に戸）の家
    const images = mapTileImages(map(['.....', '.RRR.', '.RRR.', '.WDW.', '.....']), T);
    const roof = images.filter((i) => i.key === partsTextureKey('shoka', 'roof'));
    expect(roof.map((i) => i.frame)).toEqual([
      edgeMask(false, true, true, false), edgeMask(false, true, true, true), edgeMask(false, false, true, true),
      edgeMask(true, true, false, false), edgeMask(true, true, false, true), edgeMask(true, false, false, true),
    ]);
    const wall = images.filter((i) => i.key === partsTextureKey('shoka', 'wall'));
    // 戸は壁の仲間なので、左右の壁は戸の側につながる
    expect(wall.map((i) => i.frame)).toEqual([edgeMask(false, true, false, false), edgeMask(false, false, false, true)]);
    // 戸は今までどおり 1 枚の画像
    expect(images).toContainEqual({ key: 'tile-shoka-door', x: 2 * T, y: 3 * T });
  });

  it('edge は、マップの外を同じ仲間とみなす（マップの端に接する塀や屋根は、端で切れて見える）', () => {
    const images = mapTileImages(map(['RR', '..']), T);
    const roof = images.filter((i) => i.key === partsTextureKey('shoka', 'roof'));
    expect(roof.map((i) => i.frame)).toEqual([edgeMask(true, true, false, true), edgeMask(true, true, false, true)]);
  });

  it('部品の決まりがないタイルセットは、今までどおり 1 種類 1 枚で描く', () => {
    const images = mapTileImages(map(['.T~', 'RWD'], 'snow'), T);
    expect(images.map((i) => i.key)).toEqual(['tile-snow-ground', 'tile-snow-tree', 'tile-water', 'tile-snow-roof', 'tile-wall', 'tile-door']);
    expect(images.every((i) => i.frame === undefined)).toBe(true);
  });
});
