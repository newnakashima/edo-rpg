import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from './characters';
import { EQUIPMENT } from './equipment';
import { SHOPS } from './shops';
import { ENCOUNTERS, ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { isKnownItem } from './items';
import { SKILLS } from './skills';
import { MAPS, npcVisible, tileAt } from './maps';
import { EventRunner } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { createMember, memberLevel } from '../systems/party';

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
          case 'leave':
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
  const start = { ...newGame('m', MAPS.world!.towns!.find((t) => t.name === '駿府')!.to!), flags: { prologueCleared: true } };

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
  const start = { ...newGame('m', MAPS.world!.towns!.find((t) => t.name === '名古屋')!.to!), flags: { prologueCleared: true, chapter1Cleared: true } };

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
    expect(flew.request).toMatchObject({ kind: 'warp', mapId: 'tenshu' });
    // 大凧で着く場所は、天守の通れる場所
    const req = flew.request as { x: number; y: number };
    expect(tileAt(MAPS.tenshu!, req.x, req.y)?.blocked).toBe(false);
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
    expect(retry.request.kind).toBe('say');
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
  const base = newGame('m', MAPS.world!.towns!.find((t) => t.name === '京')!.to!);
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
    expect(retry.request.kind).toBe('say');
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('夜叉丸「');
    expect(pages).toContain('酒呑の大鬼');
    expect(run('shuten', lost).flags.shutenDefeated).toBe(true);
  });

  it('酒呑の大鬼を倒して京に入ると第 3 章が終わる（chapter3Cleared）', () => {
    const cleared = run('kyoEnter', run('shuten', run('kyoEnter', start)));
    expect(cleared.flags.chapter3Cleared).toBe(true);
  });
});

describe('第 4 章の流れ', () => {
  const base = newGame('m', { mapId: 'shimizu', x: 26, y: 6 });
  const party = [...base.party, createMember('kasumi', 14), createMember('gendo', 14)];
  const ch3 = { ...base, party, flags: { intro: true, prologueCleared: true, chapter1Cleared: true, kasumiJoined: true, chapter2Cleared: true, gendoJoined: true, chapter3Cleared: true } };

  it('清水湊に初めて入ると序章が始まり（intro）、第 3 章を終えるまでは 2 回目から何もしない', () => {
    const fresh = newGame('m', { mapId: 'shimizu', x: 14, y: 7 });
    const started = run('shimizuEnter', fresh);
    expect(started.flags.intro).toBe(true);
    expect(started.party).toHaveLength(1);
    expect(new EventRunner(EVENTS.shimizuEnter!.steps).next(started).request.kind).toBe('done');
    const ch2 = { ...ch3, flags: { ...ch3.flags, chapter3Cleared: false } };
    expect(new EventRunner(EVENTS.shimizuEnter!.steps).next(ch2).request.kind).toBe('done');
  });

  it('第 3 章を終えて清水湊に入ると弔いの場面で、お凛が加わり（orinJoined）、形見のからくり銃を持っている。もう一度起きても増えない', () => {
    const runner = new EventRunner(EVENTS.shimizuEnter!.steps);
    const first = runner.next(ch3);
    expect(first.request.kind).toBe('say');
    expect(first.request.kind === 'say' ? first.request.pages.join('') : '').toContain('弔い');
    const joined = run('shimizuEnter', ch3);
    expect(joined.flags.orinJoined).toBe(true);
    expect(joined.party.map((m) => m.id)).toEqual(['hero', 'kasumi', 'gendo', 'orin']);
    expect(joined.party[3]?.equip.weapon).toBe('karakuriju');
    expect(run('shimizuEnter', joined).party).toHaveLength(4);
  });

  const withOrin = run('shimizuEnter', ch3);

  it('伊賀上野に初めて入ると仇討免状が届き（igaArrived）、2 回目からは何もしない', () => {
    const arrived = run('igaEnter', withOrin);
    expect(arrived.flags.igaArrived).toBe(true);
    expect(new EventRunner(EVENTS.igaEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  it('伊賀者の里で朧（Lv15）に勝つと oboroDefeated。負けて出直すと口上を繰り返さない', () => {
    const runner = new EventRunner(EVENTS.oboro!.steps);
    const r = skipSay(runner, runner.next(withOrin));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['oboro'], level: 15, canEscape: false, loseOk: false });
    expect(r.state.flags.oboroMet).toBe(true);
    expect(run('oboro', withOrin).flags.oboroDefeated).toBe(true);
    const lost = run('oboro', withOrin, 'defeat');
    expect(lost.flags.oboroDefeated).toBeFalsy();
    const retry = new EventRunner(EVENTS.oboro!.steps).next(lost);
    expect(retry.request.kind).toBe('say');
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('お師匠');
    expect(pages).toContain('朧「');
    expect(run('oboro', lost).flags.oboroDefeated).toBe(true);
  });

  it('鍵屋の辻で権六（Lv16）に勝つと第 4 章が終わる（gonrokuDefeated・chapter4Cleared）。負けたら立たず、出直すと口上を短くする', () => {
    const start = run('oboro', run('igaEnter', withOrin));
    const runner = new EventRunner(EVENTS.gonroku!.steps);
    const r = skipSay(runner, runner.next(start));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['gonroku'], level: 16, canEscape: false, loseOk: false });
    const won = run('gonroku', start);
    expect(won.flags.gonrokuDefeated).toBe(true);
    expect(won.flags.chapter4Cleared).toBe(true);
    const lost = run('gonroku', start, 'defeat');
    expect(lost.flags.gonrokuDefeated).toBeFalsy();
    expect(lost.flags.chapter4Cleared).toBeFalsy();
    const retry = new EventRunner(EVENTS.gonroku!.steps).next(lost);
    expect(retry.request.kind).toBe('say');
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('凛だ');
    expect(pages).toContain('権六「');
    expect(run('gonroku', lost).flags.chapter4Cleared).toBe(true);
  });
});

