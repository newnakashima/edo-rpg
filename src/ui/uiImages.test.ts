import { describe, expect, it } from 'vitest';
import { CURSOR_IMAGE_SIZE, CURSOR_SCALE, ICON_IMAGE_SIZE, ICON_NAMES, ICON_SCALE, iconFrame, PAD_BUTTON_FACE_RADIUS, PAD_BUTTON_IMAGE_SIZE, PAD_DPAD_IMAGE_SIZE, PAD_IMAGE_SCALE, SUBTITLE_TEXT, TITLE_SKY_BAND, TITLE_TEXT, WINDOW_CORNER, WINDOW_IMAGE_SIZE, windowSliceRects } from './uiImages';
import { MENU_ICON_SPACE, MENU_LABEL_LEFT, MENU_LINE_HEIGHT, menuLabelLeft } from './widgets';
import { GAME_HEIGHT, GAME_WIDTH } from './theme';
import indexHtml from '../../index.html?raw';

/** PNG の幅と高さ（IHDR）。data URL の画像から読む。 */
function pngSize(dataUrl: string): { w: number; h: number } {
  const png = atob(dataUrl.split(',')[1]!);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((v, i) => v * 256 + png.charCodeAt(at + i), 0);
  return { w: u32(16), h: u32(20) };
}

/** data URL の PNG（8 bit の RGBA、インターレースなし）を読み、画素を [r, g, b, a] の 2 次元の配列で返す。 */
async function decodePng(dataUrl: string): Promise<number[][][]> {
  const bin = atob(dataUrl.split(',')[1]!);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  const u32 = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  const w = u32(16);
  const h = u32(20);
  expect([bytes[24], bytes[25], bytes[28]], 'bit depth 8・RGBA・インターレースなし').toEqual([8, 6, 0]);
  const idat: Uint8Array[] = [];
  for (let at = 8; at < bytes.length; ) {
    const len = u32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === 'IDAT') idat.push(bytes.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = new Uint8Array(await new Response(new Blob(idat.map((part) => part.slice())).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const stride = w * 4;
  const out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]!;
    expect(filter, 'PNG のフィルタは 0〜4').toBeLessThanOrEqual(4);
    for (let i = 0; i < stride; i++) {
      const v = raw[y * (stride + 1) + 1 + i]!;
      const a = i >= 4 ? out[y * stride + i - 4]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + i]! : 0;
      const c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][filter]!;
      out[y * stride + i] = (v + pred) & 0xff;
    }
  }
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => Array.from(out.subarray(y * stride + x * 4, y * stride + x * 4 + 4))));
}

const inlined = import.meta.glob<string>('../../public/assets/ui/*.png', { eager: true, query: '?inline', import: 'default' });

describe('ウィンドウ枠とカーソルの画像', () => {
  it('ウィンドウ枠とカーソルの画像があり、大きさが定数と合う', () => {
    expect(pngSize(inlined['../../public/assets/ui/window.png']!)).toEqual({ w: WINDOW_IMAGE_SIZE, h: WINDOW_IMAGE_SIZE });
    expect(pngSize(inlined['../../public/assets/ui/cursor.png']!)).toEqual({ w: CURSOR_IMAGE_SIZE, h: CURSOR_IMAGE_SIZE });
  });

  it('カーソルは表示したときに 1 行の高さに収まる', () => {
    expect(CURSOR_IMAGE_SIZE * CURSOR_SCALE).toBeLessThan(MENU_LINE_HEIGHT);
  });
});

