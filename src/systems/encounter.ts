import type { EncounterTable } from '../data/enemies';
import { randInt, type Rng } from './random';

export const ENCOUNTER_STEPS_MIN = 16;
export const ENCOUNTER_STEPS_MAX = 32;

export function nextEncounterSteps(rng: Rng): number {
  return randInt(rng, ENCOUNTER_STEPS_MIN, ENCOUNTER_STEPS_MAX);
}

/** 1 歩進めて、残り歩数と、戦闘になるかを返す。 */
export function step(stepsLeft: number, rng: Rng): { stepsLeft: number; encounter: boolean } {
  const left = stepsLeft - 1;
  if (left > 0) return { stepsLeft: left, encounter: false };
  return { stepsLeft: nextEncounterSteps(rng), encounter: true };
}

/**
 * 出現表から敵グループを重みに従って選ぶ。敵の数は「味方の人数 + 1」以下に制限し、
 * minPartyLevel に届かない組は除く（docs/balance.md の「エンカウント」）。条件に合う組がなければ null。
 */
export function pickGroup(table: EncounterTable, party: { size: number; maxLevel: number }, rng: Rng): string[] | null {
  const groups = table.groups.filter(
    (g) => g.weight > 0 && g.members.length <= party.size + 1 && party.maxLevel >= (g.minPartyLevel ?? 1),
  );
  const total = groups.reduce((s, g) => s + g.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const g of groups) {
    r -= g.weight;
    if (r < 0) return [...g.members];
  }
  const last = groups[groups.length - 1];
  return last ? [...last.members] : null;
}
