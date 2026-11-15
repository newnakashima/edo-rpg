// マップ・イベントの曲が docs/audio.md の「場面への当てはめ」どおりかを確かめる。
import { describe, expect, it } from 'vitest';
import type { BgmId } from '../systems/audio';
import { buildingTown } from './buildings';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { MAPS } from './maps';
import { isMinka } from './minka';

/** 手順を分岐の中まで含めて、書いてある順にたどる。 */
function* walk(steps: readonly EventStep[]): Generator<EventStep> {
  for (const step of steps) {
    yield step;
    if (step.type === 'if') {
      yield* walk(step.then);
      if (step.else) yield* walk(step.else);
    } else if (step.type === 'choice') {
      for (const o of step.options) yield* walk(o.steps);
    } else if (step.type === 'battle' && step.ifLose) {
      yield* walk(step.ifLose);
    } else if (step.type === 'giveItem' && step.ifFull) {
      yield* walk(step.ifFull);
    }
  }
}

/** 屋内（建物・民家）でないマップの曲。 */
const OUTDOOR_BGM: Record<string, BgmId> = {
  world: 'bgm_road',
  shimizu: 'bgm_home',
  sunpu: 'bgm_town',
  nagoya: 'bgm_town',
  hamamatsu: 'bgm_town',
  hikone: 'bgm_town',
  iga: 'bgm_town',
  hiroshima: 'bgm_town',
  kumamoto: 'bgm_town',
  sendai: 'bgm_town',
  takoya: 'bgm_town',
  kyo: 'bgm_town_kyo',
  osaka: 'bgm_town_osaka',
  nagasaki: 'bgm_town_nanban',
  dejima: 'bgm_town_nanban',
  kanazawa: 'bgm_town_snow',
  aizu: 'bgm_town_snow',
  edo: 'bgm_town_edo',
  kagiya: 'bgm_town_night',
  kobo: 'bgm_sneak',
  yoriki: 'bgm_sneak',
  kitamaebune: 'bgm_sea',
  urayama: 'bgm_yama',
  hamamatsuMatsubayashi: 'bgm_yama',
  hikoneSawayama: 'bgm_yama',
  aizuIimoriyama: 'bgm_yama',
  kitsunebiCave: 'bgm_dungeon',
  rashomon: 'bgm_dungeon',
  oninosu: 'bgm_dungeon',
  nanbanji: 'bgm_dungeon',
  harajo: 'bgm_dungeon',
  kiyomasaIdo: 'bgm_dungeon',
  horikawaKura: 'bgm_dungeon',
  igaSato: 'bgm_ninja',
  karakuriYashiki: 'bgm_karakuri',
  komeKura: 'bgm_karakuri',
  kenkyujo: 'bgm_karakuri',
  karakuriGura: 'bgm_karakuri',
  tenshu: 'bgm_castle',
  kenrokuen: 'bgm_castle',
  edoTaika: 'bgm_taika',
  edojo: 'bgm_edojo',
  matsuNoRoka: 'bgm_edojo',
};

