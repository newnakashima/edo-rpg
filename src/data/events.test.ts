import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { isKnownItem } from './items';
import { MAPS, tileAt } from './maps';
import { EventRunner } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { createMember } from '../systems/party';

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

describe('第 1 章の流れ', () => {
  const start = { ...newGame('m', { mapId: 'sunpu', x: 28, y: 8 }), flags: { prologueCleared: true } };

  it('駿府に初めて入ると町の紹介をし、2 回目からは何もしない', () => {
    const arrived = run('sunpuEnter', start);
    expect(arrived.flags.sunpuArrived).toBe(true);
    expect(arrived.flags.chapter1Cleared).toBeFalsy();
    const runner = new EventRunner(EVENTS.sunpuEnter!.steps);
    expect(runner.next(arrived).request.kind).toBe('done');
  });

  it('工房で霞が戦う前に仲間になり、戦ったあとで kasumiJoined が立つ。負けても先へ進める', () => {
    const runner = new EventRunner(EVENTS.kasumiMeet!.steps);
    let r = runner.next(start);
    while (r.request.kind === 'say') r = runner.next(r.state);
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['karakuriNingyo', 'karakuriNingyo'], level: 4, canEscape: false, loseOk: true });
    expect(r.state.party.map((m) => m.id)).toEqual(['hero', 'kasumi']);
    expect(r.state.flags.kasumiJoined).toBeFalsy();
    for (const outcome of ['victory', 'defeat'] as const) {
      const after = run('kasumiMeet', start, outcome);
      expect(after.flags.kasumiJoined, outcome).toBe(true);
      expect(after.party.map((m) => m.id)).toEqual(['hero', 'kasumi']);
    }
    // もう一度起きても霞は増えない
    expect(run('kasumiMeet', run('kasumiMeet', start)).party).toHaveLength(2);
  });

  it('与力の蔵で勝つと名簿が見つかる（meiboFound）。負けたら立たない', () => {
    expect(run('yorikiKura', start).flags.meiboFound).toBe(true);
    expect(run('yorikiKura', start, 'defeat').flags.meiboFound).toBeFalsy();
  });

  it('鉄瓶の前に夜叉丸が消え（yashamaruFled）、勝つと tetsubinDefeated、負けたら立たない', () => {
    const runner = new EventRunner(EVENTS.tetsubin!.steps);
    let r = runner.next(start);
    while (r.request.kind === 'say') r = runner.next(r.state);
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['tetsubin'], level: 7, canEscape: false, loseOk: false });
    expect(r.state.flags.yashamaruFled).toBe(true);
    expect(run('tetsubin', start).flags.tetsubinDefeated).toBe(true);
    expect(run('tetsubin', start, 'defeat').flags.tetsubinDefeated).toBeFalsy();
  });

  it('鉄瓶に負けて出直すと、夜叉丸の場面は繰り返さず鉄瓶とだけ戦う', () => {
    const lost = run('tetsubin', start, 'defeat');
    expect(lost.flags.yashamaruFled).toBe(true);
    const runner = new EventRunner(EVENTS.tetsubin!.steps);
    const first = runner.next(lost);
    expect(first.request.kind).toBe('say');
    const pages = first.request.kind === 'say' ? first.request.pages.join('') : '';
    expect(pages).not.toContain('夜叉丸');
    expect(runner.next(first.state).request).toMatchObject({ kind: 'battle', enemies: ['tetsubin'] });
    expect(run('tetsubin', lost).flags.tetsubinDefeated).toBe(true);
  });

  it('鉄瓶を倒して駿府に入ると第 1 章が終わる', () => {
    const cleared = run('sunpuEnter', run('tetsubin', run('sunpuEnter', start)));
    expect(cleared.flags.chapter1Cleared).toBe(true);
  });

  it('葛籠は一度だけ道具が手に入り、持ちきれないときはフラグを立てずにまた受け取れる', () => {
    const got = run('yashikiChest1', start);
    expect(got.items.kintsuba).toBe(1);
    expect(got.flags.yashikiChest1).toBe(true);
    expect(run('yashikiChest1', got).items.kintsuba).toBe(1);
    const full = { ...start, items: { ...start.items, kintsuba: 99 } };
    const refused = run('yashikiChest1', full);
    expect(refused.items.kintsuba).toBe(99);
    expect(refused.flags.yashikiChest1).toBeFalsy();
  });
});

