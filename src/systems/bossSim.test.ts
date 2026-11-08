// docs/balance.md の「ボス戦の確かめ」の勝率の表を測る。
// 味方はその地域の店で最も良い装備を付け、ボスを狙う。気力の続くかぎり最もダメージの大きい攻撃の技を使い、回復の技を持つ仲間（玄道・主人公）は、
// 体力が 4 割を切った仲間がいれば回復する（道具・状態異常の技・防御は使わず、装備も店の品だけなので、実際の戦闘より少し厳しい）。
// 表を出すには `SIM_REPORT=1 npx vitest run src/systems/bossSim.test.ts --silent=false`（1,000 回ずつ）。ふだんは 300 回ずつで、
// 「雑魚敵に普通に勝てるレベル（雑魚敵 Lv）では負け、付近の雑魚敵を余裕で倒せるレベル（雑魚敵 Lv + 3）では勝てる」かを確かめる。
import { describe, expect, it } from 'vitest';
import type { CharacterId } from '../data/characters';
import { ENCOUNTERS, ENEMIES } from '../data/enemies';
import { createMember, type PartyMember } from './party';
import { enemyStats } from './stats';
import { bestEquip, pct, simulateBattle, type Policy, type SimResult } from './simUtils';

const REPORT = !!import.meta.env.SIM_REPORT;
const RUNS = REPORT ? 1000 : 300;

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
/**
 * 第 4 章は、Lv1 で加わったお凛がまだ 5 レベル、玄道が 1 レベル低い（progressionSim.test.ts の通しの確かめで、
 * 主人公が雑魚敵 Lv + 3 になったとき、玄道は 1、お凛は 5 低い）。経験値の式・出現表・加入の決まりを変えて通しの確かめの表が変わったら、
 * ここ（と osaka）の遅れも合わせ直す。
 */
const iga = (l: number): [CharacterId, number][] => [...two(l), ['gendo', l - 1], ['orin', l - 5]];
const four = (l: number): [CharacterId, number][] => [...three(l), ['orin', l]];
/** 第 5 章は霞の代わりに兵庫（Lv25 固定）。お凛はまだ 3 レベル、玄道は 1 レベル低い（通しの確かめで、主人公が雑魚敵 Lv + 3 のとき）。 */
const osaka = (l: number): [CharacterId, number][] => [
  ['hero', l],
  ['hyogo', 25],
  ['gendo', l - 1],
  ['orin', l - 3],
];

const BOSS_CASES: BossCase[] = [
  { id: 'yako', name: '野狐', level: 4, party: solo, shops: ['shimizuKaji'], encounters: ['urayama'] },
  { id: 'tetsubin', name: 'からくり大将 鉄瓶', level: 7, party: two, shops: ['sunpuKaji'], encounters: ['sunpu'] },
  { id: 'kinshachi', name: '金鯱からくり', level: 10, party: two, shops: ['nagoyaKaji'], encounters: ['tokaido', 'nagoya'] },
  { id: 'shuten', name: '酒呑の大鬼', level: 13, party: three, shops: ['kyoKaji'], encounters: ['kyoto'] },
  { id: 'oboro', name: '上忍 朧（中ボス）', level: 15, party: iga, shops: ['igaKaji'], encounters: ['iga'] },
  { id: 'gonroku', name: '蛇骨の権六', level: 16, party: iga, shops: ['igaKaji'], encounters: ['iga'] },
  { id: 'hyakuhyo', name: '百俵からくり', level: 19, party: osaka, shops: ['osakaKaji'], encounters: ['osaka', 'komeKura'] },
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
function simulateCase(c: BossCase, level: number, policy: Policy, runs = RUNS): SimResult {
  return simulateBattle(partyFor(c, level), { enemies: [c.id], level: c.level, policy, runs, focus: c.id });
}

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
