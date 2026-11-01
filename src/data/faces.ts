// 会話の顔グラフィック（PixelLab で生成した 48 × 48。public/assets/faces/<ID>.png）。記録は public/assets/README.md。
// 台詞は「名前「……」」の形でそろっているので、ページの先頭の名前から顔を引く（events.ts などの台詞を書き換えなくてよい）。
/** 顔の画像の大きさ（テストで画像を確かめる。窓は読み込んだ画像の幅から文字の位置を決めるので、ここの値は使わない）。 */
export const FACE_SIZE = 48;

/** 顔の画像がある人物。 */
export const FACES = [
  'hero_m',
  'hero_f',
  'kasumi',
  'gendo',
  'orin',
  'tatsugoro',
  'hyogo',
  'yashamaru',
  'kinta',
  'oboro',
  'gonroku',
  'ranzai',
  'sakon',
  'kagaTono',
  'kokichi',
  'washio',
  'tenzen',
  'shogun',
  'tatewaki',
] as const;
export type FaceId = (typeof FACES)[number];

/**
 * 台詞の話し手の名前 → 顔。主人公は {hero} を置き換えた後の名前（characters.ts の男女の名前。テストで照合する）。
 * 町の人の呼び名（船頭・役人など）は人によって違うので顔を出さない。
 * 「殿様」は今は加賀の殿様だけが使う（ほかの殿様を出すときは呼び名を分ける）。
 */
export const SPEAKER_FACES: Readonly<Record<string, FaceId>> = {
  弥太郎: 'hero_m',
  お志乃: 'hero_f',
  霞: 'kasumi',
  玄道: 'gendo',
  お凛: 'orin',
  辰五郎: 'tatsugoro',
  兵庫: 'hyogo',
  夜叉丸: 'yashamaru',
  金太: 'kinta',
  朧: 'oboro',
  権六: 'gonroku',
  蘭斎: 'ranzai',
  長瀬左近: 'sakon',
  殿様: 'kagaTono',
  小吉: 'kokichi',
  鷲尾: 'washio',
  典膳: 'tenzen',
  // 終章の将軍（影武者は話さないので、本物の上様だけが使う）
  上様: 'shogun',
  片平帯刀: 'tatewaki',
};

/**
 * 表情差分。台詞の名前の後ろに〈怒〉〈悲〉を書くと、その表情の顔を出す（例: 霞〈怒〉「許さない」）。
 * 印は画面には出さない（pageText で外す）。印のない台詞と、差分のない人の台詞は通常の顔。
 */
export const EXPRESSIONS = { 怒: 'angry', 悲: 'sad' } as const;
export type ExpressionMark = keyof typeof EXPRESSIONS;
export type Expression = (typeof EXPRESSIONS)[ExpressionMark];

/** 表情差分（怒り・悲しみ）の顔がある人物（旅の仲間。画像は faces/<ID>_<表情>.png）。 */
export const EXPRESSION_FACES = ['hero_m', 'hero_f', 'kasumi', 'gendo', 'orin'] as const satisfies readonly FaceId[];

/** 顔の画像（通常の顔と表情差分）。public/assets/faces/<この名前>.png。 */
export type FaceImage = FaceId | `${(typeof EXPRESSION_FACES)[number]}_${Expression}`;
export const FACE_IMAGES: readonly FaceImage[] = [
  ...FACES,
  ...EXPRESSION_FACES.flatMap((id) => Object.values(EXPRESSIONS).map((e) => `${id}_${e}` as const)),
];

export function faceKey(id: FaceImage): string {
  return `face_${id}`;
}

/** ページの先頭の「名前「」または「名前〈印〉「」。名前・印・印を外した文を返す。 */
function parsePage(page: string): { speaker?: string; mark?: string; text: string } {
  const m = /^([^「」〈〉\s]{1,8})(?:〈([^〈〉「」]{1,2})〉)?「/.exec(page);
  if (!m) return { text: page };
  const speaker = m[1]!;
  const mark = m[2];
  return { speaker, mark, text: mark === undefined ? page : speaker + page.slice(speaker.length + mark.length + 2) };
}

/** ページの先頭の「名前「」（または「名前〈印〉「」）から話し手の名前を取り出す。台詞でなければ undefined。 */
export function speakerOf(page: string): string | undefined {
  return parsePage(page).speaker;
}

/** ページの表情の印（〈怒〉なら「怒」）。印がなければ undefined。 */
export function expressionMarkOf(page: string): string | undefined {
  return parsePage(page).mark;
}

/** 画面に出す文（表情の印を外したもの）。 */
export function pageText(page: string): string {
  return parsePage(page).text;
}

/** ページの話し手の顔の画像。顔のない人や地の文なら undefined。表情差分のない人・印は通常の顔にする。 */
export function faceForPage(page: string): FaceImage | undefined {
  const { speaker, mark } = parsePage(page);
  // Object.hasOwn: 「constructor「」のような名前でオブジェクトの継承したものを引かないため
  if (speaker === undefined || !Object.hasOwn(SPEAKER_FACES, speaker)) return undefined;
  const face = SPEAKER_FACES[speaker]!;
  if (mark === undefined || !Object.hasOwn(EXPRESSIONS, mark)) return face;
  const expression = EXPRESSIONS[mark as ExpressionMark];
  return (EXPRESSION_FACES as readonly FaceId[]).includes(face) ? (`${face}_${expression}` as FaceImage) : face;
}
