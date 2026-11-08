import { describe, expect, it } from 'vitest';
import { EventRunner, type EventInput } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { JINGI_MAX } from '../systems/jingi';
import { EVENTS } from './events';
import {
  JINGI_REQUEST_EVENTS,
  JINGI_REQUEST_KINDS,
  jingiRequestEnemies,
  jingiRequestFlag,
  jingiRequestId,
  jingiRequestKindOf,
  jingiRequestLevel,
  jingiRequestReward,
  pendingJingiRequest,
} from './jingiRequests';
import { MAPS } from './maps';
import { TOWN_FACILITY_DOORS } from './townFacilities';

const start = { mapId: 'shimizu', x: 1, y: 1 };

/** イベントを最後まで進める。選択肢は choice 番目、戦闘は outcome にする。戦闘の要求も返す。 */
function run(id: string, state: GameState, choice: number, outcome: 'victory' | 'defeat') {
  const runner = new EventRunner(EVENTS[id]!.steps);
  const battles: Extract<ReturnType<EventRunner['next']>['request'], { kind: 'battle' }>[] = [];
  let r = runner.next(state);
  for (let i = 0; i < 50 && r.request.kind !== 'done'; i++) {
    let input: EventInput | undefined;
    if (r.request.kind === 'choice') input = { kind: 'choice', index: choice };
    if (r.request.kind === 'battle') {
      battles.push(r.request);
      input = { kind: 'battle', outcome };
    }
    r = runner.next(r.state, input);
  }
  return { state: r.state, battles };
}

describe('仁義ポイントを得る頼まれごと', () => {
  it('湯屋・賭場などのある 15 町の、賭場・居酒屋・妓楼にひとつずつあり、EVENTS から引ける', () => {
    const towns = Object.keys(TOWN_FACILITY_DOORS);
    expect(Object.keys(JINGI_REQUEST_EVENTS)).toHaveLength(towns.length * 3);
    for (const town of towns) {
      for (const kind of JINGI_REQUEST_KINDS) {
        const id = jingiRequestId(town, kind);
        expect(EVENTS[id]?.id, id).toBe(id);
        expect(jingiRequestKindOf(id)).toBe(kind);
        // 施設の人がその町にいる
        expect(MAPS[town]!.npcs.some((n) => n.action === kind), id).toBe(true);
      }
    }
    expect(jingiRequestKindOf('tatsugoro')).toBeNull();
  });

  it('ポイントはその町の親分の屋敷の 2 泊分（序盤 2・中盤 4・終盤 6）、敵は町の敵レベル + 1', () => {
    expect([1, 9, 10, 18, 19, 25].map(jingiRequestReward)).toEqual([2, 2, 4, 4, 6, 6]);
    expect(jingiRequestLevel(7)).toBe(8);
    expect(jingiRequestEnemies('tobaku', 1)).toHaveLength(2);
    expect(jingiRequestEnemies('gyoro', 25)).toEqual(['hatamotoYakko', 'oihagiRonin', 'oihagiRonin']);
  });

  it('引き受けて勝つと仁義ポイントを得てフラグが立ち、施設のメニューから消える', () => {
    const id = jingiRequestId('kyo', 'tobaku');
    const s = { ...newGame('m', start), jingi: 10 };
    expect(pendingJingiRequest('kyo', 'tobaku', s.flags)).toBe(id);
    const { state, battles } = run(id, s, 0, 'victory');
    expect(battles).toEqual([{ kind: 'battle', enemies: jingiRequestEnemies('tobaku', 10), level: 11, canEscape: false, loseOk: true }]);
    expect(state.jingi).toBe(14);
    expect(state.flags[jingiRequestFlag('kyo', 'tobaku')]).toBe(true);
    expect(pendingJingiRequest('kyo', 'tobaku', state.flags)).toBeNull();
    // ほかの町・施設の頼まれごとは残る
    expect(pendingJingiRequest('kyo', 'izakaya', state.flags)).toBe(jingiRequestId('kyo', 'izakaya'));
    expect(pendingJingiRequest('osaka', 'tobaku', state.flags)).toBe(jingiRequestId('osaka', 'tobaku'));
  });

  it('負けても全滅にはならず、ポイントもフラグも変わらない（また引き受けられる）。断っても同じ', () => {
    const id = jingiRequestId('edo', 'gyoro');
    const s = { ...newGame('f', start), jingi: 3 };
    for (const [choice, outcome] of [
      [0, 'defeat'],
      [1, 'victory'],
    ] as const) {
      const { state, battles } = run(id, s, choice, outcome);
      expect(battles).toHaveLength(choice === 0 ? 1 : 0);
      expect(state.jingi).toBe(3);
      expect(pendingJingiRequest('edo', 'gyoro', state.flags)).toBe(id);
    }
  });

  it('ポイントは上限を超えない', () => {
    const { state } = run(jingiRequestId('sendai', 'izakaya'), { ...newGame('m', start), jingi: JINGI_MAX - 1 }, 0, 'victory');
    expect(state.jingi).toBe(JINGI_MAX);
  });

  it('湯屋や、施設のない町には頼まれごとがない', () => {
    expect(pendingJingiRequest('kyo', 'yuya', {})).toBeNull();
    expect(pendingJingiRequest('kyo', undefined, {})).toBeNull();
    expect(pendingJingiRequest('koya', 'tobaku', {})).toBeNull();
  });
});

describe('町の旅籠', () => {
  it('旅籠の主人は渡世人を泊めず、親分の屋敷へ導く（どの町も親分の屋敷がある）', () => {
    const inns = Object.values(MAPS).flatMap((m) => m.npcs.filter((n) => n.action === 'inn').map((n) => ({ map: m.id, n })));
    expect(inns.length).toBeGreaterThan(0);
    for (const { map, n } of inns) {
      expect(TOWN_FACILITY_DOORS[map], map).toBeDefined();
      for (const line of [...(n.lines ?? []), ...(n.after?.lines ?? []), ...(n.later?.lines ?? [])]) expect(line, map).toMatch(/親分/);
    }
  });
});
