// イベントの演出（actor・walk・face・vanish）のデータを確かめる。
// 人を出す場所・歩く道が通れるマスか、動かす人がいるかを、イベントを始めるマップで分岐ごとにたどって見る。
import { describe, expect, it } from 'vitest';
import type { EventStep } from './eventTypes';
import { ENEMIES } from './enemies';
import { EVENTS } from './events';
import { canStep, MAPS, type MapDef } from './maps';
import { CHARACTER_SPRITES } from './sprites';
import { EventRunner, pathFacings, pathTo } from '../systems/eventScript';
import { newGame } from '../systems/gameState';

const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

/** イベントを始めるマップと、主人公の位置（分かるときだけ。決まった場所に乗るトリガー）。 */
interface Start {
  map: MapDef;
  hero?: { x: number; y: number };
}

function startsOf(eventId: string): Start[] {
  const starts: Start[] = [];
  for (const map of Object.values(MAPS)) {
    if (map.onEnter?.event === eventId) starts.push({ map });
    for (const t of map.triggers ?? []) if (t.event === eventId) starts.push({ map, hero: { x: t.x, y: t.y } });
    for (const n of map.npcs) if (n.event === eventId) starts.push({ map });
    for (const g of map.gates ?? []) if (g.event === eventId) starts.push({ map });
  }
  return starts;
}

/** 分岐をすべて開いた手順の並び（if の両方、選択肢のそれぞれ、負けたとき）。多すぎるときは打ち切る。 */
function linearize(steps: readonly EventStep[], limit = 512): EventStep[][] {
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
      for (const start of startsOf(id)) {
        for (const path of linearize(def.steps)) {
          let map = start.map;
          let hero = start.hero ? { ...start.hero } : undefined;
          const where = new Map<string, { x: number; y: number }>(map.npcs.map((n) => [n.id, { x: n.x, y: n.y }]));
          const label = (s: string) => `${id} @${map.id}: ${s}`;
          for (const step of path) {
            if (step.type === 'warp') {
              map = MAPS[step.mapId]!;
              hero = { x: step.x, y: step.y };
              where.clear();
              for (const n of map.npcs) where.set(n.id, { x: n.x, y: n.y });
              continue;
            }
            if (step.type === 'actor') {
              expect((step.sprite === undefined) !== (step.enemy === undefined), label(`${step.id} の姿は sprite か enemy のどちらか一つ`)).toBe(true);
              if (step.sprite) expect(CHARACTER_SPRITES as readonly string[], label(step.sprite)).toContain(step.sprite);
              if (step.enemy) expect(ENEMIES[step.enemy]?.image, label(`${step.enemy} の画像がない`)).toBeTruthy();
              expect(step.id, label('actor の ID が主人公と同じ')).not.toBe('hero');
              expect((step.x === undefined) === (step.y === undefined), label(`${step.id} の x・y は両方書くか両方省く`)).toBe(true);
              if (step.x !== undefined && step.y !== undefined) {
                expect(passable(map, step.x, step.y), label(`${step.id} を出す (${step.x},${step.y}) が通れない`)).toBe(true);
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
            if (step.type === 'vanish') {
              expect(step.who, label('vanish は主人公に使えない')).not.toBe('hero');
              expect(where.has(step.who), label(`vanish の ${step.who} がいない`)).toBe(true);
              continue;
            }
            if (step.type !== 'walk') continue;
            expect((step.path === undefined) !== (step.to === undefined), label(`walk の ${step.who} は path か to のどちらか一つ`)).toBe(true);
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
                }
              } else if (pos) Object.assign(pos, step.to);
              continue;
            }
            if (step.to !== undefined) {
              if (step.to !== 'hero') expect(where.has(step.to), label(`walk の to ${step.to} がいない`)).toBe(true);
              const target = step.to === 'hero' ? hero : where.get(step.to);
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
