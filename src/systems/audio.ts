// 音楽・効果音の呼び出し口。どの曲を鳴らすことになっているかを持ち、曲が替わったときだけ再生処理（src/ui/bgmPlayer.ts）を呼ぶ。
// 効果音は、書き出してあるもの（またはその代わり）だけを再生処理（src/ui/sePlayer.ts）に渡す。
// 曲と効果音の一覧、場面への当てはめは docs/audio.md を参照。

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

/** 書き出してある曲（public に Ogg Opus のある曲）。起動時に src/data/bgmTracks.ts の一覧で埋める。 */
let available: ReadonlySet<BgmId> = new Set();

export function setAvailableBgm(ids: Iterable<BgmId>): void {
  available = new Set(ids);
}

/** 鳴らすことになっている曲（求められた ID。止めていれば null）と、実際に鳴らす曲。 */
let requested: BgmId | null = null;
let playing: BgmId | null = null;

/** 曲を鳴らし始める（null なら止める）処理。鳴らす曲が替わったときだけ呼ぶ。起動時に再生処理を入れる（テストでは何もしない）。 */
let startTrack: (id: BgmId | null) => void = () => {};

/** ジングルを 1 度鳴らす処理。鳴り終えたら、そのとき鳴らしている曲に戻すのは再生処理の役目。 */
let startJingle: (id: BgmId) => void = () => {};

/** 曲を鳴らし始める処理を差し替える（起動時・テスト）。 */
export function setBgmPlayer(player: (id: BgmId | null) => void): void {
  startTrack = player;
}

/** ジングルを鳴らす処理を差し替える（起動時・テスト）。 */
export function setJinglePlayer(player: (id: BgmId) => void): void {
  startJingle = player;
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
  const track = resolveBgm(id, available);
  if (track) startJingle(track);
}

/** 鳴らすことになっている曲の ID（止めていれば null）。 */
export function currentBgm(): BgmId | null {
  return requested;
}

/** 実際に鳴らしている曲（代わりをたどった先。無音なら null）。 */
export function playingBgm(): BgmId | null {
  return playing;
}

/** 効果音の ID（docs/audio.md の「効果音（SE）」の一覧と同じ順）。 */
export const SE_IDS = [
  // システム・メニュー
  'se_cursor',
  'se_ok',
  'se_cancel',
  'se_buzzer',
  'se_message',
  'se_save',
  'se_coin',
  'se_item',
  'se_equip',
  // フィールド
  'se_door',
  'se_stairs',
  'se_chest',
  'se_encounter',
  'se_warp',
  'se_ward',
  'se_dice',
  'se_jingi',
  // 戦闘
  'se_slash',
  'se_hit',
  'se_shuriken',
  'se_gun',
  'se_cannon',
  'se_fire',
  'se_magic',
  'se_thunder',
  'se_critical',
  'se_damage',
  'se_miss',
  'se_guard',
  'se_buff',
  'se_debuff',
  'se_ailment',
  'se_heal',
  'se_revive',
  'se_enemy_down',
  'se_ko',
  'se_escape',
  'se_explode',
  'se_summon',
  'se_charge',
  'se_levelup',
  // 場面（イベントの手順で鳴らす）
  'se_karakuri',
  'se_crash',
  'se_smoke',
  'se_bell',
  'se_hansho',
  'se_quake',
  'se_fall',
  'se_sheathe',
  'se_gate',
  'se_splash',
  'se_hyoshigi',
] as const;

export type SeId = (typeof SE_IDS)[number];

/** まだ書き出していない効果音を鳴らそうとしたときの代わり（docs/audio.md の「なければ」）。書いていない効果音は代わりがない（無音）。 */
export const SE_FALLBACK: Partial<Record<SeId, SeId>> = {
  se_cannon: 'se_gun',
  se_thunder: 'se_magic',
};

/** 実際に鳴らす効果音。id が書き出してなければ代わりをたどり、どれもなければ null（無音）。 */
export function resolveSe(id: SeId, available: ReadonlySet<SeId>): SeId | null {
  const seen: SeId[] = [];
  for (let cur: SeId | undefined = id; cur && !seen.includes(cur); cur = SE_FALLBACK[cur]) {
    if (available.has(cur)) return cur;
    seen.push(cur);
  }
  return null;
}

/** 書き出してある効果音（public に Ogg Opus のある効果音）。起動時に src/data/seTracks.ts の一覧で埋める。 */
let availableSe: ReadonlySet<SeId> = new Set();

export function setAvailableSe(ids: Iterable<SeId>): void {
  availableSe = new Set(ids);
}

/** 効果音を 1 度鳴らす処理。起動時に再生処理（src/ui/sePlayer.ts）を入れる（テストでは何もしない）。 */
let startSe: (id: SeId) => void = () => {};

/** 効果音を鳴らす処理を差し替える（起動時・テスト）。 */
export function setSePlayer(player: (id: SeId) => void): void {
  startSe = player;
}

/** 効果音を 1 度鳴らす。まだ書き出していなければ代わりを鳴らし、代わりもなければ鳴らさない。 */
export function playSe(id: SeId): void {
  const se = resolveSe(id, availableSe);
  if (se) startSe(se);
}
