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

  it('第 1〜8 章の終わり（chapterNCleared を立てる並び）に、締めくくりの台詞と一緒に鳴る拍子木（se_hyoshigi）が 1 つずつある', () => {
    const chapters = new Set<string>();
    for (const event of Object.values(EVENTS)) {
      for (const list of lists(event.steps)) {
        const flag = list.find((s) => s.type === 'setFlag' && /^chapter\dCleared$/.test(s.flag));
        if (!flag || flag.type !== 'setFlag') continue;
        const at = list.flatMap((s, i) => (s.type === 'se' && s.id === 'se_hyoshigi' ? [i] : []));
        expect(at, flag.flag).toHaveLength(1);
        // 拍子木の後に、章の締めくくりの台詞があり、その後に章を終える印を立てる
        expect(list[at[0]! + 1]?.type, flag.flag).toBe('say');
        expect(at[0]!, flag.flag).toBeLessThan(list.indexOf(flag));
        chapters.add(flag.flag);
      }
    }
    expect([...chapters].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `chapter${n}Cleared`));
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
