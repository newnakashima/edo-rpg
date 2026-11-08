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
 * 1 歩進める。敵の出ない場所（onRoad が false。町の中など）では、エンカウントまでの歩数も魔除けの残りも変えない。
 * 敵の出る場所では、魔除け（wardSteps）が効いていれば、その残りだけを減らして戦闘にならず、
 * エンカウントまでの歩数は進めない。wardEnded はこの 1 歩で魔除けが切れたか。
 */
export function stepOnRoad(
  current: { stepsToEncounter: number; wardSteps?: number },
  onRoad: boolean,
  rng: Rng,
): { stepsToEncounter: number; wardSteps: number; encounter: boolean; wardEnded: boolean } {
  const ward = current.wardSteps ?? 0;
  if (!onRoad) return { stepsToEncounter: current.stepsToEncounter, wardSteps: ward, encounter: false, wardEnded: false };
  if (ward > 0) return { stepsToEncounter: current.stepsToEncounter, wardSteps: ward - 1, encounter: false, wardEnded: ward === 1 };
  const result = step(current.stepsToEncounter, rng);
  return { stepsToEncounter: result.stepsLeft, wardSteps: 0, encounter: result.encounter, wardEnded: false };
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
