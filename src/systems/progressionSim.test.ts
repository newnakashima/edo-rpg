// docs/balance.md の「通しの確かめ」の表を測る。序章から終章まで、章ごとに次のように進めたとして、レベルの推移と勝率を確かめる。
// - その章の出現表で戦い（1 戦の経験値は、出現表の組の重みで平均した期待値）、主人公が推奨の下限（雑魚敵 Lv + 2）に届いたらボスに挑む。
//   ボスとイベントの戦闘の経験値も足す。お凛は Lv1 で加わり、霞は第 5 章で抜けて第 6 章で戻る（平均レベルまで引き上げ）。兵庫は Lv25 のゲスト。
// - 雑魚敵の組とイベントの戦闘は、章に入ったとき（入ったときのレベル）と推奨の下限で、通常攻撃と回復の技だけで戦う（技を使わないので実際より厳しい）。
// - ボスは推奨の下限のレベルで、bossSim.test.ts と同じく技を使って戦う。
// 装備は、その章の店で最も良いもの（simUtils.ts の bestEquip）。
// 表を出すには `SIM_REPORT=1 npx vitest run src/systems/progressionSim.test.ts --silent=false`（雑魚敵 500 回・ボス 1,000 回ずつ）。ふだんは 100 回・300 回ずつ。
import { describe, expect, it } from 'vitest';
import { CHARACTERS, isGuest, type CharacterId } from '../data/characters';
import { ENCOUNTERS, ENEMIES, type EncounterTable } from '../data/enemies';
import { createMember, type PartyMember } from './party';
import { adjustedExp, enemyExp, levelForExp, totalExpForLevel } from './stats';
import { bestEquip, pct, simulateBattle, type SimResult } from './simUtils';

const REPORT = !!import.meta.env.SIM_REPORT;
const RUNS = REPORT ? 500 : 100;
/** ボス戦は勝率が 5〜9 割で乱数の幅が大きいので、ふだんも 300 回ずつ。 */
const BOSS_RUNS = REPORT ? 1000 : 300;

/** 経験値を数える仲間（ゲストを除く）の累計経験値。 */
type Exps = Partial<Record<CharacterId, number>>;

interface Fight {
  name: string;
  enemies: string[];
  level: number;
  /** 戦う仲間（章の仲間と違うとき）。 */
  party?: CharacterId[];
  /** 装備を買う店（章の店と違うとき）。 */
  shops?: string[];
}

interface Stage {
  name: string;
  /** 雑魚敵 Lv（推奨の下限は + 2）。 */
  area: number;
  /** 章の仲間（並び順）。 */
  party: CharacterId[];
  /** 章に入るときに加わる仲間。 */
  join?: CharacterId[];
  /** 章に入るときに抜ける仲間。 */
  leave?: CharacterId[];
  /** レベル上げをする出現表（組の重みで平均した経験値を、表ごとに等しく平均する）。 */
  grind: string[];
  /** 勝率を確かめる出現表と、その表で戦う仲間・店（章と違うとき）。 */
  tables: { id: string; party?: CharacterId[]; shops?: string[] }[];
  shops: string[];
  events: Fight[];
  bosses: Fight[];
}

const H: CharacterId = 'hero';
const K: CharacterId = 'kasumi';
const G: CharacterId = 'gendo';
const O: CharacterId = 'orin';
const Y: CharacterId = 'hyogo';

