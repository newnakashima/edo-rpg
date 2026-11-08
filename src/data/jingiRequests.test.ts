import { describe, expect, it } from 'vitest';
import { EventRunner, type EventInput } from '../systems/eventScript';
import { newGame, type GameState } from '../systems/gameState';
import { JINGI_MAX } from '../systems/jingi';
import { EVENTS } from './events';
import {
  BAKUTO_INTRO_EVENTS,
  bakutoIntroReward,
  pendingBakutoIntro,
  JINGI_REQUEST_EVENTS,
  JINGI_REQUEST_KINDS,
  jingiRequestEnemies,
  jingiRequestId,
  facilityMenu,
  JINGI_REQUEST_LABELS,
  jingiRequestLevel,
  jingiRequestReward,
  pendingJingiRequest,
} from './jingiRequests';
import { MAPS, npcVisible, tileAt } from './maps';
import { OYABUN, bakutoIntroduceEventId, bakutoIntroducedFlag, bakutoMeetEventId, bakutoSentFlag } from './oyabun';
import { TOWN_FACILITY_DOORS } from './townFacilities';

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

describe('仁義ポイントを得る頼まれごと', () => {
  it('湯屋・賭場などのある 15 町の、賭場・居酒屋・妓楼にひとつずつあり、EVENTS から引ける', () => {
    const towns = Object.keys(TOWN_FACILITY_DOORS);
    expect(Object.keys(JINGI_REQUEST_EVENTS)).toHaveLength(towns.length * 3);
    for (const town of towns) {
      for (const kind of JINGI_REQUEST_KINDS) {
        const id = jingiRequestId(town, kind);
        expect(EVENTS[id]?.id, id).toBe(id);
        expect(pendingJingiRequest(town, kind, {})).toEqual({ id, kind, label: JINGI_REQUEST_LABELS[kind] });
        // 施設の人がその町にいる
        expect(MAPS[town]!.npcs.some((n) => n.action === kind), id).toBe(true);
      }
    }
  });

  it('ポイントはその町の親分の屋敷の 2 泊分（序盤 2・中盤 4・終盤 6）、敵は町の敵レベル + 1', () => {
    expect([1, 9, 10, 18, 19, 25].map(jingiRequestReward)).toEqual([2, 2, 4, 4, 6, 6]);
    expect(jingiRequestLevel(7)).toBe(8);
    expect(jingiRequestEnemies('tobaku', 1)).toHaveLength(2);
    expect(jingiRequestEnemies('gyoro', 25)).toEqual(['hatamotoYakko', 'oihagiRonin', 'oihagiRonin']);
  });

  it('引き受けて勝つと仁義ポイントを得てフラグが立ち、施設のメニューから消える', () => {
    const id = jingiRequestId('kyo', 'tobaku');
    const s = { ...newGame('m', start), jingi: 10 };
    expect(pendingJingiRequest('kyo', 'tobaku', s.flags)?.id).toBe(id);
    const { state, battles } = run(id, s, 0, 'victory');
    expect(battles).toEqual([{ kind: 'battle', enemies: jingiRequestEnemies('tobaku', 10), level: 11, canEscape: false, loseOk: true }]);
    expect(state.jingi).toBe(14);
    expect(state.flags[id]).toBe(true);
    expect(pendingJingiRequest('kyo', 'tobaku', state.flags)).toBeNull();
    // ほかの町・施設の頼まれごとは残る
    expect(pendingJingiRequest('kyo', 'izakaya', state.flags)?.id).toBe(jingiRequestId('kyo', 'izakaya'));
    expect(pendingJingiRequest('osaka', 'tobaku', state.flags)?.id).toBe(jingiRequestId('osaka', 'tobaku'));
  });

  it('負けても全滅にはならず、ポイントもフラグも変わらない（また引き受けられる）。断っても同じ', () => {
    const id = jingiRequestId('edo', 'gyoro');
    const s = { ...newGame('f', start), jingi: 3 };
    for (const [choice, outcome] of [
      [0, 'defeat'],
      [1, 'victory'],
    ] as const) {
      const { state, battles } = run(id, s, choice, outcome);
      expect(battles).toHaveLength(choice === 0 ? 1 : 0);
      expect(state.jingi).toBe(3);
      expect(pendingJingiRequest('edo', 'gyoro', state.flags)?.id).toBe(id);
    }
  });

  it('ポイントは上限を超えず、知らせには増えた量ではなく今の仁義ポイントを出す', () => {
    const runner = new EventRunner(EVENTS[jingiRequestId('sendai', 'izakaya')]!.steps);
    let r = runner.next({ ...newGame('m', start), jingi: JINGI_MAX - 1 });
    const pages: string[] = [];
    for (let i = 0; i < 50 && r.request.kind !== 'done'; i++) {
      if (r.request.kind === 'say') pages.push(...r.request.pages);
      const input: EventInput | undefined =
        r.request.kind === 'choice' ? { kind: 'choice', index: 0 } : r.request.kind === 'battle' ? { kind: 'battle', outcome: 'victory' } : undefined;
      r = runner.next(r.state, input);
    }
    expect(r.state.jingi).toBe(JINGI_MAX);
    expect(pages).toContain(`渡世人としての名が上がった。（仁義 ${JINGI_MAX}）`);
  });

  it('得られるポイントの合計は docs/balance.md のとおり 198', () => {
    const total = Object.keys(TOWN_FACILITY_DOORS).reduce((sum, town) => sum + jingiRequestReward(MAPS[town]!.areaLevel) * JINGI_REQUEST_KINDS.length, 0);
    expect(total).toBe(198);
  });

  it('施設のメニューは、本来の項目・頼まれごと・やめる の順で、選んだ番号から選んだものが分かる', () => {
    const request = pendingJingiRequest('kyo', 'tobaku', {});
    const bets = [10, 100].map((b) => ({ label: `${b} 文張る`, value: b }));
    const withReq = facilityMenu(bets, [request]);
    expect(withReq.labels).toEqual(['10 文張る', '100 文張る', 'イカサマ客を懲らしめる', 'やめる']);
    expect([0, 1, 2, 3].map(withReq.pick)).toEqual([
      { kind: 'main', value: 10 },
      { kind: 'main', value: 100 },
      { kind: 'request', id: jingiRequestId('kyo', 'tobaku') },
      { kind: 'cancel' },
    ]);
    // 頼まれごとが済んでいれば出さない
    const without = facilityMenu(bets, [null]);
    expect(without.labels).toEqual(['10 文張る', '100 文張る', 'やめる']);
    expect(without.pick(2)).toEqual({ kind: 'cancel' });
    // 張る銭がなくても、頼まれごとは選べる
    const noBets = facilityMenu([], [request]);
    expect(noBets.labels).toEqual(['イカサマ客を懲らしめる', 'やめる']);
    expect(noBets.pick(0)).toEqual({ kind: 'request', id: jingiRequestId('kyo', 'tobaku') });
    expect(noBets.pick(1)).toEqual({ kind: 'cancel' });
  });

  it('頼みが複数あれば、null を飛ばして渡した順に並べ、番号を数え違えない（親分の屋敷の、親分の頼みと博徒の紹介）', () => {
    const main = [
      { label: '泊めてもらう', value: 'stay' },
      { label: '記録する', value: 'save' },
    ];
    const a = { id: 'a', label: '親分の頼みを聞く' };
    const b = { id: 'b', label: '博徒を引き合わせる' };
    const both = facilityMenu(main, [a, b]);
    expect(both.labels).toEqual(['泊めてもらう', '記録する', '親分の頼みを聞く', '博徒を引き合わせる', 'やめる']);
    expect([2, 3, 4].map(both.pick)).toEqual([{ kind: 'request', id: 'a' }, { kind: 'request', id: 'b' }, { kind: 'cancel' }]);
    const onlyB = facilityMenu(main, [null, b]);
    expect(onlyB.labels).toEqual(['泊めてもらう', '記録する', '博徒を引き合わせる', 'やめる']);
    expect([2, 3].map(onlyB.pick)).toEqual([{ kind: 'request', id: 'b' }, { kind: 'cancel' }]);
    const onlyA = facilityMenu(main, [a, null]);
    expect([2, 3].map(onlyA.pick)).toEqual([{ kind: 'request', id: 'a' }, { kind: 'cancel' }]);
  });

  it('湯屋や、施設のない町には頼まれごとがない', () => {
    expect(pendingJingiRequest('kyo', 'yuya', {})).toBeNull();
    expect(pendingJingiRequest('kyo', undefined, {})).toBeNull();
    expect(pendingJingiRequest('koya', 'tobaku', {})).toBeNull();
  });
});

