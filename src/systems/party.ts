import { CHARACTERS, type CharacterId } from '../data/characters';
import { equipmentBonus, STARTING_EQUIPMENT, type Equipped } from '../data/equipment';
import { skillsLearnedBetween } from '../data/skills';
import { levelForExp, statsAtLevel, totalExpForLevel, type Stats } from './stats';

export interface PartyMember {
  id: CharacterId;
  /** 累計経験値。レベルはここから求める。 */
  exp: number;
  hp: number;
  mp: number;
  /** 付けている装備。 */
  equip: Equipped;
}

export function memberLevel(member: PartyMember): number {
  return levelForExp(member.exp);
}

/** 装備を含めた能力値。 */
export function memberStats(member: PartyMember): Stats {
  const base = statsAtLevel(CHARACTERS[member.id].base, memberLevel(member));
  const bonus = equipmentBonus(member.equip);
  return {
    maxHp: base.maxHp + bonus.maxHp,
    maxMp: base.maxMp + bonus.maxMp,
    atk: base.atk + bonus.atk,
    def: base.def + bonus.def,
    mag: base.mag + bonus.mag,
    spd: base.spd + bonus.spd,
    luck: base.luck + bonus.luck,
  };
}

/** レベル L の仲間を、加入時の装備を付け、HP・MP 満タンで作る。 */
export function createMember(id: CharacterId, level = 1, equip: Equipped = STARTING_EQUIPMENT[id]): PartyMember {
  const member: PartyMember = { id, exp: totalExpForLevel(level), hp: 0, mp: 0, equip: { ...equip } };
  const stats = memberStats(member);
  return { ...member, hp: stats.maxHp, mp: stats.maxMp };
}

/** 全員の HP・MP を全回復する（旅籠）。 */
export function restoreAll(party: PartyMember[]): PartyMember[] {
  return party.map((m) => {
    const s = memberStats(m);
    return { ...m, hp: s.maxHp, mp: s.maxMp };
  });
}

export interface LevelUp {
  id: CharacterId;
  from: number;
  to: number;
  /** このレベルアップで覚えた技の ID。 */
  learned: string[];
}

/**
 * 仲間ごとに経験値を加える（amounts[i] が party[i] の分）。戦闘不能（HP 0）の仲間は経験値を得ない。
 * レベルが上がった分だけ最大 HP・MP の増分を現在値にも加える。
 */
export function gainExp(party: PartyMember[], amounts: number[]): { party: PartyMember[]; levelUps: LevelUp[] } {
  const levelUps: LevelUp[] = [];
  const next = party.map((m, i) => {
    const amount = amounts[i] ?? 0;
    if (m.hp <= 0 || amount <= 0) return m;
    const before = memberStats(m);
    const from = memberLevel(m);
    const updated = { ...m, exp: m.exp + amount };
    const to = memberLevel(updated);
    if (to === from) return updated;
    levelUps.push({ id: m.id, from, to, learned: skillsLearnedBetween(m.id, from, to) });
    const after = memberStats(updated);
    return {
      ...updated,
      hp: updated.hp + (after.maxHp - before.maxHp),
      mp: updated.mp + (after.maxMp - before.maxMp),
    };
  });
  return { party: next, levelUps };
}