/** 台詞を読み進め、次に画面に頼むこと（台詞以外）の手前まで進める。 */
function skipSay(runner: EventRunner, r: ReturnType<EventRunner['next']>): ReturnType<EventRunner['next']> {
  while (r.request.kind === 'say') r = runner.next(r.state);
  return r;
}

describe('第 2 章の流れ', () => {
  const start = { ...newGame('m', { mapId: 'nagoya', x: 28, y: 8 }), flags: { prologueCleared: true, chapter1Cleared: true } };

  it('大井川の渡し場は、第 1 章を終えるまでは案内だけで、終えたら川獺に勝って渡れる（oigawaOpen）。負けたら渡れない', () => {
    const before = { ...start, flags: { prologueCleared: true } };
    const runner = new EventRunner(EVENTS.oigawa!.steps);
    const first = runner.next(before);
    expect(first.request.kind).toBe('say');
    expect(runner.next(first.state).request.kind).toBe('done');
    expect(run('oigawa', before).flags.oigawaOpen).toBeFalsy();
    expect(run('oigawa', start).flags.oigawaOpen).toBe(true);
    expect(run('oigawa', start, 'defeat').flags.oigawaOpen).toBeFalsy();
    const battle = new EventRunner(EVENTS.oigawa!.steps);
    const r = skipSay(battle, battle.next(start));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['kawauso', 'kawauso'], level: 7, loseOk: true });
  });

  it('名古屋に初めて入ると町の紹介をし、2 回目からは何もしない', () => {
    const arrived = run('nagoyaEnter', start);
    expect(arrived.flags.nagoyaArrived).toBe(true);
    expect(arrived.flags.chapter2Cleared).toBeFalsy();
    expect(new EventRunner(EVENTS.nagoyaEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  it('金太に会い（kintaMet）、荷蔵の奥で勝つと手がかり（urokoClue）、金太の大凧で天守へ飛ぶ', () => {
    const met = run('kinta', start);
    expect(met.flags.kintaMet).toBe(true);
    // 手がかりの前に話しても、飛ばない
    const again = run('kinta', met);
    expect(again.flags.kintaFlew).toBeFalsy();
    expect(again.mapId).toBe('nagoya');
    expect(run('horikawaOku', met, 'defeat').flags.urokoClue).toBeFalsy();
    const clue = run('horikawaOku', met);
    expect(clue.flags.urokoClue).toBe(true);
    // 最初の選択肢（飛ぶ）で天守へ移る
    const runner = new EventRunner(EVENTS.kinta!.steps);
    const ask = skipSay(runner, runner.next(clue));
    expect(ask.request.kind).toBe('choice');
    const flew = skipSay(runner, runner.next(ask.state, { kind: 'choice', index: 0 }));
    expect(flew.request).toEqual({ kind: 'warp', mapId: 'tenshu', x: 8, y: 9 });
    expect(flew.state.flags.kintaFlew).toBe(true);
    // 「支度をする」なら飛ばない
    const stay = new EventRunner(EVENTS.kinta!.steps);
    const ask2 = skipSay(stay, stay.next(clue));
    const stayed = skipSay(stay, stay.next(ask2.state, { kind: 'choice', index: 1 }));
    expect(stayed.request.kind).toBe('done');
    expect(stayed.state.mapId).toBe('nagoya');
    expect(stayed.state.flags.kintaFlew).toBeFalsy();
  });

  it('一度飛んだあと（負けて出直すとき）は、金太は短く聞いてからまた飛べる', () => {
    const flown = { ...start, flags: { ...start.flags, kintaMet: true, urokoClue: true, kintaFlew: true } };
    const runner = new EventRunner(EVENTS.kinta!.steps);
    const first = runner.next(flown);
    const pages = first.request.kind === 'say' ? first.request.pages.join('') : '';
    expect(pages).toContain('もう一度、天守へ飛ぶかい');
    expect(pages).not.toContain('荷蔵の奥で見つけた文');
    expect(run('kinta', flown).mapId).toBe('tenshu');
  });

  it('金鯱からくりは Lv10 で逃げられず、勝つと kinshachiDefeated。負けて出直すと銀次の場面は繰り返さない', () => {
    const runner = new EventRunner(EVENTS.kinshachi!.steps);
    const r = skipSay(runner, runner.next(start));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['kinshachi'], level: 10, canEscape: false, loseOk: false });
    expect(r.state.flags.kinshachiMet).toBe(true);
    expect(run('kinshachi', start).flags.kinshachiDefeated).toBe(true);
    const lost = run('kinshachi', start, 'defeat');
    expect(lost.flags.kinshachiDefeated).toBeFalsy();
    const retry = new EventRunner(EVENTS.kinshachi!.steps).next(lost);
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('銀次「');
    expect(run('kinshachi', lost).flags.kinshachiDefeated).toBe(true);
  });

  it('金鯱からくりを倒して名古屋に入ると第 2 章が終わり、褒美は一度だけ', () => {
    const arrived = run('nagoyaEnter', start);
    const cleared = run('nagoyaEnter', run('kinshachi', arrived));
    expect(cleared.flags.chapter2Cleared).toBe(true);
    expect(cleared.money).toBe(arrived.money + 500);
    // 第 2 章のあとの金太は飛ばない
    expect(run('kinta', cleared).mapId).toBe('nagoya');
  });
});