const STAGES: Stage[] = [
  {
    name: '序章',
    area: 1,
    party: [H],
    grind: ['urayama'],
    tables: [{ id: 'urayama' }],
    shops: ['shimizuKaji'],
    events: [],
    bosses: [{ name: '野狐', enemies: ['yako'], level: 4 }],
  },
  {
    name: '第 1 章',
    area: 4,
    party: [H, K],
    join: [K],
    grind: ['sunpu'],
    tables: [{ id: 'sunpu' }],
    shops: ['sunpuKaji'],
    events: [
      { name: 'からくり人形 ×2（霞の加入）', enemies: ['karakuriNingyo', 'karakuriNingyo'], level: 4 },
      { name: 'ごろつき ×2＋化け提灯（与力の蔵）', enemies: ['gorotsuki', 'gorotsuki', 'bakeChochin'], level: 4 },
    ],
    bosses: [{ name: 'からくり大将 鉄瓶', enemies: ['tetsubin'], level: 7 }],
  },
  {
    name: '第 2 章',
    area: 7,
    party: [H, K],
    grind: ['tokaido', 'nagoya'],
    tables: [{ id: 'tokaido' }, { id: 'nagoya' }],
    shops: ['nagoyaKaji'],
    events: [
      { name: '川獺 ×2（大井川）', enemies: ['kawauso', 'kawauso'], level: 7, shops: ['sunpuKaji'] },
      { name: '追い剥ぎ浪人 ×2＋ゼンマイ犬（堀川の荷蔵）', enemies: ['oihagiRonin', 'oihagiRonin', 'zenmaiInu'], level: 7 },
      { name: '追い剥ぎ浪人＋雲助＋川獺（寄り道の浜松）', enemies: ['oihagiRonin', 'kumosuke', 'kawauso'], level: 7, shops: ['hamamatsuKaji'] },
    ],
    bosses: [{ name: '金鯱からくり', enemies: ['kinshachi'], level: 10 }],
  },
  {
    name: '第 3 章',
    area: 10,
    party: [H, K, G],
    join: [G],
    grind: ['kyoto'],
    tables: [{ id: 'kyoto' }],
    shops: ['kyoKaji'],
    events: [
      // 彦根は第 2 章を終えると寄れる（玄道の加入前の 2 人）
      { name: '亡霊武者 ×2（寄り道の彦根）', enemies: ['boreiMusha', 'boreiMusha'], level: 11, party: [H, K], shops: ['hikoneKaji'] },
      { name: '赤鬼 ×2（京）', enemies: ['akaoni', 'akaoni'], level: 10 },
    ],
    bosses: [{ name: '酒呑の大鬼', enemies: ['shuten'], level: 13 }],
  },
  {
    name: '第 4 章',
    area: 13,
    party: [H, K, G, O],
    join: [O],
    grind: ['iga'],
    tables: [{ id: 'iga' }],
    shops: ['igaKaji'],
    events: [],
    bosses: [
      { name: '上忍 朧（中ボス）', enemies: ['oboro'], level: 15 },
      { name: '蛇骨の権六', enemies: ['gonroku'], level: 16 },
    ],
  },
  {
    name: '第 5 章',
    area: 16,
    party: [H, Y, G, O],
    join: [Y],
    leave: [K],
    grind: ['osaka', 'komeKura'],
    // 兵庫が加わる前の街道は 3 人で通る
    tables: [{ id: 'osaka', party: [H, G, O] }, { id: 'osaka' }, { id: 'komeKura' }],
    shops: ['osakaKaji'],
    events: [],
    bosses: [{ name: '百俵からくり', enemies: ['hyakuhyo'], level: 19 }],
  },
  {
    name: '第 6 章',
    area: 19,
    party: [H, K, G, O],
    join: [K],
    leave: [Y],
    grind: ['nagasaki', 'harajo'],
    // 西国街道は霞が戻る前の 3 人で、大坂の装備のまま通る
    tables: [{ id: 'saigoku', party: [H, G, O], shops: ['osakaKaji'] }, { id: 'nagasaki' }, { id: 'harajo' }],
    shops: ['nagasakiKaji', 'dejimaShop'],
    events: [
      { name: '南蛮兵 ×2＋外法使い（南蛮寺跡）', enemies: ['nanbanHei', 'gehoTsukai', 'nanbanHei'], level: 19 },
      { name: '外法使い＋南蛮兵 ×3（寄り道の熊本）', enemies: ['gehoTsukai', 'nanbanHei', 'nanbanHei', 'nanbanHei'], level: 21, shops: ['kumamotoKaji'] },
    ],
    bosses: [{ name: '南蛮大筒からくり', enemies: ['nanbanOzutsu'], level: 22 }],
  },
  {
    name: '第 7 章',
    area: 22,
    party: [H, K, G, O],
    grind: ['kenrokuen', 'karakuriGura'],
    tables: [{ id: 'kitamae', shops: ['nagasakiKaji', 'dejimaShop'] }, { id: 'kenrokuen' }, { id: 'karakuriGura' }],
    shops: ['kanazawaKaji', 'kanazawaKinpaku'],
    events: [
      { name: '船幽霊 ×2＋海坊主（北前船）', enemies: ['funayurei', 'umibozu', 'funayurei'], level: 22, shops: ['nagasakiKaji', 'dejimaShop'] },
      { name: '加賀の忍び ×2＋からくり藩士（金沢）', enemies: ['kagaShinobi', 'karakuriHanshi', 'kagaShinobi'], level: 22 },
    ],
    bosses: [
      { name: 'からくり影武者（中ボス）', enemies: ['kagemusha'], level: 24 },
      { name: '夜叉丸', enemies: ['yashamaru'], level: 25 },
    ],
  },
  {
    name: '第 8 章',
    area: 25,
    party: [H, K, G, O],
    grind: ['oshu', 'edo'],
    tables: [{ id: 'oshu', shops: ['sendaiKaji'] }, { id: 'edo' }],
    shops: ['edoKaji'],
    events: [
      { name: '加賀の忍び ×2＋からくり同心（仙台）', enemies: ['kagaShinobi', 'karakuriDoshin', 'kagaShinobi'], level: 25, shops: ['sendaiKaji'] },
      { name: '送り狼 ×3＋雪女（寄り道の会津若松）', enemies: ['okuriOkami', 'okuriOkami', 'yukiOnna', 'okuriOkami'], level: 25, shops: ['aizuKaji'] },
      { name: '火付け盗賊 ×2＋からくり同心（江戸）', enemies: ['hitsukeTozoku', 'karakuriDoshin', 'hitsukeTozoku'], level: 25 },
      { name: 'からくり同心 ×2＋旗本奴（江戸）', enemies: ['karakuriDoshin', 'hatamotoYakko', 'karakuriDoshin'], level: 25 },
    ],
    bosses: [{ name: '火車からくり', enemies: ['kashaKarakuri'], level: 28 }],
  },
  {
    name: '終章',
    area: 28,
    party: [H, K, G, O],
    grind: ['edojo'],
    tables: [{ id: 'edojo' }],
    shops: ['edoKaji'],
    events: [
      { name: 'からくり旗本 ×2＋御庭番（江戸城）', enemies: ['karakuriHatamoto', 'karakuriOniwaban', 'karakuriHatamoto'], level: 28 },
      { name: '化け猫 ×2＋御庭番＋怨霊（江戸城）', enemies: ['ookuBakeneko', 'karakuriOniwaban', 'ookuBakeneko', 'onryo'], level: 28 },
      { name: 'からくり旗本＋近習 ×2＋御庭番（松の廊下）', enemies: ['karakuriHatamoto', 'karakuriKinju', 'karakuriOniwaban', 'karakuriKinju'], level: 28 },
    ],
    bosses: [
      { name: '鬼塚典膳（中ボス）', enemies: ['onizukaTenzen'], level: 30 },
      { name: '鷲尾但馬守宗衡', enemies: ['washio'], level: 31 },
      { name: 'からくり大権現', enemies: ['karakuriDaigongen'], level: 32 },
    ],
  },
];

