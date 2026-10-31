import { CHARACTERS, type CharacterId } from '../data/characters';
import { levelForExp, statsAtLevel, totalExpForLevel, type Stats } from './stats';

export interface PartyMember {
  id: CharacterId;
  /** 累計経験値。レベルはここから求める。 */
  exp: number;
  hp: number;
  mp: number;
}

export function memberLevel(member: PartyMember): number {
  return levelForExp(member.exp);
}

export function memberStats(member: PartyMember): Stats {
  return statsAtLevel(CHARACTERS[member.id].base, memberLevel(member));
}

/** レベル L の仲間を、HP・MP 満タンで作る。 */
export function createMember(id: CharacterId, level = 1): PartyMember {
  const exp = totalExpForLevel(level);
  const stats = statsAtLevel(CHARACTERS[id].base, level);
  return { id, exp, hp: stats.maxHp, mp: stats.maxMp };
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
    levelUps.push({ id: m.id, from, to });
    const after = memberStats(updated);
    return {
      ...updated,
      hp: updated.hp + (after.maxHp - before.maxHp),
      mp: updated.mp + (after.maxMp - before.maxMp),
    };
  });
  return { party: next, levelUps };
}
