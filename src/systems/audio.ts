// 音楽・効果音の呼び出し口。まだ音を鳴らさず、どの曲を鳴らすことになっているかだけを持つ。
// 曲と効果音の一覧、場面への当てはめは docs/audio.md を参照。後のフェーズでここに再生処理を入れる。

/** 曲の ID（docs/audio.md の「曲（BGM）」の一覧と同じ順）。 */
export const BGM_IDS = [
  // システム・ジングル
  'bgm_title',
  'bgm_victory',
  'bgm_defeat',
  'bgm_inn',
  'bgm_join',
  'bgm_shugeki',
  // フィールド・町
  'bgm_road',
  'bgm_sea',
  'bgm_home',
  'bgm_town',
  'bgm_town_kyo',
  'bgm_town_osaka',
  'bgm_town_nanban',
  'bgm_town_snow',
  'bgm_town_edo',
  'bgm_town_night',
  // 屋内・施設
  'bgm_oyabun',
  'bgm_shrine',
  'bgm_tobaku',
  'bgm_sneak',
  // ダンジョン
  'bgm_yama',
  'bgm_dungeon',
  'bgm_ninja',
  'bgm_karakuri',
  'bgm_castle',
  'bgm_taika',
  'bgm_edojo',
  // 戦闘
  'bgm_battle',
  'bgm_boss',
  'bgm_duel',
  'bgm_washio',
  'bgm_last_boss',
  // 場面の曲（イベントで切り替える）
  'bgm_sad',
  'bgm_tension',
  'bgm_rally',
  'bgm_matsuri',
  'bgm_epilogue',
  'bgm_ending',
] as const;

export type BgmId = (typeof BGM_IDS)[number];

/** ループしない曲（ジングル）。playJingle で鳴らし、鳴り終えたら、その前の曲に戻る。 */
export const JINGLES = ['bgm_victory', 'bgm_defeat', 'bgm_inn', 'bgm_join', 'bgm_shugeki'] as const satisfies readonly BgmId[];

export type JingleId = (typeof JINGLES)[number];

/** ループする曲（playBgm で鳴らす曲）。 */
export type LoopBgmId = Exclude<BgmId, JingleId>;

/**
 * まだ書き出していない曲を鳴らそうとしたときの代わりの曲（docs/audio.md の「代わり」）。代わりもなければ、その代わりをたどる。
 * 書いていない曲は代わりがない（無音）。親分の屋敷・寺社・賭場の代わりは町の曲なので、マップの bgmFallback で渡す。
 */
export const BGM_FALLBACK: Partial<Record<BgmId, BgmId>> = {
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
};

/** id とその代わりを順にたどった並び（id を先頭に）。 */
function fallbackChain(id: BgmId): BgmId[] {
  const chain: BgmId[] = [];
  for (let cur: BgmId | undefined = id; cur && !chain.includes(cur); cur = BGM_FALLBACK[cur]) chain.push(cur);
  return chain;
}

/**
 * 実際に鳴らす曲。id から代わりをたどり、なければ fallback（マップの bgmFallback）から代わりをたどって、
 * 最初に書き出してある（available にある）曲を返す。どれもなければ null（無音）。
 */
export function resolveBgm(id: BgmId, available: ReadonlySet<BgmId>, fallback?: BgmId): BgmId | null {
  const candidates = [...fallbackChain(id), ...(fallback ? fallbackChain(fallback) : [])];
  return candidates.find((c) => available.has(c)) ?? null;
}

/** 書き出してある曲（public に Ogg Opus のある曲）。再生処理を入れるときに埋める。 */
let available: ReadonlySet<BgmId> = new Set();

export function setAvailableBgm(ids: Iterable<BgmId>): void {
  available = new Set(ids);
}

/** 鳴らすことになっている曲（求められた ID。止めていれば null）と、実際に鳴らす曲。 */
let requested: BgmId | null = null;
let playing: BgmId | null = null;

/** 曲を鳴らし始める（null なら止める）処理。鳴らす曲が替わったときだけ呼ぶ。再生処理を入れるまでは何もしない。 */
let startTrack: (id: BgmId | null) => void = () => {};

/** 曲を鳴らし始める処理を差し替える（再生処理を入れるとき・テスト）。 */
export function setBgmPlayer(player: (id: BgmId | null) => void): void {
  startTrack = player;
}

/**
 * ループする曲を鳴らす。いま鳴らしている曲と同じなら、頭から鳴らし直さずに続ける。
 * fallback は、その曲も代わりもまだないときに鳴らす曲（親分の屋敷・寺社・賭場の町の曲）。
 * null を渡すと止める。
 */
export function playBgm(id: LoopBgmId | null, fallback?: LoopBgmId): void {
  const next = id === null ? null : resolveBgm(id, available, fallback);
  requested = id;
  if (next === playing) return;
  playing = next;
  startTrack(next);
}

/** ジングル（勝利・全滅・一泊・仲間の加入）を 1 度鳴らす。鳴り終えたら、いま鳴らすことになっている曲に戻る。 */
export function playJingle(id: JingleId): void {
  void id;
  // ここで resolveBgm(id, available) を 1 度鳴らし、終わったら playing に戻す（再生処理は後のフェーズ）
}

/** 鳴らすことになっている曲の ID（止めていれば null）。 */
export function currentBgm(): BgmId | null {
  return requested;
}

/** 実際に鳴らしている曲（代わりをたどった先。無音なら null）。 */
export function playingBgm(): BgmId | null {
  return playing;
}

export type SeId = 'se_cursor' | 'se_ok' | 'se_cancel' | 'se_encounter' | 'se_slash' | 'se_damage' | 'se_levelup' | 'se_save';

export function playSe(id: SeId): void {
  void id;
}