describe('第 5 章の流れ', () => {
  const base = newGame('m', MAPS.world!.towns!.find((t) => t.name === '大坂')!.to!);
  const party = [base.party[0]!, createMember('kasumi', 17), createMember('gendo', 17), createMember('orin', 17)];
  const ch4 = { ...base, party, flags: { intro: true, chapter3Cleared: true, orinJoined: true, chapter4Cleared: true } };

  it('大坂に初めて入ると霞が一時抜け（kasumiAway、away に預ける）、2 回目からは何もしない', () => {
    const arrived = run('osakaEnter', ch4);
    expect(arrived.flags.osakaArrived).toBe(true);
    expect(arrived.flags.kasumiAway).toBe(true);
    expect(arrived.party.map((m) => m.id)).toEqual(['hero', 'gendo', 'orin']);
    expect(arrived.away.map((m) => m.id)).toEqual(['kasumi']);
    expect(arrived.away[0]?.exp).toBe(party[1]!.exp);
    expect(new EventRunner(EVENTS.osakaEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  const arrived = run('osakaEnter', ch4);

  it('私塾で榊兵庫が Lv18 のゲストとして加わる（hyogoJoined）。もう一度起きても増えない', () => {
    const joined = run('hyogoMeet', arrived);
    expect(joined.flags.hyogoJoined).toBe(true);
    expect(joined.party.map((m) => m.id)).toEqual(['hero', 'gendo', 'orin', 'hyogo']);
    expect(run('hyogoMeet', joined).party).toHaveLength(4);
  });

  const joined = run('hyogoMeet', arrived);

  it('米蔵の地下で百俵からくり（Lv19）に勝つと hyakuhyoDefeated。負けて出直すと口上を短くする', () => {
    const runner = new EventRunner(EVENTS.hyakuhyo!.steps);
    const r = skipSay(runner, runner.next(joined));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['hyakuhyo'], level: 19, canEscape: false, loseOk: false });
    expect(run('hyakuhyo', joined).flags.hyakuhyoDefeated).toBe(true);
    const lost = run('hyakuhyo', joined, 'defeat');
    expect(lost.flags.hyakuhyoDefeated).toBeFalsy();
    const retry = new EventRunner(EVENTS.hyakuhyo!.steps).next(lost);
    expect(retry.request.kind).toBe('say');
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('お凛「');
    expect(pages).toContain('兵庫「');
    expect(run('hyakuhyo', lost).flags.hyakuhyoDefeated).toBe(true);
  });

  it('百俵からくりを倒して大坂に入ると第 5 章が終わり（chapter5Cleared）、兵庫が抜ける。霞は預けたまま', () => {
    const cleared = run('osakaEnter', run('hyakuhyo', joined));
    expect(cleared.flags.chapter5Cleared).toBe(true);
    expect(cleared.party.map((m) => m.id)).toEqual(['hero', 'gendo', 'orin']);
    expect(cleared.away.map((m) => m.id)).toEqual(['kasumi']);
  });
});

describe('第 6 章の流れ', () => {
  const base = newGame('m', { mapId: 'hiroshima', x: 40, y: 13 });
  const kasumi = createMember('kasumi', 17, { weapon: 'shinobiKodachi', armor: 'igaShozoku' });
  const ch5 = {
    ...base,
    party: [createMember('hero', 20), createMember('gendo', 20), createMember('orin', 19)],
    away: [kasumi],
    flags: { intro: true, chapter4Cleared: true, kasumiAway: true, chapter5Cleared: true },
  };

  it('広島に入ると霞が戻る（kasumiRejoined）。装備はそのまま、平均レベル（Lv19）まで引き上げる', () => {
    const back = run('hiroshimaEnter', ch5);
    expect(back.flags.kasumiRejoined).toBe(true);
    expect(back.party.map((m) => m.id)).toEqual(['hero', 'gendo', 'orin', 'kasumi']);
    expect(back.away).toEqual([]);
    expect(memberLevel(back.party[3]!)).toBe(19);
    expect(back.party[3]!.equip).toEqual(kasumi.equip);
  });

  const back = run('hiroshimaEnter', ch5);

  it('長崎に初めて入ると nagasakiArrived。2 回目からは何もしない', () => {
    const arrived = run('nagasakiEnter', back);
    expect(arrived.flags.nagasakiArrived).toBe(true);
    expect(arrived.flags.chapter6Cleared).toBeFalsy();
    expect(new EventRunner(EVENTS.nagasakiEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  const arrived = run('nagasakiEnter', back);

  it('出島の通詞から蘭斎のことを聞くと dejimaHeard。2 回目は短い', () => {
    const heard = run('tsujiMeet', arrived);
    expect(heard.flags.dejimaHeard).toBe(true);
    const again = new EventRunner(EVENTS.tsujiMeet!.steps).next(heard);
    expect(again.request.kind === 'say' && again.request.pages).toHaveLength(1);
  });

  const heard = run('tsujiMeet', arrived);

  it('南蛮寺跡の礼拝堂の跡でからくり兵に勝つと shimabaraOpen。負けて出直すと口上を短くする', () => {
    const runner = new EventRunner(EVENTS.nanbanjiOku!.steps);
    const r = skipSay(runner, runner.next(heard));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['nanbanHei', 'gehoTsukai', 'nanbanHei'], level: 19, canEscape: false, loseOk: false });
    expect(run('nanbanjiOku', heard).flags.shimabaraOpen).toBe(true);
    const lost = run('nanbanjiOku', heard, 'defeat');
    expect(lost.flags.shimabaraOpen).toBeFalsy();
    const retry = new EventRunner(EVENTS.nanbanjiOku!.steps).next(lost);
    expect(retry.request.kind === 'say' && retry.request.pages).toHaveLength(1);
    expect(run('nanbanjiOku', lost).flags.shimabaraOpen).toBe(true);
  });

  const opened = run('nanbanjiOku', heard);

  it('研究所で南蛮大筒からくり（Lv22）に勝つと nanbanOzutsuDefeated と noritoLearned。負けて出直すと口上を短くする', () => {
    const runner = new EventRunner(EVENTS.nanbanOzutsu!.steps);
    const r = skipSay(runner, runner.next(opened));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['nanbanOzutsu'], level: 22, canEscape: false, loseOk: false });
    const won = run('nanbanOzutsu', opened);
    expect(won.flags.nanbanOzutsuDefeated).toBe(true);
    expect(won.flags.noritoLearned).toBe(true);
    const lost = run('nanbanOzutsu', opened, 'defeat');
    expect(lost.flags.nanbanOzutsuDefeated).toBeFalsy();
    const retry = new EventRunner(EVENTS.nanbanOzutsu!.steps).next(lost);
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('蘭斎「');
    expect(run('nanbanOzutsu', lost).flags.nanbanOzutsuDefeated).toBe(true);
  });

  it('南蛮大筒からくりを倒して長崎に入ると第 6 章が終わる（chapter6Cleared）', () => {
    const cleared = run('nagasakiEnter', run('nanbanOzutsu', opened));
    expect(cleared.flags.chapter6Cleared).toBe(true);
    expect(cleared.party).toHaveLength(4);
  });
});

describe('第 7 章の流れ', () => {
  const base = newGame('m', { mapId: 'nagasaki', x: 14, y: 22 });
  const ch6 = {
    ...base,
    party: [createMember('hero', 22), createMember('gendo', 22), createMember('orin', 22), createMember('kasumi', 22)],
    flags: { intro: true, chapter5Cleared: true, kasumiRejoined: true, nagasakiArrived: true, nanbanOzutsuDefeated: true, noritoLearned: true, chapter6Cleared: true },
  };
  /** 最後の warp の行き先（イベントの途中の warp は、場面の側で行う）。 */
  const warpOf = (id: string, state: GameState): { mapId: string; x: number; y: number } | undefined => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    let last: { mapId: string; x: number; y: number } | undefined;
    for (let guard = 0; guard < 50 && r.request.kind !== 'done'; guard++) {
      if (r.request.kind === 'warp') last = { mapId: r.request.mapId, x: r.request.x, y: r.request.y };
      if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
      else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome: 'victory' });
      else r = runner.next(r.state);
    }
    return last;
  };

  it('長崎の北前船の船頭は、第 6 章を終えるまでは乗せず、終えると北前船の甲板へ、金沢に着いたあとは金沢の湊へ直に運ぶ', () => {
    expect(warpOf('kitamaeNagasaki', { ...ch6, flags: { ...ch6.flags, chapter6Cleared: false } })).toBeUndefined();
    expect(warpOf('kitamaeNagasaki', ch6)).toEqual({ mapId: 'kitamaebune', x: 11, y: 10 });
    expect(warpOf('kitamaeNagasaki', { ...ch6, flags: { ...ch6.flags, kanazawaArrived: true } })).toMatchObject({ mapId: 'kanazawa' });
  });

  it('船首で船幽霊と海坊主（Lv22）に勝つと kanazawaArrived で金沢の湊へ。負けたら着かず、出直すと口上を短くする', () => {
    const boarded = run('kitamaeEnter', ch6);
    expect(boarded.flags.kitamaeBoarded).toBe(true);
    const runner = new EventRunner(EVENTS.funayureiAttack!.steps);
    const r = skipSay(runner, runner.next(boarded));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['funayurei', 'umibozu', 'funayurei'], level: 22, canEscape: false, loseOk: false });
    expect(warpOf('funayureiAttack', boarded)).toEqual({ mapId: 'kanazawa', x: 4, y: 22 });
    expect(run('funayureiAttack', boarded).flags.kanazawaArrived).toBe(true);
    const lost = run('funayureiAttack', boarded, 'defeat');
    expect(lost.flags.kanazawaArrived).toBeFalsy();
    const retry = new EventRunner(EVENTS.funayureiAttack!.steps).next(lost);
    expect(retry.request.kind === 'say' && retry.request.pages).toHaveLength(2);
  });

  const arrived = run('funayureiAttack', run('kitamaeEnter', ch6));

  it('金沢に初めて入ると kanazawaIntro。2 回目からは何もしない。金沢の船頭は長崎へ戻せる', () => {
    const intro = run('kanazawaEnter', arrived);
    expect(intro.flags.kanazawaIntro).toBe(true);
    expect(new EventRunner(EVENTS.kanazawaEnter!.steps).next(intro).request.kind).toBe('done');
    expect(warpOf('kitamaeKanazawa', intro)).toEqual({ mapId: 'nagasaki', x: 14, y: 22 });
  });

  const intro = run('kanazawaEnter', arrived);

  it('長瀬左近から抜け穴のことを聞くと sakonHeard。2 回目は短い', () => {
    const heard = run('sakonMeet', intro);
    expect(heard.flags.sakonHeard).toBe(true);
    const again = new EventRunner(EVENTS.sakonMeet!.steps).next(heard);
    expect(again.request.kind === 'say' && again.request.pages).toHaveLength(1);
  });

  const heard = run('sakonMeet', intro);

  it('徽軫灯籠で加賀の忍びに勝つと nukeanaOpen。負けたら開かない', () => {
    const runner = new EventRunner(EVENTS.kotojiToro!.steps);
    const r = skipSay(runner, runner.next(heard));
    expect(r.request).toMatchObject({ kind: 'battle', level: 22, canEscape: false, loseOk: false });
    expect(run('kotojiToro', heard).flags.nukeanaOpen).toBe(true);
    expect(run('kotojiToro', heard, 'defeat').flags.nukeanaOpen).toBeFalsy();
  });

  const opened = run('kotojiToro', heard);

  it('影武者（Lv24）に勝つと kagemushaDefeated、夜叉丸（Lv25）に勝つと yashamaruDefeated。負けて出直すと口上を短くする', () => {
    for (const [id, enemy, level, flag] of [
      ['kagemusha', 'kagemusha', 24, 'kagemushaDefeated'],
      ['yashamaruBattle', 'yashamaru', 25, 'yashamaruDefeated'],
    ] as const) {
      const runner = new EventRunner(EVENTS[id]!.steps);
      const r = skipSay(runner, runner.next(opened));
      expect(r.request).toMatchObject({ kind: 'battle', enemies: [enemy], level, canEscape: false, loseOk: false });
      expect(run(id, opened).flags[flag]).toBe(true);
      const lost = run(id, opened, 'defeat');
      expect(lost.flags[flag]).toBeFalsy();
      const retry = new EventRunner(EVENTS[id]!.steps).next(lost);
      expect(retry.request.kind === 'say' && retry.request.pages).toHaveLength(1);
    }
  });

  it('殿様を救うと tonoRescued で城の前へ。金沢に入ると第 7 章が終わり（chapter7Cleared・kagaTegata）、褒美は一度だけ', () => {
    const won = run('yashamaruBattle', run('kagemusha', opened));
    const rescued = run('tonoRescue', won);
    expect(rescued.flags.tonoRescued).toBe(true);
    expect(warpOf('tonoRescue', won)).toEqual({ mapId: 'kanazawa', x: 28, y: 15 });
    const cleared = run('kanazawaEnter', rescued);
    expect(cleared.flags.chapter7Cleared).toBe(true);
    expect(cleared.flags.kagaTegata).toBe(true);
    expect(cleared.money).toBe(rescued.money + 3000);
    // もう一度起きても褒美は増えない
    expect(run('kanazawaEnter', cleared).money).toBe(cleared.money);
    // 金沢の onEnter は chapter7Cleared で止まる（2 回目の褒美はない）
    expect(MAPS.kanazawa!.onEnter).toEqual({ event: 'kanazawaEnter', unless: 'chapter7Cleared' });
  });
});

