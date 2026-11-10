// イベントの演出（actor・walk・face・vanish）のデータを確かめる。
// 人を出す場所・歩く道が通れるマスか、動かす人がいるかを、イベントを始めるマップで分岐ごとにたどって見る。
// 主人公の位置は、決まったマスに乗るトリガーと warp の後でだけ分かる。マップに入ったとき・話しかけたときのイベントでは、
// 主人公の歩く道と、主人公の隣に出た人（actor の x・y を省いた人）の道は見ない（画面は通れないマスの手前で止める）。
// 主人公の位置が分かるときは、ほかの人を主人公のマスに出したり、主人公のマスを通らせたりしないことも見る（人どうしはぶつからない）。
// 話しかけたときのイベントでは、主人公は話す相手の隣（通れて、いつもいる人のいない、出口でないマス）のどれかに立っているので、
// ほかの人をそのどのマスにも出したり通らせたりしないことを見る（主人公が歩いたら、その先は見ない。行き先が決まっていればそこを主人公の位置にする）。
import { describe, expect, it } from 'vitest';
import type { EventStep } from './eventTypes';
import { ENEMIES } from './enemies';
import { EVENTS } from './events';
import { canStep, MAPS, type MapDef } from './maps';
import { speakerOf } from './faces';
import { CHARACTER_SPRITES } from './sprites';
import { EventRunner, pathFacings, pathTo } from '../systems/eventScript';
import { newGame } from '../systems/gameState';

const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

/** フィールドで姿を見せる一行の仲間（events.ts の partyOut）。 */
const PARTY = new Set(['kasumi', 'gendo', 'orin', 'hyogo']);

/** 主人公でない人が、位置の分かる主人公のマスを通るか（人どうしはぶつからないので、重なって見える）。 */
function onHero(who: string, pos: { x: number; y: number }, hero: { x: number; y: number } | undefined): boolean {
  return who !== 'hero' && hero !== undefined && pos.x === hero.x && pos.y === hero.y;
}

/** イベントを始めるマップと、主人公の位置（分かるときだけ。決まった場所に乗るトリガー）。 */
interface Start {
  map: MapDef;
  hero?: { x: number; y: number };
  /** 話しかけたときのイベントで、主人公が立っているかもしれないマス（話す相手の隣）。 */
  heroSpots?: { x: number; y: number }[];
}

/**
 * 話す相手の隣で、主人公が立てるマス（通れて、いつもいる人〈showFlag も hideFlag もない人〉のいないマス）。
 * 出口のマスは除く（乗るとすぐ別のマップへ移るので、そこに立って話しかけることはない。江戸の大手門の門番の北の橋）。
 */
function spotsAround(map: MapDef, x: number, y: number): { x: number; y: number }[] {
  return Object.values(DELTA)
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter(
      (p) =>
        canStep(map, p.x, p.y) &&
        !map.npcs.some((n) => n.x === p.x && n.y === p.y && !n.showFlag && !n.hideFlag) &&
        !map.exits.some((e) => e.x === p.x && e.y === p.y),
    );
}

function startsOf(eventId: string): Start[] {
  const starts: Start[] = [];
  for (const map of Object.values(MAPS)) {
    if (map.onEnter?.event === eventId) starts.push({ map });
    for (const t of map.triggers ?? []) if (t.event === eventId) starts.push({ map, hero: { x: t.x, y: t.y } });
    for (const n of map.npcs) if (n.event === eventId) starts.push({ map, heroSpots: spotsAround(map, n.x, n.y) });
    for (const g of map.gates ?? []) if (g.event === eventId) starts.push({ map });
  }
  return starts;
}

/** 分岐の組み合わせの上限（超えたら、確かめ漏れにならないようテストを落とす）。 */
const PATH_LIMIT = 512;

/** 分岐をすべて開いた手順の並び（if の両方、選択肢のそれぞれ、負けたとき）。 */
function linearize(steps: readonly EventStep[], limit = PATH_LIMIT + 1): EventStep[][] {
  let paths: EventStep[][] = [[]];
  for (const step of steps) {
    let branches: EventStep[][][] = [];
    if (step.type === 'if') branches = [linearize(step.then, limit), linearize(step.else ?? [], limit)];
    else if (step.type === 'choice') branches = step.options.map((o) => linearize(o.steps, limit));
    else if (step.type === 'battle' && step.ifLose) branches = [[[]], linearize(step.ifLose, limit)];
    else if (step.type === 'giveItem' && step.ifFull) branches = [[[]], linearize(step.ifFull, limit)];
    if (branches.length === 0) {
      paths = paths.map((p) => [...p, step]);
      continue;
    }
    const tails = branches.flat();
    paths = paths.flatMap((p) => tails.map((t) => [...p, step, ...t])).slice(0, limit);
  }
  return paths;
}