const levelOf = (exps: Exps, id: CharacterId): number => (isGuest(id) ? (CHARACTERS[id].guestLevel ?? 1) : levelForExp(exps[id] ?? 0));

/**
 * 加わる・戻る仲間のレベル（eventScript.ts の averageLevel と同じく、切り捨て・最低 1。加入時のレベルが決まっている仲間を数えず、
 * その仲間しかいなければ全員で数える）。
 */
function averageLevel(exps: Exps, party: CharacterId[]): number {
  const counted = party.filter((id) => CHARACTERS[id].joinLevel === undefined);
  const members = counted.length > 0 ? counted : party;
  return Math.max(1, Math.floor(members.reduce((s, id) => s + levelOf(exps, id), 0) / Math.max(1, members.length)));
}

/** 敵の組 1 つを倒したときの、レベル L の仲間 1 人の経験値（逃げる敵は、倒せることもあるが数えない。レベル上げの戦闘の回数は多めに出る）。 */
function groupExp(members: string[], enemyLevel: number, memberLevel: number): number {
  return members.reduce((sum, id) => {
    const def = ENEMIES[id]!;
    if (def.actions?.some((a) => a.skill === 'nigeru')) return sum;
    const scale = (def.rewardScale ?? 1) * (def.reward?.exp ?? 1);
    return sum + adjustedExp(Math.round(enemyExp(enemyLevel) * scale), memberLevel, enemyLevel);
  }, 0);
}

