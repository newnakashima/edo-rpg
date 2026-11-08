// メニュー画面（戦闘の外）での道具・技・装備と、ステータス画面の内容。画面に依存しない純粋なロジック。
import { CHARACTERS, characterName, isGuest, type Gender } from '../data/characters';
import { canEquip, EQUIP_SLOTS, EQUIPMENT, SLOT_NAMES, type EquipSlot } from '../data/equipment';
import { addItem, ITEMS, itemCount, itemName, MAX_ITEM_COUNT, removeItem } from '../data/items';
import { escapePoint } from '../data/maps';
import { SKILLS, skillsAtLevel, type SkillDef } from '../data/skills';
import { healAmount } from './combat';
import type { GameState } from './gameState';
import { memberLevel, memberStats, type PartyMember } from './party';
import { expRemainingToNext, growthFactor, type Stats } from './stats';

export type FieldResult =
  | { ok: true; state: GameState; changes: { index: number; hp: number; mp: number }[] }
  | { ok: false; reason: 'noItem' | 'notField' | 'noEffect' | 'noMp' | 'casterDown' | 'cannotEquip' | 'full' | 'guest' };

function setMember(state: GameState, index: number, member: PartyMember): GameState {
  return { ...state, party: state.party.map((m, i) => (i === index ? member : m)) };
}

/** 道具をメニューで使う。効かないとき（満タン、倒れた仲間に傷薬など）は使わない。 */
export function useItemInField(state: GameState, itemId: string, target: number): FieldResult {
  const item = ITEMS[itemId];
  if (!item) return { ok: false, reason: 'noItem' };
  if (!item.field) return { ok: false, reason: 'notField' };
  const rest = removeItem(state.items, itemId);
  if (!rest) return { ok: false, reason: 'noItem' };
  const m = state.party[target];
  if (!m || !itemUsableOn(itemId, m)) return { ok: false, reason: 'noEffect' };
  const s = memberStats(m);
  const e = item.effect;
  let next: PartyMember;
  if (e.kind === 'revive') next = { ...m, hp: Math.max(1, Math.floor(s.maxHp * e.rate)) };
  else if (e.kind === 'healHp') next = { ...m, hp: Math.min(s.maxHp, m.hp + e.amount) };
  else if (e.kind === 'healMp') next = { ...m, mp: Math.min(s.maxMp, m.mp + e.amount) };
  else if (e.kind === 'healBoth') next = { ...m, hp: Math.min(s.maxHp, m.hp + e.hp), mp: Math.min(s.maxMp, m.mp + e.mp) };
  else return { ok: false, reason: 'noEffect' };
  return {
    ok: true,
    state: { ...setMember(state, target, next), items: rest },
    changes: [{ index: target, hp: next.hp - m.hp, mp: next.mp - m.mp }],
  };
}

/** その仲間がメニューで使える技（覚えていて、戦闘の外で使えるもの）。 */
export function fieldSkills(member: PartyMember): string[] {
  return skillsAtLevel(member.id, memberLevel(member)).filter((id) => SKILLS[id]?.field);
}

/**
 * 回復の技をメニューで使う。target は単体の技のときの対象（全体の技では使わない）。
 * 誰も回復しないとき（全員満タン・倒れている）は使わず、気力も減らさない。
 */
export function useSkillInField(state: GameState, caster: number, skillId: string, target?: number): FieldResult {
  const skill = SKILLS[skillId];
  const c = state.party[caster];
  if (!skill || !c || !fieldSkills(c).includes(skillId) || skill.effect.kind !== 'heal') return { ok: false, reason: 'notField' };
  if (c.hp <= 0) return { ok: false, reason: 'casterDown' };
  if (c.mp < skill.mp) return { ok: false, reason: 'noMp' };
  const targets = skill.target === 'allAllies' ? state.party.map((_, i) => i) : target === undefined ? [] : [target];
  const amount = healAmount(skill.effect.power * growthFactor(memberLevel(c)), memberStats(c).mag);
  const changes: { index: number; hp: number; mp: number }[] = [];
  const party = state.party.map((m, i) => {
    if (!targets.includes(i) || m.hp <= 0) return m;
    const max = memberStats(m).maxHp;
    const hp = Math.min(max, m.hp + amount);
    if (hp === m.hp) return m;
    changes.push({ index: i, hp: hp - m.hp, mp: 0 });
    return { ...m, hp };
  });
  if (changes.length === 0) return { ok: false, reason: 'noEffect' };
  const casterAfter = party[caster];
  if (!casterAfter) return { ok: false, reason: 'notField' };
  party[caster] = { ...casterAfter, mp: casterAfter.mp - skill.mp };
  changes.push({ index: caster, hp: 0, mp: -skill.mp });
  return { ok: true, state: { ...state, party }, changes };
}