function isStage(step: EventStep): boolean {
  return step.type === 'actor' || step.type === 'walk' || step.type === 'face' || step.type === 'vanish' || step.type === 'wait';
}

/** 人が立てるマス（戸口も含む。画面の歩きと同じ canStep）。 */
function passable(map: MapDef, x: number, y: number): boolean {
  return canStep(map, x, y);
}

describe('イベントの演出', () => {
  const staged = Object.entries(EVENTS).filter(([, def]) => linearize(def.steps).some((p) => p.some(isStage)));

  it('演出のあるイベントは、どれもマップから始まる', () => {
    for (const [id] of staged) expect(startsOf(id).length, id).toBeGreaterThan(0);
  });

  for (const [id, def] of staged) {
    it(`${id}: 出す人・歩く道が通れるマスで、動かす人がいる`, () => {
      expect(linearize(def.steps).length, `${id} の分岐の組み合わせが多すぎて確かめきれない`).toBeLessThanOrEqual(PATH_LIMIT);
      for (const start of startsOf(id)) {
        for (const path of linearize(def.steps)) {
          let map = start.map;
          let hero = start.hero ? { ...start.hero } : undefined;
          let spots = start.heroSpots ?? [];
          /** 主人公でない人が、主人公が立っているかもしれないマスに入るか。 */
          const onSpot = (who: string, pos: { x: number; y: number }) => who !== 'hero' && spots.some((p) => p.x === pos.x && p.y === pos.y);
          const where = new Map<string, { x: number; y: number }>(map.npcs.map((n) => [n.id, { x: n.x, y: n.y }]));
          const label = (s: string) => `${id} @${map.id}: ${s}`;
          for (const step of path) {
            if (step.type === 'warp') {
              map = MAPS[step.mapId]!;
              hero = { x: step.x, y: step.y };
              spots = [];
              where.clear();
              for (const n of map.npcs) where.set(n.id, { x: n.x, y: n.y });
              continue;
            }
            if (step.type === 'actor') {
              expect((step.sprite === undefined) !== (step.enemy === undefined), label(`${step.id} の姿は sprite か enemy のどちらか一つ`)).toBe(true);
              if (step.sprite) expect(CHARACTER_SPRITES as readonly string[], label(step.sprite)).toContain(step.sprite);
              if (step.enemy) expect(ENEMIES[step.enemy]?.image, label(`${step.enemy} の画像がない`)).toBeTruthy();
              if (step.scale !== undefined || step.grow) expect(step.enemy, label(`${step.id} の scale・grow は enemy の姿だけ`)).toBeDefined();
              if (step.scale !== undefined) expect(step.scale, label(`${step.id} の scale`)).toBeGreaterThan(0);
              // grow は半分の大きさからふくらむので、scale は半分より大きい
              if (step.grow) expect(step.scale ?? 0.5, label(`${step.id} の grow の scale`)).toBeGreaterThan(0.5);
              expect(step.id, label('actor の ID が主人公と同じ')).not.toBe('hero');
              expect((step.x === undefined) === (step.y === undefined), label(`${step.id} の x・y は両方書くか両方省く`)).toBe(true);
              if (step.x !== undefined && step.y !== undefined) {
                expect(passable(map, step.x, step.y), label(`${step.id} を出す (${step.x},${step.y}) が通れない`)).toBe(true);
                // 一行の仲間は、主人公から出てくる姿として主人公のマスに出してよい（第 1 章の蔵の霞）
                if (hero && !PARTY.has(step.id)) expect(step.x === hero.x && step.y === hero.y, label(`${step.id} を主人公のマス (${step.x},${step.y}) に出す`)).toBe(false);
                if (!PARTY.has(step.id)) expect(onSpot(step.id, { x: step.x, y: step.y }), label(`${step.id} を主人公が立っているかもしれないマス (${step.x},${step.y}) に出す`)).toBe(false);
                where.set(step.id, { x: step.x, y: step.y });
              } else where.set(step.id, { x: NaN, y: NaN }); // 主人公の隣の空いたマス（画面が選ぶ）
              continue;
            }
            if (step.type === 'face') {
              expect(step.dir !== undefined || step.toward !== undefined, label('face に dir も toward もない')).toBe(true);
              if (step.who !== 'hero') expect(where.has(step.who), label(`face の ${step.who} がいない`)).toBe(true);
              if (step.toward && step.toward !== 'hero') expect(where.has(step.toward), label(`face の toward ${step.toward} がいない`)).toBe(true);
              continue;
            }
            if (step.type === 'wait') {
              expect(step.ms, label('wait の時間')).toBeGreaterThan(0);
              continue;
            }
            if (step.type === 'vanish') {
              expect(step.who, label('vanish は主人公に使えない')).not.toBe('hero');
              expect(where.has(step.who), label(`vanish の ${step.who} がいない`)).toBe(true);
              continue;
            }
            if (step.type !== 'walk') continue;
            expect((step.path === undefined) !== (step.to === undefined), label(`walk の ${step.who} は path か to のどちらか一つ`)).toBe(true);
            if (step.who === 'hero' && hero === undefined) {
              // 主人公の位置が分からないまま歩いたら、主人公が立っているかもしれないマスはもう分からない（path なら以後は見ない）。
              // to に行き先のマスがあれば、そこを主人公の位置にして見続ける
              spots = [];
              if (typeof step.to === 'object') {
                expect(passable(map, step.to.x, step.to.y), label(`主人公の行き先 (${step.to.x},${step.to.y}) が通れない`)).toBe(true);
                hero = { ...step.to };
              }
              continue;
            }
            const pos = step.who === 'hero' ? hero : where.get(step.who);
            if (step.who !== 'hero') expect(pos, label(`walk の ${step.who} がいない`)).toBeDefined();
            if (typeof step.to === 'object') {
              expect(passable(map, step.to.x, step.to.y), label(`${step.who} の行き先 (${step.to.x},${step.to.y}) が通れない`)).toBe(true);
              // 横、縦の順にまっすぐ歩く道が通れるか
              if (pos && !Number.isNaN(pos.x)) {
                for (const d of pathTo(pos, step.to)) {
                  pos.x += DELTA[d][0];
                  pos.y += DELTA[d][1];
                  expect(passable(map, pos.x, pos.y), label(`${step.who} が通れない (${pos.x},${pos.y}) を歩く`)).toBe(true);
                  expect(onHero(step.who, pos, hero), label(`${step.who} が主人公のマス (${pos.x},${pos.y}) を通る`)).toBe(false);
                  expect(onSpot(step.who, pos), label(`${step.who} が主人公が立っているかもしれないマス (${pos.x},${pos.y}) を通る`)).toBe(false);
                }
              } else if (pos) Object.assign(pos, step.to);
              continue;
            }
            if (step.to !== undefined) {
              if (step.to !== 'hero') expect(where.has(step.to), label(`walk の to ${step.to} がいない`)).toBe(true);
              const target = step.to === 'hero' ? hero : where.get(step.to);
              // 両方の位置が分かれば、横、縦の順の道が通れるかを見る（行き先のマスは人がいても入れる）
              if (pos && target && !Number.isNaN(pos.x) && !Number.isNaN(target.x)) {
                const steps = pathTo(pos, target);
                for (const d of steps.slice(0, -1)) {
                  pos.x += DELTA[d][0];
                  pos.y += DELTA[d][1];
                  expect(passable(map, pos.x, pos.y), label(`${step.who} が通れない (${pos.x},${pos.y}) を歩く`)).toBe(true);
                  expect(onHero(step.who, pos, hero), label(`${step.who} が主人公のマス (${pos.x},${pos.y}) を通る`)).toBe(false);
                  expect(onSpot(step.who, pos), label(`${step.who} が主人公が立っているかもしれないマス (${pos.x},${pos.y}) を通る`)).toBe(false);
                }
              }
              if (pos) Object.assign(pos, target ?? { x: NaN, y: NaN });
              continue;
            }
            const path = step.path ?? '';
            const dirs = pathFacings(path);
            expect(dirs.length, label(`walk の道 "${path}"`)).toBe(path.length);
            if (!pos || Number.isNaN(pos.x)) continue;
            for (const d of dirs) {
              pos.x += DELTA[d][0];
              pos.y += DELTA[d][1];
              expect(passable(map, pos.x, pos.y), label(`${step.who} が通れない (${pos.x},${pos.y}) を歩く`)).toBe(true);
              expect(onHero(step.who, pos, hero), label(`${step.who} が主人公のマス (${pos.x},${pos.y}) を通る`)).toBe(false);
              expect(onSpot(step.who, pos), label(`${step.who} が主人公が立っているかもしれないマス (${pos.x},${pos.y}) を通る`)).toBe(false);
            }
          }
        }
      }
    });
  }
});