describe('第 8 章の流れ', () => {
  const base = newGame('m', { mapId: 'sendai', x: 50, y: 18 });
  const ch7 = {
    ...base,
    party: [createMember('hero', 25), createMember('gendo', 25), createMember('orin', 25), createMember('kasumi', 25)],
    flags: { intro: true, chapter6Cleared: true, kanazawaArrived: true, tonoRescued: true, kagaTegata: true, chapter7Cleared: true },
  };
  const warpOf = (id: string, state: GameState): { mapId: string; x: number; y: number } | undefined => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    let last: { mapId: string; x: number; y: number } | undefined;
    for (let guard = 0; guard < 50 && r.request.kind !== 'done'; guard++) {
      if (r.request.kind === 'warp') last = { mapId: r.request.mapId, x: r.request.x, y: r.request.y };
      if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
      else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome: 'victory' });
      else r = runner.next(r.state);
    }
    return last;
  };
  /** 戦闘を含むイベントで、最初の戦闘の要求。 */
  const battleOf = (id: string, state: GameState) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    return skipSay(runner, runner.next(state)).request;
  };
  /** 話しかけて、最初のページの数（2 回目以降は短い）。 */
  const pagesOf = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state);
    return r.request.kind === 'say' ? r.request.pages.length : 0;
  };

  it('仙台に初めて入ると sendaiIntro。片平帯刀の屋敷で刺客（Lv25）に勝つと sendaiHeard と 2000 文。負けたら聞けない', () => {
    const intro = run('sendaiEnter', ch7);
    expect(intro.flags.sendaiIntro).toBe(true);
    expect(new EventRunner(EVENTS.sendaiEnter!.steps).next(intro).request.kind).toBe('done');
    expect(battleOf('tatewaki', intro)).toMatchObject({ kind: 'battle', level: 25, canEscape: false, loseOk: false });
    const heard = run('tatewaki', intro);
    expect(heard.flags.sendaiHeard).toBe(true);
    expect(heard.money).toBe(intro.money + 2000);
    expect(run('tatewaki', intro, 'defeat').flags.sendaiHeard).toBeFalsy();
    expect(run('tatewaki', heard).money).toBe(heard.money);
    expect(pagesOf('tatewaki', heard)).toBe(1);
  });

  const heard = run('tatewaki', run('sendaiEnter', ch7));

  it('江戸に初めて入ると人相書きの高札（edoIntro）。大家の源兵衛にかくまわれると edoHideout で、長屋に小吉が現れる', () => {
    const arrived = run('edoEnter', heard);
    expect(arrived.flags.edoIntro).toBe(true);
    expect(new EventRunner(EVENTS.edoEnter!.steps).next(arrived).request.kind).toBe('done');
    const hidden = run('nagayaOoya', arrived);
    expect(hidden.flags.edoHideout).toBe(true);
    expect(pagesOf('nagayaOoya', hidden)).toBe(1);
    const kokichi = MAPS.edo!.npcs.find((n) => n.id === 'kokichi')!;
    expect(npcVisible(kokichi, arrived.flags)).toBe(false);
    expect(npcVisible(kokichi, hidden.flags)).toBe(true);
  });

  const hidden = run('nagayaOoya', run('edoEnter', heard));

  it('小吉を追うからくり同心と旗本奴（Lv25）に勝つと kokichiMet。負けたら会えない', () => {
    expect(battleOf('kokichi', hidden)).toMatchObject({ kind: 'battle', enemies: ['karakuriDoshin', 'hatamotoYakko', 'karakuriDoshin'], level: 25, canEscape: false, loseOk: false });
    expect(run('kokichi', hidden).flags.kokichiMet).toBe(true);
    expect(run('kokichi', hidden, 'defeat').flags.kokichiMet).toBeFalsy();
  });

  const met = run('kokichi', hidden);

  it('火消しの頭は小吉に会うまで相手にせず、会ったあとは hikeshiMet。小吉の知らせ（kokichiReport）は頭に会ってから', () => {
    expect(run('hikeshiGashira', hidden).flags.hikeshiMet).toBeFalsy();
    expect(run('kokichi', met).flags.kokichiReport).toBeFalsy();
    const gashira = run('hikeshiGashira', met);
    expect(gashira.flags.hikeshiMet).toBe(true);
    const report = run('kokichi', gashira);
    expect(report.flags.kokichiReport).toBe(true);
    expect(pagesOf('kokichi', report)).toBe(1);
    // 小吉の知らせのあと、長屋にお鈴が現れる
    const osuzu = MAPS.edo!.npcs.find((n) => n.id === 'osuzu')!;
    expect(npcVisible(osuzu, gashira.flags)).toBe(false);
    expect(npcVisible(osuzu, report.flags)).toBe(true);
  });

  const report = run('kokichi', run('hikeshiGashira', met));

  it('八百屋の娘は小吉の知らせまでは上の空。知らせのあと火付け盗賊（Lv25）に勝つと taikaStarted で、火消しの手拭いを受け取る', () => {
    expect(run('oharu', run('hikeshiGashira', met)).flags.taikaStarted).toBeFalsy();
    expect(battleOf('oharu', report)).toMatchObject({ kind: 'battle', level: 25, canEscape: false, loseOk: false });
    const fire = run('oharu', report);
    expect(fire.flags.taikaStarted).toBe(true);
    expect(fire.items.hikeshiTenugui).toBe(1);
    expect(run('oharu', report, 'defeat').flags.taikaStarted).toBeFalsy();
    expect(run('oharu', fire).items.hikeshiTenugui).toBe(1);
    // 町木戸の木戸番は火事が起きるとどく
    const kidoban = MAPS.edo!.npcs.find((n) => n.id === 'kidoban')!;
    expect(npcVisible(kidoban, report.flags)).toBe(true);
    expect(npcVisible(kidoban, fire.flags)).toBe(false);
  });

  const fire = run('oharu', report);

  it('火車からくり（Lv28）に勝つと kashaDefeated で長屋へ戻り、江戸に入ると第 8 章が終わる（chapter8Cleared・4000 文）。褒美は一度だけ', () => {
    const entered = run('taikaEnter', fire);
    expect(entered.flags.taikaEntered).toBe(true);
    expect(battleOf('kashaKarakuri', entered)).toMatchObject({ kind: 'battle', enemies: ['kashaKarakuri'], level: 28, canEscape: false, loseOk: false });
    const lost = run('kashaKarakuri', entered, 'defeat');
    expect(lost.flags.kashaDefeated).toBeFalsy();
    expect(pagesOf('kashaKarakuri', lost)).toBe(1);
    // 火車からくりを倒す前に江戸へ入り直しても、章は終わらず褒美もない
    for (const st of [fire, entered, lost]) {
      const again = run('edoEnter', st);
      expect(again.flags.chapter8Cleared).toBeFalsy();
      expect(again.money).toBe(st.money);
    }
    const won = run('kashaKarakuri', entered);
    expect(won.flags.kashaDefeated).toBe(true);
    expect(warpOf('kashaKarakuri', entered)).toEqual({ mapId: 'edo', x: 22, y: 16 });
    const cleared = run('edoEnter', won);
    expect(cleared.flags.chapter8Cleared).toBe(true);
    expect(cleared.money).toBe(won.money + 4000);
    expect(run('edoEnter', cleared).money).toBe(cleared.money);
    expect(MAPS.edo!.onEnter).toEqual({ event: 'edoEnter', unless: 'chapter8Cleared' });
  });

  it('第 8 章の敵の技はすべて定義され、火車からくりはボス（報酬 6 倍・祓と機が弱点・火に強い）', () => {
    const boss = ENEMIES.kashaKarakuri!;
    expect(boss.rewardScale).toBe(6);
    expect(boss.weak).toEqual(['holy', 'mech']);
    expect(boss.resist).toEqual(['fire']);
    // docs/balance.md の「第 8 章で見積もりから変えたこと」の数値（勝率 Lv27 95%・Lv26 72% はこの値で試した）
    expect(boss.factors).toEqual({ hp: 13, atk: 1.05, def: 1.2, spd: 1.1 });
    expect(boss.actions).toEqual([
      { skill: 'attack', weight: 3 },
      { skill: 'kaenGuruma', weight: 2 },
      { skill: 'mojaNoTe', weight: 1 },
    ]);
    expect(SKILLS.kaenGuruma).toMatchObject({ target: 'allEnemies', effect: { kind: 'physical', multiplier: 0.7 }, elements: ['fire'] });
    expect(SKILLS.mojaNoTe).toMatchObject({ target: 'enemy', effect: { kind: 'status', status: 'paralysis', turns: 2, chance: 0.5 } });
  });

  it('奥州街道の表には江戸の町なかの敵（火付け盗賊・旗本奴・火鼠）が出ず、江戸の大火の表には送り狼・雪女・加賀の忍びが出ない。どちらも 4 人で来るので 4 体の組がある', () => {
    const members = (id: string) => new Set(ENCOUNTERS[id]!.groups.flatMap((g) => g.members));
    for (const e of ['hitsukeTozoku', 'hatamotoYakko', 'hinezumi']) expect(members('oshu').has(e), e).toBe(false);
    for (const e of ['okuriOkami', 'yukiOnna', 'kagaShinobi']) expect(members('edo').has(e), e).toBe(false);
    for (const id of ['oshu', 'edo']) expect(Math.max(...ENCOUNTERS[id]!.groups.map((g) => g.members.length)), id).toBe(4);
    for (const id of ['hitsukeTozoku', 'kasha', 'karakuriDoshin', 'hatamotoYakko', 'hinezumi', 'okuriOkami', 'kashaKarakuri']) expect(ENEMIES[id]?.image, id).toBe(true);
  });
});