describe('ウィンドウ枠の 9 分割', () => {
  it('画像の 9 つの枠は重ならずに画像を埋める', () => {
    const frames = Object.values(windowSliceRects(WINDOW_IMAGE_SIZE, WINDOW_IMAGE_SIZE));
    expect(frames.reduce((s, r) => s + r.w * r.h, 0)).toBe(WINDOW_IMAGE_SIZE * WINDOW_IMAGE_SIZE);
    for (const r of frames) {
      expect(r.x + r.w).toBeLessThanOrEqual(WINDOW_IMAGE_SIZE);
      expect(r.y + r.h).toBeLessThanOrEqual(WINDOW_IMAGE_SIZE);
    }
  });

  it('四隅は元の大きさのまま、辺と中央がウィンドウの大きさまで伸びる', () => {
    const r = windowSliceRects(100, 22);
    expect(r.tl).toEqual({ x: 0, y: 0, w: WINDOW_CORNER, h: WINDOW_CORNER });
    expect(r.br).toEqual({ x: 100 - WINDOW_CORNER, y: 22 - WINDOW_CORNER, w: WINDOW_CORNER, h: WINDOW_CORNER });
    expect(r.mc).toEqual({ x: WINDOW_CORNER, y: WINDOW_CORNER, w: 100 - 2 * WINDOW_CORNER, h: 22 - 2 * WINDOW_CORNER });
    expect(Object.values(r).reduce((s, x) => s + x.w * x.h, 0)).toBe(100 * 22);
  });

  it('2c より小さいウィンドウでも、長さが負にならない', () => {
    for (const r of Object.values(windowSliceRects(5, 3))) {
      expect(r.w).toBeGreaterThanOrEqual(0);
      expect(r.h).toBeGreaterThanOrEqual(0);
    }
  });

  it('枠の画像は、引き伸ばす辺が伸ばす向きに一様で、中央が 1 色（伸ばしても柄が崩れない）', async () => {
    const px = await decodePng(inlined['../../public/assets/ui/window.png']!);
    const r = windowSliceRects(WINDOW_IMAGE_SIZE, WINDOW_IMAGE_SIZE);
    const at = (x: number, y: number) => px[y]![x]!.join(',');
    // 上下の辺は横に、左右の辺は縦に伸ばすので、その向きに同じ色が続く
    for (const name of ['tc', 'bc'] as const) {
      const { x, y, w, h } = r[name];
      for (let dy = 0; dy < h; dy++) for (let dx = 1; dx < w; dx++) expect(at(x + dx, y + dy), name).toBe(at(x, y + dy));
    }
    for (const name of ['ml', 'mr'] as const) {
      const { x, y, w, h } = r[name];
      for (let dx = 0; dx < w; dx++) for (let dy = 1; dy < h; dy++) expect(at(x + dx, y + dy), name).toBe(at(x + dx, y));
    }
    const { x, y, w, h } = r.mc;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) expect(at(x + dx, y + dy), 'mc').toBe(at(x, y));
    // デコーダーが正しく読めているか、既知の色で確かめる（地は不透明な藍、左上は墨）
    expect(at(x, y)).toBe('38,32,75,255');
    expect(at(0, 0)).toBe('34,34,37,255');
  });
});

describe('タイトルの背景の画像', () => {
  it('画面と同じ大きさ', () => {
    expect(pngSize(inlined['../../public/assets/ui/title.png']!)).toEqual({ w: GAME_WIDTH, h: GAME_HEIGHT });
  });

  it('題字・副題は無地の空の帯に収まる', () => {
    for (const t of [TITLE_TEXT, SUBTITLE_TEXT]) {
      expect(t.y - t.size / 2).toBeGreaterThanOrEqual(TITLE_SKY_BAND.top);
      expect(t.y + t.size / 2).toBeLessThanOrEqual(TITLE_SKY_BAND.bottom);
    }
  });

  it('無地の空の帯は 1 色の不透明な藍（生成りの文字が絵に重ならない）', async () => {
    const px = await decodePng(inlined['../../public/assets/ui/title.png']!);
    const sky = px[TITLE_SKY_BAND.top]![0]!.join(',');
    for (let y = TITLE_SKY_BAND.top; y <= TITLE_SKY_BAND.bottom; y++) {
      for (let x = 0; x < GAME_WIDTH; x++) expect(px[y]![x]!.join(','), `${x},${y}`).toBe(sky);
    }
    expect(sky).toBe('22,40,73,255');
  });
});

