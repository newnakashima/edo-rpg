import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from './characters';
import { EQUIPMENT } from './equipment';
import { speakerOf } from './faces';
import { SHOPS } from './shops';
import { ENCOUNTERS, ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { TATSUGORO_JINGI } from './oyabunRequests';
import { isKnownItem } from './items';
import { SKILLS } from './skills';
import { canStep, MAPS, npcLines, npcVisible, respawnPoint, tileAt } from './maps';
import { EventRunner, pathFacings, pathTo } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { cameraScroll } from '../ui/cameraScroll';
import { GAME_HEIGHT, GAME_WIDTH } from '../ui/theme';
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
  for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
    if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
    else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome });
    else r = runner.next(r.state);
  }
  return r.state;
}

/** イベントの要求を順に集める（選択肢は最初、戦闘は outcome）。 */
function requests(id: string, state: GameState, outcome: 'victory' | 'defeat' = 'victory') {
  const runner = new EventRunner(EVENTS[id]!.steps);
  let r = runner.next(state);
  const list = [r.request];
  for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
    if (r.request.kind === 'choice') r = runner.next(r.state, { kind: 'choice', index: 0 });
    else if (r.request.kind === 'battle') r = runner.next(r.state, { kind: 'battle', outcome });
    else r = runner.next(r.state);
    list.push(r.request);
  }
  return list;
}

// 演出のテストの補助（requests が集めた要求の並びから読む）
type Req = ReturnType<typeof requests>[number];
const stages = (list: Req[]) => list.flatMap((q) => (q.kind === 'stage' ? [q.step] : []));
const actors = (list: Req[]) => stages(list).flatMap((s) => (s.type === 'actor' ? [s.id] : []));
const vanished = (list: Req[]) => stages(list).flatMap((s) => (s.type === 'vanish' ? [s.who] : []));
const pagesIn = (list: Req[]) => list.flatMap((q) => (q.kind === 'say' ? q.pages : []));
const battleAt = (list: Req[]) => list.findIndex((q) => q.kind === 'battle');
/** 一行の仲間が同時に何人出ているかの最大（主人公の隣の空きが少ない場面では一人ずつ出す）。 */
function maxPartyOut(list: Req[]): number {
  let out = 0;
  let max = 0;
  for (const s of stages(list)) {
    if (s.type === 'actor' && ['kasumi', 'gendo', 'orin'].includes(s.id)) max = Math.max(max, ++out);
    if (s.type === 'vanish' && ['kasumi', 'gendo', 'orin'].includes(s.who)) out--;
  }
  return max;
}
/** 全員の HP を 1 にする（全回復の場面を確かめる）。 */
const hurt = (state: GameState): GameState => ({ ...state, party: state.party.map((m) => ({ ...m, hp: 1 })) });
const healed = (state: GameState) => state.party.every((m) => m.hp > 1);
const STEP = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] } as const;
/** who の nth 番目の歩き（path）を from から歩き終えたマス。通れないマスや、hero を渡せば主人公のマスを通ったら落とす。 */
function walkEnd(list: Req[], who: string, from: { x: number; y: number }, mapId: string, hero?: { x: number; y: number }, nth = 0) {
  const step = stages(list).filter((s) => s.type === 'walk' && s.who === who)[nth];
  expect(step?.type, `${who} が歩かない`).toBe('walk');
  const pos = { x: from.x, y: from.y };
  for (const c of step?.type === 'walk' ? (step.path ?? '') : '') {
    pos.x += STEP[c as keyof typeof STEP][0];
    pos.y += STEP[c as keyof typeof STEP][1];
    expect(canStep(MAPS[mapId]!, pos.x, pos.y), `${who} (${pos.x},${pos.y})`).toBe(true);
    if (hero) expect(pos.x === hero.x && pos.y === hero.y, `${who} が主人公のマスを通る`).toBe(false);
  }
  return pos;
}

describe('女主人公の台詞（linesF）', () => {
  it('linesF は lines と同じページ数で、主人公の台詞のページが同じ位置にある', () => {
    const isHero = (p: string) => /^\{hero\}(〈.〉)?「/u.test(p);
    for (const [id, def] of Object.entries(EVENTS)) {
      for (const step of walk(def.steps)) {
        if (step.type !== 'say' || !step.linesF) continue;
        expect(step.linesF.length, `${id}: ${step.lines[0]}`).toBe(step.lines.length);
        expect(step.linesF.map(isHero), `${id}: ${step.lines[0]}`).toEqual(step.lines.map(isHero));
      }
    }
  });
});

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
    // 親分の頼みを果たしたので、仁義ポイントも得る（src/data/oyabunRequests.ts）
    expect(reported.jingi).toBe(defeated.jingi + TATSUGORO_JINGI);
    // 礼は一度だけ
    const again = run('tatsugoro', reported);
    expect(again.money).toBe(reported.money);
    expect(again.jingi).toBe(reported.jingi);
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
    while (r.request.kind === 'say' || r.request.kind === 'stage') r = runner.next(r.state);
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
    while (r.request.kind === 'say' || r.request.kind === 'stage') r = runner.next(r.state);
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['tetsubin'], level: 7, canEscape: false, loseOk: false });
    expect(r.state.flags.yashamaruFled).toBe(true);
    expect(run('tetsubin', start).flags.tetsubinDefeated).toBe(true);
    expect(run('tetsubin', start, 'defeat').flags.tetsubinDefeated).toBeFalsy();
  });

  it('鉄瓶に負けて出直すと、夜叉丸の場面は繰り返さず鉄瓶とだけ戦う', () => {
    const lost = run('tetsubin', start, 'defeat');
    expect(lost.flags.yashamaruFled).toBe(true);
    const list = requests('tetsubin', lost);
    const battle = list.findIndex((r) => r.kind === 'battle');
    expect(list[battle]).toMatchObject({ kind: 'battle', enemies: ['tetsubin'] });
    const before = list.slice(0, battle).flatMap((r) => (r.kind === 'say' ? r.pages : [])).join('');
    expect(before).not.toContain('夜叉丸');
    expect(run('tetsubin', lost).flags.tetsubinDefeated).toBe(true);
  });

  it('鉄瓶を倒すと、清水の長屋のおかみは与吉が帰ってきたと話す（霞の「与吉は清水の長屋へ帰る」と合わせる）', () => {
    const okami = MAPS.shimizu!.npcs.find((n) => n.id === 'nagaya')!;
    expect(npcLines(okami, { yakoDefeated: true }).join('')).toContain('生きてりゃ');
    expect(npcLines(okami, { yakoDefeated: true, tetsubinDefeated: true }).join('')).toContain('帰ってきた');
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

/** 演出（stage）の要求を飛ばす。 */
function skipStage(runner: EventRunner, r: ReturnType<EventRunner['next']>): ReturnType<EventRunner['next']> {
  while (r.request.kind === 'stage') r = runner.next(r.state);
  return r;
}

/** 台詞を読み進め、次に画面に頼むこと（台詞以外）の手前まで進める。 */
function skipSay(runner: EventRunner, r: ReturnType<EventRunner['next']>): ReturnType<EventRunner['next']> {
  while (r.request.kind === 'say' || r.request.kind === 'stage') r = runner.next(r.state);
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
    const list = requests('kinshachi', lost);
    const battle = list.findIndex((r) => r.kind === 'battle');
    expect(list[battle]).toMatchObject({ kind: 'battle', enemies: ['kinshachi'] });
    const before = list.slice(0, battle).flatMap((r) => (r.kind === 'say' ? r.pages : [])).join('');
    expect(before).toContain('今度こそ');
    expect(before).not.toContain('銀次「');
    expect(run('kinshachi', lost).flags.kinshachiDefeated).toBe(true);
  });

  it('金鯱からくりを倒すと城の前へ移り、名古屋に入ったときのイベントで第 2 章が終わる', () => {
    const list = requests('kinshachi', start);
    expect(list.filter((r) => r.kind === 'warp').at(-1)).toMatchObject({ kind: 'warp', mapId: 'nagoya' });
    expect(MAPS.nagoya!.onEnter?.event).toBe('nagoyaEnter');
  });

  it('大井川を渡ると、渡し場の西の街道へ移る', () => {
    const list = requests('oigawa', start);
    const warp = list.find((r) => r.kind === 'warp') as { mapId: string; x: number; y: number } | undefined;
    expect(warp).toMatchObject({ mapId: 'world' });
    const gate = MAPS.world!.gates!.find((g) => g.event === 'oigawa')!;
    expect(warp!.x).toBeLessThan(gate.x);
    expect(tileAt(MAPS.world!, warp!.x, warp!.y)?.blocked).toBe(false);
    // 負けたら渡らない
    expect(requests('oigawa', start, 'defeat').some((r) => r.kind === 'warp')).toBe(false);
  });

  it('名古屋に着く前に東海道で全滅しても、着いたときの町の人は戻った主人公の見える所に出る', () => {
    const back = respawnPoint('world', 95, 30, start.flags);
    expect(back.mapId).toBe('nagoya');
    const town = MAPS.world!.towns!.find((t) => t.name === '名古屋')!.to!;
    let crowd = 0;
    for (const step of EVENTS.nagoyaEnter!.steps.flatMap((s) => (s.type === 'if' ? [...s.then, ...(s.else ?? [])] : [s])).flatMap((s) => (s.type === 'if' ? [...s.then, ...(s.else ?? [])] : [s]))) {
      if (step.type !== 'actor' || step.x === undefined || step.y === undefined || !step.id.startsWith('nagoyaYajiuma')) continue;
      crowd++;
      // 画面は横 24 マス・縦 13 マス余り。入口から入ったときも、全滅で戻ったときも見える
      for (const p of [back, town]) {
        expect(Math.abs(step.x - p.x), step.id).toBeLessThanOrEqual(10);
        expect(Math.abs(step.y - p.y), step.id).toBeLessThanOrEqual(5);
      }
    }
    expect(crowd).toBe(3);
  });

  it('大凧で飛ぶと、天守の欄干の金太の隣に着き、金太が話す', () => {
    const clue = { ...start, flags: { ...start.flags, kintaMet: true, urokoClue: true } };
    const list = requests('kinta', clue);
    const w = list.findIndex((r) => r.kind === 'warp');
    const warp = list[w] as { mapId: string; x: number; y: number };
    expect(warp.mapId).toBe('tenshu');
    const kinta = MAPS.tenshu!.npcs.find((n) => n.id === 'tenshuKinta')!;
    expect(Math.abs(kinta.x - warp.x) + Math.abs(kinta.y - warp.y)).toBe(1);
    const after = list.slice(w + 1).flatMap((r) => (r.kind === 'say' ? r.pages : [])).join('');
    expect(after).toContain('金太「着いた');
  });

  it('天守に着くと、欄干で金太が待つ（大凧で飛んだあと、金鯱からくりを倒すまで）', () => {
    const kinta = MAPS.tenshu!.npcs.find((n) => n.id === 'tenshuKinta')!;
    expect(npcVisible(kinta, {})).toBe(false);
    expect(npcVisible(kinta, { kintaFlew: true })).toBe(true);
    expect(npcVisible(kinta, { kintaFlew: true, kinshachiDefeated: true })).toBe(false);
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
    const list = requests('shuten', lost);
    const battle = list.findIndex((r) => r.kind === 'battle');
    expect(list[battle]).toMatchObject({ kind: 'battle', enemies: ['shuten'] });
    const pages = list.slice(0, battle).flatMap((r) => (r.kind === 'say' ? r.pages : [])).join('');
    expect(pages).not.toContain('夜叉丸「');
    expect(pages).toContain('酒呑の大鬼');
    expect(run('shuten', lost).flags.shutenDefeated).toBe(true);
  });

  it('酒呑の大鬼を倒すと京の北の峠道の口へ移り、京に入ったときのイベントで第 3 章が終わる（chapter3Cleared）', () => {
    const list = requests('shuten', start);
    const warp = list.filter((r) => r.kind === 'warp').at(-1) as { mapId: string; x: number; y: number } | undefined;
    expect(warp).toMatchObject({ mapId: 'kyo' });
    // 鬼の巣から歩いて戻ったときと同じ所（峠道の口）
    expect(MAPS.oninosu!.exits.some((e) => e.to === 'kyo' && e.toX === warp!.x && e.toY === warp!.y)).toBe(true);
    expect(requests('shuten', start, 'defeat').some((r) => r.kind === 'warp')).toBe(false);
    expect(MAPS.kyo!.onEnter?.event).toBe('kyoEnter');
    const cleared = run('kyoEnter', run('shuten', run('kyoEnter', start)));
    expect(cleared.flags.chapter3Cleared).toBe(true);
  });

  it('京に着く前に街道で全滅しても、着いたときの町の人は戻った主人公の見える所に出る', () => {
    const back = respawnPoint('world', 70, 28, start.flags);
    expect(back.mapId).toBe('kyo');
    const town = MAPS.world!.towns!.find((t) => t.name === '京')!.to!;
    let crowd = 0;
    for (const step of walk(EVENTS.kyoEnter!.steps)) {
      if (step.type !== 'actor' || step.x === undefined || step.y === undefined || !step.id.startsWith('kyoMachibito')) continue;
      crowd++;
      // 画面は横 24 マス・縦 13 マス余り。入口から入ったときも、全滅で戻ったときも見える
      for (const p of [back, town]) {
        expect(Math.abs(step.x - p.x), step.id).toBeLessThanOrEqual(10);
        expect(Math.abs(step.y - p.y), step.id).toBeLessThanOrEqual(5);
      }
    }
    expect(crowd).toBe(2);
  });

  it('第 3 章の終わりに峠道を下りてくる河原の人々は、鬼の巣から移った主人公の見える所に出る', () => {
    const warp = requests('shuten', start).filter((r) => r.kind === 'warp').at(-1) as { x: number; y: number };
    let people = 0;
    for (const step of walk(EVENTS.kyoEnter!.steps)) {
      if (step.type !== 'actor' || step.x === undefined || step.y === undefined || !step.id.startsWith('kyoKaeri')) continue;
      people++;
      expect(Math.abs(step.x - warp.x), step.id).toBeLessThanOrEqual(10);
      expect(Math.abs(step.y - warp.y), step.id).toBeLessThanOrEqual(5);
    }
    expect(people).toBe(3);
  });

  it('第 3 章の地の文は、人の動きと台詞に置き換わっている（残すのは音と加入の知らせだけ）', () => {
    const narration = ['京。千年の都', '河原の葦の陰で', 'は、駿府と名古屋で見てきた', '門の跡の暗がりから', '玄道が数珠を鳴らし', '崩れかけた本堂に', '夜叉丸が印を結ぶと', '地響きを立てて倒れた', '本堂の奥の牢には', '都へ戻ろう。', 'そこへ、汗まみれの飛脚', '文には、震える字で', '清水湊へ急ごう。'];
    const lines = ['kyoEnter', 'gendoMeet', 'rashomonOni', 'shuten']
      .flatMap((id) => [...walk(EVENTS[id]!.steps)])
      .flatMap((s) => (s.type === 'say' ? [...s.lines, ...(s.linesF ?? [])] : []));
    // 台詞（「」の中）でない所に、前の地の文が残っていない
    for (const text of narration) for (const line of lines) expect(line.split('「')[0], line).not.toContain(text);
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
    // 町の入口で弔いの鉦を聞き、辰五郎一家の屋敷へ移って、棺の前でお凛が仇討ちを誓う
    const reqs = requests('shimizuEnter', ch3);
    expect(reqs[0]?.kind === 'say' ? reqs[0].pages.join('') : '').toContain('カーン');
    const warp = reqs.find((r) => r.kind === 'warp');
    // 屋敷の土間（出口の 2 マス上）。通れるマスに出る
    expect(warp).toEqual({ kind: 'warp', mapId: 'shimizuOyabun', x: 8, y: 10 });
    expect(canStep(MAPS.shimizuOyabun!, 8, 10)).toBe(true);
    expect(reqs.flatMap((r) => (r.kind === 'say' ? r.pages : [])).join('')).toContain('おとっつぁんの仇は');
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
    // 勝つと、朧は煙とともに姿を消す
    const won = requests('oboro', withOrin);
    const battleAt = won.findIndex((q) => q.kind === 'battle');
    expect(won.slice(battleAt).some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'igaOboro')).toBe(true);
    const lost = run('oboro', withOrin, 'defeat');
    expect(lost.flags.oboroDefeated).toBeFalsy();
    const retryRunner = new EventRunner(EVENTS.oboro!.steps);
    const retry = skipStage(retryRunner, retryRunner.next(lost));
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
    // 撃たれた権六は、倒れて画面から消える
    const reqs = requests('gonroku', start);
    const battleAt = reqs.findIndex((q) => q.kind === 'battle');
    expect(reqs.slice(battleAt).some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kagiyaGonroku')).toBe(true);
    expect(won.flags.gonrokuDefeated).toBe(true);
    expect(won.flags.chapter4Cleared).toBe(true);
    const lost = run('gonroku', start, 'defeat');
    expect(lost.flags.gonrokuDefeated).toBeFalsy();
    expect(lost.flags.chapter4Cleared).toBeFalsy();
    const retryRunner = new EventRunner(EVENTS.gonroku!.steps);
    const retry = skipStage(retryRunner, retryRunner.next(lost));
    expect(retry.request.kind).toBe('say');
    const pages = retry.request.kind === 'say' ? retry.request.pages.join('') : '';
    expect(pages).not.toContain('凛だ');
    expect(pages).toContain('権六「');
    expect(run('gonroku', lost).flags.chapter4Cleared).toBe(true);
  });
});

