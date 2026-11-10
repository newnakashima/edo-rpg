// 頼まれごと（賭場・居酒屋・妓楼）と親分の頼みで、相手を画面に出して動かす（テストプレイの指摘「その場に表示されていない人物が喋っている」）。
// 相手は戦う敵と同じ姿・同じ数で、施設の屋内の戸口から入ってきて主人公の隣まで歩き、話し、戦いのあと戸口から去る。
// 歩く道が通れるかは eventStage.test.ts が、施設の人の隣のどのマスに主人公が立っていても確かめる。
import { describe, expect, it } from 'vitest';
import type { EventStep } from './eventTypes';
import { speakerOf } from './faces';
import { JINGI_REQUEST_EVENTS, JINGI_REQUEST_KINDS, jingiRequestEnemies, jingiRequestId, requestRoom, rivalId } from './jingiRequests';
import { MAPS } from './maps';
import { OYABUN_REQUESTS, OYABUN_REQUEST_EVENTS, oyabunRequestId } from './oyabunRequests';
import { TOWN_FACILITY_DOORS } from './townFacilities';

/** 引き受けたときの手順（選択肢の 1 つ目）。 */
function acceptSteps(id: string): EventStep[] {
  const def = JINGI_REQUEST_EVENTS[id] ?? OYABUN_REQUEST_EVENTS[id];
  const choice = def?.steps.find((s): s is Extract<EventStep, { type: 'choice' }> => s.type === 'choice');
  return choice?.options[0]?.steps ?? [];
}

/** 相手が去る手順（後から来た人から順に戸口まで歩いて消える）を含むか。 */
function leaves(steps: readonly EventStep[], count: number, door: { x: number; y: number }): boolean {
  return Array.from({ length: count }, (_, k) => count - 1 - k).every((i) => {
    const walk = steps.findIndex((s) => s.type === 'walk' && s.who === rivalId(i) && s.route && typeof s.to === 'object' && s.to.x === door.x && s.to.y === door.y);
    const vanish = steps.findIndex((s) => s.type === 'vanish' && s.who === rivalId(i));
    return walk >= 0 && vanish > walk;
  });
}

const CASES: { id: string; town: string; action: string; enemies: string[] }[] = [
  ...Object.keys(TOWN_FACILITY_DOORS).flatMap((town) =>
    JINGI_REQUEST_KINDS.map((kind) => ({ id: jingiRequestId(town, kind), town, action: kind, enemies: jingiRequestEnemies(kind, MAPS[town]?.areaLevel ?? 1) })),
  ),
  ...Object.entries(OYABUN_REQUESTS).map(([town, def]) => ({ id: oyabunRequestId(town), town, action: 'oyabun', enemies: def.enemies })),
];

describe('頼まれごと・親分の頼みの相手を画面に出す', () => {
  it('頼まれごと 45 件と親分の頼み 14 件のすべてに、施設の人の立つ屋内と戸口がある', () => {
    expect(CASES.length).toBe(59);
    for (const c of CASES) {
      const room = requestRoom(c.town, c.action);
      expect(room, c.id).toBeDefined();
      const map = MAPS[room!.mapId]!;
      expect(map.npcs.some((n) => n.action === c.action), c.id).toBe(true);
      expect(map.exits.some((e) => e.x === room!.door.x && e.y === room!.door.y), c.id).toBe(true);
    }
  });

  for (const c of CASES) {
    it(`${c.id}: 戦う敵と同じ姿・同じ数の相手が戸口から入って主人公の隣まで歩き、話してから戦い、勝っても負けても戸口から去る`, () => {
      const room = requestRoom(c.town, c.action)!;
      const steps = acceptSteps(c.id);
      const battleAt = steps.findIndex((s) => s.type === 'battle');
      const battle = steps[battleAt] as Extract<EventStep, { type: 'battle' }>;
      expect(battle.enemies).toEqual(c.enemies);
      const before = steps.slice(0, battleAt);
      c.enemies.forEach((enemy, i) => {
        const actor = before.findIndex((s) => s.type === 'actor' && s.id === rivalId(i));
        const step = before[actor] as Extract<EventStep, { type: 'actor' }>;
        expect(step.enemy, `${c.id} ${rivalId(i)}`).toBe(enemy);
        expect({ x: step.x, y: step.y }, `${c.id} ${rivalId(i)} は戸口に出る`).toEqual(room.door);
        expect(before.findIndex((s) => s.type === 'walk' && s.who === rivalId(i) && s.to === 'hero' && s.route), `${c.id} ${rivalId(i)} が主人公へ歩く`).toBeGreaterThan(actor);
      });
      // 相手の台詞（confront）は、みなが入ってきたあと
      const lastWalk = before.map((s) => s.type).lastIndexOf('walk');
      const firstSay = before.findIndex((s) => s.type === 'say');
      expect(firstSay, c.id).toBeGreaterThan(lastWalk);
      // 勝ったとき・負けたとき、どちらも相手は戸口から去る
      expect(leaves(steps.slice(battleAt + 1), c.enemies.length, room.door), `${c.id} 勝ったとき`).toBe(true);
      expect(leaves(battle.ifLose ?? [], c.enemies.length, room.door), `${c.id} 負けたとき`).toBe(true);
    });
  }

  it('相手の出入りを語る地の文（「出ていった」「引き上げていった」「夜が更けたころ」）はなく、台詞はみな話す人がいる', () => {
    const lines = (steps: readonly EventStep[]): string[] =>
      steps.flatMap((s) => {
        if (s.type === 'say') return [...s.lines, ...(s.linesF ?? [])];
        if (s.type === 'choice') return s.options.flatMap((o) => lines(o.steps));
        if (s.type === 'battle') return lines(s.ifLose ?? []);
        return [];
      });
    for (const c of CASES) {
      const def = JINGI_REQUEST_EVENTS[c.id] ?? OYABUN_REQUEST_EVENTS[c.id];
      for (const line of lines(def!.steps)) {
        // 仁義ポイントの知らせだけは地の文
        if (line.startsWith('渡世人としての名が上がった。')) continue;
        expect(speakerOf(line), `${c.id}: ${line}`).toBeTruthy();
        expect(line, c.id).not.toMatch(/出ていった|引き上げていった|夜が更けた/);
      }
    }
  });

  it('画面にいない太夫・親分には喋らせない（施設の人と相手と主人公だけ）', () => {
    for (const c of CASES) {
      const def = JINGI_REQUEST_EVENTS[c.id] ?? OYABUN_REQUEST_EVENTS[c.id];
      const text = JSON.stringify(def);
      expect(text, c.id).not.toContain('太夫「');
      expect(text, c.id).not.toContain('親分「');
    }
  });
});

describe('親分の頼みの相手の台詞', () => {
  it('勝ったときの捨て台詞（flee）と負けたときの捨て台詞（taunt）は、どの町にも 1 行以上あり、相手が話す', () => {
    for (const [town, def] of Object.entries(OYABUN_REQUESTS)) {
      expect(def.flee.length, town).toBeGreaterThan(0);
      expect(def.taunt.length, town).toBeGreaterThan(0);
      const rival = speakerOf(def.confront[0]!);
      for (const line of [...def.flee, ...def.taunt]) expect(speakerOf(line), `${town}: ${line}`).toBe(rival);
    }
  });
});
