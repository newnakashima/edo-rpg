import { describe, expect, it } from 'vitest';
import { pngSize } from '../systems/testUtils';
import { CHARACTERS, type CharacterId } from './characters';
import { PORTRAIT_HEIGHT, PORTRAIT_WIDTH, portraitFor, PORTRAITS } from './portraits';

describe('立ち絵', () => {
  it('PORTRAITS の画像がすべてあり、64 × 96 で、ほかの画像はない', () => {
    const inlined = import.meta.glob<string>('../../public/assets/portraits/*.png', { eager: true, query: '?inline', import: 'default' });
    expect(Object.keys(inlined).sort()).toEqual(PORTRAITS.map((id) => `../../public/assets/portraits/${id}.png`).sort());
    for (const id of PORTRAITS) expect(pngSize(inlined[`../../public/assets/portraits/${id}.png`]!), id).toEqual({ w: PORTRAIT_WIDTH, h: PORTRAIT_HEIGHT });
  });

  it('仲間になる人物はみな立ち絵を持ち、主人公は男女で分かれる', () => {
    for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
      expect(PORTRAITS).toContain(portraitFor(id, 'm'));
      expect(PORTRAITS).toContain(portraitFor(id, 'f'));
    }
    expect(portraitFor('hero', 'm')).toBe('hero_m');
    expect(portraitFor('hero', 'f')).toBe('hero_f');
    expect(portraitFor('kasumi', 'f')).toBe('kasumi');
  });
});
