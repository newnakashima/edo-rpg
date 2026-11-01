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

export function faceKey(id: FaceId): string {
  return `face_${id}`;
}

/** ページの先頭の「名前「」から話し手の名前を取り出す。台詞でなければ undefined。 */
export function speakerOf(page: string): string | undefined {
  const m = /^([^「」\s]{1,8})「/.exec(page);
  return m?.[1];
}

/** ページの話し手の顔。顔のない人や地の文なら undefined。 */
export function faceForPage(page: string): FaceId | undefined {
  const speaker = speakerOf(page);
  // Object.hasOwn: 「constructor「」のような名前でオブジェクトの継承したものを引かないため
  return speaker !== undefined && Object.hasOwn(SPEAKER_FACES, speaker) ? SPEAKER_FACES[speaker] : undefined;
}