describe('終章の流れ', () => {
  const base = newGame('m', { mapId: 'edo', x: 32, y: 9 });
  const ch8 = {
    ...base,
    party: [createMember('hero', 29), createMember('gendo', 29), createMember('orin', 29), createMember('kasumi', 29)],
    flags: { intro: true, kagaTegata: true, chapter7Cleared: true, edoIntro: true, kashaDefeated: true, chapter8Cleared: true },
  };
  /** イベントの要求を順に集める（選択肢は最初、戦闘は outcome）。 */
  const requests = (id: string, state: GameState, outcome: 'victory' | 'defeat' = 'victory') => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    const list = [r.request];
    for (let guard = 0; guard < 80 && r.request.kind !== 'done'; guard++) {
      if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
      else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome });
      else r = runner.next(r.state);
      list.push(r.request);
    }
    return list;
  };
  const battles = (id: string, state: GameState, outcome: 'victory' | 'defeat' = 'victory') =>
    requests(id, state, outcome).filter((r) => r.kind === 'battle');
  /** 最初の台詞のページ数（出直すと短い）。 */
  const firstPages = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state).request;
    return r.kind === 'say' ? r.pages.length : 0;
  };
  const hurt = (state: GameState): GameState => ({ ...state, party: state.party.map((m) => ({ ...m, hp: 1 })) });
  const healed = (state: GameState) => state.party.every((m) => m.hp > 1);

  it('大手門の門番は、第 8 章を終えるまでは通さず、終えると加賀の手形で門を開ける（otemonOpen。門番がどく）', () => {
    const before = { ...ch8, flags: { ...ch8.flags, chapter8Cleared: false } };
    expect(run('otemon', before).flags.otemonOpen).toBeFalsy();
    const open = run('otemon', ch8);
    expect(open.flags.otemonOpen).toBe(true);
    const monban = MAPS.edo!.npcs.find((n) => n.id === 'edoMonban')!;
    expect(npcVisible(monban, ch8.flags)).toBe(true);
    expect(npcVisible(monban, open.flags)).toBe(false);
  });

  it('本丸御殿に入ると小吉が待っていて（edojoEntered）、御錠口は御金蔵の鍵を回すまで番兵が押し戻す', () => {
    const entered = run('edojoEnter', ch8);
    expect(entered.flags.edojoEntered).toBe(true);
    expect(MAPS.edojo!.onEnter).toEqual({ event: 'edojoEnter', unless: 'edojoEntered' });
    expect(requests('jouguchi', entered).some((r) => r.kind === 'warp')).toBe(true);
    expect(MAPS.edojo!.triggers!.find((t) => t.event === 'jouguchi')?.unless).toBe('okaneguraCleared');
  });

  it('御金蔵でからくり旗本（Lv28）に勝つと金太が現れて全回復し、okaneguraCleared。負けたら立たず、出直すと口上を短くする', () => {
    expect(battles('okanegura', ch8)[0]).toMatchObject({ kind: 'battle', level: 28, canEscape: false, loseOk: false });
    const won = run('okanegura', hurt(ch8));
    expect(won.flags.okaneguraCleared).toBe(true);
    expect(healed(won)).toBe(true);
    const lost = run('okanegura', ch8, 'defeat');
    expect(lost.flags.okaneguraCleared).toBeFalsy();
    expect(lost.flags.okaneguraMet).toBe(true);
    expect(firstPages('okanegura', lost)).toBeLessThan(firstPages('okanegura', ch8));
    // 御錠口の番兵は鍵を回すと止まる
    for (const n of MAPS.edojo!.npcs.filter((x) => x.id.startsWith('jouguchiBanpei'))) {
      expect(npcVisible(n, ch8.flags)).toBe(true);
      expect(npcVisible(n, won.flags)).toBe(false);
    }
  });

  it('大奥の化け猫（Lv28、4 体）に勝つと火消しが駆けつけて全回復し、ookuCleared。負けたら立たない', () => {
    const b = battles('ookuBakeneko', ch8)[0];
    expect(b).toMatchObject({ kind: 'battle', level: 28, canEscape: false, loseOk: false });
    expect(b?.kind === 'battle' && b.enemies.length).toBe(4);
    const won = run('ookuBakeneko', hurt(ch8));
    expect(won.flags.ookuCleared).toBe(true);
    expect(healed(won)).toBe(true);
    expect(run('ookuBakeneko', ch8, 'defeat').flags.ookuCleared).toBeFalsy();
  });

  it('松の廊下に入ると兵庫が待っていて（matsuEntered）、話しかけると全回復する', () => {
    const entered = run('matsuEnter', ch8);
    expect(entered.flags.matsuEntered).toBe(true);
    expect(MAPS.matsuNoRoka!.onEnter).toEqual({ event: 'matsuEnter', unless: 'matsuEntered' });
    const hyogo = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'hyogoRoka')!;
    expect(npcVisible(hyogo, ch8.flags)).toBe(false);
    expect(npcVisible(hyogo, entered.flags)).toBe(true);
    expect(healed(run('hyogoRoka', hurt(entered)))).toBe(true);
    // 金太は飛脚の代わりに記録を預かる
    expect(MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'kintaRoka')?.action).toBe('hikyaku');
    expect(MAPS.edojo!.npcs.find((n) => n.id === 'kokichiJo')?.action).toBe('hikyaku');
  });

  it('鬼塚典膳（Lv30）に勝つと tenzenDefeated。負けたら立たず、出直すと口上を短くする', () => {
    expect(battles('tenzen', ch8)).toEqual([{ kind: 'battle', enemies: ['onizukaTenzen'], level: 30, canEscape: false, loseOk: false }]);
    expect(run('tenzen', ch8).flags.tenzenDefeated).toBe(true);
    const lost = run('tenzen', ch8, 'defeat');
    expect(lost.flags.tenzenDefeated).toBeFalsy();
    expect(firstPages('tenzen', lost)).toBeLessThan(firstPages('tenzen', ch8));
  });

  it('将軍の間で鷲尾（Lv31）、続けて全回復してからくり大権現（Lv32）。倒すとエンディング（daigongenDefeated・gameCleared）', () => {
    expect(battles('shogunNoMa', ch8)).toEqual([
      { kind: 'battle', enemies: ['washio'], level: 31, canEscape: false, loseOk: false },
      { kind: 'battle', enemies: ['karakuriDaigongen'], level: 32, canEscape: false, loseOk: false },
    ]);
    const list = requests('shogunNoMa', ch8);
    expect(list[list.length - 1]?.kind).toBe('done');
    expect(list[list.length - 2]?.kind).toBe('ending');
    const won = run('shogunNoMa', ch8);
    expect(won.flags.washioDefeated && won.flags.daigongenDefeated && won.flags.gameCleared).toBe(true);
    // 鷲尾に負けたら何も立たない
    const lostWashio = run('shogunNoMa', ch8, 'defeat');
    expect(lostWashio.flags.washioDefeated).toBeFalsy();
    expect(lostWashio.flags.washioMet).toBe(true);
  });

  it('大権現に負けて出直すと、鷲尾とは戦わず、全回復して大権現とだけ戦う', () => {
    const afterWashio = { ...ch8, flags: { ...ch8.flags, washioMet: true, washioDefeated: true } };
    expect(battles('shogunNoMa', afterWashio)).toEqual([{ kind: 'battle', enemies: ['karakuriDaigongen'], level: 32, canEscape: false, loseOk: false }]);
    const lost = run('shogunNoMa', hurt(afterWashio), 'defeat');
    expect(lost.flags.daigongenDefeated).toBeFalsy();
    expect(lost.flags.gameCleared).toBeFalsy();
    // 戦いの前に魂の光で全回復している
    const runner = new EventRunner(EVENTS.shogunNoMa!.steps);
    let r = runner.next(hurt(afterWashio));
    while (r.request.kind !== 'battle') r = runner.next(r.state);
    expect(healed(r.state)).toBe(true);
    const triggers = MAPS.matsuNoRoka!.triggers!.filter((t) => t.event === 'shogunNoMa');
    expect(triggers.length).toBeGreaterThan(0);
    for (const t of triggers) expect(t.unless).toBe('daigongenDefeated');
  });

  it('エンディングの茶屋の場面は、主人公が女なら台詞を変える', () => {
    const pagesOf = (state: GameState) =>
      requests('shogunNoMa', state).flatMap((r) => (r.kind === 'say' ? r.pages : [])).filter((p) => p.includes('勝手に'));
    expect(pagesOf(ch8)).toEqual(['弥太郎「……へっ。勝手にしな」']);
    expect(pagesOf({ ...ch8, gender: 'f' })).toEqual(['お志乃「……ふふ。勝手におし」']);
  });

  it('大手門の門番は otemon のイベントで話す', () => {
    expect(MAPS.edo!.npcs.find((n) => n.id === 'edoMonban')).toMatchObject({ event: 'otemon', hideFlag: 'otemonOpen' });
  });

  it('江戸城の葛籠に、4 人それぞれの最後の武器がある（docs/balance.md の攻撃 35・31・24・35。江戸の店のどの武器より強い）', () => {
    const want: [string, string, CharacterId, number][] = [
      ['edojoChest1', 'aoiNagawaki', 'hero', 35],
      ['edojoChest5', 'oniwabanKodachi', 'kasumi', 31],
      ['edojoChest4', 'nyoraiShakujo', 'gendo', 24],
      ['edojoChest2', 'aoiZutsu', 'orin', 35],
    ];
    const shopWeapons = Object.values(SHOPS).flatMap((sh) => sh.goods).map((id) => EQUIPMENT[id]).filter((e) => e?.slot === 'weapon');
    for (const [chestId, item, wearer, atk] of want) {
      expect(run(chestId, ch8).items[item], chestId).toBe(1);
      const eq = EQUIPMENT[item]!;
      expect(eq.wearers).toEqual([wearer]);
      expect(eq.bonus.atk).toBe(atk);
      for (const w of shopWeapons.filter((x) => x!.wearers.includes(wearer))) expect(atk, `${item} > ${w!.id}`).toBeGreaterThan(w!.bonus.atk ?? 0);
    }
  });

  it('江戸城の出現表は 5 種類以上の敵で、どれも定義されている', () => {
    const members = new Set(ENCOUNTERS.edojo!.groups.flatMap((g) => g.members));
    expect(members.size).toBeGreaterThanOrEqual(5);
    for (const id of members) expect(ENEMIES[id], id).toBeDefined();
    expect(SKILLS.roju).toMatchObject({ target: 'allEnemies', effect: { kind: 'status', status: 'atkDown', turns: 3, chance: 0.6 } });
    expect(ENEMIES.washio!.actions).toEqual([
      { skill: 'attack', weight: 3 },
      { skill: 'roju', weight: 1 },
      { skill: 'kinjuYobi', weight: 1 },
    ]);
    expect(ENEMIES.karakuriDaigongen!.actions).toEqual([
      { skill: 'attack', weight: 3 },
      { skill: 'gongenHo', weight: 2 },
      { skill: 'tamaZenmai', weight: 1 },
    ]);
  });

  it('終章の敵は、ボスの報酬と弱点が決めたとおりで、画像がある。大権現は 1 ターンに 2 回動く', () => {
    expect(ENEMIES.onizukaTenzen).toMatchObject({ rewardScale: 4, factors: { hp: 12, atk: 1.15, def: 1.2, spd: 1.2 } });
    expect(ENEMIES.washio).toMatchObject({ rewardScale: 6, factors: { hp: 12, atk: 1.1, def: 1.2, spd: 1.0 } });
    expect(ENEMIES.karakuriDaigongen).toMatchObject({ rewardScale: 6, actionsPerTurn: 2, weak: ['mech', 'holy'], factors: { hp: 10, atk: 0.8, def: 1.3, spd: 1.1 } });
    // docs/balance.md の「終章で見積もりから変えたこと」の数値（勝率はこの値で試した）
    expect(SKILLS.tenzenIai).toMatchObject({ effect: { kind: 'physical', multiplier: 1.4 } });
    expect(SKILLS.kinjuYobi).toMatchObject({ effect: { kind: 'summon', enemy: 'karakuriKinju', max: 2, level: 26 } });
    expect(SKILLS.gongenHo).toMatchObject({ target: 'allEnemies', effect: { kind: 'physical', multiplier: 0.7 } });
    expect(ENCOUNTERS.edojo!.level).toBe(28);
    expect(Math.max(...ENCOUNTERS.edojo!.groups.map((g) => g.members.length))).toBe(4);
    for (const id of ['karakuriOniwaban', 'ookuBakeneko', 'karakuriHatamoto', 'karakuriKinju', 'onizukaTenzen', 'washio', 'karakuriDaigongen']) {
      expect(ENEMIES[id]?.image, id).toBe(true);
    }
  });
});

