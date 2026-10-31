import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { FACE_SIZE, FACES, faceForPage, SPEAKER_FACES, speakerOf } from './faces';

/** PNG の幅と高さ（IHDR）。data URL の画像から読む。 */
function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
}

describe('顔グラフィック', () => {
  it('どの顔にも 48 × 48 の画像がある', () => {
    const inlined = import.meta.glob<string>('../../public/assets/faces/*.png', { eager: true, query: '?inline', import: 'default' });
    expect(Object.keys(inlined).sort()).toEqual(FACES.map((id) => `../../public/assets/faces/${id}.png`).sort());
    for (const id of FACES) expect(pngSize(inlined[`../../public/assets/faces/${id}.png`]!), id).toEqual({ w: FACE_SIZE, h: FACE_SIZE });
  });

  it('どの顔も、だれかの台詞に使われる', () => {
    expect(new Set(Object.values(SPEAKER_FACES))).toEqual(new Set(FACES));
  });

  it('主人公の名前は characters.ts の男女の名前と同じ', () => {
    const name = CHARACTERS.hero.name;
    expect(typeof name).toBe('object');
    if (typeof name === 'object') {
      expect(SPEAKER_FACES[name.m]).toBe('hero_m');
      expect(SPEAKER_FACES[name.f]).toBe('hero_f');
    }
  });

  it('顔を引く名前は、どれも実際の台詞の話し手にいる', () => {
    const source = Object.values(import.meta.glob<string>('./{events,maps}.ts', { eager: true, query: '?raw', import: 'default' })).join('\n');
    expect(source).toContain('霞「');
    const speakers = new Set([...source.matchAll(/['"`]([^'"`「」\s]{1,8})「/g)].map((m) => m[1]));
    // 主人公は {hero} のまま書いてあり、置き換えた後の名前（男女）で引く
    const heroName = CHARACTERS.hero.name;
    const heroNames: string[] = typeof heroName === 'object' ? Object.values(heroName) : [heroName];
    expect(speakers).toContain('{hero}');
    for (const name of Object.keys(SPEAKER_FACES)) {
      if (heroNames.includes(name)) continue;
      expect(speakers, name).toContain(name);
    }
  });
});

describe('話し手の名前', () => {
  it('ページの先頭の「名前「」から取り出す', () => {
    expect(speakerOf('霞「行こう」')).toBe('霞');
    expect(speakerOf('長瀬左近「殿を……」')).toBe('長瀬左近');
  });

  it('地の文は話し手にしない', () => {
    expect(speakerOf('{hero}は格子の錠を断ち切った。')).toBeUndefined();
    expect(speakerOf('「誰だ」')).toBeUndefined();
    // 「立て札に「…」」のような地の文は名前の形に見えるが、顔の表にない名前なので顔は出ない
    expect(faceForPage('立て札に「この先、関所」とある。')).toBeUndefined();
  });

  it('顔のある人だけ顔を引く', () => {
    expect(faceForPage('霞「行こう」')).toBe('kasumi');
    expect(faceForPage('お志乃「……親分が」')).toBe('hero_f');
    expect(faceForPage('船頭「乗っていくかい」')).toBeUndefined();
    expect(faceForPage('静かな夜だ。')).toBeUndefined();
  });
});
