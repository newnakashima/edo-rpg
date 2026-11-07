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

  it('武家の城下（bushi）は 草 → 道 → 水 → 岩 → 森 の順に重ね、石垣（岩）の下に草を敷いて草の縁でつなぐ', () => {
    // 左から地面・水・岩・森・草
    const images = mapTileImages(map(['.~^T,', '.~^T,'], 'bushi'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const first = (kind: TileKind) => order.indexOf(partsTextureKey('bushi', kind));
    const last = (kind: TileKind) => order.lastIndexOf(partsTextureKey('bushi', kind));
    for (const kind of ['grass', 'water', 'rock', 'tree'] as const) expect(first(kind), kind).toBeGreaterThanOrEqual(0);
    expect(last('grass')).toBeLessThan(first('water'));
    expect(last('water')).toBeLessThan(first('rock'));
    expect(last('rock')).toBeLessThan(first('tree'));
    // 岩と森の間（x = 2 と 3 の間）は全面が草、水と岩の間は右半分だけ草
    const grassAt = (px: number) => images.find((i) => i.key === partsTextureKey('bushi', 'grass') && i.x === px && i.y === T / 2);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(false, true, false, true));
    // 岩・森のマスの下には草、水のマスの下には地面
    for (const x of [2, 3]) expect(images).toContainEqual({ key: 'tile-grass', x: x * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: 0 });

    // 左から草・道・水・家（上の行が屋根、下の行が壁と戸）
    const town = mapTileImages(map([',=~RR', ',=~WD'], 'bushi'), T);
    const townOrder = town.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const key = (kind: TileKind) => partsTextureKey('bushi', kind);
    expect(townOrder.lastIndexOf(key('grass'))).toBeLessThan(townOrder.indexOf(key('road')));
    expect(townOrder.lastIndexOf(key('road'))).toBeLessThan(townOrder.indexOf(key('water')));
    // 屋根・壁は端の部品。屋根は下の壁の側が軒先、壁は戸を仲間としてつなぐ（マップの外も仲間）
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('roof'), 3, 0)).toBe(edgeMask(true, true, false, false));
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, true, true, false));
    // 戸は bushi の 1 枚の画像
    expect(town).toContainEqual({ key: 'tile-bushi-door', x: 4 * T, y: T });
  });

  it('京の町家（miyako）は 草 → 道 → 水 → 岩 → 森 の順に重ね、屋根・壁は端の部品、戸は miyako の 1 枚の画像', () => {
    const key = (kind: TileKind) => partsTextureKey('miyako', kind);
    const images = mapTileImages(map(['.~^T,', '.~^T,'], 'miyako'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    for (const kind of ['grass', 'water', 'rock', 'tree'] as const) expect(order.indexOf(key(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(order.lastIndexOf(key('grass'))).toBeLessThan(order.indexOf(key('water')));
    expect(order.lastIndexOf(key('water'))).toBeLessThan(order.indexOf(key('rock')));
    expect(order.lastIndexOf(key('rock'))).toBeLessThan(order.indexOf(key('tree')));
    // 岩と森の間（x = 2 と 3 の間）は全面が草、水と岩の間は右半分だけ草
    const grassAt = (px: number) => images.find((i) => i.key === key('grass') && i.x === px && i.y === T / 2);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(false, true, false, true));
    // 岩・森のマスの下には草、水のマスの下には地面
    for (const x of [2, 3]) expect(images).toContainEqual({ key: 'tile-grass', x: x * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: 0 });

    const town = mapTileImages(map([',=~RR', ',=~WD'], 'miyako'), T);
    const townOrder = town.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    expect(townOrder.lastIndexOf(key('grass'))).toBeLessThan(townOrder.indexOf(key('road')));
    expect(townOrder.lastIndexOf(key('road'))).toBeLessThan(townOrder.indexOf(key('water')));
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('roof'), 3, 0)).toBe(edgeMask(true, true, false, false));
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, true, true, false));
    expect(town).toContainEqual({ key: 'tile-miyako-door', x: 4 * T, y: T });
  });

  it('江戸の長屋（nagaya）は 草 → 道 → 水 → 森 の順に重ね、森の下に草を敷き、屋根・壁は端の部品、戸は nagaya の 1 枚の画像', () => {
    const key = (kind: TileKind) => partsTextureKey('nagaya', kind);
    const images = mapTileImages(map(['.~,T', '.~,T'], 'nagaya'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    for (const kind of ['grass', 'water', 'tree'] as const) expect(order.indexOf(key(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(order.lastIndexOf(key('grass'))).toBeLessThan(order.indexOf(key('water')));
    expect(order.lastIndexOf(key('water'))).toBeLessThan(order.indexOf(key('tree')));
    // 草と森の間（x = 2 と 3 の間）は全面が草（草の joins に森）、水と草の間は右半分だけ草
    const grassAt = (px: number) => images.find((i) => i.key === key('grass') && i.x === px && i.y === T / 2);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(false, true, false, true));
    // 森のマスの下には草、水のマスの下には地面
    expect(images).toContainEqual({ key: 'tile-grass', x: 3 * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: 0 });

    const town = mapTileImages(map([',=~RR', ',=~WD'], 'nagaya'), T);
    const townOrder = town.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    expect(townOrder.lastIndexOf(key('grass'))).toBeLessThan(townOrder.indexOf(key('road')));
    expect(townOrder.lastIndexOf(key('road'))).toBeLessThan(townOrder.indexOf(key('water')));
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('roof'), 3, 0)).toBe(edgeMask(true, true, false, false));
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, true, true, false));
    expect(town).toContainEqual({ key: 'tile-nagaya-door', x: 4 * T, y: T });
  });

  it('山里（sato）は 草 → 道 → 水 → 岩 → 森 の順に重ね、修練場の岩の下に草を敷き、板塀（壁の縦の列）と道場の床を描く', () => {
    const key = (kind: TileKind) => partsTextureKey('sato', kind);
    const images = mapTileImages(map(['.~^T,', '.~^T,'], 'sato'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    for (const kind of ['grass', 'water', 'rock', 'tree'] as const) expect(order.indexOf(key(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(order.lastIndexOf(key('grass'))).toBeLessThan(order.indexOf(key('water')));
    expect(order.lastIndexOf(key('water'))).toBeLessThan(order.indexOf(key('rock')));
    expect(order.lastIndexOf(key('rock'))).toBeLessThan(order.indexOf(key('tree')));
    // 岩と森の間（x = 2 と 3 の間）は全面が草（草の joins に岩・森）、水と岩の間は右半分だけ草
    const grassAt = (px: number) => images.find((i) => i.key === key('grass') && i.x === px && i.y === T / 2);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(false, true, false, true));
    // 岩・森のマスの下には草、水のマスの下には地面
    for (const x of [2, 3]) expect(images).toContainEqual({ key: 'tile-grass', x: x * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: 0 });

    // 道は草の後、水の前に重ねる
    const roads = mapTileImages(map([',=~', ',=~'], 'sato'), T);
    const roadOrder = roads.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    expect(roadOrder.indexOf(key('road'))).toBeGreaterThanOrEqual(0);
    expect(roadOrder.lastIndexOf(key('grass'))).toBeLessThan(roadOrder.indexOf(key('road')));
    expect(roadOrder.lastIndexOf(key('road'))).toBeLessThan(roadOrder.indexOf(key('water')));

    // 鍵屋の辻の板塀（1 列の壁）は上下だけがつながり、伊賀者の里の道場の床（_）は共通の 1 枚の画像
    const town = mapTileImages(map([',W,RR', ',W_WD', ',W,,,'], 'sato'), T);
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('wall'), 1, 1)).toBe(edgeMask(true, false, true, false));
    expect(at(key('roof'), 3, 0)).toBe(edgeMask(true, true, false, false));
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, true, false, false));
    expect(town).toContainEqual({ key: 'tile-floor', x: 2 * T, y: T });
    expect(town).toContainEqual({ key: 'tile-sato-door', x: 4 * T, y: T });
    const townOrder = town.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    expect(townOrder).toContain(key('grass'));
  });

  it('南蛮の町（nanban）は 草 → 道 → 水 → 岩 → 森 の順に重ね、山の岩の下に草を敷き、出島の塀（壁の縦の列と、扇形の階段の角）を描く', () => {
    const key = (kind: TileKind) => partsTextureKey('nanban', kind);
    const images = mapTileImages(map(['.~^T,', '.~^T,'], 'nanban'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    for (const kind of ['grass', 'water', 'rock', 'tree'] as const) expect(order.indexOf(key(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(order.lastIndexOf(key('grass'))).toBeLessThan(order.indexOf(key('water')));
    expect(order.lastIndexOf(key('water'))).toBeLessThan(order.indexOf(key('rock')));
    expect(order.lastIndexOf(key('rock'))).toBeLessThan(order.indexOf(key('tree')));
    // 岩と森の間は全面が草（草の joins に岩・森）、水と岩の間は右半分だけ草
    const grassAt = (px: number) => images.find((i) => i.key === key('grass') && i.x === px && i.y === T / 2);
    expect(grassAt(2 * T + T / 2)?.frame).toBe(15);
    expect(grassAt(T + T / 2)?.frame).toBe(dualMask(false, true, false, true));
    // 岩・森のマスの下には草、水のマスの下には地面
    for (const x of [2, 3]) expect(images).toContainEqual({ key: 'tile-grass', x: x * T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-ground', x: T, y: 0 });

    // 道は草の後、水の前に重ねる
    const roads = mapTileImages(map([',=~', ',=~'], 'nanban'), T);
    const roadOrder = roads.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    expect(roadOrder.indexOf(key('road'))).toBeGreaterThanOrEqual(0);
    expect(roadOrder.lastIndexOf(key('grass'))).toBeLessThan(roadOrder.indexOf(key('road')));
    expect(roadOrder.lastIndexOf(key('road'))).toBeLessThan(roadOrder.indexOf(key('water')));

    // 出島の塀: 縦の列の (1,1) は上下だけがつながる。家の屋根・壁・戸と、門の床（_）は共通の 1 枚の画像
    const town = mapTileImages(map(['~W.RR~', '~W.WD~', '~WW_W~'], 'nanban'), T);
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('wall'), 1, 1)).toBe(edgeMask(true, false, true, false));
    expect(at(key('wall'), 1, 2)).toBe(edgeMask(true, true, true, false)); // 右は (2,2) の壁、下はマップの外（仲間とみなす）
    expect(at(key('roof'), 3, 0)).toBe(edgeMask(true, true, false, false));
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, true, false, false));
    expect(town).toContainEqual({ key: 'tile-floor', x: 3 * T, y: 2 * T });
    expect(town).toContainEqual({ key: 'tile-nanban-door', x: 4 * T, y: T });

    // 扇形の塀の階段: マップの外に頼らない角。段の角は右と下、段の内側は上と左がつながる
    const fan = mapTileImages(map(['~~~~~', '~~WWW', '~WW..', '~W...', '~~~~~'], 'nanban'), T);
    const fanAt = (x: number, y: number) => fan.find((i) => i.key === key('wall') && i.x === x * T && i.y === y * T)?.frame;
    expect(fanAt(2, 1)).toBe(edgeMask(false, true, true, false));
    expect(fanAt(1, 2)).toBe(edgeMask(false, true, true, false));
    expect(fanAt(2, 2)).toBe(edgeMask(true, false, false, true));
  });

  it('雪の町（snow）は 草 → 道 → 水 → 岩 → 森 の順に雪の地面の上へ重ね、岩・森の下も雪で、草は道・岩・森を仲間にしない', () => {
    const key = (kind: TileKind) => partsTextureKey('snow', kind);
    const images = mapTileImages(map([',=~^T', ',=~^T'], 'snow'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    for (const kind of ['grass', 'road', 'water', 'rock', 'tree'] as const) expect(order.indexOf(key(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(order.lastIndexOf(key('grass'))).toBeLessThan(order.indexOf(key('road')));
    expect(order.lastIndexOf(key('road'))).toBeLessThan(order.indexOf(key('water')));
    expect(order.lastIndexOf(key('water'))).toBeLessThan(order.indexOf(key('rock')));
    expect(order.lastIndexOf(key('rock'))).toBeLessThan(order.indexOf(key('tree')));
    // どのマスの下にも雪の地面（草は岩・森を仲間にしないので、岩と森の間に草の縁は出ない）
    for (const x of [0, 1, 2, 3, 4]) expect(images).toContainEqual({ key: 'tile-snow-ground', x: x * T, y: 0 });
    // 草は道も仲間にしないので、草と道の境目では左半分だけが草。岩と森の間には草の縁が出ない
    const grassAt = (px: number) => images.find((i) => i.key === key('grass') && i.x === px && i.y === T / 2);
    expect(grassAt(T / 2)?.frame).toBe(dualMask(true, false, true, false));
    expect(grassAt(T + T / 2)).toBeUndefined();
    expect(grassAt(3 * T + T / 2)).toBeUndefined();
  });

  it('雪の町（snow）の屋根・壁は端の部品で、壁は戸を仲間にし、戸は snow の 1 枚の画像', () => {
    const key = (kind: TileKind) => partsTextureKey('snow', kind);
    const town = mapTileImages(map(['.RRR.', '.WDW.', '.....'], 'snow'), T);
    const at = (k: string, x: number, y: number) => town.find((i) => i.key === k && i.x === x * T && i.y === y * T)?.frame;
    expect(at(key('roof'), 1, 0)).toBe(edgeMask(true, true, false, false)); // 上はマップの外（仲間とみなす）
    expect(at(key('wall'), 1, 1)).toBe(edgeMask(false, true, false, false)); // 右の戸も壁の仲間
    expect(at(key('wall'), 3, 1)).toBe(edgeMask(false, false, false, true));
    expect(town).toContainEqual({ key: 'tile-snow-door', x: 2 * T, y: T });
  });

  it('屋内（interior）は 板の間 → 畳 の順に土間の上へ重ね、畳の下に板の間を敷いて板の間の縁を畳の外にだけ出し、壁は端の部品', () => {
    // 上の行が壁、左が土間、中が板の間、右が畳
    const rows = ['WWWW', '.__,', '.__,'];
    const images = mapTileImages(map(rows, 'interior'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const key = (kind: TileKind) => partsTextureKey('interior', kind);
    expect(order.lastIndexOf(key('floor'))).toBeLessThan(order.indexOf(key('grass')));
    // 土間は土間の 1 枚、板の間のマスの下は土間、畳のマスの下は板の間の 1 枚
    expect(images).toContainEqual({ key: 'tile-interior-ground', x: 0, y: T });
    expect(images).toContainEqual({ key: 'tile-interior-ground', x: T, y: T });
    expect(images).toContainEqual({ key: 'tile-interior-floor', x: 3 * T, y: T });
    // 板の間と畳の間（x = 2 と 3 の境目）は板の間がつながる（畳を仲間とみなす）。土間との境目（x = 0 と 1）は縁が出る
    const dualAt = (kind: TileKind, x: number, y: number) =>
      images.find((i) => i.key === key(kind) && i.x === x * T + T / 2 && i.y === y * T + T / 2)?.frame;
    expect(dualAt('floor', 2, 1)).toBe(dualMask(true, true, true, true));
    expect(dualAt('floor', 0, 1)).toBe(dualMask(false, true, false, true));
    expect(dualAt('grass', 2, 1)).toBe(dualMask(false, true, false, true));
    // 壁は上の行の 1 段で、マップの外（上・左右）を仲間とみなす
    expect(images.find((i) => i.key === key('wall') && i.x === T && i.y === 0)?.frame).toBe(edgeMask(true, true, false, true));
    expect(TILESETS.interior).toContain('ground');
    expect(TILESETS.interior).toContain('floor');
    // 畳が土間に直に接する所では、畳の外側に板の間の縁（框）が出る（畳の下も板の間とみなす）
    const tatami = mapTileImages(map(['....', '.,,.', '.,,.', '....'], 'interior'), T);
    const at = (kind: TileKind, x: number, y: number) =>
      tatami.find((i) => i.key === key(kind) && i.x === x * T + T / 2 && i.y === y * T + T / 2)?.frame;
    expect(at('floor', 0, 1)).toBe(dualMask(false, true, false, true));
    expect(at('floor', 1, 1)).toBe(dualMask(true, true, true, true));
    expect(at('grass', 0, 1)).toBe(dualMask(false, true, false, true));
  });

  it('洞窟（cave）は 水 → 岩 の順に床の上へ重ね、橋（道）は川と岩壁の側にだけ欄干を出す', () => {
    // 上下が川、左右が床の 2 マス幅の橋。下の行の右は岩壁
    const images = mapTileImages(map(['.~~.', '.==.', '.==^', '.~~.'], 'cave'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const first = (kind: TileKind) => order.indexOf(partsTextureKey('cave', kind));
    const last = (kind: TileKind) => order.lastIndexOf(partsTextureKey('cave', kind));
    expect(last('water')).toBeLessThan(first('rock'));
    // 水・岩のマスの下には洞窟の床
    expect(images).toContainEqual({ key: 'tile-cave-ground', x: T, y: 0 });
    expect(images).toContainEqual({ key: 'tile-cave-ground', x: 3 * T, y: 2 * T });
    // 橋は床を仲間とみなすので、左右の床の側には欄干が出ない。上下の川の側と、右下の岩壁の側には出る
    const bridge = (x: number, y: number) => images.find((i) => i.key === partsTextureKey('cave', 'road') && i.x === x * T && i.y === y * T)?.frame;
    expect(bridge(1, 1)).toBe(edgeMask(false, true, true, true));
    expect(bridge(2, 1)).toBe(edgeMask(false, true, true, true));
    expect(bridge(1, 2)).toBe(edgeMask(true, true, false, true));
    expect(bridge(2, 2)).toBe(edgeMask(true, false, false, true));
  });

  it('蔵（kura）は 板敷き → 堀川 の順に土間の上へ重ね、橋（道）は土間・板敷きを仲間にして堀川の側にだけ欄干を出し、壁は端の部品', () => {
    // 上の行が壁。2 行目は板敷きと土間、3 行目は堀川を渡る橋、4 行目は堀川の下の岸に接する橋
    const rows = ['WWWW', '_.._', '~=~~', '_.=_'];
    const images = mapTileImages(map(rows, 'kura'), T);
    const order = images.map((i) => i.key).filter((k) => k.startsWith('parts-'));
    const key = (kind: TileKind) => partsTextureKey('kura', kind);
    expect(order.lastIndexOf(key('floor'))).toBeLessThan(order.indexOf(key('water')));
    // 板敷き・堀川のマスの下は土間の 1 枚
    expect(images).toContainEqual({ key: 'tile-kura-ground', x: 0, y: T });
    expect(images).toContainEqual({ key: 'tile-kura-ground', x: 0, y: 2 * T });
    expect(TILESETS.kura).toContain('ground');
    expect(TILESETS.kura).toContain('floor');
    // 板敷きの縁は、土間・堀川・橋の側に出る
    const dualAt = (kind: TileKind, x: number, y: number) =>
      images.find((i) => i.key === key(kind) && i.x === x * T + T / 2 && i.y === y * T + T / 2)?.frame;
    expect(dualAt('floor', 0, 1)).toBe(dualMask(true, false, false, false));
    // 橋は土間・板敷き（とマップの外）を仲間とみなすので、欄干は堀川の側にだけ出る
    const bridge = (x: number, y: number) => images.find((i) => i.key === key('road') && i.x === x * T && i.y === y * T)?.frame;
    expect(bridge(1, 2)).toBe(edgeMask(true, false, true, false));
    expect(bridge(2, 3)).toBe(edgeMask(false, true, true, true));
    // 壁は上の行の 1 段で、マップの外（上・左右）を仲間とみなす
    expect(images.find((i) => i.key === key('wall') && i.x === T && i.y === 0)?.frame).toBe(edgeMask(true, true, false, true));
  });

  it('ワールドマップ（field）は 街道 → 海 → 山 → 森 の順に野の上へ重ね、町・関所の印は街道の上に描いて、街道を印の下まで続ける', () => {
    // 左から野・街道・町・街道・関所・海・山・森
    const images = mapTileImages(map(['"=O=G~^T', '"=O=G~^T'], 'field'), T);
    const order = images.map((i) => i.key);
    const first = (key: string) => order.indexOf(key);
    const last = (key: string) => order.lastIndexOf(key);
    const parts = (kind: TileKind) => partsTextureKey('field', kind);
    for (const kind of ['road', 'water', 'rock', 'tree'] as const) expect(first(parts(kind)), kind).toBeGreaterThanOrEqual(0);
    expect(last(parts('road'))).toBeLessThan(first(parts('water')));
    expect(last(parts('water'))).toBeLessThan(first(parts('rock')));
    expect(last(parts('rock'))).toBeLessThan(first(parts('tree')));
    // 印は dual をすべて重ねた後に描き、マスには野を敷く
    expect(first('tile-field-town')).toBeGreaterThan(last(parts('tree')));
    expect(first('tile-field-gate')).toBeGreaterThan(last(parts('tree')));
    for (const x of [1, 2, 4, 5, 6, 7]) expect(images).toContainEqual({ key: 'tile-field-plain', x: x * T, y: 0 });
    // 街道と町・関所の間は全面が街道（印の手前で道が切れない）。関所と海の間は左半分だけ
    const roadAt = (px: number) => images.find((i) => i.key === parts('road') && i.x === px && i.y === T / 2)?.frame;
    expect(roadAt(T + T / 2)).toBe(15);
    expect(roadAt(3 * T + T / 2)).toBe(15);
    expect(roadAt(4 * T + T / 2)).toBe(dualMask(true, false, true, false));
    // 印は部品のシートを持たない（今までどおりの 1 枚の画像）
    expect(allPartsImages().map((p) => p.key)).not.toContain(parts('town'));
  });

  it('over の印（ワールドマップの町・関所など）の画像は、背景が透明（不透明だと街道の上に四角が出る）', async () => {
    const files = import.meta.glob<string>('../../public/assets/tiles/*/*.png', { eager: true, query: '?inline', import: 'default' });
    // 8 bit の RGBA の PNG を展開して、アルファが 0 の画素の数を数える
    const transparentPixels = async (url: string): Promise<number> => {
      const bytes = Uint8Array.from(atob(url.split(',')[1]!), (c) => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      const [width, height, depth, colorType] = [view.getUint32(16), view.getUint32(20), bytes[24], bytes[25]];
      expect([depth, colorType]).toEqual([8, 6]);
      const idat: Uint8Array[] = [];
      for (let p = 8; p < bytes.length; ) {
        const len = view.getUint32(p);
        if (String.fromCharCode(...bytes.slice(p + 4, p + 8)) === 'IDAT') idat.push(bytes.slice(p + 8, p + 8 + len));
        p += 12 + len;
      }
      const raw = new Uint8Array(await new Response(new Blob(idat as BlobPart[]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
      const stride = width * 4;
      const out = new Uint8Array(stride * height);
      for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)]!;
        for (let i = 0; i < stride; i++) {
          const x = raw[y * (stride + 1) + 1 + i]!;
          const a = i >= 4 ? out[y * stride + i - 4]! : 0;
          const b = y > 0 ? out[(y - 1) * stride + i]! : 0;
          const c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4]! : 0;
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter]!;
          out[y * stride + i] = (x + pred) & 0xff;
        }
      }
      let count = 0;
      for (let i = 3; i < out.length; i += 4) if (out[i] === 0) count++;
      return count;
    };
    // TILE_PARTS で over にした種類の画像を、すべて調べる
    const overFiles = (Object.entries(TILE_PARTS) as [TilesetId, Partial<Record<TileKind, { rule: string }>>][]).flatMap(([set, defs]) =>
      Object.entries(defs).filter(([, def]) => def?.rule === 'over').map(([kind]) => `../../public/assets/tiles/${set}/${kind}.png`),
    );
    expect(overFiles.length).toBeGreaterThan(0);
    // 16 × 16 のうち、印のまわりの半分以上が透明
    for (const file of overFiles) {
      expect(files[file], file).toBeDefined();
      expect(await transparentPixels(files[file]!), file).toBeGreaterThan(128);
    }
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
    const images = mapTileImages(map(['.T~', 'RWD'], 'fire'), T);
    expect(images.map((i) => i.key)).toEqual(['tile-fire-ground', 'tile-tree', 'tile-water', 'tile-fire-roof', 'tile-fire-wall', 'tile-door']);
    expect(images.every((i) => i.frame === undefined)).toBe(true);
  });
});