export type EscapeResult =
  | { ok: true; state: GameState; to: { mapId: string; x: number; y: number } }
  | { ok: false; reason: 'noItem' | 'notField' | 'noMp' | 'casterDown' | 'noEscape' };

/**
 * ダンジョンから入口の外へ戻る道具（道しるべの札）か技（抜け道）を使う。by が道具の ID か、技を使う仲間と技の ID。
 * ダンジョンの外や、歩いて出られないダンジョンでは使わず、道具も気力も減らさない（noEscape。気力が足りないなどより先に断る）。
 * 戻った state は道具・気力を減らしただけで、居場所は変えない（画面の切り替えと一緒に to へ移す）。
 */
export function escapeInField(state: GameState, by: { item: string } | { caster: number; skill: string }): EscapeResult {
  const to = escapePoint(state.mapId);
  let next: GameState;
  if ('item' in by) {
    const item = ITEMS[by.item];
    if (!item || item.effect.kind !== 'escape') return { ok: false, reason: 'notField' };
    if (!to) return { ok: false, reason: 'noEscape' };
    const rest = removeItem(state.items, by.item);
    if (!rest) return { ok: false, reason: 'noItem' };
    next = { ...state, items: rest };
  } else {
    const skill = SKILLS[by.skill];
    const c = state.party[by.caster];
    if (!skill || !c || skill.effect.kind !== 'escape' || !fieldSkills(c).includes(by.skill)) return { ok: false, reason: 'notField' };
    if (!to) return { ok: false, reason: 'noEscape' };
    if (c.hp <= 0) return { ok: false, reason: 'casterDown' };
    if (c.mp < skill.mp) return { ok: false, reason: 'noMp' };
    next = setMember(state, by.caster, { ...c, mp: c.mp - skill.mp });
  }
  return { ok: true, state: next, to };
}

/**
 * 装備を付け替える。equipId が null なら外す。外した装備は所持品に戻す。
 * 最大 HP・MP が減ったら、今の HP・MP を最大値に収める。
 */
export function changeEquipment(state: GameState, index: number, slot: EquipSlot, equipId: string | null): FieldResult {
  const m = state.party[index];
  if (!m) return { ok: false, reason: 'cannotEquip' };
  // ゲストの装備は変えられない（外した装備が所持品に残らないように）
  if (isGuest(m.id)) return { ok: false, reason: 'guest' };
  let items = state.items;
  if (equipId !== null) {
    const def = EQUIPMENT[equipId];
    if (!def || def.slot !== slot || !canEquip(m.id, equipId)) return { ok: false, reason: 'cannotEquip' };
    if (itemCount(items, equipId) < 1) return { ok: false, reason: 'noItem' };
    items = removeItem(items, equipId) ?? items;
  }
  const current = m.equip[slot];
  if (current) {
    // 外した装備を戻す場所がなければ、付け替えない（黙って消さない）
    if (itemCount(items, current) >= MAX_ITEM_COUNT) return { ok: false, reason: 'full' };
    items = addItem(items, current);
  }
  const changed = withEquipment(m, slot, equipId);
  const s = memberStats(changed);
  const next = { ...changed, hp: Math.min(changed.hp, s.maxHp), mp: Math.min(changed.mp, s.maxMp) };
  return { ok: true, state: { ...setMember(state, index, next), items }, changes: [] };
}

/** 枠の装備を付け替えた（null なら外した）仲間。所持品は変えない。 */
function withEquipment(member: PartyMember, slot: EquipSlot, equipId: string | null): PartyMember {
  const equip = { ...member.equip };
  if (equipId === null) delete equip[slot];
  else equip[slot] = equipId;
  return { ...member, equip };
}

/** 装備を付け替えたら能力値がどう変わるか（メニューでの比較用）。 */
export function statsWithEquipment(member: PartyMember, slot: EquipSlot, equipId: string | null) {
  return memberStats(withEquipment(member, slot, equipId));
}