describe('演出の手順の実行', () => {
  it('演出の手順は画面に頼み（stage）、warp で演出の人を空にする', () => {
    const runner = new EventRunner([
      { type: 'actor', id: 'a', sprite: 'kasumi', x: 1, y: 2 },
      { type: 'walk', who: 'a', path: 'ud' },
      { type: 'warp', mapId: 'shimizu', x: 20, y: 9 },
      { type: 'wait', ms: 100 },
    ]);
    const s = newGame('m', { mapId: 'shimizu', x: 20, y: 9 });
    const r1 = runner.next(s);
    expect(r1.request).toEqual({ kind: 'stage', step: { type: 'actor', id: 'a', sprite: 'kasumi', x: 1, y: 2 } });
    runner.stage.set('a', { sprite: 'kasumi', x: 1, y: 2, facing: 'down', visible: true });
    expect(runner.next(r1.state).request.kind).toBe('stage');
    expect(runner.next(r1.state).request.kind).toBe('warp');
    expect(runner.stage.size).toBe(0);
    expect(runner.next(r1.state).request).toEqual({ kind: 'stage', step: { type: 'wait', ms: 100 } });
    expect(runner.next(r1.state).request.kind).toBe('done');
  });

  it('歩く道は u・d・l・r を向きにする', () => {
    expect(pathFacings('udlr')).toEqual(['up', 'down', 'left', 'right']);
  });
});

