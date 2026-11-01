import { describe, expect, it } from 'vitest';
import { reportBattleOutcome, setPendingEvent, shouldRunEnterEvent, takePendingEvent } from './state';
import { EventRunner } from './systems/eventScript';

describe('途中のイベントを預かる', () => {
  it('取り出すと空になる', () => {
    const runner = new EventRunner([]);
    setPendingEvent({ runner, fromMapId: 'shimizu', enterPending: false });
    expect(takePendingEvent()?.runner).toBe(runner);
    expect(takePendingEvent()).toBeNull();
  });

  it('戦闘の結果を預かっているイベントに渡す。預かっていなければ何もしない', () => {
    reportBattleOutcome('victory');
    expect(takePendingEvent()).toBeNull();
    setPendingEvent({ runner: new EventRunner([]), fromMapId: 'shimizu', enterPending: false });
    reportBattleOutcome('defeat');
    expect(takePendingEvent()?.resume).toEqual({ kind: 'battle', outcome: 'defeat' });
  });

  it('空にできる（タイトルに戻ったとき）', () => {
    setPendingEvent({ runner: new EventRunner([]), fromMapId: 'shimizu', enterPending: false });
    setPendingEvent(null);
    expect(takePendingEvent()).toBeNull();
  });
});

describe('フィールドに来たとき、マップに入ったときのイベントを行うか', () => {
  const pending = (fromMapId: string, enterPending: boolean) => ({ runner: new EventRunner([]), fromMapId, enterPending });

  it('始めたとき・読み込んだときは行う', () => {
    expect(shouldRunEnterEvent('shimizu', null)).toBe(true);
  });

  it('イベントの外の戦闘から同じマップに戻ったときは行わない。全滅で別のマップに来たときは行う', () => {
    expect(shouldRunEnterEvent('world', null, 'world')).toBe(false);
    expect(shouldRunEnterEvent('shimizu', null, 'world')).toBe(true);
  });

  it('イベントの warp で別のマップに来たときは、イベントのあとに行う', () => {
    expect(shouldRunEnterEvent('kanazawa', pending('kitamaebune', false))).toBe(true);
    expect(shouldRunEnterEvent('kanazawa', pending('kanazawa', false))).toBe(false);
  });

  it('warp で来たマップのイベントの続きで戦闘に入り、同じマップに戻ったときも行う（enterPending を引き継ぐ）', () => {
    // warp の先で戦闘に入ると fromMapId は移動先のマップになる。まだ onEnter を行っていないことを enterPending で覚えている
    expect(shouldRunEnterEvent('kanazawa', pending('kanazawa', true))).toBe(true);
  });
});
