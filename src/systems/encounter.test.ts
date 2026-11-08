import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, type EncounterTable } from '../data/enemies';
import { ENCOUNTER_STEPS_MAX, ENCOUNTER_STEPS_MIN, nextEncounterSteps, pickGroup, step, stepOnRoad } from './encounter';
import { seededRng, seqRng } from './testUtils';

describe('歩数', () => {
  it('次のエンカウントまでの歩数は 16〜32', () => {
    expect(nextEncounterSteps(seqRng(0))).toBe(ENCOUNTER_STEPS_MIN);
    expect(nextEncounterSteps(seqRng(0.9999))).toBe(ENCOUNTER_STEPS_MAX);
  });

  it('残りが 0 になると戦闘になり、歩数を引き直す', () => {
    expect(step(5, seqRng(0))).toEqual({ stepsLeft: 4, encounter: false });
    expect(step(1, seqRng(0))).toEqual({ stepsLeft: ENCOUNTER_STEPS_MIN, encounter: true });
  });
});

describe('魔除け（魔除けの香・結界の真言）', () => {
  it('効いているあいだは残りの歩数だけが減り、戦闘にならず、エンカウントまでの歩数も進まない', () => {
    expect(stepOnRoad({ stepsToEncounter: 1, wardSteps: 3 }, true, seqRng(0))).toEqual({ stepsToEncounter: 1, wardSteps: 2, encounter: false, wardEnded: false });
  });

  it('最後の 1 歩で切れたことを知らせ、その歩では戦闘にならない', () => {
    expect(stepOnRoad({ stepsToEncounter: 1, wardSteps: 1 }, true, seqRng(0))).toEqual({ stepsToEncounter: 1, wardSteps: 0, encounter: false, wardEnded: true });
  });

  it('切れたあと（省いたときも）は、いつもどおり歩数を数えて戦闘になる', () => {
    expect(stepOnRoad({ stepsToEncounter: 1, wardSteps: 0 }, true, seqRng(0))).toEqual({ stepsToEncounter: ENCOUNTER_STEPS_MIN, wardSteps: 0, encounter: true, wardEnded: false });
    expect(stepOnRoad({ stepsToEncounter: 5 }, true, seqRng(0))).toEqual({ stepsToEncounter: 4, wardSteps: 0, encounter: false, wardEnded: false });
  });

  it('敵の出ない場所（町の中など）では、魔除けの残りもエンカウントまでの歩数も変わらない', () => {
    expect(stepOnRoad({ stepsToEncounter: 1, wardSteps: 1 }, false, seqRng(0))).toEqual({ stepsToEncounter: 1, wardSteps: 1, encounter: false, wardEnded: false });
    expect(stepOnRoad({ stepsToEncounter: 1 }, false, seqRng(0))).toEqual({ stepsToEncounter: 1, wardSteps: 0, encounter: false, wardEnded: false });
  });

  it('150 歩のあいだは一度も戦闘にならない', () => {
    let cur = { stepsToEncounter: 1, wardSteps: 150 };
    for (let i = 0; i < 150; i++) {
      const r = stepOnRoad(cur, true, seededRng(i));
      expect(r.encounter).toBe(false);
      cur = r;
    }
    expect(cur.wardSteps).toBe(0);
  });
});

describe('pickGroup', () => {
  const table: EncounterTable = {
    level: 1,
    groups: [
      { members: ['a'], weight: 1 },
      { members: ['b', 'b'], weight: 1 },
      { members: ['c', 'c', 'c'], weight: 1 },
      { members: ['d', 'd'], weight: 1, minPartyLevel: 3 },
    ],
  };

  it('敵の数は味方の人数 + 1 以下', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 200; i++) {
      const g = pickGroup(table, { size: 1, maxLevel: 5 }, rng);
      expect(g && g.length).toBeLessThanOrEqual(2);
    }
  });

  it('minPartyLevel に届かない組は出ない', () => {
    const rng = seededRng(8);
    for (let i = 0; i < 200; i++) {
      expect(pickGroup(table, { size: 4, maxLevel: 2 }, rng)).not.toEqual(['d', 'd']);
    }
  });

  it('重みに従って選ぶ', () => {
    expect(pickGroup(table, { size: 4, maxLevel: 5 }, seqRng(0))).toEqual(['a']);
    expect(pickGroup(table, { size: 4, maxLevel: 5 }, seqRng(0.99))).toEqual(['d', 'd']);
  });

  it('条件に合う組がなければ null', () => {
    expect(pickGroup({ level: 1, groups: [{ members: ['a', 'a', 'a'], weight: 1 }] }, { size: 1, maxLevel: 1 }, seqRng(0))).toBeNull();
  });

  it('序章の 2 体の組は Lv2 から出て、山犬を含む 2 体の組はない', () => {
    const urayama = ENCOUNTERS.urayama;
    if (!urayama) throw new Error('missing table');
    for (const g of urayama.groups.filter((x) => x.members.length >= 2)) {
      expect(g.members).toContain('onibi');
      expect(g.members).not.toContain('yamainu');
    }
    const rng = seededRng(10);
    const sizes = new Set(Array.from({ length: 200 }, () => pickGroup(urayama, { size: 1, maxLevel: 2 }, rng)?.length));
    expect(sizes).toEqual(new Set([1, 2]));
  });

  it('序章の Lv1 の主人公には 1 体の組しか出ない', () => {
    const urayama = ENCOUNTERS.urayama;
    if (!urayama) throw new Error('missing table');
    const rng = seededRng(9);
    for (let i = 0; i < 200; i++) {
      expect(pickGroup(urayama, { size: 1, maxLevel: 1 }, rng)).toHaveLength(1);
    }
  });
});