describe('仮想パッドの画像', () => {
  const images = {
    dpad: PAD_DPAD_IMAGE_SIZE,
    button_ok: PAD_BUTTON_IMAGE_SIZE,
    button_cancel: PAD_BUTTON_IMAGE_SIZE,
  } as const;

  it('画像があり、大きさが定数と合う', () => {
    for (const [name, size] of Object.entries(images)) {
      expect(pngSize(inlined[`../../public/assets/ui/${name}.png`]!), name).toEqual({ w: size, h: size });
    }
  });

  /** index.html の <style> から、セレクターがちょうど selector のルールの宣言をすべて取り出す（現れた順。コメントは除く）。 */
  function cssRules(selector: string): Record<string, string>[] {
    const style = indexHtml.slice(indexHtml.indexOf('<style>'), indexHtml.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Array.from(style.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => {
      const decls: Record<string, string> = {};
      for (const part of m[1]!.split(';')) {
        const at = part.indexOf(':');
        if (at > 0) decls[part.slice(0, at).trim()] = part.slice(at + 1).trim();
      }
      return decls;
    });
  }

  /** セレクターがちょうど selector のルールが 1 つだけあり、その宣言を返す。 */
  function cssRule(selector: string): Record<string, string> {
    const rules = cssRules(selector);
    expect(rules, selector).toHaveLength(1);
    return rules[0]!;
  }

  it('index.html の十字キーと丸いボタンのルールが、画像を定数の倍率で表示する', () => {
    const dpad = PAD_DPAD_IMAGE_SIZE * PAD_IMAGE_SCALE;
    const button = PAD_BUTTON_IMAGE_SIZE * PAD_IMAGE_SCALE;
    const d = cssRule('.dpad');
    expect(d.width).toBe(`${dpad}px`);
    expect(d.height).toBe(`${dpad}px`);
    expect(d.background).toBe(`url(assets/ui/dpad.png) center / ${dpad}px ${dpad}px no-repeat`);
    const b = cssRule('.actions .btn');
    expect(b.width).toBe(`${button}px`);
    expect(b.height).toBe(`${button}px`);
    expect(b.background).toBe(`center / ${button}px ${button}px no-repeat`);
    expect(cssRule('.actions .ok')['background-image']).toBe('url(assets/ui/button_ok.png)');
    expect(cssRule('.actions .cancel')['background-image']).toBe('url(assets/ui/button_cancel.png)');
  });

  it('縦持ちのパッドの高さは、上下の余白と十字キーと下のセーフエリアの和（十字キーがはみ出さない）', () => {
    // タッチ端末で出すときの #pad（余白を持つルール）。横持ちのルールは高さを上書きしない
    const rules = cssRules('#pad');
    const shown = rules.filter((r) => r.padding);
    expect(shown).toHaveLength(1);
    expect(rules.filter((r) => r.height)).toHaveLength(1);
    const pad = shown[0]!;
    expect(pad['box-sizing']).toBe('border-box');
    const m = /^(\d+)px \d+px calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)$/.exec(pad.padding!);
    expect(m, pad.padding).not.toBeNull();
    const top = Number(m![1]);
    const bottom = Number(m![2]);
    expect(pad.height).toBe(`calc(${top + PAD_DPAD_IMAGE_SIZE * PAD_IMAGE_SCALE + bottom}px + env(safe-area-inset-bottom))`);
  });

  it('十字キーの押せる区画（3 × 3 の格子の上・左・右・下）の中心は絵の腕の上、四隅の区画の中心は透過', async () => {
    const px = await decodePng(inlined['../../public/assets/ui/dpad.png']!);
    const cell = (i: number) => Math.floor(((i + 0.5) * PAD_DPAD_IMAGE_SIZE) / 3);
    const alpha = (col: number, row: number) => px[cell(row)]![cell(col)]![3];
    for (const [col, row] of [[1, 0], [0, 1], [2, 1], [1, 2], [1, 1]] as const) expect(alpha(col, row), `${col},${row}`).toBe(255);
    for (const [col, row] of [[0, 0], [2, 0], [0, 2], [2, 2]] as const) expect(alpha(col, row), `${col},${row}`).toBe(0);
  });

  it('四隅は透過している（十字と円の外が背景に溶ける）', async () => {
    for (const [name, size] of Object.entries(images)) {
      const px = await decodePng(inlined[`../../public/assets/ui/${name}.png`]!);
      for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]] as const) {
        expect(px[y]![x]![3], `${name} ${x},${y}`).toBe(0);
      }
    }
  });

  it('丸いボタンの中央は 1 色の不透明な面で、決定は朱・取消は藍', async () => {
    const faces: Record<string, string> = {};
    for (const name of ['button_ok', 'button_cancel']) {
      const px = await decodePng(inlined[`../../public/assets/ui/${name}.png`]!);
      const c = (PAD_BUTTON_IMAGE_SIZE - 1) / 2;
      const face = px[Math.floor(c)]![Math.floor(c)]!.join(',');
      for (let y = 0; y < PAD_BUTTON_IMAGE_SIZE; y++) {
        for (let x = 0; x < PAD_BUTTON_IMAGE_SIZE; x++) {
          if (Math.hypot(x - c, y - c) <= PAD_BUTTON_FACE_RADIUS) expect(px[y]![x]!.join(','), `${name} ${x},${y}`).toBe(face);
        }
      }
      faces[name] = face;
    }
    expect(faces).toEqual({ button_ok: '176,55,48,255', button_cancel: '46,64,112,255' });
  });
});