describe('第 5 章の流れ', () => {
  // 見送り: 「台詞を言う人（霞・玄道・お凛・兵庫など）が、その前に画面に出ていて消えていない」を、分岐ごとに機械的に確かめるテストはまだない。
  // 話者名と画面の人の ID の対応表が要るので、全章の書き換えが終わったあとに eventStage.test.ts へ足す（speakerOf で話者を取り、actor・vanish をたどる）
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

  it('私塾で榊兵庫が Lv25 のゲストとして加わる（hyogoJoined）。もう一度起きても増えない', () => {
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
    const list = requests('hyakuhyo', lost);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const before = list.slice(0, battle).flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(before).not.toContain('お凛');
    expect(before).toContain('今度こそ');
    expect(run('hyakuhyo', lost).flags.hyakuhyoDefeated).toBe(true);
  });

  it('百俵からくりは工場の奥から歩いてきて、勝つと崩れて消え、北岸の蔵の前へ移る（大坂に入ったときのイベントで第 5 章が終わる）', () => {
    const list = requests('hyakuhyo', joined);
    const battle = list.findIndex((q) => q.kind === 'battle');
    expect(list.slice(0, battle).some((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'komeKuraHyakuhyo')).toBe(true);
    expect(list.slice(battle).some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'komeKuraHyakuhyo')).toBe(true);
    const warp = list.filter((q) => q.kind === 'warp').at(-1);
    expect(warp).toEqual({ kind: 'warp', mapId: 'osaka', x: 26, y: 4 });
    expect(canStep(MAPS.osaka!, 26, 4)).toBe(true);
    // 蔵の戸（米蔵の地下の出口が戻す所）と同じ場所
    expect(MAPS.komeKura!.exits!.every((e) => e.to === 'osaka' && e.toX === 26 && e.toY === 4)).toBe(true);
    expect(MAPS.osaka!.onEnter?.event).toBe('osakaEnter');
    // 負けたら移らない
    expect(requests('hyakuhyo', joined, 'defeat').some((q) => q.kind === 'warp')).toBe(false);
  });

  it('私塾の兵庫は、加わると主人公のところへ歩いて消える', () => {
    const list = requests('hyogoMeet', arrived);
    const join = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'hyogoJuku');
    expect(join).toBeGreaterThan(0);
    expect(list.slice(0, join).some((q) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === 'hyogoJuku' && q.step.to === 'hero')).toBe(true);
    expect(MAPS.osakaJuku!.npcs.find((n) => n.id === 'hyogoJuku')?.hideFlag).toBe('hyogoJoined');
  });

  it('大坂に着く前に街道で全滅しても、着いたときの町人は戻った主人公の見える所に出る', () => {
    const back = respawnPoint('world', 58, 34, ch4.flags);
    expect(back.mapId).toBe('osaka');
    const town = MAPS.world!.towns!.find((t) => t.name === '大坂')!.to!;
    const branch = EVENTS.osakaEnter!.steps[0]!;
    const inner = branch.type === 'if' ? (branch.else ?? []) : [];
    const steps = inner.flatMap((s) => (s.type === 'if' ? [...s.then, ...(s.else ?? [])] : [s]));
    let crowd = 0;
    for (const step of steps) {
      if (step.type !== 'actor' || step.x === undefined || step.y === undefined) continue;
      crowd++;
      for (const p of [back, town]) {
        expect(Math.abs(step.x - p.x), step.id).toBeLessThanOrEqual(10);
        expect(Math.abs(step.y - p.y), step.id).toBeLessThanOrEqual(5);
      }
    }
    expect(crowd).toBe(2);
  });

  it('第 5 章の終わりは北岸の蔵の前で、門弟たちが橋へ押し寄せ、兵庫が止める。人は蔵の前から見える所に出る', () => {
    const list = requests('osakaEnter', run('hyakuhyo', joined));
    const stage = list.flatMap((q) => (q.kind === 'stage' ? [q.step] : []));
    const actors = stage.filter((s) => s.type === 'actor');
    expect(actors.map((a) => a.id)).toEqual(expect.arrayContaining(['hyogo', 'osakaMonteiA', 'osakaMonteiB', 'osakaMonteiC', 'osakaHikyaku']));
    for (const a of actors) {
      if (a.type !== 'actor' || a.x === undefined || a.y === undefined) continue;
      expect(Math.abs(a.x - 26), a.id).toBeLessThanOrEqual(10);
      expect(Math.abs(a.y - 4), a.id).toBeLessThanOrEqual(9);
    }
    // 兵庫が姿を消してから一行を離れる
    const vanished = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'hyogo');
    const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.includes('榊兵庫が一行を離れた')));
    expect(vanished).toBeGreaterThan(0);
    expect(said).toBeGreaterThan(vanished);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).toContain('門弟「');
    expect(pages).toContain('飛脚「');
    // 主人公は橋のほう（南）を向くので、仲間は左右に出て、橋を駆けてくる飛脚（x = 26、主人公の 2 マス手前で止まる）と重ならない
    expect(stage[0]).toEqual({ type: 'face', who: 'hero', dir: 'down' });
    const hikyaku = stage.filter((s) => s.type === 'walk' && s.who === 'osakaHikyaku');
    expect(hikyaku[0]).toMatchObject({ path: 'uuuuuuu' });
    expect(hikyaku[1]).toMatchObject({ path: 'ddddddd' });
  });

  it('第 5 章の終わりに、兵庫は橋の上で鉄砲に撃たれて川へ落ち、羽織しか上がらない（死んだと思わせる）', () => {
    const list = requests('osakaEnter', run('hyakuhyo', joined));
    const bang = list.findIndex((q) => q.kind === 'say' && q.pages.includes('ダーン！'));
    const shooter = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'osakaTeppo');
    const fell = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'hyogo');
    const splash = list.findIndex((q) => q.kind === 'say' && q.pages.includes('ザブン……！'));
    expect(bang).toBeGreaterThan(0);
    expect(shooter).toBeGreaterThan(bang);
    expect(fell).toBeGreaterThan(shooter);
    expect(splash).toBeGreaterThan(fell);
    // 兵庫は橋の端から川へ落ちる（消える前のマスの隣が川）
    const hyogoStart = stages(list).find((st) => st.type === 'actor' && st.id === 'hyogo')!;
    let pos = hyogoStart.type === 'actor' ? { x: hyogoStart.x!, y: hyogoStart.y! } : { x: 0, y: 0 };
    for (let i = 0; i < 3; i++) pos = walkEnd(list, 'hyogo', pos, 'osaka', undefined, i);
    expect(stages(list).filter((st) => st.type === 'walk' && st.who === 'hyogo')).toHaveLength(3);
    expect([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => MAPS.osaka!.rows[pos.y + dy!]![pos.x + dx!] === '~')).toBe(true);
    const pages = pagesIn(list).join('');
    expect(pages).toContain('羽織だけ');
    expect(pages).toContain('口は封じた');
  });

  it('第 5 章の後の大坂の人は、兵庫が奉行所へ行ったとは言わない', () => {
    // 大坂の町と、その建物の中（osakaJuku など）
    const afterCleared = Object.values(MAPS)
      .filter((m) => m.id.startsWith('osaka'))
      .flatMap((m) => m.npcs.flatMap((n) => [n.after, n.later].filter((c) => c?.flag === 'chapter5Cleared').flatMap((c) => c!.lines)));
    expect(afterCleared.some((l) => l.includes('先生'))).toBe(true);
    for (const l of afterCleared) expect(l).not.toMatch(/奉行所へ(行かはった|行かれた)|名乗り出/u);
  });

  it('大坂に着いたとき、主人公は町のほうを向き、霞は上か下に出て東の街道へ戻る（主人公のマスを通らない）', () => {
    const stage = requests('osakaEnter', ch4).flatMap((q) => (q.kind === 'stage' ? [q.step] : []));
    expect(stage[0]).toEqual({ type: 'face', who: 'hero', dir: 'left' });
    const gone = stage.findIndex((s) => s.type === 'vanish' && s.who === 'kasumi');
    expect(stage.slice(0, gone).some((s) => s.type === 'walk' && s.who === 'kasumi')).toBe(true);
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

  it('広島に入ると霞が戻る（kasumiRejoined）。装備はそのまま、平均レベル（お凛を数えない主人公・玄道の Lv20）まで引き上げる', () => {
    const back = run('hiroshimaEnter', ch5);
    expect(back.flags.kasumiRejoined).toBe(true);
    expect(back.party.map((m) => m.id)).toEqual(['hero', 'gendo', 'orin', 'kasumi']);
    expect(back.away).toEqual([]);
    expect(memberLevel(back.party[3]!)).toBe(20);
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

  it('出島の通詞の話では、霞が出てきてから話し、話し終えると戻る', () => {
    const list = requests('tsujiMeet', arrived);
    const out = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kasumi');
    const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('霞「')));
    const gone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kasumi');
    expect(out).toBeGreaterThanOrEqual(0);
    expect(said).toBeGreaterThan(out);
    expect(gone).toBeGreaterThan(said);
  });

  const heard = run('tsujiMeet', arrived);

  it('南蛮寺跡の礼拝堂の跡でからくり兵に勝つと shimabaraOpen。負けて出直すと口上を短くする', () => {
    const runner = new EventRunner(EVENTS.nanbanjiOku!.steps);
    const r = skipSay(runner, runner.next(heard));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['nanbanHei', 'gehoTsukai', 'nanbanHei'], level: 19, canEscape: false, loseOk: false });
    expect(run('nanbanjiOku', heard).flags.shimabaraOpen).toBe(true);
    const lost = run('nanbanjiOku', heard, 'defeat');
    expect(lost.flags.shimabaraOpen).toBeFalsy();
    const list = requests('nanbanjiOku', lost);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const before = list.slice(0, battle).flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(before).toContain('懲りぬ');
    expect(before).not.toContain('鎧をまとうた');
    expect(run('nanbanjiOku', lost).flags.shimabaraOpen).toBe(true);
  });

  it('南蛮寺跡では、からくり兵と外法使いが礼拝堂から出てきて、勝つと消える。書き付けは霞が拾って読み上げる', () => {
    const list = requests('nanbanjiOku', heard);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const shown = list.slice(0, battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' ? [q.step.id] : []));
    expect(shown).toEqual(['nanbanjiHeiA', 'nanbanjiHeiB', 'nanbanjiGeho']);
    const gone = list.slice(battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'vanish' ? [q.step.who] : []));
    expect(gone).toEqual(expect.arrayContaining(['nanbanjiHeiA', 'nanbanjiHeiB', 'nanbanjiGeho']));
    const pages = list.slice(battle).flatMap((q) => (q.kind === 'say' ? q.pages : []));
    expect(pages.some((p) => p.startsWith('霞「『魂のゼンマイ'))).toBe(true);
    // 地の文で書き付けのありかを語らない
    expect(pages.join('')).not.toContain('落ちていた');
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
    const list = requests('nanbanOzutsu', lost);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const before = list.slice(0, battle).flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(before).not.toContain('蘭斎「');
    expect(before).toContain('霞「');
    expect(run('nanbanOzutsu', lost).flags.nanbanOzutsuDefeated).toBe(true);
  });

  it('研究所では、大筒からくりが奥から出てきて入口をふさぎ、勝つと崩れて消える。主人公は机の脇の蘭斎の前へ行き、蘭斎は息を引き取って消える', () => {
    const list = requests('nanbanOzutsu', opened);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const stage = list.flatMap((q) => (q.kind === 'stage' ? [q.step] : []));
    expect(list.slice(0, battle).some((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kenkyujoOzutsu')).toBe(true);
    expect(list.slice(0, battle).some((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kenkyujoRansai')).toBe(true);
    expect(list.slice(battle).some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kenkyujoOzutsu')).toBe(true);
    // 主人公が歩くのは大筒からくりが消えてから。行き先（14, 20）は蘭斎（14, 21）の前
    const ozutsuGone = stage.findIndex((s) => s.type === 'vanish' && s.who === 'kenkyujoOzutsu');
    const heroWalk = stage.findIndex((s) => s.type === 'walk' && s.who === 'hero');
    expect(heroWalk).toBeGreaterThan(ozutsuGone);
    expect(stage[heroWalk]).toMatchObject({ to: { x: 15, y: 20 } });
    expect(stage[heroWalk + 1]).toMatchObject({ type: 'walk', who: 'hero', path: 'l' });
    expect(stage.find((s) => s.type === 'actor' && s.id === 'kenkyujoRansai')).toMatchObject({ x: 14, y: 21 });
    expect(canStep(MAPS.kenkyujo!, 14, 20)).toBe(true);
    // 蘭斎は最後の言葉のあとで消え、そのあと蘭斎は喋らない
    const ransaiGone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kenkyujoRansai');
    expect(ransaiGone).toBeGreaterThan(battle);
    expect(list.slice(ransaiGone).some((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('蘭斎「')))).toBe(false);
    // 書き付けを渡す・経を唱えるのを地の文で語らない（受け取った知らせだけ）
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).not.toContain('蘭斎は、');
    expect(pages).not.toContain('玄道は、長い');
    expect(pages).toContain('玄道は、蘭斎から祝詞の書き付けを受け取った。');
  });

  it('南蛮大筒からくりを倒して長崎に入ると第 6 章が終わる（chapter6Cleared）', () => {
    const cleared = run('nagasakiEnter', run('nanbanOzutsu', opened));
    expect(cleared.flags.chapter6Cleared).toBe(true);
    expect(cleared.party).toHaveLength(4);
  });

  /** イベントで、決まった場所に出す人（x・y のある actor）。 */
  const placed = (list: ReturnType<typeof requests>) =>
    list.flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' && q.step.x !== undefined && q.step.y !== undefined ? [{ id: q.step.id, x: q.step.x, y: q.step.y }] : []));
  const near = (a: { x: number; y: number }, p: { x: number; y: number }) => Math.abs(a.x - p.x) <= 10 && Math.abs(a.y - p.y) <= 5;

  it('広島に着くと、霞が橋のたもとに出て、主人公のところへ歩いて消えてから一行に戻る。霞は東の入口からも全滅後の戻り先からも見える', () => {
    const list = requests('hiroshimaEnter', ch5);
    const town = MAPS.world!.towns!.find((t) => t.name === '広島')!.to!;
    const back = respawnPoint('world', 40, 33, ch5.flags);
    expect(back.mapId).toBe('hiroshima');
    const actors = placed(list);
    expect(actors.map((a) => a.id)).toEqual(['kasumi']);
    for (const a of actors) for (const p of [town, back]) expect(near(a, p), `${a.id} @${p.x},${p.y}`).toBe(true);
    const gone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kasumi');
    const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.includes('霞が一行に戻った')));
    expect(gone).toBeGreaterThan(0);
    expect(said).toBeGreaterThan(gone);
    expect(list.slice(0, gone).some((q) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === 'kasumi' && q.step.to === 'hero')).toBe(true);
    // 玄道（東の入口では主人公の下、霞の歩く y = 14 に出る）は、霞が歩き出す前に戻る
    const kasumiWalk = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === 'kasumi');
    const gendoGone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'gendo');
    expect(gendoGone).toBeGreaterThan(0);
    expect(gendoGone).toBeLessThan(kasumiWalk);
    // 霞は横、縦の順に主人公へ歩く。東の入口からも全滅後の戻り先からも、途中で通れないマスに当たらない
    const kasumi = actors[0]!;
    for (const p of [town, back]) {
      const pos = { x: kasumi.x, y: kasumi.y };
      while (pos.x !== p.x) {
        pos.x += Math.sign(p.x - pos.x);
        expect(canStep(MAPS.hiroshima!, pos.x, pos.y), `${pos.x},${pos.y} @${p.x},${p.y}`).toBe(true);
      }
      while (pos.y !== p.y) {
        pos.y += Math.sign(p.y - pos.y);
        expect(canStep(MAPS.hiroshima!, pos.x, pos.y), `${pos.x},${pos.y} @${p.x},${p.y}`).toBe(true);
      }
    }
  });

  it('長崎に着くと、オランダ人と人足が湊のほうへ歩いていき、仲間が町のことを話す', () => {
    const list = requests('nagasakiEnter', back);
    const town = MAPS.world!.towns!.find((t) => t.name === '長崎')!.to!;
    const actors = placed(list);
    expect(actors.map((a) => a.id)).toEqual(['nagasakiOranda', 'nagasakiNinsoku']);
    for (const a of actors) expect(near(a, town), a.id).toBe(true);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).toContain('オランダ人「');
    expect(pages).not.toContain('長崎。湊には');
  });

  it('第 6 章の終わりは、東の入口・全滅後の戻り先・熊本からの渡し船の湊のどこでも始まるので、決まった場所に人を出さず、仲間だけで話す', () => {
    const won = run('nanbanOzutsu', opened);
    const list = requests('nagasakiEnter', won);
    const town = MAPS.world!.towns!.find((t) => t.name === '長崎')!.to!;
    const back = respawnPoint('kenkyujo');
    expect(back.mapId).toBe('nagasaki');
    expect(placed(list)).toEqual([]);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).toContain('北前船');
    expect(pages).not.toContain('{hero}たちは');
    expect(pages).not.toContain('船頭「');
    // 熊本からの渡し船の着く湊（14, 22）は隣の空いたマスが 1 つだけなので、仲間は一人ずつ出る
    let out = 0;
    let most = 0;
    for (const q of list) {
      if (q.kind !== 'stage') continue;
      if (q.step.type === 'actor' && q.step.x === undefined) out++;
      if (q.step.type === 'vanish' && ['kasumi', 'gendo', 'orin'].includes(q.step.who)) out--;
      most = Math.max(most, out);
    }
    expect(most).toBe(1);
    // どこで始まっても、主人公の隣に空いたマス（通れて、町の人がいない）がある
    const nagasaki = MAPS.nagasaki!;
    const ferry = [...walk(EVENTS.kumamotoWatashi!.steps)].find((st) => st.type === 'warp' && st.mapId === 'nagasaki');
    expect(ferry).toBeDefined();
    for (const p of [town, back, ferry as { x: number; y: number }]) {
      const free = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => canStep(nagasaki, p.x + dx!, p.y + dy!) && !nagasaki.npcs.some((n) => n.x === p.x + dx! && n.y === p.y + dy!));
      expect(free.length, `${p.x},${p.y}`).toBeGreaterThan(0);
    }
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
    for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
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

  it('北前船の船出の場面は、長崎の船頭に乗せてもらったときだけ出る（甲板の屋形から出たときは出ない）', () => {
    const sailing = run('kitamaeNagasaki', ch6);
    expect(sailing.flags.kitamaeSetSail).toBe(true);
    const first = requests('kitamaeEnter', sailing);
    // 船頭が屋形の戸から出てきて話し、お凛が出て問い返す。船の進みを地の文で語らない
    expect(first.find((q) => q.kind === 'stage' && q.step.type === 'actor')).toMatchObject({ step: { id: 'kitamaeSendoE', sprite: 'npc_sendo', x: 9, y: 10 } });
    const firstPages = first.flatMap((q) => (q.kind === 'say' ? q.pages : []));
    expect(firstPages.every((p) => p.includes('「'))).toBe(true);
    expect(firstPages).toContain('お凛「出るって、何がだい」');
    expect(first.some((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'orin')).toBe(true);
    expect(first.some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kitamaeSendoE')).toBe(true);
    const boarded = run('kitamaeEnter', sailing);
    expect(boarded.flags.kitamaeBoarded).toBe(true);
    expect(boarded.flags.kitamaeSetSail).toBeFalsy();
    // 屋形から甲板へ出たとき（もう一度 onEnter が走る）は何も出さない
    expect(new EventRunner(EVENTS.kitamaeEnter!.steps).next(boarded).request.kind).toBe('done');
    // 負けて長崎から乗り直すと、短い船出の場面（船頭のひと言だけ）
    const again = requests('kitamaeEnter', run('kitamaeNagasaki', boarded)).flatMap((q) => (q.kind === 'say' ? q.pages : []));
    expect(again).toHaveLength(1);
    expect(again[0]).toMatch(/^船頭「/);
  });

  it('船首で船幽霊と海坊主（Lv22）に勝つと kanazawaArrived で金沢の湊へ。負けたら着かず、出直すと口上を短くする', () => {
    const boarded = run('kitamaeEnter', run('kitamaeNagasaki', ch6));
    expect(boarded.flags.kitamaeBoarded).toBe(true);
    const runner = new EventRunner(EVENTS.funayureiAttack!.steps);
    const r = skipSay(runner, runner.next(boarded));
    expect(r.request).toMatchObject({ kind: 'battle', enemies: ['funayurei', 'umibozu', 'funayurei'], level: 22, canEscape: false, loseOk: false });
    expect(warpOf('funayureiAttack', boarded)).toEqual({ mapId: 'kanazawa', x: 4, y: 22 });
    expect(run('funayureiAttack', boarded).flags.kanazawaArrived).toBe(true);
    const lost = run('funayureiAttack', boarded, 'defeat');
    expect(lost.flags.kanazawaArrived).toBeFalsy();
    const retry = requests('funayureiAttack', lost);
    const retryBefore = retry.slice(0, retry.findIndex((q) => q.kind === 'battle')).flatMap((q) => (q.kind === 'say' ? q.pages : []));
    expect(retryBefore).toHaveLength(2);
    expect(retryBefore.join('')).not.toContain('霞「');
  });

  it('船首では、船幽霊が両舷から這い上がり、海坊主が船首の先に出て、船頭が後ろから駆けつける。勝つと消え、玄道が経を唱える', () => {
    const boarded = run('kitamaeEnter', run('kitamaeNagasaki', ch6));
    const list = requests('funayureiAttack', boarded);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const shown = list.slice(0, battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' ? [q.step.id] : []));
    expect(shown).toEqual(expect.arrayContaining(['funayureiA', 'funayureiB', 'funayureiUmibozu', 'funayureiSendo']));
    const gone = list.slice(battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'vanish' ? [q.step.who] : []));
    expect(gone).toEqual(expect.arrayContaining(['funayureiA', 'funayureiB', 'funayureiUmibozu']));
    // 船頭が出てから船頭が話す
    const sendoOut = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'funayureiSendo');
    const sendoSays = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('船頭「')));
    expect(sendoSays).toBeGreaterThan(sendoOut);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).toContain('船幽霊「');
    expect(pages).toContain('玄道「……南無');
    expect(pages).not.toContain('玄道は、');
    expect(pages).not.toContain('幾日かののち');
  });

  const arrived = run('funayureiAttack', run('kitamaeEnter', run('kitamaeNagasaki', ch6)));

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
      const retry = requests(id, lost);
      const retryBefore = retry.slice(0, retry.findIndex((q) => q.kind === 'battle')).flatMap((q) => (q.kind === 'say' ? q.pages : []));
      expect(retryBefore, id).toHaveLength(1);
    }
  });

  it('金沢に着くと、湊の桟橋で仲間 3 人が出て話し、一行に戻る。町のようすを地の文で語らない', () => {
    const list = requests('kanazawaEnter', arrived);
    const out = list.flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' ? [q.step.id] : []));
    expect(out).toEqual(['kasumi', 'gendo', 'orin']);
    const back = list.flatMap((q) => (q.kind === 'stage' && q.step.type === 'vanish' ? [q.step.who] : []));
    expect(back).toEqual(expect.arrayContaining(['kasumi', 'gendo', 'orin']));
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : []));
    expect(pages.every((p) => p.includes('「'))).toBe(true);
    // 湊（4, 22）の隣の空いたマス（通れて、町の人がいない）は 3 つある
    const kanazawa = MAPS.kanazawa!;
    const free = [
      [3, 22],
      [5, 22],
      [4, 21],
      [4, 23],
    ].filter(([x, y]) => canStep(kanazawa, x!, y!) && !kanazawa.npcs.some((n) => n.x === x && n.y === y));
    expect(free.length).toBeGreaterThanOrEqual(3);
  });

  it('長瀬左近の話では、霞が出てきてから話し、話し終えると戻る', () => {
    const list = requests('sakonMeet', intro);
    const out = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kasumi');
    const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('霞「')));
    const gone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kasumi');
    expect(out).toBeGreaterThanOrEqual(0);
    expect(said).toBeGreaterThan(out);
    expect(gone).toBeGreaterThan(said);
  });

  it('徽軫灯籠では、忍びとからくり藩士が出てきて、勝つと消え、抜け穴の石もどく。石が動くのを地の文で語らない', () => {
    const list = requests('kotojiToro', heard);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const shown = list.slice(0, battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' ? [q.step.id] : []));
    expect(shown).toEqual(expect.arrayContaining(['toroShinobiA', 'toroShinobiB', 'toroHanshi']));
    const gone = list.slice(battle).flatMap((q) => (q.kind === 'stage' && q.step.type === 'vanish' ? [q.step.who] : []));
    expect(gone).toEqual(expect.arrayContaining(['toroShinobiA', 'toroShinobiB', 'toroHanshi', 'nukeIshiW', 'nukeIshiE']));
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).not.toContain('石を押すと');
    expect(pages).not.toContain('ずれていた');
    // 敵が出るマスは、灯籠を調べる主人公の立つマス（北・東・南）に重ならない
    const toro = MAPS.kenrokuen!.npcs.find((n) => n.id === 'kotojiToro')!;
    const heroSpots = [
      [toro.x, toro.y - 1],
      [toro.x + 1, toro.y],
      [toro.x, toro.y + 1],
      [toro.x - 1, toro.y],
    ].filter(([x, y]) => canStep(MAPS.kenrokuen!, x!, y!));
    // 出した位置から、歩いた道をたどった位置（イベントのデータから求める）
    const pos = new Map<string, [number, number]>();
    for (const q of list.slice(0, battle)) {
      if (q.kind !== 'stage') continue;
      if (q.step.type === 'actor' && q.step.id.startsWith('toro') && q.step.x !== undefined && q.step.y !== undefined) pos.set(q.step.id, [q.step.x, q.step.y]);
      if (q.step.type === 'walk' && pos.has(q.step.who) && q.step.path) {
        for (const c of q.step.path) {
          const [x, y] = pos.get(q.step.who)!;
          const [dx, dy] = STEP[c as keyof typeof STEP];
          pos.set(q.step.who, [x + dx, y + dy]);
          expect(heroSpots.some(([hx, hy]) => hx === x + dx && hy === y + dy), `${q.step.who} が (${x + dx},${y + dy}) を通る`).toBe(false);
        }
      }
    }
    expect([...pos.keys()].sort()).toEqual(['toroHanshi', 'toroShinobiA', 'toroShinobiB']);
    for (const [id, [x, y]] of pos) expect(heroSpots.some(([hx, hy]) => hx === x && hy === y), id).toBe(false);
  });

  // 見送り（P2）: 戦闘をはさむ演出（影武者の人形を消す・夜叉丸が進み出る）を、戦闘から戻ったときに置き直すことは
  // FieldScene の仕組み（runner.stage の置き直し）に任せ、ここでは確かめていない。FieldScene を動かすテストの仕組みができたら足す
  it('影武者は上座の人形が立ち上がって入口の前まで歩いてくる。勝つと玄道の祝詞で崩れて消える', () => {
    const list = requests('kagemusha', opened);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const before = list.slice(0, battle);
    const zaGone = before.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'kagemushaZa');
    const actorOut = before.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'guraKagemusha');
    expect(zaGone).toBeGreaterThanOrEqual(0);
    expect(actorOut).toBeGreaterThan(zaGone);
    expect(before.find((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'guraKagemusha')).toMatchObject({ step: { enemy: 'kagemusha', x: 9, y: 24 } });
    expect(list.slice(battle).some((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'guraKagemusha')).toBe(true);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    // 一人で戦うのに「者ども、出あえ」と呼ばない。祝詞を地の文で語らない
    expect(pages).not.toContain('出あえ');
    expect(pages).not.toContain('玄道が祝詞を唱えると');
    expect(pages).not.toContain('広間の上座に');
  });

  it('夜叉丸は座敷牢の前で 1 歩進み出て、勝つと玄道の祝詞のあとで崩れ落ちて消える。そのあと夜叉丸は話さない', () => {
    const list = requests('yashamaruBattle', opened);
    const battle = list.findIndex((q) => q.kind === 'battle');
    expect(list.slice(0, battle).some((q) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === 'yashamaruGura')).toBe(true);
    const gone = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'vanish' && q.step.who === 'yashamaruGura');
    expect(gone).toBeGreaterThan(battle);
    expect(list.slice(gone).some((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('夜叉丸「')))).toBe(false);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).not.toContain('夜叉丸は膝をついた');
    expect(pages).not.toContain('玄道は、蘭斎の祝詞を唱えた');
    expect(pages).not.toContain('静かに目を閉じた');
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

  it('第 7 章の終わりでは、手形をもらったあと江戸へ直に向かわず、北国街道を東へ陸路で仙台へ向かうよう促す', () => {
    const rescued = run('tonoRescue', run('yashamaruBattle', run('kagemusha', opened)));
    const pages = requests('kanazawaEnter', rescued).flatMap((r) => (r.kind === 'say' ? r.pages : []));
    const tegata = pages.findIndex((p) => p.includes('江戸城の手形を授かった'));
    expect(tegata).toBeGreaterThanOrEqual(0);
    const last = pages[pages.length - 1]!;
    expect(last).toContain('北国街道');
    expect(last).toContain('仙台');
    expect(pages.slice(tegata).some((p) => p.includes('陸路'))).toBe(true);
  });

  it('第 7 章の終わりは城の門の前で、殿様が橋に立ち、家臣と長瀬左近が東の通りから来て話す。大広間に呼ばれたと地の文で語らない', () => {
    const rescued = run('tonoRescue', run('yashamaruBattle', run('kagemusha', opened)));
    const list = requests('kanazawaEnter', rescued);
    const placed = list.flatMap((q) => (q.kind === 'stage' && q.step.type === 'actor' && q.step.x !== undefined ? [q.step.id] : []));
    expect(placed).toEqual(['kanazawaTono', 'kanazawaKashin', 'kanazawaSakon']);
    // 話す人は、話す前に出ている
    for (const [id, speaker] of [
      ['kanazawaTono', '殿様「'],
      ['kanazawaKashin', '家臣「'],
      ['kanazawaSakon', '長瀬左近「'],
    ] as const) {
      const out = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === id);
      const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith(speaker)));
      expect(said, id).toBeGreaterThan(out);
    }
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).not.toContain('大広間に、一行は呼ばれた');
    expect(pages).not.toContain('捕らえられた。');
    // 主人公 (28, 15) の隣は、左近が来るまでは東と南、来たあとは南だけが空くので、仲間は一人ずつ出る
    let out = 0;
    let most = 0;
    for (const q of list) {
      if (q.kind !== 'stage') continue;
      if (q.step.type === 'actor' && q.step.x === undefined) out++;
      if (q.step.type === 'vanish' && ['kasumi', 'gendo', 'orin'].includes(q.step.who)) out--;
      most = Math.max(most, out);
    }
    expect(most).toBe(1);
    expect(canStep(MAPS.kanazawa!, 28, 16)).toBe(true);
  });

  it('座敷牢の殿様の場面では、霞が出てきて話し、錠を断ち切るのは主人公の台詞と音で見せる', () => {
    const won = run('yashamaruBattle', run('kagemusha', opened));
    const list = requests('tonoRescue', won);
    expect(list.some((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kasumi')).toBe(true);
    const pages = list.flatMap((q) => (q.kind === 'say' ? q.pages : [])).join('');
    expect(pages).not.toContain('{hero}は格子の錠を断ち切った');
    expect(pages).toContain('ガキン！');
  });
});

/** 第 7 章を終えて仙台に着いたところ（第 8 章のテストの始まり）。 */
const CH7_CLEARED: GameState = {
  ...newGame('m', { mapId: 'sendai', x: 50, y: 18 }),
  party: [createMember('hero', 25), createMember('gendo', 25), createMember('orin', 25), createMember('kasumi', 25)],
  flags: { intro: true, chapter6Cleared: true, kanazawaArrived: true, tonoRescued: true, kagaTegata: true, chapter7Cleared: true },
};

describe('第 8 章の流れ', () => {
  const ch7 = CH7_CLEARED;
  const warpOf = (id: string, state: GameState): { mapId: string; x: number; y: number } | undefined => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    let r = runner.next(state);
    let last: { mapId: string; x: number; y: number } | undefined;
    for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
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
  /** 話しかけて、最初のページの数（2 回目以降は短い。人が出てくる演出は飛ばす）。 */
  const pagesOf = (id: string, state: GameState) => {
    const runner = new EventRunner(EVENTS[id]!.steps);
    const r = skipStage(runner, runner.next(state));
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
    // 小吉の知らせのあと、大家・源兵衛の家にお鈴が現れる（大家「お鈴ちゃんの面倒は、うちで見るよ」）
    const osuzu = MAPS.edoGenbeiIe!.npcs.find((n) => n.id === 'osuzu')!;
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
    // docs/balance.md の「ボス」の表の倍率（勝率は「作り直したボスで確かめた結果」）
    expect(boss.factors).toEqual({ hp: 32, atk: 2.1, def: 1.2, spd: 1.1 });
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
  const battles = (id: string, state: GameState, outcome: 'victory' | 'defeat' = 'victory') =>
    requests(id, state, outcome).filter((r) => r.kind === 'battle');
  /** 戦闘までの台詞のページ数（出直すと短い。演出の手順は数えない）。 */
  const firstPages = (id: string, state: GameState) => {
    const list = requests(id, state);
    const end = list.findIndex((r) => r.kind === 'battle');
    return list.slice(0, end < 0 ? list.length : end).reduce((n, r) => n + (r.kind === 'say' ? r.pages.length : 0), 0);
  };

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

  it('松の廊下に入ると（matsuEntered）、休息の間の火消しの若い衆が話しかけるたびに全回復する。兵庫はまだいない', () => {
    const entered = run('matsuEnter', ch8);
    expect(entered.flags.matsuEntered).toBe(true);
    expect(MAPS.matsuNoRoka!.onEnter).toEqual({ event: 'matsuEnter', unless: 'matsuEntered' });
    const hikeshi = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'hikeshiRoka')!;
    expect(npcVisible(hikeshi, ch8.flags)).toBe(true);
    expect(healed(run('hikeshiRoka', hurt(entered)))).toBe(true);
    // 若い衆は休息の間から主人公の前まで下りてきてから話し、元の場所へ戻る
    const list = requests('matsuEnter', ch8);
    const exit = MAPS.edojo!.exits.find((e) => e.to === 'matsuNoRoka')!;
    const hero = { x: exit.toX, y: exit.toY };
    const there = walkEnd(list, 'hikeshiRoka', hikeshi, 'matsuNoRoka', hero);
    expect(Math.abs(there.x - hero.x) + Math.abs(there.y - hero.y)).toBe(1);
    expect(walkEnd(list, 'hikeshiRoka', there, 'matsuNoRoka', hero, 1)).toEqual({ x: hikeshi.x, y: hikeshi.y });
    const firstWalk = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === 'hikeshiRoka');
    const firstWords = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('若い衆「')));
    expect(firstWords).toBeGreaterThan(firstWalk);
    const hyogo = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'hyogoRoka')!;
    expect(npcVisible(hyogo, entered.flags)).toBe(false);
    // 金太は飛脚の代わりに記録を預かる
    expect(MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'kintaRoka')?.action).toBe('hikyaku');
    expect(MAPS.edojo!.npcs.find((n) => n.id === 'kokichiJo')?.action).toBe('hikyaku');
  });

  it('将軍の間の手前で手下（Lv28、4 体）に勝つと兵庫が現れて引き受け（hyogoReturned）、以後は話しかけるたびに全回復する。負けたら立たず、出直すと口上を短くする', () => {
    const entered = run('tenzen', run('matsuEnter', ch8));
    const b = battles('hyogoReturn', entered)[0];
    expect(b).toMatchObject({ kind: 'battle', level: 28, canEscape: false, loseOk: false });
    expect(b?.kind === 'battle' && b.enemies.length).toBe(4);
    const won = run('hyogoReturn', entered);
    expect(won.flags.hyogoReturned).toBe(true);
    // 兵庫は一行には加わらない
    expect(won.party.map((m) => m.id)).not.toContain('hyogo');
    const hyogo = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'hyogoRoka')!;
    expect(npcVisible(hyogo, won.flags)).toBe(true);
    expect(healed(run('hyogoRoka', hurt(won)))).toBe(true);
    const lost = run('hyogoReturn', entered, 'defeat');
    expect(lost.flags.hyogoReturned).toBeFalsy();
    expect(lost.flags.hyogoReturnMet).toBe(true);
    expect(firstPages('hyogoReturn', lost)).toBeLessThan(firstPages('hyogoReturn', entered));
  });

  it('兵庫は勝ったあとに後ろから現れ、生きていたわけを話し、マップの兵庫の場所まで歩いて残る', () => {
    const entered = run('tenzen', run('matsuEnter', ch8));
    const list = requests('hyogoReturn', entered);
    const battle = list.findIndex((q) => q.kind === 'battle');
    const appear = list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'hyogo');
    expect(appear).toBeGreaterThan(battle);
    const pages = pagesIn(list).join('');
    expect(pages).toContain('生きて');
    expect(pages).toContain('網打ちの舟');
    const npc = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'hyogoRoka')!;
    const start = list[appear]!;
    const from = start.kind === 'stage' && start.step.type === 'actor' ? { x: start.step.x!, y: start.step.y! } : { x: 0, y: 0 };
    // 後ろの廊下から主人公（24, 11）の脇まで来て話し、主人公の南の側を通って北の口の手下の前へ進む
    const hero = { x: 24, y: 11 };
    const near = walkEnd(list, 'hyogo', from, 'matsuNoRoka', hero);
    // 北の口から下りてきた手下の隣で斬り払ってから、廊下の南の側へ下がる
    const slash = walkEnd(list, 'hyogo', near, 'matsuNoRoka', hero, 1);
    const kinju = stages(list).filter((st) => st.type === 'actor' && st.id.startsWith('matsuKinju'));
    expect(kinju).toHaveLength(2);
    for (const k of kinju) {
      if (k.type !== 'actor') continue;
      const at = walkEnd(list, k.id, { x: k.x!, y: k.y! }, 'matsuNoRoka', hero);
      expect(Math.abs(at.x - slash.x) + Math.abs(at.y - slash.y), k.id).toBe(1);
    }
    expect(walkEnd(list, 'hyogo', slash, 'matsuNoRoka', hero, 2)).toEqual({ x: npc.x, y: npc.y });
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

  it('将軍の間では、主人公が間の中まで進み、上座の上様（影武者）と鷲尾の二人が画面に入る。鷲尾は前へ出て話し、負けると上様の脇へ上がる', () => {
    const map = MAPS.matsuNoRoka!;
    const list = requests('shogunNoMa', ch8);
    const first = stages(list)[0];
    expect(first).toEqual({ type: 'walk', who: 'hero', to: { x: 18, y: 6 } });
    const hero = { x: 18, y: 6 };
    const washio = map.npcs.find((n) => n.id === 'washioZa')!;
    const shogun = map.npcs.find((n) => n.id === 'kagemushaShogun')!;
    // 前へ出た鷲尾は主人公の前に立ち、負けると上様の隣へ上がる
    const front = walkEnd(list, 'washioZa', washio, 'matsuNoRoka', hero);
    expect(front).toEqual({ x: hero.x, y: hero.y - 2 });
    const side = walkEnd(list, 'washioZa', front, 'matsuNoRoka', hero, 1);
    expect(Math.abs(side.x - shogun.x) + Math.abs(side.y - shogun.y)).toBe(1);
    // 主人公の位置でのカメラ（FieldScene と同じ計算）に、二人の頭（1 マス上）から足元までと、鷲尾の歩く道が入る（下の台詞の窓 66 px にもかからない）
    const scrollX = cameraScroll(hero.x * 16 + 8, Math.max(...map.rows.map((r) => r.length)) * 16, GAME_WIDTH);
    const scrollY = cameraScroll(hero.y * 16 + 8, map.rows.length * 16, GAME_HEIGHT);
    for (const p of [washio, shogun, front, side]) {
      expect(p.x * 16 >= scrollX && (p.x + 1) * 16 <= scrollX + GAME_WIDTH, `${p.x},${p.y}`).toBe(true);
      expect((p.y - 1) * 16 >= scrollY && (p.y + 1) * 16 <= scrollY + GAME_HEIGHT - 66, `${p.x},${p.y}`).toBe(true);
    }
    // 出直したときも、主人公は間の中まで進み、鷲尾が前へ出る
    const again = requests('shogunNoMa', { ...ch8, flags: { ...ch8.flags, washioMet: true } });
    expect(stages(again)[0]).toEqual(first);
    expect(walkEnd(again, 'washioZa', washio, 'matsuNoRoka', hero)).toEqual(front);
    // 将軍の間の地の文で、二人の居場所を語らない（画面で見せる）
    expect(pagesIn(list).some((p) => p.includes('上座に、上様が端然と'))).toBe(false);
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
    expect(ENEMIES.onizukaTenzen).toMatchObject({ rewardScale: 4, factors: { hp: 32, atk: 2.0, def: 1.2, spd: 1.2 } });
    expect(ENEMIES.washio).toMatchObject({ rewardScale: 6, factors: { hp: 45, atk: 2.0, def: 1.2, spd: 1.0 } });
    expect(ENEMIES.karakuriDaigongen).toMatchObject({ rewardScale: 6, actionsPerTurn: 2, weak: ['mech', 'holy'], factors: { hp: 22, atk: 1.2, def: 1.3, spd: 1.1 } });
    // docs/balance.md の「終章で見積もりから変えたこと」の技の数値
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
    const onMountain = MAPS.aizuIimoriyama!.npcs.find((n) => n.id === 'heita')!;
    const atHome = MAPS.aizu!.npcs.find((n) => n.id === 'heitaHome')!;
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

  it('葛籠の中身は、飯盛山が朝鮮人参・加賀棒茶・道しるべの札、町が身不知柿', () => {
    expect(run('aizuChest1', heard).items.ninjin).toBe((heard.items.ninjin ?? 0) + 1);
    expect(run('aizuChest3', heard).items.bocha).toBe((heard.items.bocha ?? 0) + 1);
    expect(run('aizuChest4', heard).items.michishirube).toBe((heard.items.michishirube ?? 0) + 1);
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
    for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
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
        for (const name of ['霞', '玄道', 'お凛', '榊兵庫']) expect(speakerOf(line), `${id}: ${line}`).not.toBe(name);
      }
    }
  });

  it('葛籠の中身は、松林が金創膏・気付け薬・道しるべの札、町がうなぎの蒲焼', () => {
    expect(run('hamamatsuChest1', arrived).items.kintsuba).toBe((arrived.items.kintsuba ?? 0) + 1);
    expect(run('hamamatsuChest3', arrived).items.kitsukegusuri).toBe((arrived.items.kitsukegusuri ?? 0) + 1);
    expect(run('hamamatsuChest4', arrived).items.michishirube).toBe((arrived.items.michishirube ?? 0) + 1);
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
        for (const name of ['霞', '玄道', 'お凛', '榊兵庫']) expect(speakerOf(line), `${id}: ${line}`).not.toBe(name);
      }
    }
  });

  it('葛籠の中身は、佐和山が万金丹・金創膏・道しるべの札、町が糸切餅', () => {
    expect(run('hikoneChest1', arrived).items.mankintan).toBe((arrived.items.mankintan ?? 0) + 1);
    expect(run('hikoneChest3', arrived).items.kintsuba).toBe((arrived.items.kintsuba ?? 0) + 1);
    expect(run('hikoneChest4', arrived).items.michishirube).toBe((arrived.items.michishirube ?? 0) + 1);
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
    for (let guard = 0; guard < 400 && r.request.kind !== 'done'; guard++) {
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

describe('第 8 章・寄り道の町の演出（地の文を人の動きと台詞に）', () => {
  const ch7 = CH7_CLEARED;
  /** 調べた物の説明として残す地の文（熊本の井戸・古井戸・水脈のからくり）。 */
  const DESCRIPTIONS = new Set([
    '井戸の底に、わずかな水が濁って溜まっている。',
    '古井戸の底から、水の流れる音が聞こえてくる。',
    '石を組んだ古い井戸だ。内側の壁に石段が切ってあり、暗い底へ続いている。……ごうん、ごうんと、鉄の鳴る音がする。',
    '石を組んだ古い井戸だ。内側の壁に石段が切ってあり、暗い底へ続いている。……底の方から、かすかに鉄の鳴る音がする。',
    '地の下を流れる水脈に、鉄の筒が何本も突き立てられている。歯車が回るたびに、水が吸い上げられ、岩の割れ目へ捨てられていく。',
  ]);
  /** 地の文として残してよいもの: 画面で見せられない音（かなと記号だけ）、受け取った知らせ、調べた物の説明。 */
  const allowedNarration = (p: string) => /^[ぁ-んァ-ヶー、。…！]+$/u.test(p) || /^\S+から \d+ 文を受け取った。$|^\d+ 文を受け取った。$|^[^、。]+を受け取った。$/u.test(p) || DESCRIPTIONS.has(p);
  /** 第 8 章と寄り道の町のマップ（町なか・建物の中・ダンジョン）。終章（江戸城の大手門の門番）と、どの町にもある博徒・親分の頼みは除く。 */
  const mapIds = Object.keys(MAPS).filter((m) => /^(sendai|hamamatsu|hikone|kumamoto|kiyomasaIdo|aizu|edo(?!jo))/.test(m));
  const ids = [
    ...new Set(
      mapIds.flatMap((m) => {
        const map = MAPS[m]!;
        return [map.onEnter?.event, ...(map.triggers ?? []).map((t) => t.event), ...map.npcs.map((n) => n.event)].filter(
          (e): e is string => e !== undefined && e !== 'otemon' && !/^(bakuto_|oyabun|jingi)|Chest\d*$/.test(e),
        );
      }),
    ),
  ];

  it('第 8 章と寄り道の町のイベントには、人の動きや居場所を語る地の文が残っていない', () => {
    expect(ids).toEqual(expect.arrayContaining(['sendaiEnter', 'tatewaki', 'edoEnter', 'kokichi', 'oharu', 'taikaEnter', 'kashaKarakuri', 'hamamatsuTako', 'hikoneGusoku', 'kumamotoKarakuri', 'heita']));
    const lines = (steps: readonly EventStep[]): string[] =>
      steps.flatMap((st) => {
        if (st.type === 'say') return [...st.lines, ...(st.linesF ?? [])];
        if (st.type === 'if') return [...lines(st.then), ...lines(st.else ?? [])];
        if (st.type === 'choice') return st.options.flatMap((o) => lines(o.steps));
        if (st.type === 'giveItem') return lines(st.ifFull ?? []);
        if (st.type === 'battle') return lines(st.ifLose ?? []);
        return [];
      });
    for (const id of ids) {
      for (const line of lines(EVENTS[id]!.steps)) {
        // 台詞は「話者「……」」の形だけにし、台詞の前後に地の文を続けない（「門番が笑って「……」」のように、話者の後ろに助詞や動きを書かない）
        if (line.includes('「')) {
          expect(line, id).toMatch(/^[^「」、。\s]+「.*」$/u);
          const speaker = line.slice(0, line.indexOf('「')).replace(/〈.〉$/u, '');
          expect(speaker, `${id}: ${line}`).not.toMatch(/[がはをにてでと]$/u);
        } else expect(allowedNarration(line), `${id}: ${line}`).toBe(true);
      }
    }
  });

  it('仙台に着くと、霞と玄道が出て話し、一行に戻る', () => {
    const list = requests('sendaiEnter', ch7);
    expect(actors(list)).toEqual(['kasumi', 'gendo']);
    expect(vanished(list)).toEqual(['gendo', 'kasumi']);
  });

  const heard = run('tatewaki', run('sendaiEnter', ch7));

  it('片平帯刀の屋敷では、霞が出て話し、刺客が庭から座敷へ踏み込んでくる。勝つと忍びは煙で、からくり同心は崩れて消える', () => {
    const list = requests('tatewaki', run('sendaiEnter', ch7));
    const b = battleAt(list);
    expect(actors(list.slice(0, b))).toEqual(['kasumi', 'tatewakiShinobiA', 'tatewakiDoshin', 'tatewakiShinobiB']);
    expect(vanished(list.slice(b))).toEqual(['tatewakiShinobiA', 'tatewakiShinobiB', 'tatewakiDoshin']);
    // 霞は刺客が出てくる前に戻る（座敷の主人公の隣が刺客の道と重ならないように）
    expect(vanished(list.slice(0, b))).toEqual(['kasumi']);
  });

  const arrived = run('edoEnter', heard);

  it('江戸に着くと、町人とおかみが高札のお触れを読み上げて去り、仲間が一人ずつ出て話す', () => {
    const list = requests('edoEnter', heard);
    expect(actors(list).slice(0, 2)).toEqual(['edoKosatsuChonin', 'edoKosatsuOkami']);
    expect(vanished(list)).toEqual(expect.arrayContaining(['edoKosatsuChonin', 'edoKosatsuOkami']));
    expect(pagesIn(list).some((p) => p.startsWith('町人「') && p.includes('高札'))).toBe(true);
    expect(maxPartyOut(list)).toBe(1);
  });

  const hidden = run('nagayaOoya', arrived);

  it('小吉に初めて会うと、からくり同心と旗本奴が路地の東から駆けてきて、勝つと同心は崩れ、旗本奴は東へ逃げる', () => {
    const list = requests('kokichi', hidden);
    const b = battleAt(list);
    expect(actors(list.slice(0, b))).toEqual(['kokichiDoshinA', 'kokichiYakko', 'kokichiDoshinB']);
    expect(vanished(list.slice(b)).slice(0, 3)).toEqual(['kokichiDoshinA', 'kokichiDoshinB', 'kokichiYakko']);
    expect(pagesIn(list).join('')).not.toContain('転がり込んで');
  });

  const met = run('kokichi', hidden);
  const report = run('kokichi', run('hikeshiGashira', met));

  it('火消しの頭の話では、霞が出てきて話す。小吉の知らせでは、お鈴を負ぶっていることを小吉が話し、玄道が出て寝顔を見る', () => {
    const gashira = requests('hikeshiGashira', met);
    expect(actors(gashira)).toEqual(['kasumi']);
    const list = requests('kokichi', run('hikeshiGashira', met));
    expect(actors(list)[0]).toBe('gendo');
    const pages = pagesIn(list).join('');
    expect(pages).not.toContain('負ぶっている');
    expect(pages).toContain('背中で');
    expect(maxPartyOut(list)).toBe(1);
  });

  it('お春の場面では、火付け盗賊とからくり同心が東の通りから駆けてきて、勝つと消える。半鐘のあと火消しの頭が西の通りから駆けつけて帰る', () => {
    const list = requests('oharu', report);
    const b = battleAt(list);
    expect(actors(list.slice(0, b))).toEqual(expect.arrayContaining(['oharuTozokuA', 'oharuDoshin', 'oharuTozokuB']));
    expect(vanished(list.slice(b))).toEqual(expect.arrayContaining(['oharuTozokuA', 'oharuDoshin', 'oharuTozokuB', 'oharuGashira']));
    expect(actors(list.slice(b))).toContain('oharuGashira');
    expect(pagesIn(list).join('')).not.toContain('こぼれ落ちた');
    // 店先の上の空の娘も、地の文ではなく娘の台詞で見せる
    expect(pagesIn(requests('oharu', met)).every((p) => p.startsWith('八百屋の娘「'))).toBe(true);
  });

  it('持ち物がいっぱいで手拭いを受け取れなくても、火消しの頭は西の通りへ帰って消える', () => {
    const full = { ...report, items: { ...report.items, hikeshiTenugui: 99 } };
    const list = requests('oharu', full);
    expect(pagesIn(list).some((p) => p.includes('手拭いも持てねえ'))).toBe(true);
    expect(vanished(list.slice(battleAt(list)))).toContain('oharuGashira');
  });

  const fire = run('oharu', report);
  const entered = run('taikaEnter', fire);

  it('大火の町に入ると、主人公が 1 歩進み、隣の火消しが声をかけ、霞が南に出る', () => {
    const taika = MAPS.edoTaika!;
    // 大火の町に入る道は、江戸の町木戸からの 1 つだけ
    const entries = Object.values(MAPS).flatMap((m) => m.exits.filter((e) => e.to === 'edoTaika'));
    expect(entries).toHaveLength(1);
    const list = requests('taikaEnter', fire);
    expect(list[0]).toMatchObject({ kind: 'stage', step: { type: 'walk', who: 'hero', path: 'r' } });
    const hero = { x: entries[0]!.toX + 1, y: entries[0]!.toY };
    expect(canStep(taika, hero.x, hero.y)).toBe(true);
    // 1 歩進んだ先の北は壁、南は空いていて、霞はそこに出る。火消しはその隣
    expect(canStep(taika, hero.x, hero.y - 1)).toBe(false);
    expect(canStep(taika, hero.x, hero.y + 1)).toBe(true);
    const hikeshi = taika.npcs.find((n) => n.id === 'taikaHikeshi1')!;
    expect(Math.abs(hikeshi.x - hero.x) + Math.abs(hikeshi.y - (hero.y + 1))).toBe(1);
    expect(actors(list)).toEqual(['kasumi']);
  });

  it('火車からくりは広場の奥から出てきて、勝つと崩れて消え、火消しの頭が西の通りから駆けつける。夜明けまでを地の文で語らない', () => {
    const list = requests('kashaKarakuri', entered);
    const b = battleAt(list);
    expect(actors(list.slice(0, b))[0]).toBe('kasha');
    expect(vanished(list.slice(b))[0]).toBe('kasha');
    expect(actors(list.slice(b))).toContain('kashaGashira');
    expect(pagesIn(list).join('')).not.toContain('明け方');
    // 主人公の隣で空くのは西と東だけなので、仲間は一人ずつ出る
    expect(maxPartyOut(list)).toBe(1);
    const t = MAPS.edoTaika!.triggers!.find((x) => x.event === 'kashaKarakuri')!;
    expect([canStep(MAPS.edoTaika!, t.x, t.y - 1), canStep(MAPS.edoTaika!, t.x, t.y + 1)]).toEqual([false, false]);
  });

  it('第 8 章の終わりは長屋の路地で、大家が西の家の前から主人公の西まで歩いてくる（主人公のマスを通らない）。仲間は一人ずつ出る', () => {
    const won = run('kashaKarakuri', entered);
    const list = requests('edoEnter', won);
    const edo = MAPS.edo!;
    // 第 8 章の終わりは、火車からくりを倒して長屋の路地へ warp したところで始まる
    const warp = requests('kashaKarakuri', entered).find((q) => q.kind === 'warp');
    expect(warp).toMatchObject({ kind: 'warp', mapId: 'edo' });
    const hero = warp?.kind === 'warp' ? { x: warp.x, y: warp.y } : { x: NaN, y: NaN };
    const ooya = edo.npcs.find((n) => n.id === 'nagayaOoya')!;
    // 大家は主人公の西隣で止まる
    expect(walkEnd(list, 'nagayaOoya', ooya, 'edo', hero)).toEqual({ x: hero.x - 1, y: hero.y });
    expect(pagesIn(list).join('')).not.toContain('長屋に戻ると');
    expect(maxPartyOut(list)).toBe(1);
  });

  it('寄り道の町に着くと、町の人が入口へ歩いてきて町のことを話し、去っていく（浜松・彦根は仲間を出さない）', () => {
    const hamamatsu = { ...newGame('m', { mapId: 'hamamatsu', x: 50, y: 12 }), party: [createMember('hero', 7), createMember('kasumi', 7)], flags: { intro: true, chapter1Cleared: true, oigawaOpen: true } };
    const ham = requests('hamamatsuEnter', hamamatsu);
    expect(actors(ham)).toEqual(['hamamatsuChonin']);
    expect(vanished(ham)).toEqual(['hamamatsuChonin']);
    const hikone = { ...hamamatsu, flags: { ...hamamatsu.flags, chapter2Cleared: true } };
    const hik = requests('hikoneEnter', hikone);
    expect(actors(hik)).toEqual(['hikoneSamurai', 'hikoneChonin']);
    expect(vanished(hik)).toEqual(['hikoneSamurai', 'hikoneChonin']);
    const aizu = requests('aizuEnter', heard);
    expect(actors(aizu)).toEqual(['aizuChonin', 'kasumi']);
    // 入口の西隣は空いていて、町の人はそこで止まる
    for (const [map, x, y] of [['hamamatsu', 49, 12], ['hikone', 49, 12], ['aizu', 49, 13]] as const) expect(canStep(MAPS[map]!, x, y), map).toBe(true);
  });

  it('熊本に着くと、渡し船の船頭が見送り、空の桶のおかみが通りかかり、仲間が出て話す', () => {
    const kumamoto = { ...newGame('m', { mapId: 'kumamoto', x: 5, y: 32 }), party: CH7_CLEARED.party, flags: { intro: true, chapter5Cleared: true, kasumiRejoined: true, shimabaraOpen: true } };
    const list = requests('kumamotoEnter', kumamoto);
    expect(pagesIn(list)[0]).toMatch(/^船頭「/);
    expect(actors(list)).toEqual(['gendo', 'kawashiriOkami', 'orin', 'kasumi']);
    expect(MAPS.kumamoto!.npcs.find((n) => n.id === 'watashiSendo')).toMatchObject({ x: 3, y: 32 });
    // 水脈のからくりを止めるのは、仲間が一人ずつ出て見せる
    const karakuri = requests('kumamotoKarakuri', run('kumamotoMosaku', kumamoto));
    const b = battleAt(karakuri);
    expect(actors(karakuri.slice(0, b))).toEqual(expect.arrayContaining(['mizuGeho', 'mizuHeiA', 'mizuHeiB', 'mizuHeiC']));
    expect(vanished(karakuri.slice(b))).toEqual(expect.arrayContaining(['mizuGeho', 'mizuHeiA', 'mizuHeiB', 'mizuHeiC']));
    expect(actors(karakuri.slice(b))).toEqual(['kasumi', 'orin', 'gendo', 'kasumi']);
    expect(maxPartyOut(karakuri)).toBe(1);
  });

  it('佐和山では、勝つと主人公が南東へ下がり、盗人は南の細い道を下りていく（主人公の立つマスを通らない）', () => {
    const hikone = { ...newGame('m', { mapId: 'hikone', x: 50, y: 12 }), party: [createMember('hero', 10)], flags: { intro: true, chapter2Cleared: true, hikoneIntro: true, hikoneGusokuAsked: true } };
    const list = requests('hikoneGusoku', hikone);
    const isWalk = (q: Req, who: string) => q.kind === 'stage' && q.step.type === 'walk' && q.step.who === who;
    const heroAt = list.findIndex((q) => isWalk(q, 'hero'));
    const nusubitoAt = list.findIndex((q) => isWalk(q, 'gusokuNusubito'));
    // 主人公が下がってから、盗人が歩き出す
    expect(heroAt).toBeGreaterThan(battleAt(list));
    expect(nusubitoAt).toBeGreaterThan(heroAt);
    const heroStep = list[heroAt]!;
    const to = heroStep.kind === 'stage' && heroStep.step.type === 'walk' && typeof heroStep.step.to === 'object' ? heroStep.step.to : undefined;
    expect(to).toBeDefined();
    const map = MAPS.hikoneSawayama!;
    const nusubito = map.npcs.find((n) => n.id === 'gusokuNusubito')!;
    // 盗人の隣で主人公が立てる（通れて、話しかけたときに人や物がいない）マスのどこからでも、横、縦の順にまっすぐ下がれる
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
    const spots = Object.values(d)
      .map(([dx, dy]) => ({ x: nusubito.x + dx, y: nusubito.y + dy }))
      .filter((p) => canStep(map, p.x, p.y) && !map.npcs.some((n) => n.x === p.x && n.y === p.y && npcVisible(n, hikone.flags)));
    expect(spots.length).toBeGreaterThan(0);
    for (const spot of spots) {
      const p = { ...spot };
      for (const dir of pathTo(p, to!)) {
        p.x += d[dir][0];
        p.y += d[dir][1];
        expect(canStep(map, p.x, p.y) && !(p.x === nusubito.x && p.y === nusubito.y), `(${spot.x},${spot.y}) から下がる道 (${p.x},${p.y})`).toBe(true);
      }
    }
    // 盗人の逃げる道は、下がった主人公のマスを通らない
    const walkStep = list[nusubitoAt]!;
    const path = walkStep.kind === 'stage' && walkStep.step.type === 'walk' ? (walkStep.step.path ?? '') : '';
    const np = { x: nusubito.x, y: nusubito.y };
    for (const c of pathFacings(path)) {
      np.x += d[c][0];
      np.y += d[c][1];
      expect(canStep(map, np.x, np.y), `(${np.x},${np.y})`).toBe(true);
      expect(np.x === to!.x && np.y === to!.y, '盗人が主人公のマスを通る').toBe(false);
    }
  });

  it('浜松で糸巻きを受け取り直すときに持ち物がまだいっぱいなら、その場にいる源太が話す（弥平は合戦の場面にしかいない）。熊本の茂作には、主人公が水脈のからくりのことを話す', () => {
    const flown = { ...newGame('m', { mapId: 'hamamatsu', x: 50, y: 12 }), party: [createMember('hero', 7)], items: { takoItomaki: 99 }, flags: { intro: true, hamamatsuIntro: true, hamamatsuTakoAsked: true, hamamatsuTakoFound: true, hamamatsuTakoFlown: true } };
    const pages = pagesIn(requests('hamamatsuGenta', flown));
    expect(pages.every((p) => p.startsWith('源太「'))).toBe(true);
    // 合戦の場面で持ち物がいっぱいなら、その場にいる弥平が話し、合戦は済んだことにする
    const gassen = { ...flown, flags: { ...flown.flags, hamamatsuTakoFlown: false } };
    const fullGassen = requests('hamamatsuGenta', gassen);
    expect(actors(fullGassen)).toContain('yahei');
    expect(pagesIn(fullGassen).some((p) => p.startsWith('弥平「……おや、荷物がいっぱい'))).toBe(true);
    const after = run('hamamatsuGenta', gassen);
    expect(after.flags.hamamatsuTakoFlown).toBe(true);
    expect(after.flags.hamamatsuTakoDone).toBeFalsy();
    expect(after.items.takoItomaki).toBe(99);
    expect(pagesIn(fullGassen)).not.toContain('凧の糸巻きを受け取った。');
    const found = { ...CH7_CLEARED, flags: { ...CH7_CLEARED.flags, shimabaraOpen: true, kumamotoIntro: true, kumamotoIdoAsked: true, kumamotoIdoFound: true } };
    const ret = pagesIn(requests('kumamotoMosaku', found));
    const told = ret.findIndex((p) => p.includes('「古井戸の底の水脈に、からくりが'));
    expect(told).toBeGreaterThan(0);
    expect(told).toBeLessThan(ret.findIndex((p) => p.startsWith('茂作「水脈の水を')));
  });

  it('彦根の工房で具足を届けると、大庭が戸口から入ってきて、持ち物がいっぱいでも話し終えて帰っていく', () => {
    const hikone = { ...newGame('m', { mapId: 'hikone', x: 50, y: 12 }), party: [createMember('hero', 10)], flags: { intro: true, chapter2Cleared: true, hikoneIntro: true, hikoneGusokuAsked: true, hikoneGusokuFound: true } };
    for (const state of [hikone, { ...hikone, items: { ...hikone.items, akazonaeKote: 99 } }]) {
      const list = requests('hikoneJinbei', state);
      expect(actors(list)).toEqual(['oba']);
      expect(vanished(list)).toEqual(['oba']);
      const said = list.findIndex((q) => q.kind === 'say' && q.pages.some((p) => p.startsWith('大庭「')));
      expect(said).toBeGreaterThan(list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor'));
    }
  });

  it('飯盛山では、送り狼と雪女が山道の南から出てきて、勝つと消える。平太は主人公のところへ歩いて一行と山を下りる', () => {
    const aizu = { ...heard, flags: { ...heard.flags, aizuIntro: true, aizuJuuAsked: true } };
    const list = requests('heita', aizu);
    const b = battleAt(list);
    expect(actors(list.slice(0, b))).toEqual(expect.arrayContaining(['iimoriOkamiA', 'iimoriOkamiB', 'iimoriOkamiC', 'iimoriYukiOnna']));
    expect(vanished(list.slice(b))).toEqual(expect.arrayContaining(['iimoriOkamiA', 'iimoriOkamiB', 'iimoriOkamiC', 'iimoriYukiOnna', 'heita']));
    expect(pagesIn(list).join('')).not.toContain('一行と山を下りた');
    // 什の掟を唱える場面は、少年たちのいる日新館の庭で見せる（町に入ったときには出さない）
    expect(pagesIn(requests('aizuEnter', heard)).join('')).not.toContain('ならぬことはならぬ');
    expect(pagesIn(requests('aizuJuu', { ...heard, flags: { ...heard.flags, aizuIntro: true } }))[0]).toMatch(/^少年たち「一つ/);
  });
});

describe('終章の演出（地の文を人の動きと台詞に）', () => {
  const base = newGame('m', { mapId: 'edo', x: 32, y: 9 });
  const ch8: GameState = {
    ...base,
    party: [createMember('hero', 29), createMember('gendo', 29), createMember('orin', 29), createMember('kasumi', 29)],
    flags: { intro: true, kagaTegata: true, chapter7Cleared: true, edoIntro: true, kashaDefeated: true, chapter8Cleared: true },
  };
  const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  const triggerOf = (mapId: string, event: string) => MAPS[mapId]!.triggers!.find((t) => t.event === event)!;

  /**
   * 終章のイベント（大手門の門番と、本丸御殿・松の廊下）。将軍の間（ラスボスの間・エンディングのタスク）は、そちらのタスクで作り直すので除く。
   */
  const LATER = new Set(['shogunNoMa']);
  const ids = [
    'otemon',
    ...new Set(
      ['edojo', 'matsuNoRoka'].flatMap((m) => {
        const map = MAPS[m]!;
        return [map.onEnter?.event, ...(map.triggers ?? []).map((t) => t.event), ...map.npcs.map((n) => n.event)].filter(
          (e): e is string => e !== undefined && !LATER.has(e) && !/Chest\d*$/.test(e),
        );
      }),
    ),
  ];
  /** 地の文として残してよいもの: 画面で見せられない音や声（かなと記号だけ）。 */
  const allowedNarration = (p: string) => /^[ぁ-んァ-ヶー、。…！]+$/u.test(p);

  it('終章のイベントには、人の動きや居場所を語る地の文が残っていない', () => {
    expect(ids).toEqual(['otemon', 'edojoEnter', 'jouguchi', 'okanegura', 'ookuBakeneko', 'matsuEnter', 'tenzen', 'hyogoReturn', 'hikeshiRoka', 'hyogoRoka']);
    const lines = (steps: readonly EventStep[]): string[] =>
      steps.flatMap((st) => {
        if (st.type === 'say') return [...st.lines, ...(st.linesF ?? [])];
        if (st.type === 'if') return [...lines(st.then), ...lines(st.else ?? [])];
        if (st.type === 'choice') return st.options.flatMap((o) => lines(o.steps));
        if (st.type === 'giveItem') return lines(st.ifFull ?? []);
        if (st.type === 'battle') return lines(st.ifLose ?? []);
        return [];
      });
    for (const id of ids) {
      for (const line of lines(EVENTS[id]!.steps)) {
        if (line.includes('「')) {
          expect(line, id).toMatch(/^[^「」、。\s]+「.*」$/u);
          const speaker = line.slice(0, line.indexOf('「')).replace(/〈.〉$/u, '');
          expect(speaker, `${id}: ${line}`).not.toMatch(/[がはをにてでと]$/u);
        } else expect(allowedNarration(line), `${id}: ${line}`).toBe(true);
      }
    }
  });

  it('大手門の門番は、開門を呼ばわってから橋を北へ歩いて門の内へ消える（主人公の立つ南のマスを通らない）', () => {
    const list = requests('otemon', ch8);
    const monban = MAPS.edo!.npcs.find((n) => n.id === 'edoMonban')!;
    const hero = { x: monban.x, y: monban.y + 1 };
    // 扉 (32, 5) の前まで歩いてから消える（北の出口 (32, 7) にとどまらない）
    expect(walkEnd(list, 'edoMonban', monban, 'edo', hero)).toEqual({ x: monban.x, y: monban.y - 2 });
    const st = stages(list);
    expect(st.findIndex((s) => s.type === 'vanish' && s.who === 'edoMonban')).toBeGreaterThan(st.findIndex((s) => s.type === 'walk' && s.who === 'edoMonban'));
    expect(pagesIn(list).join('')).not.toContain('脇へ退き');
    // 第 8 章を終える前は動かない
    expect(stages(requests('otemon', { ...ch8, flags: { ...ch8.flags, chapter8Cleared: false } }))).toEqual([]);
  });

  it('本丸御殿に入ると、小吉が持ち場から玄関の主人公の隣まで歩いてきて話し、持ち場へ戻る。霞が出て話す', () => {
    const list = requests('edojoEnter', ch8);
    const exit = MAPS.edo!.exits.find((e) => e.to === 'edojo')!;
    const hero = { x: exit.toX, y: exit.toY };
    const kokichi = MAPS.edojo!.npcs.find((n) => n.id === 'kokichiJo')!;
    const there = walkEnd(list, 'kokichiJo', kokichi, 'edojo', hero);
    expect(adjacent(there, hero)).toBe(true);
    // 小吉と主人公が向き合ってから話す
    const talk = list.findIndex((q) => q.kind === 'say');
    expect(stages(list.slice(0, talk))).toEqual(expect.arrayContaining([{ type: 'face', who: 'kokichiJo', toward: 'hero' }, { type: 'face', who: 'hero', toward: 'kokichiJo' }]));
    expect(walkEnd(list, 'kokichiJo', there, 'edojo', hero, 1)).toEqual({ x: kokichi.x, y: kokichi.y });
    expect(actors(list)).toEqual(['kasumi']);
    expect(pagesIn(list).join('')).not.toContain('一行は');
  });

  it('御錠口では番兵が声を上げてから主人公を押し戻し、戻った先で霞が出て話す', () => {
    const list = requests('jouguchi', ch8);
    const warpAt = list.findIndex((q) => q.kind === 'warp');
    expect(pagesIn(list.slice(0, warpAt))).toContain('からくりの番兵「ギギ……御錠口ヨリ先ハ、何人モ通サヌ」');
    expect(list.findIndex((q) => q.kind === 'stage' && q.step.type === 'actor' && q.step.id === 'kasumi')).toBeGreaterThan(warpAt);
  });

  it('御金蔵では、からくり旗本が蔵の奥から歩いてきて主人公の西をふさぐ。勝つと崩れて消え、金太が天窓から降りてきて鍵を回し、帰っていく', () => {
    const t = triggerOf('edojo', 'okanegura');
    const list = requests('okanegura', ch8);
    const first = stages(list).find((s) => s.type === 'actor' && s.id === 'hatamoto');
    expect(first).toMatchObject({ enemy: 'karakuriHatamoto' });
    const at = first?.type === 'actor' ? { x: first.x!, y: first.y! } : { x: NaN, y: NaN };
    expect(walkEnd(list, 'hatamoto', at, 'edojo', t)).toEqual({ x: t.x - 1, y: t.y });
    const b = battleAt(list);
    expect(actors(list.slice(0, b))).toEqual(expect.arrayContaining(['hatamoto', 'oniwaban', 'orin']));
    // 勝つと消え、金太が出てきて主人公の西で話す
    expect(vanished(list.slice(b))).toEqual(expect.arrayContaining(['hatamoto', 'oniwaban', 'kinta']));
    const kintaStep = stages(list).find((s) => s.type === 'actor' && s.id === 'kinta');
    const k = kintaStep?.type === 'actor' ? { x: kintaStep.x!, y: kintaStep.y! } : { x: NaN, y: NaN };
    expect(walkEnd(list, 'kinta', k, 'edojo', t)).toEqual({ x: t.x - 1, y: t.y });
    // 金太は来た道を天窓の下へ戻ってから消える
    expect(walkEnd(list, 'kinta', { x: t.x - 1, y: t.y }, 'edojo', t, 1)).toEqual(k);
    // 手当て（全回復）は金太の台詞のあと。戦闘の前と、手当ての台詞の前には治らない
    const runner = new EventRunner(EVENTS.okanegura!.steps);
    let r = runner.next(hurt(ch8));
    let healedBeforeWords = false;
    let sawWords = false;
    while (r.request.kind !== 'done') {
      if (r.request.kind === 'say' && r.request.pages.some((p) => p.includes('傷の手当て'))) sawWords = true;
      if (!sawWords && healed(r.state)) healedBeforeWords = true;
      r = r.request.kind === 'battle' ? runner.next(r.state, { kind: 'battle', outcome: 'victory' }) : runner.next(r.state);
    }
    expect(sawWords).toBe(true);
    expect(healedBeforeWords).toBe(false);
    expect(healed(r.state)).toBe(true);
    expect(maxPartyOut(list)).toBe(1);
    // 負けたら金太は出ない。出直すと、お凛は出ない
    const lost = requests('okanegura', ch8, 'defeat');
    expect(actors(lost)).not.toContain('kinta');
    expect(actors(requests('okanegura', { ...ch8, flags: { ...ch8.flags, okaneguraMet: true } }))).not.toContain('orin');
  });

  it('大奥の化け猫は、打掛の女が振り向いて化け猫に変わる。勝つと煙で消え、火消しの頭が持ち場から主人公の南まで駆けてきて、話し終えると持ち場へ戻る', () => {
    const t = triggerOf('edojo', 'ookuBakeneko');
    const list = requests('ookuBakeneko', ch8);
    const st = stages(list);
    const turn = st.findIndex((s) => s.type === 'face' && s.who === 'uchikake');
    const gone = st.findIndex((s) => s.type === 'vanish' && s.who === 'uchikake');
    const neko = st.findIndex((s) => s.type === 'actor' && s.id === 'bakeneko');
    expect(turn).toBeGreaterThan(-1);
    expect(gone).toBeGreaterThan(turn);
    expect(neko).toBeGreaterThan(gone);
    const b = battleAt(list);
    expect(vanished(list.slice(b))).toContain('bakeneko');
    const ginji = MAPS.edojo!.npcs.find((n) => n.id === 'ginjiJo')!;
    const ginjiStep = st.find((s) => s.type === 'actor' && s.id === 'ginjiKashira');
    expect(ginjiStep).toMatchObject({ x: ginji.x, y: ginji.y });
    const there = walkEnd(list, 'ginjiKashira', ginji, 'edojo', t);
    expect(there).toEqual({ x: t.x, y: t.y + 1 });
    expect(walkEnd(list, 'ginjiKashira', there, 'edojo', t, 1)).toEqual({ x: ginji.x, y: ginji.y });
    // 細い口なので、仲間は一人ずつ
    expect(maxPartyOut(list)).toBe(1);
    // 出直すと、すぐ化け猫の姿で出る
    const again = requests('ookuBakeneko', { ...ch8, flags: { ...ch8.flags, ookuMet: true } });
    expect(actors(again.slice(0, battleAt(again)))).toEqual(['bakeneko']);
  });

  it('鬼塚典膳は 1 歩進み出て話し、勝つと刀を納めて崩れ落ち、消える。負けたら消えない', () => {
    const list = requests('tenzen', ch8);
    const tenzen = MAPS.matsuNoRoka!.npcs.find((n) => n.id === 'tenzenRoka')!;
    for (const t of MAPS.matsuNoRoka!.triggers!.filter((x) => x.event === 'tenzen')) {
      expect(walkEnd(list, 'tenzenRoka', tenzen, 'matsuNoRoka', t)).toEqual({ x: tenzen.x - 1, y: tenzen.y });
    }
    expect(maxPartyOut(list)).toBe(1);
    expect(vanished(list.slice(battleAt(list)))).toContain('tenzenRoka');
    expect(vanished(requests('tenzen', ch8, 'defeat'))).not.toContain('tenzenRoka');
    expect(pagesIn(list).join('')).not.toContain('膝をついた');
  });
});
