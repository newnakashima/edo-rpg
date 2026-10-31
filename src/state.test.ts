import { describe, expect, it } from 'vitest';
import { reportBattleOutcome, setPendingEvent, takePendingEvent } from './state';
import { EventRunner } from './systems/eventScript';

describe('途中のイベントを預かる', () => {
  it('取り出すと空になる', () => {
    const runner = new EventRunner([]);
    setPendingEvent({ runner });
    expect(takePendingEvent()?.runner).toBe(runner);
    expect(takePendingEvent()).toBeNull();
  });

  it('戦闘の結果を預かっているイベントに渡す。預かっていなければ何もしない', () => {
    reportBattleOutcome('victory');
    expect(takePendingEvent()).toBeNull();
    setPendingEvent({ runner: new EventRunner([]) });
    reportBattleOutcome('defeat');
    expect(takePendingEvent()?.resume).toEqual({ kind: 'battle', outcome: 'defeat' });
  });

  it('空にできる（タイトルに戻ったとき）', () => {
    setPendingEvent({ runner: new EventRunner([]) });
    setPendingEvent(null);
    expect(takePendingEvent()).toBeNull();
  });
});
