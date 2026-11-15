import { describe, expect, it } from 'vitest';
import type { EventStep } from '../data/eventTypes';
import { BGM_FALLBACK, BGM_IDS, currentBgm, JINGLES, playBgm, playingBgm, playJingle, resolveBgm, setAvailableBgm, setBgmPlayer, setJinglePlayer, type BgmId } from './audio';
import { EventRunner, MAX_PARTY } from './eventScript';
import { newGame } from './gameState';
import { createMember } from './party';

describe('曲の代わり', () => {
  it('曲は docs/audio.md の一覧の 38 曲で、ジングルは 5 曲', () => {
    expect(BGM_IDS).toHaveLength(38);
    expect(new Set(BGM_IDS).size).toBe(38);
    expect([...JINGLES]).toEqual(['bgm_victory', 'bgm_defeat', 'bgm_inn', 'bgm_join', 'bgm_shugeki']);
  });

  it('代わりの表は docs/audio.md の「代わり」の列のとおり（町の曲・無音は表に入れない）', () => {
    expect(BGM_FALLBACK).toEqual({
      bgm_sea: 'bgm_road',
      bgm_home: 'bgm_town',
      bgm_town_kyo: 'bgm_town',
      bgm_town_osaka: 'bgm_town',
      bgm_town_nanban: 'bgm_town',
      bgm_town_snow: 'bgm_town',
      bgm_town_edo: 'bgm_town',
      bgm_town_night: 'bgm_town',
      bgm_sneak: 'bgm_tension',
      bgm_yama: 'bgm_dungeon',
      bgm_ninja: 'bgm_dungeon',
      bgm_karakuri: 'bgm_dungeon',
      bgm_castle: 'bgm_dungeon',
      bgm_taika: 'bgm_dungeon',
      bgm_edojo: 'bgm_castle',
      bgm_boss: 'bgm_battle',
      bgm_duel: 'bgm_boss',
      bgm_washio: 'bgm_last_boss',
      bgm_last_boss: 'bgm_boss',
      bgm_rally: 'bgm_tension',
      bgm_matsuri: 'bgm_town',
      bgm_epilogue: 'bgm_ending',
    });
  });

  it('代わりの表は一覧にある曲だけを指し、たどると必ず終わる', () => {
    for (const [id, to] of Object.entries(BGM_FALLBACK)) {
      expect(BGM_IDS).toContain(id);
      expect(BGM_IDS).toContain(to);
      const seen = new Set<string>();
      for (let cur: BgmId | undefined = id as BgmId; cur; cur = BGM_FALLBACK[cur]) {
        expect(seen.has(cur)).toBe(false);
        seen.add(cur);
      }
    }
  });

  it('書き出してある曲はそのまま、なければ代わりをたどる（決闘 → ボス → 通常戦闘）', () => {
    expect(resolveBgm('bgm_duel', new Set(['bgm_duel', 'bgm_battle']))).toBe('bgm_duel');
    expect(resolveBgm('bgm_duel', new Set(['bgm_boss', 'bgm_battle']))).toBe('bgm_boss');
    expect(resolveBgm('bgm_duel', new Set(['bgm_battle']))).toBe('bgm_battle');
    expect(resolveBgm('bgm_duel', new Set())).toBeNull();
  });

  it('代わりのない曲は無音。親分の屋敷などは、マップの bgmFallback（町の曲）とその代わりをたどる', () => {
    expect(resolveBgm('bgm_sad', new Set(['bgm_town']))).toBeNull();
    expect(resolveBgm('bgm_oyabun', new Set(['bgm_town']), 'bgm_town_snow')).toBe('bgm_town');
    expect(resolveBgm('bgm_oyabun', new Set(['bgm_town', 'bgm_oyabun']), 'bgm_town_snow')).toBe('bgm_oyabun');
  });

  it('playBgm は鳴らすことになっている曲を覚え、null で止める', () => {
    setAvailableBgm(['bgm_town']);
    playBgm('bgm_home');
    expect(currentBgm()).toBe('bgm_home');
    playBgm(null);
    expect(currentBgm()).toBeNull();
    setAvailableBgm([]);
  });

  it('いま鳴らしている曲と同じ曲（代わりをたどって同じになる曲も）なら続け、違えば替え、止めたあとは鳴らし直す', () => {
    const started: (BgmId | null)[] = [];
    setBgmPlayer((id) => started.push(id));
    setAvailableBgm(['bgm_town', 'bgm_road']);
    playBgm('bgm_town');
    playBgm('bgm_town');
    expect(playingBgm()).toBe('bgm_town');
    // 京・大坂の曲がまだなければ、どちらも町の曲に解決されるので続く
    playBgm('bgm_town_kyo');
    playBgm('bgm_town_osaka');
    expect(playingBgm()).toBe('bgm_town');
    expect(currentBgm()).toBe('bgm_town_osaka');
    playBgm('bgm_road');
    expect(playingBgm()).toBe('bgm_road');
    playBgm(null);
    expect(playingBgm()).toBeNull();
    playBgm('bgm_road');
    expect(playingBgm()).toBe('bgm_road');
    // 親分の屋敷の曲がまだなければ、fallback の町の曲
    playBgm('bgm_oyabun', 'bgm_town');
    expect(playingBgm()).toBe('bgm_town');
    // 鳴らし始めたのは、曲が替わったときと、止めたあとだけ
    expect(started).toEqual(['bgm_town', 'bgm_road', null, 'bgm_road', 'bgm_town']);
    playBgm(null);
    setAvailableBgm([]);
    setBgmPlayer(() => {});
  });

  it('playJingle は書き出してあるジングルだけを鳴らし、鳴らすことになっている曲は変えない', () => {
    const jingles: BgmId[] = [];
    const started: (BgmId | null)[] = [];
    setJinglePlayer((id) => jingles.push(id));
    setBgmPlayer((id) => started.push(id));
    setAvailableBgm(['bgm_town', 'bgm_inn']);
    playBgm('bgm_town');
    playJingle('bgm_inn');
    playJingle('bgm_join');
    expect(jingles).toEqual(['bgm_inn']);
    expect(started).toEqual(['bgm_town']);
    expect(playingBgm()).toBe('bgm_town');
    playBgm(null);
    setAvailableBgm([]);
    setBgmPlayer(() => {});
    setJinglePlayer(() => {});
  });
});