describe('イベントの warp', () => {
  it('warp の直後に battle を置かない（戦闘から戻ったときに移動先の onEnter が行われない既知の制限のため。FieldScene.ts）', () => {
    const check = (steps: readonly EventStep[], where: string): void => {
      steps.forEach((st, i) => {
        if (st.type === 'warp') expect(steps[i + 1]?.type, where).not.toBe('battle');
        if (st.type === 'if') {
          check(st.then, where);
          check(st.else ?? [], where);
        }
        if (st.type === 'choice') for (const o of st.options) check(o.steps, where);
      });
    };
    for (const ev of Object.values(EVENTS)) check(ev.steps, ev.id);
  });
});

describe('寄り道の会津若松（什の掟を守る少年たち）', () => {
  const base = newGame('f', { mapId: 'aizu', x: 50, y: 13 });
  const heard = {
    ...base,
    party: [createMember('hero', 26), createMember('gendo', 26), createMember('orin', 26), createMember('kasumi', 26)],
    flags: { intro: true, chapter7Cleared: true, kagaTegata: true, sendaiIntro: true, sendaiHeard: true },
  };
  const pagesOf = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state);
    return r.request.kind === 'say' ? r.request.pages.length : 0;
  };
  const firstBattle = (id: string, state: GameState) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    return skipSay(runner, runner.next(state)).request;
  };

  it('会津若松に初めて入ると aizuIntro。2 回目からは何もしない', () => {
    const arrived = run('aizuEnter', heard);
    expect(arrived.flags.aizuIntro).toBe(true);
    expect(new EventRunner(EVENTS.aizuEnter!.steps).next(arrived).request.kind).toBe('done');
  });

  it('新之助の頼みを聞く前は、飯盛山の平太は話さず戦わない', () => {
    const r = run('heita', heard);
    expect(r.flags.heitaFound).toBeFalsy();
    expect(firstBattle('heita', heard).kind).toBe('done');
  });

  it('新之助の頼み（aizuJuuAsked）を聞くと、平太の前で送り狼の群れ（Lv25・逃げられない）と戦い、勝つと heitaFound。負けたら連れ帰れない', () => {
    const asked = run('aizuJuu', heard);
    expect(asked.flags.aizuJuuAsked).toBe(true);
    expect(firstBattle('heita', asked)).toMatchObject({ kind: 'battle', enemies: ['okuriOkami', 'okuriOkami', 'yukiOnna', 'okuriOkami'], level: 25, canEscape: false, loseOk: false });
    expect(run('heita', asked).flags.heitaFound).toBe(true);
    expect(run('heita', asked, 'defeat').flags.heitaFound).toBeFalsy();
    // 平太を連れ帰る前に新之助に話すと、飯盛山を指す短い台詞だけで、終わらない
    const again = run('aizuJuu', asked);
    expect(again.flags).toEqual(asked.flags);
    expect(again.items).toEqual(asked.items);
    expect(pagesOf('aizuJuu', asked)).toBe(1);
  });

  it('平太を連れ帰って新之助に話すと aizuJuuDone で、起き上がり小法師を一度だけ受け取る。平太は山から日新館の庭へ移る', () => {
    const found = run('heita', run('aizuJuu', heard));
    const done = run('aizuJuu', found);
    expect(done.flags.aizuJuuDone).toBe(true);
    expect(done.items.okiagariKoboshi).toBe(1);
    // 終えたあとは短い台詞だけで、何も変わらない
    expect(run('aizuJuu', done).items).toEqual(done.items);
    expect(run('aizuJuu', done).flags).toEqual(done.flags);
    expect(pagesOf('aizuJuu', done)).toBe(1);
    expect(EQUIPMENT.okiagariKoboshi?.slot).toBe('accessory');
    for (const shop of Object.values(SHOPS)) expect(shop.goods, shop.id).not.toContain('okiagariKoboshi');
    const aizu = MAPS.aizu!;
    const onMountain = aizu.npcs.find((n) => n.id === 'heita')!;
    const atHome = aizu.npcs.find((n) => n.id === 'heitaHome')!;
    expect([npcVisible(onMountain, heard.flags), npcVisible(atHome, heard.flags)]).toEqual([true, false]);
    expect([npcVisible(onMountain, found.flags), npcVisible(atHome, found.flags)]).toEqual([false, true]);
  });

  it('持ち物がいっぱいでお礼を受け取れなければ aizuJuuDone は立たず、次は裁きの場面を繰り返さずに受け取れる', () => {
    const found = run('heita', run('aizuJuu', heard));
    const full = { ...found, items: { ...found.items, okiagariKoboshi: 99 } };
    const refused = run('aizuJuu', full);
    expect(refused.flags.aizuJuuJudged).toBe(true);
    expect(refused.flags.aizuJuuDone).toBeFalsy();
    expect(refused.items.okiagariKoboshi).toBe(99);
    // 空きを作って話しかけると、短い台詞のあとで受け取れる（裁きの長い台詞は繰り返さない）
    const freed = { ...refused, items: { ...refused.items, okiagariKoboshi: 0 } };
    expect(pagesOf('aizuJuu', freed)).toBe(1);
    const got = run('aizuJuu', freed);
    expect(got.flags.aizuJuuDone).toBe(true);
    expect(got.items.okiagariKoboshi).toBe(1);
  });

  it('葛籠の中身は、飯盛山が朝鮮人参、町が身不知柿', () => {
    expect(run('aizuChest1', heard).items.ninjin).toBe((heard.items.ninjin ?? 0) + 1);
    expect(run('aizuChest2', heard).items.mishirazuGaki).toBe((heard.items.mishirazuGaki ?? 0) + 1);
  });
});

