import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { isKnownItem } from './items';
import { MAPS, tileAt } from './maps';
import { EventRunner } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';

/** イベントの手順を、分岐の中まで含めてすべてたどる。 */
function* walk(steps: readonly EventStep[]): Generator<EventStep> {
  for (const step of steps) {
    yield step;
    if (step.type === 'if') {
      yield* walk(step.then);
      if (step.else) yield* walk(step.else);
    } else if (step.type === 'choice') {
      for (const o of step.options) yield* walk(o.steps);
    } else if (step.type === 'battle' && step.ifLose) {
      yield* walk(step.ifLose);
    } else if (step.type === 'giveItem' && step.ifFull) {
      yield* walk(step.ifFull);
    }
  }
}

describe('イベントのデータ', () => {
  for (const [key, def] of Object.entries(EVENTS)) {
    it(`${key}: 参照する道具・敵・仲間・移動先が正しい`, () => {
      expect(def.id).toBe(key);
      for (const step of walk(def.steps)) {
        switch (step.type) {
          case 'giveItem':
            expect(isKnownItem(step.item), step.item).toBe(true);
            expect(step.count ?? 1).toBeGreaterThan(0);
            break;
          case 'battle':
            expect(step.enemies.length).toBeGreaterThan(0);
            for (const id of step.enemies) expect(ENEMIES[id], id).toBeDefined();
            break;
          case 'join':
            expect(CHARACTERS[step.member], step.member).toBeDefined();
            break;
          case 'warp': {
            const map = MAPS[step.mapId];
            expect(map, step.mapId).toBeDefined();
            if (map) expect(tileAt(map, step.x, step.y)?.blocked).toBe(false);
            break;
          }
          case 'choice':
            expect(step.options.length).toBeGreaterThan(0);
            break;
          case 'say':
            expect(step.lines.length).toBeGreaterThan(0);
            break;
          default:
            break;
        }
      }
    });
  }
});

/** イベントを最後まで進める（選択肢は最初のもの、戦闘の結果は outcome）。 */
function run(id: string, state: GameState, outcome: 'victory' | 'defeat' = 'victory'): GameState {
  const runner = new EventRunner(EVENTS[id]!.steps);
  let r = runner.next(state);
  for (let guard = 0; guard < 50 && r.request.kind !== 'done'; guard++) {
    if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
    else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome });
    else r = runner.next(r.state);
  }
  return r.state;
}

describe('序章の流れ', () => {
  const start = newGame('m', { mapId: 'shimizu', x: 14, y: 7 });

  it('辰五郎の頼みを聞き、野狐を倒して報告すると序章が終わる', () => {
    const asked = run('tatsugoro', start);
    expect(asked.flags.talkedToTatsugoro).toBe(true);
    expect(asked.flags.prologueCleared).toBeFalsy();
    // 倒す前にもう一度話しても、まだ終わらない
    expect(run('tatsugoro', asked).flags.prologueCleared).toBeFalsy();
    const defeated = run('yako', asked);
    expect(defeated.flags.yakoDefeated).toBe(true);
    const reported = run('tatsugoro', defeated);
    expect(reported.flags.prologueCleared).toBe(true);
    expect(reported.money).toBe(defeated.money + 300);
    // 礼は一度だけ
    expect(run('tatsugoro', reported).money).toBe(reported.money);
  });

  it('野狐の戦闘は逃げられず、負けたら yakoDefeated は立たない', () => {
    const battle = EVENTS.yako!.steps.find((st) => st.type === 'battle');
    expect(battle).toMatchObject({ type: 'battle', enemies: ['yako'], level: 4 });
    expect(battle?.type === 'battle' && battle.canEscape).toBeFalsy();
    expect(battle?.type === 'battle' && battle.ifLose).toBeFalsy();
    expect(run('yako', start, 'defeat').flags.yakoDefeated).toBeFalsy();
  });

  it('頼みを聞く前に野狐を倒していても、報告で序章が終わる', () => {
    const reported = run('tatsugoro', run('yako', start));
    expect(reported.flags.talkedToTatsugoro).toBe(true);
    expect(reported.flags.prologueCleared).toBe(true);
  });
});
