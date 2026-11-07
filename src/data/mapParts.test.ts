import { describe, expect, it } from 'vitest';
import { MAPS, TILES, TILESETS, type MapDef, type TileKind, type TilesetId } from './maps';
import { allPartsImages, cellHash, dualMask, edgeMask, mapTileImages, partsTextureKey, TILE_PARTS } from './mapParts';

const T = 16;

function map(rows: string[], tileset: TilesetId = 'shoka'): MapDef {
  return { id: 'test', name: 'test', rows, npcs: [], exits: [], tileset, areaLevel: 1 };
}

describe('部品で描くタイル', () => {
  it('部品の画像がそろっている', () => {
    const files = import.meta.glob('../../public/assets/tiles/*/*.png');
    const names = Object.keys(files).map((f) => f.replace('../../public/', ''));
    for (const parts of allPartsImages()) expect(names, parts.file).toContain(parts.file);
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

  it('場所で決まる柄の番号は、同じ場所なら毎回同じ', () => {
    expect(cellHash(3, 5)).toBe(cellHash(3, 5));
    expect(new Set(Array.from({ length: 20 }, (_, i) => cellHash(i, 0) % 4)).size).toBeGreaterThan(1);
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

  it('部品の決まりがないタイルセットは、今までどおり 1 種類 1 枚で描く', () => {
    const images = mapTileImages(map(['.T~', 'RWD'], 'snow'), T);
    expect(images.map((i) => i.key)).toEqual(['tile-snow-ground', 'tile-snow-tree', 'tile-water', 'tile-snow-roof', 'tile-wall', 'tile-door']);
    expect(images.every((i) => i.frame === undefined)).toBe(true);
  });
});