describe('寄り道の浜松（遠州の凧揚げ合戦）', () => {
  const base = newGame('m', { mapId: 'hamamatsu', x: 50, y: 12 });
  const arrived = {
    ...base,
    party: [createMember('hero', 7), createMember('kasumi', 7)],
    flags: { intro: true, prologueCleared: true, chapter1Cleared: true, oigawaOpen: true, hamamatsuIntro: true },
  };
  const pagesOf = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state);
    return r.request.kind === 'say' ? r.request.pages.length : 0;
  };
  const firstBattle = (id: string, state: GameState) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    return skipSay(runner, runner.next(state)).request;
  };
  /** 選択肢で index を選んで最後まで進める。 */
  const runChoosing = (id: string, state: GameState, index: number) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    for (let guard = 0; guard < 50 && r.request.kind !== 'done'; guard++) {
      if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index });
      else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome: 'victory' });
      else r = runner.next(r.state);
    }
    return r.state;
  };
  const found = run('hamamatsuTako', run('hamamatsuGenta', arrived));

  it('浜松に初めて入ると hamamatsuIntro。2 回目からは何もしない', () => {
    const entered = run('hamamatsuEnter', { ...arrived, flags: { ...arrived.flags, hamamatsuIntro: false } });
    expect(entered.flags.hamamatsuIntro).toBe(true);
    expect(new EventRunner(EVENTS.hamamatsuEnter!.steps).next(entered).request.kind).toBe('done');
  });

  it('源太の頼みを聞く前は、松林の浪人は追い払うだけで戦わない', () => {
    expect(firstBattle('hamamatsuTako', arrived).kind).toBe('done');
    expect(run('hamamatsuTako', arrived).flags.hamamatsuTakoFound).toBeFalsy();
  });

  it('源太の頼み（hamamatsuTakoAsked）を聞くと、浪人・雲助・獺（Lv7・逃げられない）と戦い、勝つと初凧を取り返す。負けたら取り返せない', () => {
    const asked = run('hamamatsuGenta', arrived);
    expect(asked.flags.hamamatsuTakoAsked).toBe(true);
    expect(firstBattle('hamamatsuTako', asked)).toMatchObject({ kind: 'battle', enemies: ['oihagiRonin', 'kumosuke', 'kawauso'], level: 7, canEscape: false, loseOk: false });
    expect(found.flags.hamamatsuTakoFound).toBe(true);
    expect(run('hamamatsuTako', asked, 'defeat').flags.hamamatsuTakoFound).toBeFalsy();
    // 取り返す前に源太に話すと、松林を指す短い台詞だけ
    expect(run('hamamatsuGenta', asked).flags).toEqual(asked.flags);
    expect(pagesOf('hamamatsuGenta', asked)).toBe(1);
  });

  it('初凧を届けると凧揚げ合戦。引けば祝儀 200 文、繰り出せば祝儀なし。どちらも凧の糸巻きを一度だけ受け取る（hamamatsuTakoDone）', () => {
    const pulled = runChoosing('hamamatsuGenta', found, 0);
    const released = runChoosing('hamamatsuGenta', found, 1);
    expect(pulled.money).toBe(found.money + 200);
    expect(released.money).toBe(found.money);
    for (const done of [pulled, released]) {
      expect(done.flags.hamamatsuTakoDone).toBe(true);
      expect(done.items.takoItomaki).toBe(1);
      // 終えたあとは短い台詞だけで、何も変わらない
      const again = run('hamamatsuGenta', done);
      expect([again.items, again.money, again.flags]).toEqual([done.items, done.money, done.flags]);
      expect(pagesOf('hamamatsuGenta', done)).toBe(1);
    }
    expect(EQUIPMENT.takoItomaki?.slot).toBe('accessory');
    for (const shop of Object.values(SHOPS)) expect(shop.goods, shop.id).not.toContain('takoItomaki');
  });

  it('持ち物がいっぱいで糸巻きを受け取れなければ hamamatsuTakoDone は立たず、次は合戦を繰り返さずに受け取れる（祝儀も二度は出ない）', () => {
    const full = { ...found, items: { ...found.items, takoItomaki: 99 } };
    const refused = run('hamamatsuGenta', full);
    expect(refused.flags.hamamatsuTakoFlown).toBe(true);
    expect(refused.flags.hamamatsuTakoDone).toBeFalsy();
    expect(refused.items.takoItomaki).toBe(99);
    const freed = { ...refused, items: { ...refused.items, takoItomaki: 0 } };
    expect(pagesOf('hamamatsuGenta', freed)).toBe(1);
    const got = run('hamamatsuGenta', freed);
    expect(got.flags.hamamatsuTakoDone).toBe(true);
    expect(got.items.takoItomaki).toBe(1);
    expect(got.money).toBe(refused.money);
  });

  it('浜松の台詞には仲間が出てこない（第 2 章から、霞が抜けている第 5 章にも来られるため）', () => {
    const lines = (steps: EventStep[]): string[] =>
      steps.flatMap((st) => {
        if (st.type === 'say') return [...st.lines, ...(st.linesF ?? [])];
        if (st.type === 'if') return [...lines(st.then), ...lines(st.else ?? [])];
        if (st.type === 'choice') return st.options.flatMap((o) => lines(o.steps));
        if (st.type === 'giveItem') return lines(st.ifFull ?? []);
        return [];
      });
    for (const id of ['hamamatsuEnter', 'hamamatsuGenta', 'hamamatsuTako']) {
      for (const line of lines(EVENTS[id]!.steps)) {
        for (const name of ['霞', '玄道', 'お凛', '榊兵庫']) expect(line.startsWith(`${name}「`), `${id}: ${line}`).toBe(false);
      }
    }
  });

  it('葛籠の中身は、松林が金創膏、町がうなぎの蒲焼', () => {
    expect(run('hamamatsuChest1', arrived).items.kintsuba).toBe((arrived.items.kintsuba ?? 0) + 1);
    expect(run('hamamatsuChest2', arrived).items.unagi).toBe((arrived.items.unagi ?? 0) + 1);
  });
});