describe('博徒の紹介', () => {
  const bakuto = (town: string) => MAPS[town]!.npcs.find((n) => n.id === `${town}Bakuto`)!;

  it('親分の屋敷のある 15 町に文無しの博徒が 1 人ずついて、話しかけるイベントと引き合わせるイベントが EVENTS から引ける', () => {
    expect(Object.keys(BAKUTO_INTRO_EVENTS)).toHaveLength(Object.keys(OYABUN).length * 2);
    for (const town of Object.keys(OYABUN)) {
      const npc = bakuto(town);
      expect(npc.event, town).toBe(bakutoMeetEventId(town));
      expect(EVENTS[bakutoMeetEventId(town)]?.id, town).toBe(bakutoMeetEventId(town));
      expect(EVENTS[bakutoIntroduceEventId(town)]?.id, town).toBe(bakutoIntroduceEventId(town));
      // 台詞の一家の名は、その町の親分の一家
      const { pages } = run(bakutoMeetEventId(town), newGame('m', start), 1, 'victory');
      expect(pages.join(''), town).toContain(OYABUN[town]!.family);
      // 清水湊では辰五郎が殺されたあとも使うので、博徒も若い衆も親分が生きているとは言わない
      const intro = run(bakutoIntroduceEventId(town), newGame('m', start), 0, 'victory').pages;
      for (const p of [...pages, ...intro]) expect(p, town).not.toMatch(/親分/);
    }
    // 屋敷のないマップ（ダンジョン・ワールドマップなど）にはいない
    for (const map of Object.values(MAPS)) if (!OYABUN[map.id]) expect(map.npcs.some((n) => n.id.endsWith('Bakuto')), map.id).toBe(false);
  });

  it('博徒は通りの中ほどの通れるマスに立ち、道をふさがない（まわりの 8 マスが通れて、戸口・ほかの人・出口から離れている）', () => {
    for (const town of Object.keys(OYABUN)) {
      const map = MAPS[town]!;
      const npc = bakuto(town);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(tileAt(map, npc.x + dx, npc.y + dy)?.blocked, `${town} ${dx},${dy}`).toBe(false);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) expect(map.rows[npc.y + dy]?.[npc.x + dx], town).not.toBe('D');
      const others = map.npcs.filter((n) => n !== npc && Math.abs(n.x - npc.x) <= 2 && Math.abs(n.y - npc.y) <= 2);
      expect(others.map((n) => n.id), town).toEqual([]);
      const spots = [...map.exits, ...(map.triggers ?? []), ...(map.gates ?? []), ...(map.marks ?? [])];
      expect(spots.some((p) => Math.abs(Math.floor(p.x) - npc.x) <= 2 && Math.abs(p.y - npc.y) <= 2), town).toBe(false);
    }
  });

  it('ワールドマップから町に入った場所から、ほかの人に道をふさがれずに博徒の隣まで歩いて行ける', () => {
    for (const town of Object.keys(OYABUN)) {
      const map = MAPS[town]!;
      const npc = bakuto(town);
      const blocked = new Set(map.npcs.map((n) => `${n.x},${n.y}`));
      const { x, y } = MAPS.world!.towns!.find((t) => t.to?.mapId === town)!.to!;
      const from = { x, y };
      const seen = new Set([`${from.x},${from.y}`]);
      for (const queue = [from]; queue.length > 0; ) {
        const p = queue.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const q = { x: p.x + dx, y: p.y + dy };
          const key = `${q.x},${q.y}`;
          if (seen.has(key) || blocked.has(key) || tileAt(map, q.x, q.y)?.blocked !== false) continue;
          seen.add(key);
          queue.push(q);
        }
      }
      expect(seen.has(`${npc.x},${npc.y - 1}`), town).toBe(true);
    }
  });

  it('紹介すると決めると博徒は通りから消え、屋敷のメニューに「博徒を引き合わせる」が出る。断れば何も変わらない', () => {
    const s = newGame('f', start);
    expect(pendingBakutoIntro('nagoya', s.flags)).toBeNull();
    const declined = run(bakutoMeetEventId('nagoya'), s, 1, 'victory').state;
    expect(declined.flags[bakutoSentFlag('nagoya')]).toBeFalsy();
    expect(npcVisible(bakuto('nagoya'), declined.flags)).toBe(true);
    const sent = run(bakutoMeetEventId('nagoya'), s, 0, 'victory');
    expect(sent.state.flags[bakutoSentFlag('nagoya')]).toBe(true);
    expect(sent.state.jingi).toBe(s.jingi);
    expect(npcVisible(bakuto('nagoya'), sent.state.flags)).toBe(false);
    // 女主人公の台詞を使う
    expect(sent.pages.some((p) => p.includes('姐さん'))).toBe(true);
    expect(pendingBakutoIntro('nagoya', sent.state.flags)).toEqual({ id: bakutoIntroduceEventId('nagoya'), label: '博徒を引き合わせる' });
    // ほかの町の屋敷には出ない
    expect(pendingBakutoIntro('kyo', sent.state.flags)).toBeNull();
  });

  it('引き合わせると屋敷の 1 泊分（序盤 1・中盤 2・終盤 3）の仁義ポイントを得て、メニューから消える', () => {
    expect([1, 9, 10, 18, 19, 25].map(bakutoIntroReward)).toEqual([1, 1, 2, 2, 3, 3]);
    for (const town of ['shimizu', 'osaka', 'edo']) {
      const s = { ...newGame('m', start), jingi: 5, flags: { [bakutoSentFlag(town)]: true } };
      const { state, pages } = run(bakutoIntroduceEventId(town), s, 0, 'victory');
      expect(state.jingi, town).toBe(5 + bakutoIntroReward(MAPS[town]!.areaLevel));
      expect(state.flags[bakutoIntroducedFlag(town)], town).toBe(true);
      expect(pendingBakutoIntro(town, state.flags), town).toBeNull();
      expect(pages, town).toContain(`渡世人としての名が上がった。（仁義 ${state.jingi}）`);
      // 博徒は屋敷の中にいて画面に出ていないので、話すのは若い衆だけ
      for (const p of pages.filter((l) => l.includes('「'))) expect(p, town).toMatch(/^若い衆「/);
    }
  });

  it('得られるポイントの合計は docs/balance.md のとおり 33', () => {
    const total = Object.keys(OYABUN).reduce((sum, town) => sum + bakutoIntroReward(MAPS[town]!.areaLevel), 0);
    expect(total).toBe(33);
  });
});

describe('町の旅籠', () => {
  it('旅籠の主人は渡世人を泊めず、親分の屋敷へ導く（どの町も親分の屋敷がある）', () => {
    const inns = Object.values(MAPS).flatMap((m) => m.npcs.filter((n) => n.action === 'inn').map((n) => ({ map: m.id, n })));
    expect(inns.length).toBeGreaterThan(0);
    for (const { map, n } of inns) {
      expect(TOWN_FACILITY_DOORS[map], map).toBeDefined();
      for (const line of [...(n.lines ?? []), ...(n.after?.lines ?? []), ...(n.later?.lines ?? [])]) {
        expect(line, map).toMatch(/親分/);
        // 泊められない・お断り、とはっきり言う
        expect(line, map).toMatch(/泊め(られ|でき|でけ)(ねえ|ない|ん|ませ|まへ|し)|泊めちゃならねえ|お断り/);
      }
    }
  });
});