/** 出現表で 1 戦したときの経験値の期待値（pickGroup と同じく、人数と minPartyLevel で組を絞る）。 */
function expectedExp(table: EncounterTable, size: number, maxLevel: number, memberLevel: number): number {
  const groups = table.groups.filter((g) => g.members.length <= size + 1 && maxLevel >= (g.minPartyLevel ?? 1));
  const total = groups.reduce((s, g) => s + g.weight, 0);
  return groups.reduce((s, g) => s + g.weight * groupExp(g.members, table.level, memberLevel), 0) / total;
}

function gain(exps: Exps, party: CharacterId[], amount: (level: number) => number): void {
  for (const id of party) {
    if (isGuest(id)) continue;
    exps[id] = (exps[id] ?? 0) + amount(levelOf(exps, id));
  }
}

interface StageLevels {
  /** 章に入ったときの各自のレベル。 */
  entry: Partial<Record<CharacterId, number>>;
  /** レベル上げのあと（イベントの戦闘と 1 体目のボスに挑むとき）の各自のレベル。 */
  ready: Partial<Record<CharacterId, number>>;
  /** ボスごとの、挑むときの各自のレベル（前のボスとイベントの戦闘の経験値を足したもの）。 */
  bosses: Partial<Record<CharacterId, number>>[];
  /** 主人公が雑魚敵 Lv + offset に届くまでの戦闘の回数。 */
  battles: number;
}

/**
 * 序章から順に章を進め、章ごとのレベルを求める。主人公が雑魚敵 Lv + offset に届くまでレベル上げをしてから、イベントの戦闘とボスに挑む。
 * レベル上げの経験値は章の仲間（4 人）で数える（第 5 章の街道を兵庫の加入前の 3 人で、第 6 章の西国街道を霞が戻る前の 3 人で通る分は数えない）。
 */
function progress(offset: number): StageLevels[] {
  const exps: Exps = { hero: 0 };
  /** 一時離脱中の仲間の経験値（eventScript.ts の away）。 */
  const away: Exps = {};
  const inParty = new Set<CharacterId>([H]);
  const out: StageLevels[] = [];
  for (const stage of STAGES) {
    for (const id of stage.leave ?? []) {
      away[id] = exps[id];
      delete exps[id];
      inParty.delete(id);
    }
    for (const id of stage.join ?? []) {
      const members = [...inParty];
      inParty.add(id);
      if (isGuest(id)) continue;
      // 戻る仲間（rejoinParty）は、預けていた経験値と平均レベルの多いほう
      const level = CHARACTERS[id].joinLevel ?? averageLevel(exps, members);
      exps[id] = Math.max(away[id] ?? 0, totalExpForLevel(level));
      delete away[id];
    }
    const snapshot = () => Object.fromEntries(stage.party.map((id) => [id, levelOf(exps, id)]));
    const entry = snapshot();
    let battles = 0;
    while (levelOf(exps, H) < stage.area + offset && battles < 500) {
      const maxLevel = Math.max(...stage.party.map((id) => levelOf(exps, id)));
      gain(exps, stage.party, (l) => stage.grind.reduce((s, t) => s + expectedExp(ENCOUNTERS[t]!, stage.party.length, maxLevel, l), 0) / stage.grind.length);
      battles++;
    }
    const ready = snapshot();
    for (const f of stage.events) gain(exps, f.party ?? stage.party, (l) => groupExp(f.enemies, f.level, l));
    const bosses: StageLevels['bosses'] = [];
    for (const f of stage.bosses) {
      bosses.push(snapshot());
      gain(exps, stage.party, (l) => groupExp(f.enemies, f.level, l));
    }
    out.push({ entry, ready, battles, bosses });
  }
  return out;
}