describe('寄り道の彦根（赤備えの具足を探す）', () => {
  const base = newGame('m', { mapId: 'hikone', x: 50, y: 12 });
  const arrived = {
    ...base,
    party: [createMember('hero', 10), createMember('kasumi', 10)],
    flags: { intro: true, prologueCleared: true, chapter1Cleared: true, oigawaOpen: true, chapter2Cleared: true, hikoneIntro: true },
  };
  const pagesOf = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state);
    return r.request.kind === 'say' ? r.request.pages.length : 0;
  };
  const firstBattle = (id: string, state: GameState) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    return skipSay(runner, runner.next(state)).request;
  };
  const found = run('hikoneGusoku', run('hikoneJinbei', arrived));

  it('彦根に初めて入ると hikoneIntro。2 回目からは何もしない', () => {
    const entered = run('hikoneEnter', { ...arrived, flags: { ...arrived.flags, hikoneIntro: false } });
    expect(entered.flags.hikoneIntro).toBe(true);
    expect(new EventRunner(EVENTS.hikoneEnter!.steps).next(entered).request.kind).toBe('done');
  });

  it('甚兵衛の頼みを聞く前は、佐和山の盗人は追い払うだけで戦わない', () => {
    expect(firstBattle('hikoneGusoku', arrived).kind).toBe('done');
    expect(run('hikoneGusoku', arrived).flags.hikoneGusokuFound).toBeFalsy();
  });

  it('甚兵衛の頼み（hikoneGusokuAsked）を聞くと、亡霊武者 2（Lv11・逃げられない）と戦い、勝つと具足を取り返す。負けたら取り返せない', () => {
    const asked = run('hikoneJinbei', arrived);
    expect(asked.flags.hikoneGusokuAsked).toBe(true);
    expect(firstBattle('hikoneGusoku', asked)).toMatchObject({ kind: 'battle', enemies: ['boreiMusha', 'boreiMusha'], level: 11, canEscape: false, loseOk: false });
    expect(found.flags.hikoneGusokuFound).toBe(true);
    expect(run('hikoneGusoku', asked, 'defeat').flags.hikoneGusokuFound).toBeFalsy();
    // 取り返す前に甚兵衛に話すと、佐和山を指す短い台詞だけ
    expect(run('hikoneJinbei', asked).flags).toEqual(asked.flags);
    expect(pagesOf('hikoneJinbei', asked)).toBe(1);
  });

  it('具足を届けると、赤備えの籠手を一度だけ受け取る（hikoneGusokuDone）。店には置かない', () => {
    const done = run('hikoneJinbei', found);
    expect(done.flags.hikoneGusokuReturned).toBe(true);
    expect(done.flags.hikoneGusokuDone).toBe(true);
    expect(done.items.akazonaeKote).toBe(1);
    // 終えたあとは短い台詞だけで、何も変わらない
    const again = run('hikoneJinbei', done);
    expect([again.items, again.money, again.flags]).toEqual([done.items, done.money, done.flags]);
    expect(pagesOf('hikoneJinbei', done)).toBe(1);
    expect(EQUIPMENT.akazonaeKote?.slot).toBe('accessory');
    for (const shop of Object.values(SHOPS)) expect(shop.goods, shop.id).not.toContain('akazonaeKote');
  });

  it('持ち物がいっぱいで籠手を受け取れなければ hikoneGusokuDone は立たず、次は届けた場面を繰り返さずに受け取れる', () => {
    const full = { ...found, items: { ...found.items, akazonaeKote: 99 } };
    const refused = run('hikoneJinbei', full);
    expect(refused.flags.hikoneGusokuReturned).toBe(true);
    expect(refused.flags.hikoneGusokuDone).toBeFalsy();
    expect(refused.items.akazonaeKote).toBe(99);
    const freed = { ...refused, items: { ...refused.items, akazonaeKote: 0 } };
    expect(pagesOf('hikoneJinbei', freed)).toBe(1);
    const got = run('hikoneJinbei', freed);
    expect(got.flags.hikoneGusokuDone).toBe(true);
    expect(got.items.akazonaeKote).toBe(1);
  });

  it('彦根の台詞には仲間が出てこない（第 3 章の初めから、霞が抜けている第 5 章にも来られるため）', () => {
    const lines = (steps: EventStep[]): string[] =>
      steps.flatMap((st) => {
        if (st.type === 'say') return [...st.lines, ...(st.linesF ?? [])];
        if (st.type === 'if') return [...lines(st.then), ...lines(st.else ?? [])];
        if (st.type === 'choice') return st.options.flatMap((o) => lines(o.steps));
        if (st.type === 'giveItem') return lines(st.ifFull ?? []);
        return [];
      });
    for (const id of ['hikoneEnter', 'hikoneJinbei', 'hikoneGusoku']) {
      for (const line of lines(EVENTS[id]!.steps)) {
        for (const name of ['霞', '玄道', 'お凛', '榊兵庫']) expect(line.startsWith(`${name}「`), `${id}: ${line}`).toBe(false);
      }
    }
  });

  it('葛籠の中身は、佐和山が万金丹、町が糸切餅', () => {
    expect(run('hikoneChest1', arrived).items.mankintan).toBe((arrived.items.mankintan ?? 0) + 1);
    expect(run('hikoneChest2', arrived).items.itokiriMochi).toBe((arrived.items.itokiriMochi ?? 0) + 1);
  });
});

