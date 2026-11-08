// docs/balance.md の「ボス戦の確かめ」の勝率の表を測る。
// 味方はその地域の店で最も良い装備を付け、ボスを狙う。気力の続くかぎり最もダメージの大きい攻撃の技を使い、回復の技を持つ仲間（玄道・主人公）は、
// 体力が 4 割を切った仲間がいれば回復する（道具・状態異常の技・防御は使わず、装備も店の品だけなので、実際の戦闘より少し厳しい）。
// 表を出すには `SIM_REPORT=1 npx vitest run src/systems/bossSim.test.ts`（1,000 回ずつ）。ふだんは 300 回ずつで、
// 「雑魚敵に普通に勝てるレベル（雑魚敵 Lv）では負け、付近の雑魚敵を余裕で倒せるレベル（雑魚敵 Lv + 3）では勝てる」かを確かめる。
import { describe, expect, it } from 'vitest';
import { createBattle, isAlive, resolveTurn, type Combatant, type Command } from './battle';
import type { CharacterId } from '../data/characters';
import { EQUIPMENT, EQUIP_SLOTS, STARTING_EQUIPMENT, canEquip, type Equipped } from '../data/equipment';
import { SHOPS } from '../data/shops';
import { ENCOUNTERS, ENEMIES } from '../data/enemies';
import { SKILLS } from '../data/skills';
import { createMember, type PartyMember } from './party';
import { enemyStats, growthFactor } from './stats';
import { seededRng } from './testUtils';

const REPORT = !!import.meta.env.SIM_REPORT;
const RUNS = REPORT ? 1000 : 300;

/** 装備の良さ（能力値の合計。体力は 1/4 に数える）。 */
function score(id: string): number {
  const b = EQUIPMENT[id]?.bonus ?? {};
  return (b.atk ?? 0) + (b.def ?? 0) + (b.mag ?? 0) + (b.spd ?? 0) + (b.luck ?? 0) + (b.maxHp ?? 0) / 4 + (b.maxMp ?? 0) / 4;
}

/** 店の品から、枠ごとに最も良い装備を選ぶ（初期装備より悪ければ初期装備のまま）。 */
function bestEquip(id: CharacterId, shops: string[]): Equipped {
  const goods = shops.flatMap((s) => SHOPS[s]?.goods ?? []);
  const equip: Equipped = { ...STARTING_EQUIPMENT[id] };
  if (id === 'hyogo') return equip;
  for (const slot of EQUIP_SLOTS) {
    for (const g of goods) {
      const def = EQUIPMENT[g];
      if (!def || def.slot !== slot || !canEquip(id, g)) continue;
      const cur = equip[slot];
      if (!cur || score(g) > score(cur)) equip[slot] = g;
    }
  }
  return equip;
}

function healSkills(c: Combatant): string[] {
  return c.skills.filter((s) => SKILLS[s]?.effect.kind === 'heal' && (SKILLS[s]?.target === 'ally' || SKILLS[s]?.target === 'allAllies'));
}

/** 味方の戦い方。attack は通常攻撃だけ、skills は気力の続くかぎり最もダメージの大きい攻撃の技を使う。どちらも回復の技は使う。 */
type Policy = 'attack' | 'skills';

/** 技のダメージの見積もり（docs/balance.md の「戦闘計算」。乱数・会心・命中は見ない）。通常攻撃は 'attack'。 */
function estimate(c: Combatant, skill: string, foe: Combatant): number {
  const physical = (mult: number, ignoreDefense = false) => Math.max(1, c.stats.atk - (ignoreDefense ? 0 : foe.stats.def / 2)) * mult;
  if (skill === 'attack') return physical(1);
  const def = SKILLS[skill];
  if (!def) return 0;
  const element = def.elements ?? [];
  const elementRate = element.some((e) => foe.weak.includes(e)) ? 1.5 : element.some((e) => foe.resist.includes(e)) ? 0.5 : 1;
  const e = def.effect;
  if (e.kind === 'physical') {
    if (e.gamble) return 0;
    const hits = ((e.hits ?? 1) + (e.maxHits ?? e.hits ?? 1)) / 2;
    // ランダムに当てる技は、ボスに当たるとは限らないが、手下がいなければすべてボスに当たる
    return physical(e.multiplier, e.ignoreDefense) * hits * elementRate;
  }
  if (e.kind === 'magic') {
    const per = Math.max(1, e.power * growthFactor(c.level) + c.stats.mag * 1.2 - (e.ignoreDefense ? 0 : foe.stats.def / 4));
    return per * (e.hits ?? 1) * elementRate;
  }
  return 0;
}