describe('メニューのアイコンの画像', () => {
  const url = () => inlined['../../public/assets/ui/icons.png']!;

  it('32 × 32 のコマが ICON_NAMES の数だけ横に並ぶ', () => {
    expect(pngSize(url())).toEqual({ w: ICON_IMAGE_SIZE * ICON_NAMES.length, h: ICON_IMAGE_SIZE });
    ICON_NAMES.forEach((name, i) => expect(iconFrame(name)).toBe(i));
  });

  it('表示したときに 1 行の高さに収まる', () => {
    expect(ICON_IMAGE_SIZE * ICON_SCALE).toBeLessThan(MENU_LINE_HEIGHT);
  });

  it('どのコマにも絵があり、縁の 1 px は透明（隣のコマや窓の縁に絵がはみ出さない）', async () => {
    const px = await decodePng(url());
    ICON_NAMES.forEach((name, i) => {
      const left = i * ICON_IMAGE_SIZE;
      let opaque = 0;
      for (let y = 0; y < ICON_IMAGE_SIZE; y++) {
        for (let x = 0; x < ICON_IMAGE_SIZE; x++) {
          const a = px[y]![left + x]![3]!;
          if (a > 0) opaque++;
          const edge = x === 0 || y === 0 || x === ICON_IMAGE_SIZE - 1 || y === ICON_IMAGE_SIZE - 1;
          if (edge) expect(a, `${name} (${x}, ${y})`).toBe(0);
        }
      }
      expect(opaque, name).toBeGreaterThan(40);
    });
  });
});

describe('アイコンのあるメニューの名前の位置', () => {
  it('1 行でもアイコンがあれば、全部の行の名前をアイコンの分だけずらす', () => {
    expect(menuLabelLeft([{ label: 'たたかう' }, { label: 'にげる' }])).toBe(MENU_LABEL_LEFT);
    expect(menuLabelLeft([{ label: '長脇差', icon: 'katana' }, { label: 'はずす' }])).toBe(MENU_LABEL_LEFT + MENU_ICON_SPACE);
  });

  it('アイコンは名前の左の空きに収まる', () => {
    expect(ICON_IMAGE_SIZE * ICON_SCALE).toBeLessThan(MENU_ICON_SPACE);
  });
});