function partyAt(ids: CharacterId[], levels: Partial<Record<CharacterId, number>>, shops: string[]): PartyMember[] {
  return ids.map((id) => createMember(id, levels[id] ?? levelOf({}, id), bestEquip(id, shops)));
}

const LABEL: Record<CharacterId, string> = { hero: '主人公', kasumi: '霞', gendo: '玄道', orin: 'お凛', hyogo: '兵庫' };
const levelText = (ids: CharacterId[], levels: Partial<Record<CharacterId, number>>) => ids.map((id) => `${LABEL[id]} ${levels[id]}`).join('・');

interface TableResult {
  /** 最も勝ちにくい組の勝率と、その組。 */
  worst: SimResult & { group: string };
  /** 組の重みで平均した勝率と HP の減り。 */
  win: number;
  hpLoss: number;
}

function simulateTable(tableId: string, party: PartyMember[], runs: number): TableResult {
  const table = ENCOUNTERS[tableId]!;
  const maxLevel = Math.max(...party.map((m) => levelForExp(m.exp)));
  const groups = table.groups.filter((g) => g.members.length <= party.length + 1 && maxLevel >= (g.minPartyLevel ?? 1));
  const total = groups.reduce((s, g) => s + g.weight, 0);
  let worst: TableResult['worst'] | undefined;
  let win = 0;
  let hpLoss = 0;
  for (const g of groups) {
    const r = simulateBattle(party, { enemies: g.members, level: table.level, policy: 'attack', runs, canEscape: true, spread: true, seed: 42 });
    win += (r.win * g.weight) / total;
    hpLoss += (r.hpLoss * g.weight) / total;
    if (!worst || r.win < worst.win) worst = { ...r, group: g.members.map((id) => ENEMIES[id]!.name).join('・') };
  }
  return { worst: worst!, win, hpLoss };
}

