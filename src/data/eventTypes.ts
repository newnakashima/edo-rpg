// イベントスクリプトの形。シナリオはこの形のデータ（events.ts）として書き、systems/eventScript.ts が実行する。
import type { CharacterId } from './characters';

/**
 * イベントの 1 手順。
 * 台詞の中の {hero} は主人公の名前に置き換える。linesF があれば、主人公が女のときはそちらを使う。
 */
export type EventStep =
  | { type: 'say'; lines: string[]; linesF?: string[] }
  | { type: 'setFlag'; flag: string; value?: boolean }
  /** フラグが立っていれば then、立っていなければ else を行う。 */
  | { type: 'if'; flag: string; then: EventStep[]; else?: EventStep[] }
  /** 選択肢。選んだものの steps を行う。 */
  | { type: 'choice'; prompt?: string; options: { label: string; steps: EventStep[] }[] }
  /** 道具・装備品を渡す。持ちきれない（99 個を超える）ときは渡さず、ifFull があればそれを行う。 */
  | { type: 'giveItem'; item: string; count?: number; ifFull?: EventStep[] }
  | { type: 'giveMoney'; amount: number }
  /**
   * 新しい仲間を加える（その時点のパーティーの平均レベル〈切り捨て、最低 1〉で、加入時の装備を付けて）。ゲストは決まったレベル（guestLevel）で加わる。
   * 加入済み・一時離脱中（away にいる）・満員なら何もしない。一時離脱からの復帰は rejoin を使う。
   */
  | { type: 'join'; member: CharacterId }
  /**
   * 仲間を一時的に抜く（第 5 章の霞）。経験値と装備は GameState.away に預ける。戻すときは rejoin を使う。
   * ゲスト（榊兵庫）は預けずにそのまま抜ける。主人公と、いない仲間には何もしない。
   */
  | { type: 'leave'; member: CharacterId }
  /**
   * 一時離脱中（away にいる）の仲間を戻す（第 6 章の霞）。装備はそのまま、経験値はその時点のパーティーの平均レベル〈切り捨て〉まで引き上げ（下げない）、HP・MP は満タンにする。
   * away にいない・満員なら何もしない。
   */
  | { type: 'rejoin'; member: CharacterId }
  /** 全員を全回復する。 */
  | { type: 'heal' }
  /**
   * 戦闘。勝つか逃げたら次の手順へ進む。
   * ifLose があれば、負けても全滅扱いにせず（倒れた仲間は HP 1 で起き上がる）ifLose を行う。なければ通常の全滅で、イベントはそこで終わる。
   * canEscape を省くと逃げられない。
   */
  | { type: 'battle'; enemies: string[]; level: number; canEscape?: boolean; ifLose?: EventStep[] }
  | { type: 'warp'; mapId: string; x: number; y: number }
  /** イベントをここで終える。 */
  | { type: 'end' };

export interface EventDef {
  id: string;
  steps: EventStep[];
}