describe('第 3 章の流れ', () => {
  const base = newGame('m', { mapId: 'kyo', x: 28, y: 6 });
  const start = { ...base, party: [...base.party, createMember('kasumi', 11)], flags: { prologueCleared: true, chapter1Cleared: true, kasumiJoined: true, chapter2Cleared: true } };

  it('京に初めて入ると町の紹介をし、2 回目からは何もしない', () => {
    const arrived = run('kyoEnter', start);
    expect(arrived.flags.kyoArrived).toBe(true);
    expect(arrived.flags.chapter3Cleared).toBeFalsy();
    expect(new EventRunner(EVENTS.kyoEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  it('河原で玄道が仲間になる（gendoJoined）。もう一度起きても増えない', () => {
    const joined = run('gendoMeet', start);
    expect(joined.flags.gendoJoined).toBe(true);
    expect(joined.party.map((m) => m.id)).toEqual(['hero', 'kasumi', 'gendo']);
    expect(run('gendoMeet', joined).party).toHaveLength(3);
  });

  it('羅生門跡の鬼は、玄道に会う前は戦わず、会ったあとで赤鬼 2 体に勝つと rashomonCleared。負けたら立たない', () => {
    const before = new EventRunner(EVENTS.rashomonOni!.steps);
    const r0 = skipSay(before, before.next(start));
    expect(r0.request.kind).toBe('done');
    expect(r0.state.flags.rashomonCleared).toBeFalsy();
    const joined = run('gendoMeet', start);
    const runner = new EventRunner(EVENTS.rashomonOni!.steps);
    expect(skipSay(runner, runner.next(joined)).request).toMatchObject({ kind: 'battle', enemies: ['akaoni', 'akaoni'], level: 10, canEscape: false, loseOk: false });
    expect(run('rashomonOni', joined).flags.rashomonCleared).toBe(true);
    expect(run('rashomonOni', joined, 'defeat').flags.rashomonCleared).toBeFalsy();
  });

  it('鬼の巣で夜叉丸が消え（yashamaruKyoFled）、酒呑の大鬼（Lv13）に勝つと shutenDefeated。負けて出直すと夜叉丸の場面は繰り返さない', () => {
    const runner = new EventRunner(EVENTS.shuten!.steps);
    const r = skipSay(runner, runner.next(start));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['shuten'], level: 13, canEscape: false, loseOk: false });
    expect(r.state.flags.yashamaruKyoFled).toBe(true);
    expect(run('shuten', start).flags.shutenDefeated).toBe(true);
    const lost = run('shuten', start, 'defeat');
    expect(lost.flags.shutenDefeated).toBeFalsy();
    const retry = new EventRunner(EVENTS.shuten!.steps).next(lost);
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('夜叉丸「');
    expect(run('shuten', lost).flags.shutenDefeated).toBe(true);
  });

  it('酒呑の大鬼を倒して京に入ると第 3 章が終わる（chapter3Cleared）', () => {
    const cleared = run('kyoEnter', run('shuten', run('kyoEnter', start)));
    expect(cleared.flags.chapter3Cleared).toBe(true);
  });
});
