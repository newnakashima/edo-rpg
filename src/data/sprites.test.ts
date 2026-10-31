import { describe, expect, it } from 'vitest';
import { FACINGS, heroSprite, idleFrame, shouldStandStill, walkFrame, WALK_FRAMES } from './sprites';

describe('キャラクターのスプライトシート', () => {
  it('行は下・左・右・上、列は立ちと歩行 4 コマ', () => {
    expect(idleFrame('down')).toBe(0);
    expect(idleFrame('left')).toBe(5);
    expect(idleFrame('right')).toBe(10);
    expect(idleFrame('up')).toBe(15);
    expect(walkFrame('down', 0)).toBe(1);
    expect(walkFrame('up', WALK_FRAMES - 1)).toBe(19);
  });

  it('コマ番号が重ならない', () => {
    const all = FACINGS.flatMap((f) => [idleFrame(f), ...Array.from({ length: WALK_FRAMES }, (_, i) => walkFrame(f, i))]);
    expect(new Set(all).size).toBe(all.length);
    expect(Math.max(...all)).toBe(FACINGS.length * (1 + WALK_FRAMES) - 1);
  });

  it('主人公の性別からシートを選ぶ', () => {
    expect(heroSprite('m')).toBe('hero_m');
    expect(heroSprite('f')).toBe('hero_f');
  });
});

describe('立ち姿に戻すか', () => {
  it('1 歩の移動中は戻さない', () => {
    expect(shouldStandStill({ moving: true, busy: false, held: true })).toBe(false);
    expect(shouldStandStill({ moving: true, busy: true, held: false })).toBe(false);
  });

  it('止まっていて方向が押されていなければ戻す', () => {
    expect(shouldStandStill({ moving: false, busy: false, held: false })).toBe(true);
  });

  it('方向が押され続けていれば、次の 1 歩に続けるため戻さない', () => {
    expect(shouldStandStill({ moving: false, busy: false, held: true })).toBe(false);
  });

  it('メニュー・会話・イベントの最中は、方向が押されていても戻す', () => {
    expect(shouldStandStill({ moving: false, busy: true, held: true })).toBe(true);
  });
});