/** 仲間の並びで a 番目と b 番目を入れ替える（メニューの並び替え）。範囲外か同じ位置なら state をそのまま返す。 */
export function swapMembers(state: GameState, a: number, b: number): GameState {
  const ma = state.party[a];
  const mb = state.party[b];
  if (!ma || !mb || a === b) return state;
  return { ...state, party: state.party.map((m, i) => (i === a ? mb : i === b ? ma : m)) };
}

/** 道具がその仲間に効くか（メニューで対象を選ぶときに、効かない仲間を選べなくする）。 */
export function itemUsableOn(itemId: string, member: PartyMember): boolean {
  const effect = ITEMS[itemId]?.effect;
  if (!effect) return false;
  const s = memberStats(member);
  switch (effect.kind) {
    case 'revive':
      return member.hp <= 0;
    case 'healHp':
      return member.hp > 0 && member.hp < s.maxHp;
    case 'healMp':
      return member.hp > 0 && member.mp < s.maxMp;
    case 'healBoth':
      return member.hp > 0 && (member.hp < s.maxHp || member.mp < s.maxMp);
    case 'cure':
    case 'escape':
      return false;
  }
}

/** 次のレベルまでの経験値。ゲストは成長しないので null（最大レベルも null）。 */
export function expToNext(member: PartyMember): number | null {
  return isGuest(member.id) ? null : expRemainingToNext(member.exp);
}

/** 技の説明の窓に出す文。withField なら、戦闘の外でも使える技にそう書き足す。戦闘の外だけの技（抜け道）には、いつもそう書き足す。 */
export function skillDescription(skill: SkillDef, withField = false): string {
  const where = skill.fieldOnly ? '・戦闘の外だけで使う' : withField && skill.field ? '・戦闘の外でも使える' : '';
  return `${skill.description}（気力 ${skill.mp}${where}）`;
}

/** ステータス画面の能力値の並び（表示名と Stats のキー）。 */
const STATUS_STATS: readonly (readonly [string, keyof Stats])[] = [
  ['攻撃', 'atk'],
  ['防御', 'def'],
  ['術力', 'mag'],
  ['素早さ', 'spd'],
  ['運', 'luck'],
];

/** ステータス画面の装備・技の 1 行。 */
export interface StatusEntry {
  label: string;
  /** 右寄せの補足（技の消費する気力）。 */
  note?: string;
  /** カーソルを合わせたときに説明の窓に出す文。 */
  description: string;
  /** 装備の行なら、その枠（アイコンに使う）。 */
  slot?: EquipSlot;
}

/** メニューのステータス画面に出す内容（画面に依存しない）。 */
export interface StatusSheet {
  name: string;
  job: string;
  level: number;
  hp: string;
  mp: string;
  /** 倒れている（体力 0）。 */
  down: boolean;
  stats: { label: string; value: number }[];
  exp: number;
  /** 次のレベルまでの経験値。ゲストは成長しないので null。 */
  next: number | null;
  equipment: StatusEntry[];
  /** 覚えている技（習得順）。 */
  skills: StatusEntry[];
}

export function statusSheet(member: PartyMember, gender: Gender): StatusSheet {
  const s = memberStats(member);
  const level = memberLevel(member);
  return {
    name: characterName(member.id, gender),
    job: CHARACTERS[member.id].job,
    level,
    hp: `${member.hp}/${s.maxHp}`,
    mp: `${member.mp}/${s.maxMp}`,
    down: member.hp <= 0,
    stats: STATUS_STATS.map(([label, key]) => ({ label, value: s[key] })),
    exp: member.exp,
    next: expToNext(member),
    equipment: EQUIP_SLOTS.map((slot) => {
      const id = member.equip[slot];
      return {
        label: id ? itemName(id) : '――',
        slot,
        description: id ? `${SLOT_NAMES[slot]}: ${EQUIPMENT[id]?.description ?? ''}` : `${SLOT_NAMES[slot]}: 何も付けていない`,
      };
    }),
    skills: skillsAtLevel(member.id, level).flatMap((id) => {
      const skill = SKILLS[id];
      if (!skill) return [];
      return [{ label: skill.name, note: String(skill.mp), description: skillDescription(skill, true) }];
    }),
  };
}