describe('イベントの曲', () => {
  const state = () => newGame('m', { mapId: 'shimizu', x: 1, y: 1 });

  it('bgm の手順で場面の曲を替え、戦闘をはさんでも続け、イベントが終わればマップの曲に戻す（undefined）', () => {
    const steps: EventStep[] = [
      { type: 'say', lines: ['a'] },
      { type: 'bgm', id: 'bgm_sad' },
      { type: 'say', lines: ['b'] },
      { type: 'battle', enemies: ['onibi'], level: 1, bgm: 'bgm_boss' },
      { type: 'say', lines: ['c'] },
    ];
    const runner = new EventRunner(steps);
    let r = runner.next(state());
    expect(runner.bgm).toBeUndefined();
    r = runner.next(r.state);
    expect(r.request).toEqual({ kind: 'say', pages: ['b'] });
    expect(runner.bgm).toBe('bgm_sad');
    r = runner.next(r.state);
    expect(r.request).toMatchObject({ kind: 'battle', bgm: 'bgm_boss' });
    r = runner.next(r.state, { kind: 'battle', outcome: 'victory' });
    expect(runner.bgm).toBe('bgm_sad');
    r = runner.next(r.state);
    expect(r.request.kind).toBe('done');
    expect(runner.bgm).toBeUndefined();
  });

  it('イベントの戦闘の曲は、書いていなければ bgm_battle', () => {
    const runner = new EventRunner([{ type: 'battle', enemies: ['onibi'], level: 1 }]);
    expect(runner.next(state()).request).toMatchObject({ kind: 'battle', bgm: 'bgm_battle' });
  });

  it('bgm の id が null なら止める', () => {
    const runner = new EventRunner([{ type: 'bgm', id: null }, { type: 'say', lines: ['a'] }]);
    runner.next(state());
    expect(runner.bgm).toBeNull();
  });

  it('仲間が加わった・戻ったときだけ、加入のジングルを鳴らす印が立つ（一度読むと消える）', () => {
    const runner = new EventRunner([
      { type: 'join', member: 'kasumi' },
      { type: 'say', lines: ['a'] },
      { type: 'join', member: 'kasumi' },
      { type: 'say', lines: ['b'] },
    ]);
    const r = runner.next(state());
    expect(runner.takeJoined()).toBe(true);
    expect(runner.takeJoined()).toBe(false);
    // もう加わっている仲間の join では立たない
    runner.next(r.state);
    expect(runner.takeJoined()).toBe(false);
  });

  it('一時離脱から戻る rejoin でも立ち、満員の join・いない仲間の rejoin では立たない', () => {
    const away = { ...state(), away: [createMember('kasumi', 5)] };
    const back = new EventRunner([{ type: 'rejoin', member: 'kasumi' }, { type: 'say', lines: ['a'] }]);
    back.next(away);
    expect(back.takeJoined()).toBe(true);

    const nobody = new EventRunner([{ type: 'rejoin', member: 'kasumi' }, { type: 'say', lines: ['a'] }]);
    nobody.next(state());
    expect(nobody.takeJoined()).toBe(false);

    const base = state();
    const full = { ...base, party: [...base.party, ...(['kasumi', 'gendo', 'orin'] as const).map((id) => createMember(id, 5))] };
    expect(full.party).toHaveLength(MAX_PARTY);
    const crowded = new EventRunner([{ type: 'join', member: 'hyogo' }, { type: 'say', lines: ['a'] }]);
    crowded.next(full);
    expect(crowded.takeJoined()).toBe(false);
  });
});