/**
 * 回復の技を持つ仲間は、体力が 4 割を切った仲間がいれば回復する（2 人以上なら全体の回復）。
 * ほかはボス（いなければ先頭の敵）を狙う。skills では、通常攻撃より大きいと見積もった攻撃の技を気力の続くかぎり使う
 * （回復の技を持つ仲間は、気力を最大の 4 割は残す）。
 */
function commandsFor(combatants: Combatant[], bossId: string, policy: Policy): Record<string, Command> {
  const allies = combatants.filter((c) => c.side === 'party' && isAlive(c));
  const foes = combatants.filter((c) => c.side === 'enemy' && isAlive(c));
  const foe = foes.find((c) => c.enemyId === bossId) ?? foes[0];
  const commands: Record<string, Command> = {};
  let healed = false;
  for (const c of allies) {
    const heals = healSkills(c);
    const low = allies.filter((a) => a.hp < a.stats.maxHp * 0.4).sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp);
    if (!healed && low.length > 0) {
      const usable = heals.filter((s) => (SKILLS[s]?.mp ?? 0) <= c.mp);
      const all = usable.find((s) => SKILLS[s]?.target === 'allAllies');
      const single = usable.find((s) => SKILLS[s]?.target === 'ally');
      const skill = low.length >= 2 && all ? all : (single ?? all);
      if (skill) {
        commands[c.key] = { kind: 'skill', skill, target: low[0]!.key };
        healed = true;
        continue;
      }
    }
    if (!foe) continue;
    let best = 'attack';
    if (policy === 'skills') {
      const reserve = heals.length > 0 ? c.stats.maxMp * 0.4 : 0;
      for (const s of c.skills) {
        if ((SKILLS[s]?.mp ?? 0) > c.mp - reserve) continue;
        if (estimate(c, s, foe) > estimate(c, best, foe)) best = s;
      }
    }
    commands[c.key] = best === 'attack' ? { kind: 'attack', target: foe.key } : { kind: 'skill', skill: best, target: foe.key };
  }
  return commands;
}

interface Result {
  win: number;
  hpLoss: number;
  turns: number;
}

function simulate(boss: BossCase, party: PartyMember[], policy: Policy, runs = RUNS): Result {
  const rng = seededRng(7);
  let win = 0;
  let hpLoss = 0;
  let turns = 0;
  for (let k = 0; k < runs; k++) {
    let b = createBattle(party, 'm', [boss.id], boss.level, {
      canEscape: false,
    });
    let t = 0;
    while (b.outcome === 'ongoing' && t < 60) {
      b = resolveTurn(b, commandsFor(b.combatants, boss.id, policy), rng).state;
      t++;
    }
    if (b.outcome !== 'victory') continue;
    win++;
    const members = b.combatants.filter((c) => c.side === 'party');
    hpLoss += 1 - members.reduce((s, c) => s + c.hp, 0) / members.reduce((s, c) => s + c.stats.maxHp, 0);
    turns += t;
  }
  return {
    win: win / runs,
    hpLoss: hpLoss / Math.max(1, win),
    turns: turns / Math.max(1, win),
  };
}

interface BossCase {
  id: string;
  name: string;
  level: number;
  /** 戦う仲間（レベル L のときの各自のレベル）。 */
  party: (l: number) => [CharacterId, number][];
  /** 装備を買う店。 */
  shops: string[];
  /** 付近の雑魚敵の出現表（ENCOUNTERS）。 */
  encounters: string[];
}

const solo = (l: number): [CharacterId, number][] => [['hero', l]];
const two = (l: number): [CharacterId, number][] => [
  ['hero', l],
  ['kasumi', l],
];
const three = (l: number): [CharacterId, number][] => [...two(l), ['gendo', l]];
/** 第 4 章は、Lv1 で加わったお凛がまだ 2 レベル低い。 */
const iga = (l: number): [CharacterId, number][] => [...three(l), ['orin', l - 2]];
const four = (l: number): [CharacterId, number][] => [...three(l), ['orin', l]];
/** 第 5 章は霞の代わりに兵庫（Lv18 固定）。 */
const osaka = (l: number): [CharacterId, number][] => [
  ['hero', l],
  ['hyogo', 18],
  ['gendo', l],
  ['orin', l],
];

