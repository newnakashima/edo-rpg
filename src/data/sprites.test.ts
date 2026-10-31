import { describe, expect, it } from 'vitest';
import { CHAR_FRAME, CHARACTER_SPRITES, FACINGS, heroSprite, idleFrame, objectDepth, objectDisplayOrigin, oppositeFacing, personDepth, shouldStandStill, walkDepthRow, walkFrame, WALK_FRAMES } from './sprites';

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

describe('向きと重なり順', () => {
  it('反対の向き', () => {
    expect(FACINGS.map(oppositeFacing)).toEqual(['up', 'right', 'left', 'down']);
  });

  it('下にいる人ほど手前に描き、町の名前の表示（5）より上', () => {
    expect(personDepth(3)).toBeLessThan(personDepth(4));
    expect(personDepth(0)).toBeGreaterThan(5);
    expect(personDepth(200)).toBeLessThan(11);
  });
});

describe('歩くときの重なり順', () => {
  it('下へ歩くときは歩き始めから移った先、上へ歩くときは着くまで元の行', () => {
    expect(walkDepthRow(4, 5)).toBe(5);
    expect(walkDepthRow(5, 4)).toBe(5);
    expect(walkDepthRow(4, 4)).toBe(4);
  });
});

describe('シートの画像', () => {
  it('全てのキャラクターのシートが public/assets/chars/ にある', () => {
    const files = Object.keys(import.meta.glob('../../public/assets/chars/*.png'));
    for (const id of CHARACTER_SPRITES) {
      expect(files, id).toContain(`../../public/assets/chars/${id}.png`);
    }
    expect(CHAR_FRAME).toBe(40);
  });
});

describe('物の置き方', () => {
  it('16 × 16 の物はタイルの左上に、32 × 32 の物は下端の中央をタイルの下端の中央に合わせる', () => {
    expect(objectDisplayOrigin('tsuzura')).toEqual({ x: 0, y: 0 });
    expect(objectDisplayOrigin('hokora')).toEqual({ x: 8, y: 16 });
  });

  it('物は、上の行（奥）に立った人よりも奥、下の行の人よりも奥に描く', () => {
    const y = 7;
    expect(objectDepth(y)).toBeLessThan(personDepth(y - 1));
    expect(objectDepth(y)).toBeLessThan(personDepth(y + 1));
    // 2 行上の人（物に重ならない）より手前
    expect(objectDepth(y)).toBeGreaterThan(personDepth(y - 2));
    // 町の名前の表示（5）より上
    expect(objectDepth(0)).toBeGreaterThan(5);
  });
});