describe('マップの曲', () => {
  const parentOf = (id: string) => buildingTown(id) ?? (isMinka(id) ? MAPS[id]!.exits[0]!.to : undefined);

  it('屋内でないマップは、表のとおりの曲', () => {
    const outdoor = Object.values(MAPS).filter((m) => parentOf(m.id) === undefined);
    expect(Object.fromEntries(outdoor.map((m) => [m.id, m.bgm]))).toEqual(OUTDOOR_BGM);
  });

  it('屋内は町（建物のあるマップ）の曲。親分の屋敷・寺社・賭場だけは別の曲で、まだなければ町の曲を鳴らす', () => {
    const facility: Record<string, BgmId> = {};
    for (const m of Object.values(MAPS)) {
      const parent = parentOf(m.id);
      if (!parent) continue;
      if (m.bgm === MAPS[parent]!.bgm) {
        expect(m.bgmFallback, m.id).toBeUndefined();
        continue;
      }
      facility[m.id] = m.bgm;
      expect(m.bgmFallback, m.id).toBe(MAPS[parent]!.bgm);
    }
    const ids = (bgm: BgmId) => Object.keys(facility).filter((id) => facility[id] === bgm).sort();
    expect(new Set(Object.values(facility))).toEqual(new Set(['bgm_oyabun', 'bgm_shrine', 'bgm_tobaku']));
    // 親分の屋敷は親分のいる 15 の町に 1 軒ずつ
    expect(ids('bgm_oyabun')).toHaveLength(15);
    expect(ids('bgm_oyabun').every((id) => /Oyabun/.test(id))).toBe(true);
    expect(ids('bgm_tobaku').every((id) => /Tobaku/.test(id))).toBe(true);
    expect(ids('bgm_shrine')).toEqual(
      [
        ...['shimizu', 'hiroshima', 'nagasaki', 'hamamatsu', 'hikone', 'kumamoto', 'aizu', 'edo'].map((t) => `${t}Tera`),
        'kanazawaZendera',
        'kanazawaShikakeDera',
        'sunpuSengen',
        'nagoyaAtsuta',
        'kyoYasaka',
        'igaTenjin',
        'osakaTennoji',
        'sendaiHachiman',
      ].sort(),
    );
  });

  it('伊賀者の里・鍵屋の辻の民家は、その里・辻の曲', () => {
    const minka = Object.values(MAPS).filter((m) => isMinka(m.id));
    expect(minka.filter((m) => m.exits[0]!.to === 'igaSato').every((m) => m.bgm === 'bgm_ninja')).toBe(true);
    expect(minka.filter((m) => m.exits[0]!.to === 'kagiya').every((m) => m.bgm === 'bgm_town_night')).toBe(true);
  });
});

describe('イベントの曲', () => {
  it('イベントの戦闘の曲は、章のボス・因縁の相手・鷲尾・大権現だけ別の曲（ほかは bgm_battle）', () => {
    const special: Record<string, BgmId> = {};
    for (const def of Object.values(EVENTS)) {
      for (const step of walk(def.steps)) if (step.type === 'battle' && step.bgm) special[step.enemies.join(',')] = step.bgm;
    }
    expect(special).toEqual({
      yako: 'bgm_boss',
      tetsubin: 'bgm_boss',
      kinshachi: 'bgm_boss',
      shuten: 'bgm_boss',
      oboro: 'bgm_duel',
      gonroku: 'bgm_duel',
      hyakuhyo: 'bgm_boss',
      nanbanOzutsu: 'bgm_boss',
      'funayurei,umibozu,funayurei': 'bgm_boss',
      kagemusha: 'bgm_boss',
      yashamaru: 'bgm_duel',
      kashaKarakuri: 'bgm_boss',
      onizukaTenzen: 'bgm_duel',
      washio: 'bgm_washio',
      karakuriDaigongen: 'bgm_last_boss',
    });
  });

  it('場面の曲を替えるイベントと、その曲の順', () => {
    const scenes: Record<string, (BgmId | null)[]> = {};
    for (const def of Object.values(EVENTS)) {
      const ids = [...walk(def.steps)].flatMap((s) => (s.type === 'bgm' ? [s.id] : []));
      if (ids.length > 0) scenes[def.id] = ids;
    }
    expect(scenes).toEqual({
      yako: ['bgm_tension'],
      tetsubin: ['bgm_tension', 'bgm_sad'],
      kinshachi: ['bgm_sad'],
      shuten: ['bgm_tension'],
      kyoEnter: ['bgm_tension'],
      shimizuEnter: ['bgm_sad'],
      gonroku: ['bgm_sad'],
      osakaEnter: ['bgm_sad', 'bgm_sad'],
      nanbanOzutsu: ['bgm_sad'],
      sakonMeet: ['bgm_tension'],
      yashamaruBattle: ['bgm_sad'],
      edoEnter: ['bgm_tension'],
      kokichi: ['bgm_tension'],
      oharu: ['bgm_sad', 'bgm_taika'],
      okanegura: ['bgm_rally'],
      ookuBakeneko: ['bgm_rally'],
      hyogoReturn: ['bgm_rally'],
      shogunNoMa: ['bgm_tension', 'bgm_sad', 'bgm_epilogue', 'bgm_ending'],
      hamamatsuGenta: ['bgm_matsuri'],
    });
  });
});
