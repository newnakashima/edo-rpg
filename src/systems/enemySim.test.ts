// docs/balance.md の「雑魚敵の個性」の勝率の表を測る。
// 味方は全員、生きている先頭の敵を通常攻撃するだけ（術・回復・道具を使わないので、実際より厳しい）。
// 表を出すには `SIM_REPORT=1 npx vitest run src/systems/enemySim.test.ts`（1,000 回ずつ）。ふだんは 200 回ずつで、+ 2 の勝率が 85% 以上かだけを確かめる。
import { describe, expect, it } from 'vitest';
import { createBattle, isAlive, resolveTurn, type Command } from './battle';
import type { CharacterId } from '../data/characters';
import { createMember } from './party';
import { seededRng } from './testUtils';

const REPORT = !!import.meta.env.SIM_REPORT;
const RUNS = REPORT ? 1000 : 200;

interface Result {
  win: number;
  hpLoss: number;
  turns: number;
  fled: number;
}

function simulate(enemies: string[], party: [CharacterId, number][], level: number, canEscape: boolean, runs = RUNS): Result {
  const rng = seededRng(42);
  let win = 0;
  let hpLoss = 0;
  let turns = 0;
  let fled = 0;
  for (let k = 0; k < runs; k++) {
    let b = createBattle(
      party.map(([id, l]) => createMember(id, l)),
      'm',
      enemies,
      level,
      { canEscape },
    );
    let t = 0;
    while (b.outcome === 'ongoing' && t < 60) {
      const foe = b.combatants.find((c) => c.side === 'enemy' && isAlive(c));
      const commands: Record<string, Command> = {};
      for (const c of b.combatants) if (c.side === 'party' && isAlive(c) && foe) commands[c.key] = { kind: 'attack', target: foe.key };
      b = resolveTurn(b, commands, rng).state;
      t++;
    }
    if (b.outcome !== 'victory') continue;
    win++;
    const members = b.combatants.filter((c) => c.side === 'party');
    hpLoss += 1 - members.reduce((s, c) => s + c.hp, 0) / members.reduce((s, c) => s + c.stats.maxHp, 0);
    turns += t;
    if (b.combatants.some((c) => c.fled)) fled++;
  }
  return { win: win / runs, hpLoss: hpLoss / Math.max(1, win), turns: turns / Math.max(1, win), fled: fled / Math.max(1, win) };
}

const three = (l: number): [CharacterId, number][] => [
  ['hero', l],
  ['kasumi', l],
  ['gendo', l],
];
const four = (l: number): [CharacterId, number][] => [...three(l), ['orin', l]];
/** 第 5 章は霞の代わりに兵庫（Lv25 固定）。 */
const osaka = (l: number): [CharacterId, number][] => [
  ['hero', l],
  ['hyogo', 25],
  ['gendo', l],
  ['orin', l],
];

interface Case {
  name: string;
  enemies: string[];
  party: (l: number) => [CharacterId, number][];
  level: number;
  /** イベントの戦闘（逃げられない。逃げる敵は通常攻撃をする）。 */
  event?: boolean;
}