const BOSS_CASES: BossCase[] = [
  { id: 'yako', name: '野狐', level: 4, party: solo, shops: ['shimizuKaji'], encounters: ['urayama'] },
  { id: 'tetsubin', name: 'からくり大将 鉄瓶', level: 7, party: two, shops: ['sunpuKaji'], encounters: ['sunpu'] },
  { id: 'kinshachi', name: '金鯱からくり', level: 10, party: two, shops: ['nagoyaKaji'], encounters: ['tokaido', 'nagoya'] },
  { id: 'shuten', name: '酒呑の大鬼', level: 13, party: three, shops: ['kyoKaji'], encounters: ['kyoto'] },
  { id: 'oboro', name: '上忍 朧（中ボス）', level: 15, party: iga, shops: ['igaKaji'], encounters: ['iga'] },
  { id: 'gonroku', name: '蛇骨の権六', level: 16, party: iga, shops: ['igaKaji'], encounters: ['iga'] },
  { id: 'hyakuhyo', name: '百俵からくり', level: 19, party: osaka, shops: ['osakaKaji'], encounters: ['osaka'] },
  { id: 'nanbanOzutsu', name: '南蛮大筒からくり', level: 22, party: four, shops: ['nagasakiKaji', 'dejimaShop'], encounters: ['nagasaki', 'harajo'] },
  { id: 'kagemusha', name: 'からくり影武者（中ボス）', level: 24, party: four, shops: ['kanazawaKaji', 'kanazawaKinpaku'], encounters: ['kenrokuen', 'karakuriGura'] },
  { id: 'yashamaru', name: '夜叉丸', level: 25, party: four, shops: ['kanazawaKaji', 'kanazawaKinpaku'], encounters: ['kenrokuen', 'karakuriGura'] },
  { id: 'kashaKarakuri', name: '火車からくり', level: 28, party: four, shops: ['edoKaji'], encounters: ['oshu', 'edo'] },
  { id: 'onizukaTenzen', name: '鬼塚典膳（中ボス）', level: 30, party: four, shops: ['edoKaji'], encounters: ['edojo'] },
  { id: 'washio', name: '鷲尾但馬守宗衡', level: 31, party: four, shops: ['edoKaji'], encounters: ['edojo'] },
  { id: 'karakuriDaigongen', name: 'からくり大権現', level: 32, party: four, shops: ['edoKaji'], encounters: ['edojo'] },
];

/** 付近の雑魚敵のレベル（1 つ目の出現表のレベル）。 */
function areaLevel(c: BossCase): number {
  return ENCOUNTERS[c.encounters[0]!]!.level;
}

function partyFor(c: BossCase, level: number): PartyMember[] {
  return c.party(level).map(([id, l]) => createMember(id, Math.max(1, l), bestEquip(id, c.shops)));
}

/** 味方がレベル L のときのボス戦を試す。 */
function simulateCase(c: BossCase, level: number, policy: Policy, runs = RUNS): Result {
  return simulate(c, partyFor(c, level), policy, runs);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

describe('ボスの強さ（単純な戦闘）', () => {
  it('技を使う戦い方で、雑魚敵 Lv では勝率 30% 以下、雑魚敵 Lv + 3 では勝率 65% 以上（目安の 25%・70% に乱数の幅を見込む）', () => {
    const rows: string[] = [];
    const bad: string[] = [];
    for (const c of BOSS_CASES) {
      const area = areaLevel(c);
      const r = [0, 1, 2, 3].map((d) => simulateCase(c, area + d, 'skills'));
      const cells = r.map((x, d) => `Lv${area + d}: ${pct(x.win)}${d >= 2 ? `・${x.turns.toFixed(1)} ターン・HP ${pct(x.hpLoss)} 減` : ''}`);
      if (REPORT) {
        // 通常攻撃だけの勝率（下限の目安）も並べる
        const plain = [0, 3].map((d) => pct(simulateCase(c, area + d, 'attack').win));
        cells.push(`${plain[0]}・${plain[1]}`);
      }
      rows.push(`| ${c.name}（Lv${c.level}） | ${cells.join(' | ')} |`);
      if (r[0]!.win > 0.3) bad.push(`${c.name}: Lv${area} で ${pct(r[0]!.win)}`);
      if (r[3]!.win < 0.65) bad.push(`${c.name}: Lv${area + 3} で ${pct(r[3]!.win)}`);
    }
    if (REPORT) console.log(rows.join('\n'));
    expect(bad).toEqual([]);
  }, 60_000);

  it('ボスの攻撃は、付近の雑魚敵の攻撃より高い', () => {
    for (const c of BOSS_CASES) {
      const boss = enemyStats(ENEMIES[c.id]!.factors, c.level).atk;
      for (const area of c.encounters) {
        const table = ENCOUNTERS[area]!;
        for (const id of new Set(table.groups.flatMap((g) => g.members))) {
          expect(boss, `${c.name}と${ENEMIES[id]!.name}（${area}）`).toBeGreaterThan(enemyStats(ENEMIES[id]!.factors, table.level).atk);
        }
      }
    }
  });
});
