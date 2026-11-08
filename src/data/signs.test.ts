import { describe, expect, it } from 'vitest';
import { pngSize } from '../systems/testUtils';
import { MAPS } from './maps';
import { doorSignPosition, mapSigns, SIGN_KINDS, signKind, signPosition, type SignKind } from './signs';
import { buildingTown } from './buildings';

// 看板の字は描いたスクリプト（scripts/draw_signs.py の SIGNS）が正
const script = Object.values(import.meta.glob<string>('../../scripts/draw_signs.py', { eager: true, query: '?raw', import: 'default' }))[0]!;
const GLYPHS: Record<string, string> = Object.fromEntries([...script.matchAll(/^ {4}'(\w+)': \('(.)'/gm)].map((m) => [m[1], m[2]]));

const allSigns = () => Object.values(MAPS).flatMap((map) => mapSigns(map).map((sign) => ({ map, sign })));

// 施設の人（action のある人）。建物の中（src/data/buildings.ts）の施設の人は、看板を町の戸口に掛けるので別に確かめる
const facilities = Object.values(MAPS)
  .filter((map) => !buildingTown(map.id))
  .flatMap((map) => map.npcs.filter((n) => n.action).map((npc) => ({ map, npc })));
const indoorFacilities = Object.values(MAPS)
  .filter((map) => buildingTown(map.id))
  .flatMap((map) => map.npcs.filter((n) => signKind(n)).map((npc) => ({ map, npc })));

describe('施設の看板', () => {
  it('看板を掛ける施設の人はどれも看板の種類が決まっている', () => {
    expect(facilities.length + indoorFacilities.length).toBeGreaterThan(90);
    for (const { map, npc } of facilities.filter((f) => f.npc.sign !== false)) expect(signKind(npc), `${map.id} ${npc.id}`).not.toBeNull();
  });

  it('施設には看板を掛ける。掛けないのは sign: false と書いた施設だけ（戸の見つからない施設を見落とさない）', () => {
    for (const { map, npc } of facilities) {
      if (npc.sign === false) continue;
      expect(signPosition(map, npc), `${map.id} ${npc.id}`).not.toBeNull();
    }
    // 掛けない施設は、戸のない施設と城の中の人、ワールドマップのもぐりの宿（届けの出ていない宿。src/data/moguriYado.ts）だけ
    const none = facilities.filter((f) => f.npc.sign === false && f.npc.action !== 'moguriInn').map((f) => f.npc.id);
    expect(none.sort()).toEqual(['kakibune', 'kanazawaHikyaku', 'kintaRoka', 'kokichiJo']);
  });

  it('建物の中の施設は、その建物の町の戸口（入口）の隣の壁に、施設の種類の看板を掛ける', () => {
    expect(indoorFacilities.length).toBeGreaterThan(0);
    for (const { map, npc } of indoorFacilities) {
      const town = MAPS[buildingTown(map.id)!]!;
      const entrance = town.exits.find((e) => e.to === map.id)!;
      const label = `${map.id} ${npc.id}`;
      expect(entrance.sign, label).toBe(signKind(npc));
      const pos = doorSignPosition(town, entrance)!;
      expect(town.rows[pos.y]?.[pos.x], label).toBe('W');
      expect(Math.abs(pos.x - entrance.x), label).toBe(1);
      expect(mapSigns(town), label).toContainEqual({ ...pos, kind: signKind(npc) });
      // 建物の中には看板を掛けない（壁の戸口がない）
      expect(signPosition(map, npc), label).toBeNull();
    }
  });

  it('看板は壁のマスに掛け、その施設の人の近く（上 1〜3 マス、左右 3 マス以内）にある', () => {
    for (const { map, npc } of facilities) {
      const pos = signPosition(map, npc);
      if (!pos) continue;
      expect(map.rows[pos.y]?.[pos.x], `${map.id} ${npc.id}`).toBe('W');
      expect(npc.y - pos.y, `${map.id} ${npc.id}`).toBeGreaterThanOrEqual(1);
      expect(npc.y - pos.y, `${map.id} ${npc.id}`).toBeLessThanOrEqual(3);
      expect(Math.abs(npc.x - pos.x), `${map.id} ${npc.id}`).toBeLessThanOrEqual(3);
    }
  });

  it('看板は施設の人の真上に掛けない（頭で隠れる）', () => {
    for (const { map, npc } of facilities) {
      const pos = signPosition(map, npc);
      if (pos) expect(pos.x, `${map.id} ${npc.id}`).not.toBe(npc.x);
    }
  });

  it('位置を書いていない施設は、戸口の隣に掛ける（看板の左右どちらかが戸）', () => {
    for (const { map, npc } of facilities) {
      const pos = signPosition(map, npc);
      // 位置を書いた施設（戸から離れて立つ人）は除く
      if (!pos || npc.sign) continue;
      const row = map.rows[pos.y]!;
      expect([row[pos.x - 1], row[pos.x + 1]], `${map.id} ${npc.id}`).toContain('D');
    }
  });

  it('同じマップで看板どうし・看板と人・入口の目印が重ならない', () => {
    for (const map of Object.values(MAPS)) {
      const cells = mapSigns(map).map((s) => `${s.x},${s.y}`);
      expect(new Set(cells).size, map.id).toBe(cells.length);
      for (const n of map.npcs) expect(cells, `${map.id} ${n.id}`).not.toContain(`${n.x},${n.y}`);
      for (const m of map.marks ?? []) expect(cells, `${map.id} mark`).not.toContain(`${m.x},${m.y}`);
    }
  });

  it('看板の種類はどれもどこかで使い、画像は 16 × 16', () => {
    const used = new Set(allSigns().map((s) => s.sign.kind));
    for (const kind of SIGN_KINDS) expect(used.has(kind), kind).toBe(true);
    const files = import.meta.glob<string>('../../public/assets/signs/*.png', { eager: true, query: '?inline', import: 'default' });
    const names = Object.keys(files).map((f) => f.replace('../../public/assets/signs/', '').replace('.png', ''));
    expect(names.sort()).toEqual([...SIGN_KINDS].sort());
    for (const [f, url] of Object.entries(files)) expect(pngSize(url), f).toEqual({ w: 16, h: 16 });
  });

  it('描くスクリプト（scripts/draw_signs.py）の看板の種類は SIGN_KINDS と同じ', () => {
    expect(Object.keys(GLYPHS).sort()).toEqual([...SIGN_KINDS].sort());
  });

  it('よろず屋は「万」、刀鍛冶は「刀」、旅籠は「宿」、茶屋は「茶」の看板', () => {
    const npcs = Object.values(MAPS).flatMap((m) => m.npcs);
    const kindOf = (id: string) => signKind(npcs.find((n) => n.id === id)!) as SignKind;
    expect(GLYPHS[kindOf('yorozuya')]).toBe('万');
    expect(GLYPHS[kindOf('kaji')]).toBe('刀');
    expect(GLYPHS[kindOf('innkeeper')]).toBe('宿');
    expect(GLYPHS[kindOf('teahouse')]).toBe('茶');
  });
});