describe('台詞を言う仲間が画面にいる', () => {
  // テストプレイの指摘「その場に表示されていない人物が喋っている」。一行の仲間（霞・玄道・お凛・兵庫）は主人公に重なって見えないので、
  // 台詞を言う前に actor（partyOut）で出しておく。マップに同じ姿の NPC（加入前・一時離脱中の仲間など）がいれば、その人が話しているとみなす。
  // 出し消しのフラグ（showFlag・hideFlag）を持つ NPC は、イベントの途中でそのフラグが立てば出す・消す（加入して hideFlag が立った仲間は、
  // そのあと partyOut しないと話せない）。イベントの始まりのフラグは分からないので、始まりではマップに書いた人はみな見えているとみなす
  // （始まりの時点で hideFlag が立って消えている人が話す誤りは、このテストでは見つけられない）。
  const MEMBER_OF: Record<string, string> = { 霞: 'kasumi', 玄道: 'gendo', お凛: 'orin', 兵庫: 'hyogo', 榊兵庫: 'hyogo' };
  for (const [id, def] of Object.entries(EVENTS)) {
    const starts = startsOf(id);
    if (starts.length === 0) continue;
    it(`${id}: 仲間の台詞は、その仲間が出ている間だけ`, () => {
      for (const start of starts) {
        for (const path of linearize(def.steps)) {
          let map = start.map;
          /** 見えている人の ID → 姿。 */
          const shown = new Map<string, string | undefined>(map.npcs.map((n) => [n.id, n.sprite]));
          for (const step of path) {
            if (step.type === 'warp') {
              map = MAPS[step.mapId]!;
              shown.clear();
              for (const n of map.npcs) shown.set(n.id, n.sprite);
            } else if (step.type === 'setFlag') {
              // value: false はフラグを下ろす（出し消しが逆になる）
              const on = step.value !== false;
              for (const n of map.npcs) {
                if (n.hideFlag === step.flag) {
                  if (on) shown.delete(n.id);
                  else shown.set(n.id, n.sprite);
                } else if (n.showFlag === step.flag) {
                  if (on) shown.set(n.id, n.sprite);
                  else shown.delete(n.id);
                }
              }
            } else if (step.type === 'actor') shown.set(step.id, step.sprite);
            else if (step.type === 'vanish') shown.delete(step.who);
            else if (step.type === 'say') {
              for (const line of [...step.lines, ...(step.linesF ?? [])]) {
                const member = MEMBER_OF[speakerOf(line) ?? ''];
                if (!member) continue;
                const visible = [...shown.entries()].some(([who, sprite]) => who === member || sprite === member);
                expect(visible, `${id} @${map.id}: ${line}`).toBe(true);
              }
            }
          }
        }
      }
    });
  }
});
