import { describe, expect, it } from 'vitest';
import { EventRunner, type EventInput } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { JINGI_MAX } from '../systems/jingi';
import { ENEMIES } from './enemies';
import { EVENTS } from './events';
import { MAPS } from './maps';
import { OYABUN } from './oyabun';
import {
  OYABUN_REQUESTS,
  OYABUN_REQUEST_EVENTS,
  TATSUGORO_JINGI,
  oyabunRequestId,
  oyabunRequestLevel,
  oyabunRequestReward,
  pendingOyabunRequest,
} from './oyabunRequests';

const start = { mapId: 'shimizu', x: 1, y: 1 };

/** イベントを最後まで進める。選択肢は choice 番目、戦闘は outcome にする。戦闘の要求と、出た台詞も返す。 */
function run(id: string, state: GameState, choice: number, outcome: 'victory' | 'defeat') {
  const runner = new EventRunner(EVENTS[id]!.steps);
  const battles: Extract<ReturnType<EventRunner['next']>['request'], { kind: 'battle' }>[] = [];
  const pages: string[] = [];
  let r = runner.next(state);
  for (let i = 0; i < 50 && r.request.kind !== 'done'; i++) {
    let input: EventInput | undefined;
    if (r.request.kind === 'say') pages.push(...r.request.pages);
    if (r.request.kind === 'choice') input = { kind: 'choice', index: choice };
    if (r.request.kind === 'battle') {
      battles.push(r.request);
      input = { kind: 'battle', outcome };
    }
    r = runner.next(r.state, input);
  }
  return { state: r.state, battles, pages };
}

describe('親分の頼み', () => {
  it('清水湊（序章の辰五郎の頼み）を除く、屋敷のある 14 町にひとつずつあり、EVENTS から引ける', () => {
    const towns = Object.keys(OYABUN).filter((t) => t !== 'shimizu');
    expect(Object.keys(OYABUN_REQUESTS).sort()).toEqual([...towns].sort());
    expect(Object.keys(OYABUN_REQUEST_EVENTS)).toHaveLength(14);
    for (const town of towns) {
      const id = oyabunRequestId(town);
      expect(EVENTS[id]?.id, id).toBe(id);
      expect(pendingOyabunRequest(town, {})).toEqual({ id, label: '親分の頼みを聞く' });
      // 相手は 3 人で、どれも敵の一覧にある
      expect(OYABUN_REQUESTS[town]!.enemies, town).toHaveLength(3);
      for (const e of OYABUN_REQUESTS[town]!.enemies) expect(ENEMIES[e], `${town} ${e}`).toBeDefined();
    }
    // 清水湊と、屋敷のない町には出ない
    expect(pendingOyabunRequest('shimizu', {})).toBeNull();
    expect(pendingOyabunRequest('world', {})).toBeNull();
  });

  it('ポイントはその町の親分の屋敷の 3 泊分（序盤 3・中盤 6・終盤 9）、敵は町の敵レベル + 2。辰五郎の頼みは清水湊の 3 泊分', () => {
    expect([1, 9, 10, 18, 19, 25].map(oyabunRequestReward)).toEqual([3, 3, 6, 6, 9, 9]);
    expect(oyabunRequestLevel(7)).toBe(9);
    expect(TATSUGORO_JINGI).toBe(3);
  });

  it('引き受けて勝つと仁義ポイントを得てフラグが立ち、屋敷のメニューから消える', () => {
    const id = oyabunRequestId('kyo');
    const s = { ...newGame('m', start), jingi: 10 };
    const { state, battles, pages } = run(id, s, 0, 'victory');
    expect(battles).toEqual([{ kind: 'battle', enemies: OYABUN_REQUESTS.kyo!.enemies, level: 12, canEscape: false, loseOk: true }]);
    expect(state.jingi).toBe(16);
    expect(pages).toContain('渡世人としての名が上がった。（仁義 16）');
    expect(state.flags[id]).toBe(true);
    expect(pendingOyabunRequest('kyo', state.flags)).toBeNull();
    // ほかの町の頼みは残る
    expect(pendingOyabunRequest('osaka', state.flags)?.id).toBe(oyabunRequestId('osaka'));
  });

  it('負けても全滅にはならず、ポイントは得ず、また引き受けられる。断っても残る', () => {
    const id = oyabunRequestId('edo');
    const s = newGame('m', start);
    const lost = run(id, s, 0, 'defeat');
    expect(lost.state.jingi).toBe(s.jingi);
    expect(lost.state.flags[id]).toBeFalsy();
    expect(pendingOyabunRequest('edo', lost.state.flags)?.id).toBe(id);
    const declined = run(id, s, 1, 'victory');
    expect(declined.battles).toHaveLength(0);
    expect(declined.state.flags[id]).toBeFalsy();
  });

  it('上限を超えるときは 100 で止まり、台詞も今のポイントを出す', () => {
    const s = { ...newGame('m', start), jingi: JINGI_MAX - 1 };
    const r = run(oyabunRequestId('edo'), s, 0, 'victory');
    expect(r.state.jingi).toBe(JINGI_MAX);
    expect(r.pages).toContain(`渡世人としての名が上がった。（仁義 ${JINGI_MAX}）`);
  });

  it('得られるポイントの合計は docs/balance.md のとおり、辰五郎の頼みと合わせて 99', () => {
    const total = Object.keys(OYABUN_REQUESTS).reduce((sum, town) => sum + oyabunRequestReward(MAPS[town]!.areaLevel), 0);
    expect(total).toBe(96);
    expect(total + TATSUGORO_JINGI).toBe(99);
  });

  it('親分は画面に出ないので、親分本人には喋らせない（若い衆が伝える）', () => {
    for (const [town, def] of Object.entries(OYABUN_REQUESTS)) {
      const name = OYABUN[town]!.welcome.split('「')[0]!;
      for (const line of [...def.ask, ...def.confront, ...def.thanks]) expect(line.startsWith(`${name}「`), `${town}: ${line}`).toBe(false);
    }
  });
});