describe('寄り道の熊本（籠城の備えの井戸の謎）', () => {
  const base = newGame('m', { mapId: 'kumamoto', x: 5, y: 32 });
  const arrived = {
    ...base,
    party: [createMember('hero', 19), createMember('gendo', 19), createMember('orin', 19), createMember('kasumi', 19)],
    flags: { intro: true, chapter5Cleared: true, kasumiRejoined: true, nagasakiArrived: true, shimabaraOpen: true, kumamotoIntro: true },
  };
  const pagesOf = (id: string, state: GameState) => {
    const r = new EventRunner(EVENTS[id]!.steps).next(state);
    return r.request.kind === 'say' ? r.request.pages.length : 0;
  };
  /** 選択肢を index で選びながら進め、最後の warp の行き先を返す。 */
  const warpWith = (id: string, state: GameState, index: number) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    let last: { mapId: string; x: number; y: number } | undefined;
    for (let guard = 0; guard < 50 && r.request.kind !== 'done'; guard++) {
      if (r.request.kind === 'warp') last = { mapId: r.request.mapId, x: r.request.x, y: r.request.y };
      r = r.request.kind === 'choice' ? runner.next(r.state, { kind: 'choice', index }) : runner.next(r.state);
    }
    return last;
  };
  const asked = run('kumamotoMosaku', arrived);
  const found = run('kumamotoKarakuri', asked);

  it('熊本に初めて入ると kumamotoIntro。2 回目からは何もしない', () => {
    const entered = run('kumamotoEnter', { ...arrived, flags: { ...arrived.flags, kumamotoIntro: false } });
    expect(entered.flags.kumamotoIntro).toBe(true);
    expect(new EventRunner(EVENTS.kumamotoEnter!.steps).next(entered).request.kind).toBe('done');
  });

  it('茂作の頼み（kumamotoIdoAsked）を聞くまでは、古井戸を下りられない。聞いたあとは古井戸の底へ下りられる', () => {
    expect(warpWith('kumamotoFuruido', arrived, 0)).toBeUndefined();
    expect(asked.flags.kumamotoIdoAsked).toBe(true);
    expect(warpWith('kumamotoFuruido', asked, 0)).toEqual({ mapId: 'kiyomasaIdo', x: 3, y: 2 });
    // 「やめておく」なら下りない
    expect(warpWith('kumamotoFuruido', asked, 1)).toBeUndefined();
    // からくりを壊したあとも、取り残した葛籠のために下りられる
    expect(warpWith('kumamotoFuruido', found, 0)).toEqual({ mapId: 'kiyomasaIdo', x: 3, y: 2 });
  });

  it('水脈のからくりでは外法使い・南蛮兵 3（Lv21・逃げられない）と戦い、勝つと水が戻る（kumamotoIdoFound）。負けたら戻らない', () => {
    const runner = new EventRunner(EVENTS.kumamotoKarakuri!.steps);
    expect(skipSay(runner, runner.next(asked)).request).toMatchObject({
      kind: 'battle',
      enemies: ['gehoTsukai', 'nanbanHei', 'nanbanHei', 'nanbanHei'],
      level: 21,
      canEscape: false,
      loseOk: false,
    });
    expect(found.flags.kumamotoIdoFound).toBe(true);
    expect(run('kumamotoKarakuri', asked, 'defeat').flags.kumamotoIdoFound).toBeFalsy();
    // 戻る前に茂作に話すと、古井戸を指す短い台詞だけ
    expect(run('kumamotoMosaku', asked).flags).toEqual(asked.flags);
    expect(pagesOf('kumamotoMosaku', asked)).toBe(1);
  });

  it('茂作に知らせると、肥後象嵌の鍔を一度だけ受け取る（kumamotoIdoDone）。店には置かない', () => {
    const done = run('kumamotoMosaku', found);
    expect(done.flags.kumamotoIdoReturned).toBe(true);
    expect(done.flags.kumamotoIdoDone).toBe(true);
    expect(done.items.higoZoganTsuba).toBe(1);
    const again = run('kumamotoMosaku', done);
    expect([again.items, again.money, again.flags]).toEqual([done.items, done.money, done.flags]);
    expect(pagesOf('kumamotoMosaku', done)).toBe(1);
    expect(EQUIPMENT.higoZoganTsuba?.slot).toBe('accessory');
    for (const shop of Object.values(SHOPS)) expect(shop.goods, shop.id).not.toContain('higoZoganTsuba');
  });

  it('持ち物がいっぱいで鍔を受け取れなければ kumamotoIdoDone は立たず、次は知らせた場面を繰り返さずに受け取れる', () => {
    const full = { ...found, items: { ...found.items, higoZoganTsuba: 99 } };
    const refused = run('kumamotoMosaku', full);
    expect(refused.flags.kumamotoIdoReturned).toBe(true);
    expect(refused.flags.kumamotoIdoDone).toBeFalsy();
    const freed = { ...refused, items: { ...refused.items, higoZoganTsuba: 0 } };
    expect(pagesOf('kumamotoMosaku', freed)).toBe(1);
    const got = run('kumamotoMosaku', freed);
    expect(got.flags.kumamotoIdoDone).toBe(true);
    expect(got.items.higoZoganTsuba).toBe(1);
  });

  it('川尻の湊の船頭は、長崎の湊か島原の湊（ワールドマップの熊本の印の西の街道）へ渡す', () => {
    expect(warpWith('kumamotoWatashi', arrived, 0)).toEqual({ mapId: 'nagasaki', x: 14, y: 22 });
    expect(warpWith('kumamotoWatashi', arrived, 1)).toEqual({ mapId: 'world', x: 17, y: 53 });
    expect(warpWith('kumamotoWatashi', arrived, 2)).toBeUndefined();
  });

  it('熊本へは島原の古城の手がかり（shimabaraOpen）のあとでしか来られず、そのときの仲間は霞・玄道・お凛（兵庫は第 5 章で抜けたまま）', () => {
    // 仲間の台詞を入れてよいわけ: shimabaraOpen は霞が戻った（kasumiRejoined）あとの長崎で立ち、兵庫が再び加わるイベントはない
    const joins = (steps: readonly EventStep[]): string[] =>
      steps.flatMap((st) => {
        if (st.type === 'join' || st.type === 'rejoin') return [st.member];
        if (st.type === 'if') return [...joins(st.then), ...joins(st.else ?? [])];
        if (st.type === 'choice') return st.options.flatMap((o) => joins(o.steps));
        return [];
      });
    const all = Object.values(EVENTS).flatMap((e) => joins(e.steps));
    expect(all.filter((m) => m === 'hyogo')).toHaveLength(1);
    expect(MAPS.world!.towns!.find((t) => t.name === '熊本')?.openFlag).toBe('shimabaraOpen');
  });

  it('葛籠の中身は、水脈が金平糖と反魂丹、町が辛子蓮根', () => {
    expect(run('kumamotoChest1', arrived).items.konpeito).toBe((arrived.items.konpeito ?? 0) + 1);
    expect(run('kumamotoChest3', arrived).items.hangontan).toBe((arrived.items.hangontan ?? 0) + 1);
    expect(run('kumamotoChest2', arrived).items.karashiRenkon).toBe((arrived.items.karashiRenkon ?? 0) + 1);
  });
});
