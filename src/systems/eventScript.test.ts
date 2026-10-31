import { describe, expect, it } from 'vitest';
import type { EventStep } from '../data/eventTypes';
import { EventRunner, joinParty, MAX_PARTY } from './eventScript';
import { newGame, type GameState } from './gameState';
import { createMember, memberLevel, memberStats } from './party';

function game(over: Partial<GameState> = {}): GameState {
  return { ...newGame('m', { mapId: 'shimizu', x: 1, y: 1 }), ...over };
}

/** 台詞と選択肢を順に読み進め、出てきた依頼を集める（選択肢は choices の順に選ぶ）。 */
function play(steps: EventStep[], state: GameState, choices: number[] = [], battles: ('victory' | 'defeat' | 'escaped')[] = []) {
  const runner = new EventRunner(steps);
  const requests = [];
  let s = state;
  let r = runner.next(s);
  for (let guard = 0; guard < 50; guard++) {
    s = r.state;
    requests.push(r.request);
    if (r.request.kind === 'done') break;
    if (r.request.kind === 'choice') r = runner.next(s, { kind: 'choice', index: choices.shift() ?? 0 });
    else if (r.request.kind === 'battle') r = runner.next(s, { kind: 'battle', outcome: battles.shift() ?? 'victory' });
    else r = runner.next(s);
  }
  return { state: s, requests, runner };
}

describe('イベントスクリプト', () => {
  it('台詞の {hero} を名前に置き換え、女主人公には linesF を使う', () => {
    const steps: EventStep[] = [{ type: 'say', lines: ['{hero}、よく来た'], linesF: ['{hero}さん、よく来た'] }];
    expect(play(steps, game()).requests[0]).toEqual({ kind: 'say', pages: ['弥太郎、よく来た'] });
    expect(play(steps, game({ gender: 'f' })).requests[0]).toEqual({ kind: 'say', pages: ['お志乃さん、よく来た'] });
  });

  it('フラグを立て、フラグで分岐する', () => {
    const steps: EventStep[] = [
      { type: 'if', flag: 'met', then: [{ type: 'say', lines: ['また会ったな'] }], else: [{ type: 'say', lines: ['はじめまして'] }, { type: 'setFlag', flag: 'met' }] },
    ];
    const first = play(steps, game());
    expect(first.requests[0]).toEqual({ kind: 'say', pages: ['はじめまして'] });
    expect(first.state.flags.met).toBe(true);
    expect(play(steps, first.state).requests[0]).toEqual({ kind: 'say', pages: ['また会ったな'] });
  });

  it('選択肢で選んだ手順を行い、そのあと続きに戻る', () => {
    const steps: EventStep[] = [
      { type: 'choice', prompt: '行くか？', options: [{ label: '行く', steps: [{ type: 'setFlag', flag: 'go' }] }, { label: 'やめる', steps: [{ type: 'end' }] }] },
      { type: 'say', lines: ['出発だ'] },
    ];
    const go = play(steps, game(), [0]);
    expect(go.requests[0]).toEqual({ kind: 'choice', prompt: '行くか？', labels: ['行く', 'やめる'] });
    expect(go.state.flags.go).toBe(true);
    expect(go.requests[1]).toEqual({ kind: 'say', pages: ['出発だ'] });
    const stop = play(steps, game(), [1]);
    expect(stop.requests.map((r) => r.kind)).toEqual(['choice', 'done']);
  });

  it('道具とお金を渡す（道具は 99 個で止める）', () => {
    const r = play([{ type: 'giveItem', item: 'kizugusuri', count: 5 }, { type: 'giveMoney', amount: 30 }], game({ items: { kizugusuri: 97 }, money: 10 }));
    expect(r.state.items.kizugusuri).toBe(99);
    expect(r.state.money).toBe(40);
  });

  it('戦闘に勝てば続き、負けたら ifLose を行う。ifLose がなければ終わる', () => {
    const steps: EventStep[] = [
      { type: 'battle', enemies: ['onibi'], level: 1, ifLose: [{ type: 'setFlag', flag: 'lost' }] },
      { type: 'setFlag', flag: 'after' },
    ];
    const win = play(steps, game(), [], ['victory']);
    expect(win.requests[0]).toEqual({ kind: 'battle', enemies: ['onibi'], level: 1, canEscape: false, loseOk: true });
    expect(win.state.flags).toMatchObject({ after: true });
    expect(win.state.flags.lost).toBeUndefined();
    const lose = play(steps, game(), [], ['defeat']);
    expect(lose.state.flags).toMatchObject({ lost: true, after: true });

    const noLose: EventStep[] = [{ type: 'battle', enemies: ['onibi'], level: 1 }, { type: 'setFlag', flag: 'after' }];
    const wiped = play(noLose, game(), [], ['defeat']);
    expect(wiped.requests[0]).toMatchObject({ loseOk: false });
    expect(wiped.state.flags.after).toBeUndefined();
    expect(wiped.runner.done).toBe(true);
  });

  it('場所を移す', () => {
    const r = play([{ type: 'warp', mapId: 'urayama', x: 3, y: 4 }], game());
    expect(r.requests[0]).toEqual({ kind: 'warp', mapId: 'urayama', x: 3, y: 4 });
    expect(r.state).toMatchObject({ mapId: 'urayama', x: 3, y: 4 });
  });

  it('全回復する', () => {
    const r = play([{ type: 'heal' }], game({ party: [{ ...createMember('hero', 1), hp: 1, mp: 0 }] }));
    expect(r.state.party[0]?.hp).toBe(memberStats(r.state.party[0]!).maxHp);
  });

  it('引数の状態を変更しない', () => {
    const s = game();
    const snapshot = JSON.stringify(s);
    play([{ type: 'setFlag', flag: 'x' }, { type: 'giveMoney', amount: 5 }, { type: 'join', member: 'kasumi' }], s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('仲間の加入', () => {
  it('パーティーの平均レベルで、加入時の装備を付けて加わる', () => {
    const s = game({ party: [createMember('hero', 6), createMember('gendo', 9)] });
    const r = joinParty(s, 'kasumi');
    const kasumi = r.party[2]!;
    expect(memberLevel(kasumi)).toBe(7);
    expect(kasumi.equip.weapon).toBe('kunai');
    expect(kasumi.hp).toBe(memberStats(kasumi).maxHp);
  });

  it('加入済み・満員なら何もしない', () => {
    const s = game();
    expect(joinParty(s, 'hero')).toBe(s);
    // 満員の判定だけを確かめるため、霞のいない 4 人で埋める
    const full = game({ party: Array.from({ length: MAX_PARTY }, () => createMember('hero', 1)) });
    expect(joinParty(full, 'kasumi')).toBe(full);
  });
});
