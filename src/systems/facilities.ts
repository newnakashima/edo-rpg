// 町の施設（docs/balance.md の「経済」）。
import type { GameState } from './gameState';
import { memberStats, restoreAll, type PartyMember } from './party';
import type { Stats } from './stats';
import { randInt, type Rng } from './random';

/**
 * 町の旅籠の宿代。旅籠は渡世人の一行を泊めない（親分の屋敷か、もぐりの宿に泊まる）が、
 * 湯屋・居酒屋・妓楼・もぐりの宿の値段の基準として使う。
 */
export function innPrice(areaLevel: number): number {
  return 10 + areaLevel * 4;
}

export function dangoPrice(areaLevel: number): number {
  return 5 + areaLevel;
}

/** 団子で回復する割合（最大 HP に対する割合）。 */
export const DANGO_HEAL_RATE = 0.3;

/** 茶屋のメニューの選択肢（並び順）。その場で団子を食べる・持ち帰りの品を買う（品を売る店があるときだけ）・やめる。 */
export type TeahouseChoice = 'eat' | 'buy' | 'cancel';

export function teahouseChoices(hasShop: boolean): TeahouseChoice[] {
  return hasShop ? ['eat', 'buy', 'cancel'] : ['eat', 'cancel'];
}

export type PurchaseResult = { ok: true; state: GameState } | { ok: false; reason: 'money' };

/** もぐりの宿（ワールドマップの非合法な旅籠）の宿代。町の旅籠の 4 倍（妓楼の 3 倍より高い、いちばん高い全回復）。 */
export function moguriInnPrice(areaLevel: number): number {
  return innPrice(areaLevel) * 4;
}

/** もぐりの宿に泊まる。全員の HP・MP を全回復する（戦闘不能も治る）。 */
export function stayAtMoguriInn(state: GameState, areaLevel: number): PurchaseResult {
  const price = moguriInnPrice(areaLevel);
  if (state.money < price) return { ok: false, reason: 'money' };
  return { ok: true, state: { ...state, money: state.money - price, party: restoreAll(state.party) } };
}

/** 茶屋で団子を食べる。戦闘不能でない全員の HP を少し回復する。 */
export function eatDango(state: GameState, areaLevel: number): PurchaseResult {
  const price = dangoPrice(areaLevel);
  if (state.money < price) return { ok: false, reason: 'money' };
  const party = state.party.map((m) => {
    if (m.hp <= 0) return m;
    const max = memberStats(m).maxHp;
    return { ...m, hp: Math.min(max, m.hp + Math.ceil(max * DANGO_HEAL_RATE)) };
  });
  return { ok: true, state: { ...state, money: state.money - price, party } };
}

/** 湯屋の湯銭（体力だけを戻す。宿代 innPrice の半分ほど）。 */
export function yuyaPrice(areaLevel: number): number {
  return 6 + areaLevel * 2;
}

/** 居酒屋の一杯の値段（気力だけを戻す。湯屋と同じ）。 */
export function izakayaPrice(areaLevel: number): number {
  return 6 + areaLevel * 2;
}

/** 妓楼の座敷の値段（体力と気力を戻す。宿代 innPrice の 3 倍）。 */
export function gyoroPrice(areaLevel: number): number {
  return innPrice(areaLevel) * 3;
}

/**
 * 代金を払い、戦闘不能でない全員を heal で回復する。
 * もぐりの宿（stayAtMoguriInn）と同じく、回復する余地がなくても代金を取る。直すなら合わせて、満タンのときは { ok: false, reason: 'full' } を返す。
 */
function payAndHeal(
  state: GameState,
  price: number,
  heal: (m: PartyMember, max: Stats) => PartyMember,
): PurchaseResult {
  if (state.money < price) return { ok: false, reason: 'money' };
  const party = state.party.map((m) => (m.hp <= 0 ? m : heal(m, memberStats(m))));
  return { ok: true, state: { ...state, money: state.money - price, party } };
}

/** 湯屋で湯に浸かる。戦闘不能でない全員の体力を最大まで戻す（気力は戻らない）。 */
export function takeBath(state: GameState, areaLevel: number): PurchaseResult {
  return payAndHeal(state, yuyaPrice(areaLevel), (m, max) => ({ ...m, hp: max.maxHp }));
}

/** 居酒屋で一杯やる。戦闘不能でない全員の気力を最大まで戻す（戦闘の外なので酔わない）。 */
export function drinkAtIzakaya(state: GameState, areaLevel: number): PurchaseResult {
  return payAndHeal(state, izakayaPrice(areaLevel), (m, max) => ({ ...m, mp: max.maxMp }));
}

/** 妓楼の座敷に上がる。戦闘不能でない全員の体力と気力を最大まで戻す（倒れた仲間は起こさない）。 */
export function visitGyoro(state: GameState, areaLevel: number): PurchaseResult {
  return payAndHeal(state, gyoroPrice(areaLevel), (m, max) => ({ ...m, hp: max.maxHp, mp: max.maxMp }));
}

/** 賭場で張れる額（文）。 */
export const CHOHAN_BETS = [10, 100, 1000] as const;

/** 勝ったときに賭場が取る寺銭（勝ち分に対する割合。切り捨て）。 */
const TERASEN_RATE = 0.05;

/** 丁（偶数）か半（奇数）か。 */
export type ChohanCall = 'cho' | 'han';

export type ChohanResult =
  | { ok: true; state: GameState; dice: [number, number]; win: boolean; gain: number }
  | { ok: false; reason: 'money' };

/** 丁半の勝ち分（張った額から寺銭を引いた額）。 */
export function chohanWinnings(bet: number): number {
  return bet - Math.floor(bet * TERASEN_RATE);
}

const DICE_KANJI = ['一', '二', '三', '四', '五', '六'];

/** 壺振りの出目の読み上げ（「四・六の丁」など。ぞろ目は「五のぞろ目の丁」）。 */
export function chohanRollText(dice: readonly [number, number]): string {
  const [a, b] = dice;
  const parity = (a + b) % 2 === 0 ? '丁' : '半';
  if (a === b) return `${DICE_KANJI[a - 1]}のぞろ目の${parity}`;
  return `${DICE_KANJI[a - 1]}・${DICE_KANJI[b - 1]}の${parity}`;
}

/** 賭場で丁半を張る。二つのさいころの目の和が偶数なら丁、奇数なら半。当たれば張った額から寺銭を引いた額を得て、外れれば張った額を失う。 */
export function playChohan(state: GameState, bet: number, call: ChohanCall, rng: Rng): ChohanResult {
  if (state.money < bet) return { ok: false, reason: 'money' };
  const dice: [number, number] = [randInt(rng, 1, 6), randInt(rng, 1, 6)];
  const result: ChohanCall = (dice[0] + dice[1]) % 2 === 0 ? 'cho' : 'han';
  const win = result === call;
  const gain = win ? chohanWinnings(bet) : -bet;
  return { ok: true, state: { ...state, money: state.money + gain }, dice, win, gain };
}

/** 全滅したとき。所持金を半分にし、全員を全回復して町の旅籠の前（町の人に介抱される）に戻す。 */
export function reviveAfterDefeat(state: GameState, respawn: { mapId: string; x: number; y: number }): GameState {
  return {
    ...state,
    money: Math.floor(state.money / 2),
    party: restoreAll(state.party),
    mapId: respawn.mapId,
    x: respawn.x,
    y: respawn.y,
    facing: 'down',
  };
}
