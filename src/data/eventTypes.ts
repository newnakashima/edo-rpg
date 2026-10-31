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
   * 加入済み・満員なら何もしない。一時離脱からの復帰（away から戻し、平均レベルまで経験値を引き上げる）は第 6 章で足す。
   */
  | { type: 'join'; member: CharacterId }
  /**
   * 仲間を一時的に抜く（第 5 章の霞）。経験値と装備は GameState.away に預けておき、あとで join すると、そのときの続きから戻る。
   * ゲスト（榊兵庫）は預けずにそのまま抜ける。主人公と、いない仲間には何もしない。
   */
  | { type: 'leave'; member: CharacterId }
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
