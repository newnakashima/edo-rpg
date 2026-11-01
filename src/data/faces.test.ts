import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { EXPRESSION_FACES, EXPRESSIONS, FACE_IMAGES, FACE_SIZE, FACES, faceForPage, pageText, SPEAKER_FACES, speakerOf } from './faces';

/** PNG の幅と高さ（IHDR）。data URL の画像から読む。 */
function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
}

describe('顔グラフィック', () => {
  it('どの顔（表情差分を含む）にも 48 × 48 の画像がある', () => {
    const inlined = import.meta.glob<string>('../../public/assets/faces/*.png', { eager: true, query: '?inline', import: 'default' });
    expect(Object.keys(inlined).sort()).toEqual(FACE_IMAGES.map((id) => `../../public/assets/faces/${id}.png`).sort());
    for (const id of FACE_IMAGES) expect(pngSize(inlined[`../../public/assets/faces/${id}.png`]!), id).toEqual({ w: FACE_SIZE, h: FACE_SIZE });
    // 表情差分は、仲間それぞれの怒り・悲しみの 2 枚
    expect(FACE_IMAGES.length).toBe(FACES.length + EXPRESSION_FACES.length * Object.keys(EXPRESSIONS).length);
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

describe('顔のある台詞の長さ', () => {
  it('顔の右の文字幅（1 行およそ 27 字）で 3 行に収まり、右下の ▼ に重ならない長さ', () => {
    // フィールドの窓（高さ 54、11px）は 3 行まで。顔があると 1 行がおよそ 27 字になる（ui/messageLayout.ts）。
    // 折り返しの禁則と ▼ の分を見て、3 行の 81 字より少し短い 76 字までにする
    const source = Object.values(import.meta.glob<string>('./{events,maps}.ts', { eager: true, query: '?raw', import: 'default' })).join('\n');
    const names = [...Object.keys(SPEAKER_FACES), '{hero}'];
    // 表情の印（〈怒〉など）は画面に出ないので、外した長さで数える
    const lines = [...source.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!).filter((l) => names.includes(speakerOf(l) ?? ''));
    expect(lines.length).toBeGreaterThan(100);
    for (const line of lines) expect(pageText(line).length, line).toBeLessThanOrEqual(76);
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

  it('名前の後ろの表情の印は、話し手の名前に含めない', () => {
    expect(speakerOf('霞〈怒〉「許さない」')).toBe('霞');
    expect(speakerOf('{hero}〈悲〉「……親分が」')).toBe('{hero}');
  });

  it('顔のある人だけ顔を引く', () => {
    expect(faceForPage('霞「行こう」')).toBe('kasumi');
    expect(faceForPage('お志乃「……親分が」')).toBe('hero_f');
    expect(faceForPage('船頭「乗っていくかい」')).toBeUndefined();
    expect(faceForPage('静かな夜だ。')).toBeUndefined();
    expect(faceForPage('constructor「……」')).toBeUndefined();
  });
});

describe('表情差分', () => {
  it('印に合った表情の顔を引く', () => {
    expect(faceForPage('霞〈怒〉「許さない」')).toBe('kasumi_angry');
    expect(faceForPage('お凛〈悲〉「……おとっつぁん」')).toBe('orin_sad');
    expect(faceForPage('弥太郎〈悲〉「……親分が」')).toBe('hero_m_sad');
    expect(faceForPage('お志乃〈怒〉「させないよ！」')).toBe('hero_f_angry');
  });

  it('差分のない人や、知らない印は通常の顔にする', () => {
    expect(faceForPage('金太〈怒〉「なにを！」')).toBe('kinta');
    expect(faceForPage('霞〈笑〉「ふふ」')).toBe('kasumi');
    expect(faceForPage('船頭〈怒〉「こら！」')).toBeUndefined();
  });

  it('画面に出す文からは印を外す', () => {
    expect(pageText('霞〈怒〉「許さない」')).toBe('霞「許さない」');
    expect(pageText('霞「行こう」')).toBe('霞「行こう」');
    expect(pageText('静かな夜だ。〈怒〉')).toBe('静かな夜だ。〈怒〉');
  });

  it('台詞の印は〈怒〉〈悲〉だけで、表情差分のある人（主人公・仲間）にだけ付いている', () => {
    const source = Object.values(import.meta.glob<string>('./{events,maps}.ts', { eager: true, query: '?raw', import: 'default' })).join('\n');
    const marked = [...source.matchAll(/'([^'「」\s]{1,8})〈([^〉]*)〉「/g)];
    expect(marked.length).toBeGreaterThan(20);
    // 書き損じ（名前と印の間の空白、半角の <>、9 字以上の名前など）は印として読まれず画面に出てしまうので、
    // 台詞の文字列の中の〈は、どれも「'名前〈印〉「」の形で使われていること
    const strings = [...source.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]!);
    const brackets = strings.reduce((n, str) => n + [...str.matchAll(/〈/g)].length, 0);
    expect(brackets).toBe(marked.length);
    for (const [whole, speaker, mark] of marked) {
      expect(Object.keys(EXPRESSIONS), whole).toContain(mark);
      // 主人公は {hero} のまま書いてあり、男女どちらの顔にも差分がある
      if (speaker !== '{hero}') expect(EXPRESSION_FACES as readonly string[], whole).toContain(SPEAKER_FACES[speaker!]);
    }
    // どの表情差分も、少なくとも 1 か所で使う（主人公は {hero} で男女の両方に使われる）
    for (const id of EXPRESSION_FACES) {
      for (const mark of Object.keys(EXPRESSIONS)) {
        const used = marked.some(([, speaker, m]) => m === mark && (speaker === '{hero}' ? id.startsWith('hero_') : SPEAKER_FACES[speaker!] === id));
        expect(used, `${id} ${mark}`).toBe(true);
      }
    }
  });
});