const CASES: Case[] = [
  { name: '赤鬼 ×2（京のイベント）', enemies: ['akaoni', 'akaoni'], party: three, level: 10, event: true },
  { name: '青鬼', enemies: ['aooni'], party: three, level: 10 },
  { name: '一反木綿 ×3', enemies: ['ittanmomen', 'ittanmomen', 'ittanmomen'], party: three, level: 10 },
  { name: 'からくり鷹 ×2', enemies: ['karakuriTaka', 'karakuriTaka'], party: four, level: 13 },
  { name: '化け鼠 ×3', enemies: ['bakeNezumi', 'bakeNezumi', 'bakeNezumi'], party: osaka, level: 16 },
  { name: 'からくり俵＋化け鼠 ×2', enemies: ['karakuriTawara', 'bakeNezumi', 'bakeNezumi'], party: osaka, level: 16 },
  { name: '用心棒 ×2＋鉄砲足軽（米蔵の地下）', enemies: ['yojinbo', 'yojinbo', 'teppoAshigaru'], party: osaka, level: 17 },
  { name: 'からくり俵 ×2＋化け鼠（米蔵の地下）', enemies: ['karakuriTawara', 'karakuriTawara', 'bakeNezumi'], party: osaka, level: 17 },
  { name: '鉄砲足軽 ×2＋用心棒＋からくり俵（米蔵の地下）', enemies: ['teppoAshigaru', 'yojinbo', 'teppoAshigaru', 'karakuriTawara'], party: osaka, level: 17 },
  { name: '化け鼠 ×2＋用心棒＋鉄砲足軽（米蔵の地下）', enemies: ['bakeNezumi', 'yojinbo', 'bakeNezumi', 'teppoAshigaru'], party: osaka, level: 17 },
  { name: '用心棒＋からくり俵＋鉄砲足軽（米蔵の地下）', enemies: ['yojinbo', 'karakuriTawara', 'teppoAshigaru'], party: osaka, level: 17 },
  { name: '猫又＋用心棒＋化け鼠（米蔵の地下）', enemies: ['nekomata', 'yojinbo', 'bakeNezumi'], party: osaka, level: 17 },
  { name: '化け鼠 ×2＋猫又＋からくり俵（米蔵の地下）', enemies: ['bakeNezumi', 'bakeNezumi', 'nekomata', 'karakuriTawara'], party: osaka, level: 17 },
  { name: '平家蟹 ×2', enemies: ['heikegani', 'heikegani'], party: four, level: 19 },
  { name: 'がしゃどくろ＋亡霊武者', enemies: ['gashadokuro', 'boreiMusha'], party: four, level: 19 },
  { name: '怨霊 ×2＋亡霊武者＋外法使い', enemies: ['onryo', 'onryo', 'boreiMusha', 'gehoTsukai'], party: four, level: 19 },
  { name: '船幽霊＋海坊主＋船幽霊（北前船のイベント）', enemies: ['funayurei', 'umibozu', 'funayurei'], party: four, level: 22, event: true },
  { name: '加賀の忍び ×2＋からくり藩士（金沢のイベント）', enemies: ['kagaShinobi', 'karakuriHanshi', 'kagaShinobi'], party: four, level: 22, event: true },
  { name: '金箔からくり ×2', enemies: ['kinpakuNingyo', 'kinpakuNingyo'], party: four, level: 22 },
  { name: '雪入道＋雪女 ×2', enemies: ['yukiNyudo', 'yukiOnna', 'yukiOnna'], party: four, level: 22 },
  { name: '送り狼 ×3＋雪女（奥州街道のイベント）', enemies: ['okuriOkami', 'okuriOkami', 'yukiOnna', 'okuriOkami'], party: four, level: 25, event: true },
  { name: '旗本奴 ×2', enemies: ['hatamotoYakko', 'hatamotoYakko'], party: four, level: 25 },
  { name: 'からくり同心＋旗本奴＋からくり同心（江戸のイベント）', enemies: ['karakuriDoshin', 'hatamotoYakko', 'karakuriDoshin'], party: four, level: 25, event: true },
  { name: '火鼠 ×3', enemies: ['hinezumi', 'hinezumi', 'hinezumi'], party: four, level: 25 },
  { name: 'からくり旗本 ×2＋御庭番（江戸城のイベント）', enemies: ['karakuriHatamoto', 'karakuriOniwaban', 'karakuriHatamoto'], party: four, level: 28, event: true },
  { name: '化け猫 ×2＋御庭番＋怨霊（江戸城のイベント）', enemies: ['ookuBakeneko', 'karakuriOniwaban', 'ookuBakeneko', 'onryo'], party: four, level: 28, event: true },
  { name: 'からくり旗本＋御庭番＋近習', enemies: ['karakuriHatamoto', 'karakuriOniwaban', 'karakuriKinju'], party: four, level: 28 },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

describe('雑魚敵の個性の勝率（単純な戦闘）', () => {
  it('味方が敵のレベル + 2 なら、どの組にも 85% 以上勝てる', () => {
    const rows: string[] = [];
    const weak: [string, number][] = [];
    for (const c of CASES) {
      const even = simulate(c.enemies, c.party(c.level), c.level, !c.event);
      const plus2 = simulate(c.enemies, c.party(c.level + 2), c.level, !c.event);
      rows.push(
        `| ${c.name} | ${pct(even.win)}・${pct(even.hpLoss)}・${even.turns.toFixed(1)}${even.fled > 0 ? `（${pct(even.fled)} の戦闘で逃げる）` : ''} | ${pct(plus2.win)}・${pct(plus2.hpLoss)} |`,
      );
      if (plus2.win < 0.85) weak.push([c.name, plus2.win]);
    }
    if (REPORT) console.log(rows.join('\n'));
    expect(weak).toEqual([]);
  });
});
