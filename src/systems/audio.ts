// 音楽・効果音の呼び出し口。今回は音を実装しないので何もしない。
// 曲と効果音の一覧は docs/audio.md を参照。後のフェーズでここに再生処理を入れる。

export type BgmId =
  | 'bgm_title'
  | 'bgm_town'
  | 'bgm_road'
  | 'bgm_battle'
  | 'bgm_victory'
  | 'bgm_inn';

export type SeId = 'se_cursor' | 'se_ok' | 'se_cancel' | 'se_encounter' | 'se_slash' | 'se_damage' | 'se_levelup' | 'se_save';

export function playBgm(id: BgmId): void {
  void id;
}

export function playSe(id: SeId): void {
  void id;
}
