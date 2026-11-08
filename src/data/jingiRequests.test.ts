import { describe, expect, it } from 'vitest';
import { EventRunner, type EventInput } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { JINGI_MAX } from '../systems/jingi';
import { EVENTS } from './events';
import {
  JINGI_REQUEST_EVENTS,
  JINGI_REQUEST_KINDS,
  jingiRequestEnemies,
  jingiRequestId,
  facilityMenu,
  JINGI_REQUEST_LABELS,
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
        expect(pendingJingiRequest(town, kind, {})).toEqual({ id, kind, label: JINGI_REQUEST_LABELS[kind] });
        // 施設の人がその町にいる
        expect(MAPS[town]!.npcs.some((n) => n.action === kind), id).toBe(true);
      }
    }
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
    expect(pendingJingiRequest('kyo', 'tobaku', s.flags)?.id).toBe(id);
    const { state, battles } = run(id, s, 0, 'victory');
    expect(battles).toEqual([{ kind: 'battle', enemies: jingiRequestEnemies('tobaku', 10), level: 11, canEscape: false, loseOk: true }]);
    expect(state.jingi).toBe(14);
    expect(state.flags[id]).toBe(true);
    expect(pendingJingiRequest('kyo', 'tobaku', state.flags)).toBeNull();
    // ほかの町・施設の頼まれごとは残る
    expect(pendingJingiRequest('kyo', 'izakaya', state.flags)?.id).toBe(jingiRequestId('kyo', 'izakaya'));
    expect(pendingJingiRequest('osaka', 'tobaku', state.flags)?.id).toBe(jingiRequestId('osaka', 'tobaku'));
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
      expect(pendingJingiRequest('edo', 'gyoro', state.flags)?.id).toBe(id);
    }
  });

  it('ポイントは上限を超えず、知らせには増えた量ではなく今の仁義ポイントを出す', () => {
    const runner = new EventRunner(EVENTS[jingiRequestId('sendai', 'izakaya')]!.steps);
    let r = runner.next({ ...newGame('m', start), jingi: JINGI_MAX - 1 });
    const pages: string[] = [];
    for (let i = 0; i < 50 && r.request.kind !== 'done'; i++) {
      if (r.request.kind === 'say') pages.push(...r.request.pages);
      const input: EventInput | undefined =
        r.request.kind === 'choice' ? { kind: 'choice', index: 0 } : r.request.kind === 'battle' ? { kind: 'battle', outcome: 'victory' } : undefined;
      r = runner.next(r.state, input);
    }
    expect(r.state.jingi).toBe(JINGI_MAX);
    expect(pages).toContain(`渡世人としての名が上がった。（仁義 ${JINGI_MAX}）`);
  });

  it('得られるポイントの合計は docs/balance.md のとおり 198', () => {
    const total = Object.keys(TOWN_FACILITY_DOORS).reduce((sum, town) => sum + jingiRequestReward(MAPS[town]!.areaLevel) * JINGI_REQUEST_KINDS.length, 0);
    expect(total).toBe(198);
  });

  it('施設のメニューは、本来の項目・頼まれごと・やめる の順で、選んだ番号から選んだものが分かる', () => {
    const request = pendingJingiRequest('kyo', 'tobaku', {});
    const bets = [10, 100].map((b) => ({ label: `${b} 文張る`, value: b }));
    const withReq = facilityMenu(bets, request);
    expect(withReq.labels).toEqual(['10 文張る', '100 文張る', 'イカサマ客を懲らしめる', 'やめる']);
    expect([0, 1, 2, 3].map(withReq.pick)).toEqual([
      { kind: 'main', value: 10 },
      { kind: 'main', value: 100 },
      { kind: 'request', id: jingiRequestId('kyo', 'tobaku') },
      { kind: 'cancel' },
    ]);
    // 頼まれごとが済んでいれば出さない
    const without = facilityMenu(bets, null);
    expect(without.labels).toEqual(['10 文張る', '100 文張る', 'やめる']);
    expect(without.pick(2)).toEqual({ kind: 'cancel' });
    // 張る銭がなくても、頼まれごとは選べる
    const noBets = facilityMenu([], request);
    expect(noBets.labels).toEqual(['イカサマ客を懲らしめる', 'やめる']);
    expect(noBets.pick(0)).toEqual({ kind: 'request', id: jingiRequestId('kyo', 'tobaku') });
    expect(noBets.pick(1)).toEqual({ kind: 'cancel' });
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
      for (const line of [...(n.lines ?? []), ...(n.after?.lines ?? []), ...(n.later?.lines ?? [])]) {
        expect(line, map).toMatch(/親分/);
        // 泊められない・お断り、とはっきり言う
        expect(line, map).toMatch(/泊め(られ|でき|でけ)(ねえ|ない|ん|ませ|まへ|し)|泊めちゃならねえ|お断り/);
      }
    }
  });
});
