// メニュー画面（戦闘の外）での道具・技・装備。画面に依存しない純粋なロジック。
import { canEquip, EQUIPMENT, type EquipSlot } from '../data/equipment';
import { addItem, ITEMS, itemCount, removeItem } from '../data/items';
import { SKILLS, skillsAtLevel } from '../data/skills';
import { healAmount } from './combat';
import type { GameState } from './gameState';
import { memberLevel, memberStats, type PartyMember } from './party';
import { growthFactor } from './stats';

export type FieldResult =
  | { ok: true; state: GameState; changes: { index: number; hp: number; mp: number }[] }
  | { ok: false; reason: 'noItem' | 'notField' | 'noEffect' | 'noMp' | 'casterDown' | 'cannotEquip' };

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
  if (!m) return { ok: false, reason: 'noEffect' };
  const s = memberStats(m);
  const e = item.effect;
  let next: PartyMember;
  if (e.kind === 'revive') {
    if (m.hp > 0) return { ok: false, reason: 'noEffect' };
    next = { ...m, hp: Math.max(1, Math.floor(s.maxHp * e.rate)) };
  } else if (m.hp <= 0) {
    return { ok: false, reason: 'noEffect' };
  } else if (e.kind === 'healHp') {
    if (m.hp >= s.maxHp) return { ok: false, reason: 'noEffect' };
    next = { ...m, hp: Math.min(s.maxHp, m.hp + e.amount) };
  } else if (e.kind === 'healMp') {
    if (m.mp >= s.maxMp) return { ok: false, reason: 'noEffect' };
    next = { ...m, mp: Math.min(s.maxMp, m.mp + e.amount) };
  } else {
    return { ok: false, reason: 'noEffect' };
  }
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

/**
 * 装備を付け替える。equipId が null なら外す。外した装備は所持品に戻す。
 * 最大 HP・MP が減ったら、今の HP・MP を最大値に収める。
 */
export function changeEquipment(state: GameState, index: number, slot: EquipSlot, equipId: string | null): FieldResult {
  const m = state.party[index];
  if (!m) return { ok: false, reason: 'cannotEquip' };
  let items = state.items;
  if (equipId !== null) {
    const def = EQUIPMENT[equipId];
    if (!def || def.slot !== slot || !canEquip(m.id, equipId)) return { ok: false, reason: 'cannotEquip' };
    if (itemCount(items, equipId) < 1) return { ok: false, reason: 'noItem' };
    items = removeItem(items, equipId) ?? items;
  }
  const current = m.equip[slot];
  if (current) items = addItem(items, current);
  const equip = { ...m.equip };
  if (equipId === null) delete equip[slot];
  else equip[slot] = equipId;
  const changed = { ...m, equip };
  const s = memberStats(changed);
  const next = { ...changed, hp: Math.min(changed.hp, s.maxHp), mp: Math.min(changed.mp, s.maxMp) };
  return { ok: true, state: { ...setMember(state, index, next), items }, changes: [] };
}

/** 装備を付け替えたら能力値がどう変わるか（メニューでの比較用）。 */
export function statsWithEquipment(member: PartyMember, slot: EquipSlot, equipId: string | null) {
  const equip = { ...member.equip };
  if (equipId === null) delete equip[slot];
  else equip[slot] = equipId;
  return memberStats({ ...member, equip });
}
