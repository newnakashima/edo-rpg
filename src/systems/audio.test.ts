import { describe, expect, it } from 'vitest';
import type { EventStep } from '../data/eventTypes';
import { BGM_FALLBACK, BGM_IDS, currentBgm, playBgm, resolveBgm, setAvailableBgm, type BgmId } from './audio';
import { EventRunner } from './eventScript';
import { newGame } from './gameState';

describe('曲の代わり', () => {
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
});
