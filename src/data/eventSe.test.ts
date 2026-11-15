// イベントの効果音（手順 se）の置き方を確かめる（docs/audio.md の「場面（イベントの手順で鳴らす）」）。
import { describe, expect, it } from 'vitest';
import type { EventStep } from './eventTypes';
import { CHEST_EVENTS, EVENTS } from './events';
import { SE_IDS } from '../systems/audio';
import { EventRunner } from '../systems/eventScript';
import { START_POSITION } from './maps';
import { newGame } from '../systems/gameState';

/** 手順の並び（分岐の中の並びも）をすべて挙げる。 */
function* lists(steps: readonly EventStep[]): Generator<readonly EventStep[]> {
  yield steps;
  for (const step of steps) {
    if (step.type === 'if') {
      yield* lists(step.then);
      if (step.else) yield* lists(step.else);
    } else if (step.type === 'choice') {
      for (const o of step.options) yield* lists(o.steps);
    } else if (step.type === 'battle' && step.ifLose) {
      yield* lists(step.ifLose);
    } else if (step.type === 'giveItem' && step.ifFull) {
      yield* lists(step.ifFull);
    }
  }
}

describe('イベントの効果音', () => {
  it('手順 se と warp の se は表にある音で、手順 se はすぐ後に台詞（葛籠は道具を渡す手順）が来る（音は次の台詞と一緒に鳴るので）', () => {
    let count = 0;
    for (const [id, event] of Object.entries(EVENTS)) {
      for (const list of lists(event.steps)) {
        list.forEach((step, i) => {
          if (step.type === 'warp' && step.se) expect(SE_IDS, id).toContain(step.se);
          if (step.type !== 'se') return;
          count++;
          expect(SE_IDS, id).toContain(step.id);
          // 続けて鳴らす se（からくりと火など）は飛ばして、その次の手順を見る
          const next = list.slice(i + 1).find((s) => s.type !== 'se');
          expect(next?.type === 'say' || (step.id === 'se_chest' && next?.type === 'giveItem'), `${id} の ${step.id}`).toBe(true);
        });
      }
    }
    // 置いた手順を拾えていない（たどり方が壊れた）ことを見逃さないため（いまは約 60 か所）
    expect(count).toBeGreaterThan(40);
  });

  it('葛籠を開けると、蓋の音と道具を得る音が鳴る。空の葛籠は鳴らさない', () => {
    expect(CHEST_EVENTS.size).toBeGreaterThan(70);
    for (const id of CHEST_EVENTS) {
      const runner = new EventRunner(EVENTS[id]!.steps);
      const first = runner.next(newGame('m', START_POSITION));
      expect(first.request.kind, id).toBe('say');
      expect(runner.takeSounds(), id).toEqual(['se_chest', 'se_item']);
      const again = new EventRunner(EVENTS[id]!.steps);
      again.next({ ...first.state, flags: { ...first.state.flags, [id]: true } });
      expect(again.takeSounds(), id).toEqual([]);
    }
  });
});