describe('通しの確かめ（序章から終章まで）', () => {
  /** 推奨の下限（雑魚敵 Lv + 2）まで上げて進む。 */
  const levels = progress(2);
  /** 推奨の上限（雑魚敵 Lv + 3）まで上げて進む。 */
  const upper = progress(3);

  it('レベル上げ: 推奨の上限まで上げても、どの章も 45 戦以内（プレイ時間の見積もりのレベル上げ 20〜30 分 ≒ 30〜45 戦）', () => {
    const rows = STAGES.map((s, i) => {
      const l = levels[i]!;
      const u = upper[i]!;
      return `| ${s.name}（雑魚敵 Lv${s.area}） | ${levelText(s.party, l.entry)} | ${l.battles} 戦: ${levelText(s.party, l.ready)} | ${levelText(s.party, u.entry)} | ${u.battles} 戦: ${levelText(s.party, u.ready)} |`;
    });
    if (REPORT) {
      console.log(rows.join('\n'));
      console.log(`合計 + 2: ${levels.reduce((s, l) => s + l.battles, 0)} 戦、+ 3: ${upper.reduce((s, l) => s + l.battles, 0)} 戦`);
    }
    for (const u of upper) expect(u.battles).toBeLessThanOrEqual(45);
    // 章に入ったときの主人公は、雑魚敵 Lv − 1 以上（前の章で推奨の下限まで上げ、ボスを倒していれば届く）
    STAGES.forEach((s, i) => expect(levels[i]!.entry.hero, s.name).toBeGreaterThanOrEqual(s.area - 1));
  });

  it('お凛（Lv1 で加わる）は、第 5 章のボスでは主人公より 3 レベル低いまでに、第 6 章以降のボスでは 2 レベル低いまでに追いつく', () => {
    STAGES.forEach((s, i) => {
      const at = upper[i]!.bosses[0]!;
      if (at.orin === undefined || i < STAGES.findIndex((x) => x.name === '第 5 章')) return;
      const gap = i === STAGES.findIndex((x) => x.name === '第 5 章') ? 3 : 2;
      expect(at.hero! - at.orin, s.name).toBeLessThanOrEqual(gap);
    });
  });

  it('雑魚敵の組: 章に入ったときのレベルで、どの組にも 80% 以上、推奨の下限で 95% 以上勝てる（通常攻撃と回復だけ）', () => {
    const rows: string[] = [];
    const bad: string[] = [];
    STAGES.forEach((s, i) => {
      const l = levels[i]!;
      for (const t of s.tables) {
        const ids = t.party ?? s.party;
        const shops = t.shops ?? s.shops;
        const entry = simulateTable(t.id, partyAt(ids, l.entry, shops), RUNS);
        const ready = simulateTable(t.id, partyAt(ids, l.ready, shops), RUNS);
        rows.push(
          `| ${s.name} ${t.id}（${ids.length} 人） | ${pct(entry.win)}・HP ${pct(entry.hpLoss)} 減（最も低い組: ${entry.worst.group} ${pct(entry.worst.win)}） | ${pct(ready.win)}・HP ${pct(ready.hpLoss)} 減（${ready.worst.group} ${pct(ready.worst.win)}） |`,
        );
        if (entry.worst.win < 0.8) bad.push(`${s.name} ${t.id} 入ったとき: ${entry.worst.group} ${pct(entry.worst.win)}`);
        if (ready.worst.win < 0.95) bad.push(`${s.name} ${t.id} 推奨の下限: ${ready.worst.group} ${pct(ready.worst.win)}`);
      }
    });
    if (REPORT) console.log(rows.join('\n'));
    expect(bad).toEqual([]);
  }, 120_000);

  it('イベントの戦闘: 推奨の下限で 90% 以上勝てる（通常攻撃と回復だけ）', () => {
    const rows: string[] = [];
    const bad: string[] = [];
    STAGES.forEach((s, i) => {
      const l = levels[i]!;
      for (const f of s.events) {
        const ids = f.party ?? s.party;
        const shops = f.shops ?? s.shops;
        const run = (lv: Partial<Record<CharacterId, number>>) =>
          simulateBattle(partyAt(ids, lv, shops), { enemies: f.enemies, level: f.level, policy: 'attack', runs: RUNS, spread: true, seed: 42 });
        const entry = run(l.entry);
        const ready = run(l.ready);
        rows.push(`| ${s.name} | ${f.name}（Lv${f.level}） | ${pct(entry.win)}・HP ${pct(entry.hpLoss)} 減 | ${pct(ready.win)}・HP ${pct(ready.hpLoss)} 減 |`);
        if (ready.win < 0.9) bad.push(`${f.name}: ${pct(ready.win)}`);
      }
    });
    if (REPORT) console.log(rows.join('\n'));
    expect(bad).toEqual([]);
  }, 60_000);

  it('ボス: 推奨の上限まで上げて進めば、技を使ってどのボスにも 55% 以上勝てる（目安の 6 割に乱数の幅を見込む。推奨の下限で進んだ場合は表に出すだけ）', () => {
    const rows: string[] = [];
    const bad: string[] = [];
    STAGES.forEach((s, i) => {
      s.bosses.forEach((f, j) => {
        const boss = f.enemies[0]!;
        const run = (lv: Partial<Record<CharacterId, number>>) =>
          simulateBattle(partyAt(s.party, lv, s.shops), { enemies: f.enemies, level: f.level, policy: 'skills', runs: BOSS_RUNS, focus: boss });
        const lower = levels[i]!.bosses[j]!;
        const top = upper[i]!.bosses[j]!;
        const l = run(lower);
        const u = run(top);
        rows.push(
          `| ${f.name}（Lv${f.level}） | ${levelText(s.party, lower)}: ${pct(l.win)}・HP ${pct(l.hpLoss)} 減 | ${levelText(s.party, top)}: ${pct(u.win)}・${u.turns.toFixed(1)} ターン・HP ${pct(u.hpLoss)} 減 |`,
        );
        if (u.win < 0.55) bad.push(`${f.name}: ${pct(u.win)}`);
      });
    });
    if (REPORT) console.log(rows.join('\n'));
    expect(bad).toEqual([]);
  }, 60_000);
});
