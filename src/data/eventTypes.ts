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
  | { type: 'giveItem'; item: string; count?: number }
  | { type: 'giveMoney'; amount: number }
  /** 仲間に加える（その時点のパーティーの平均レベルで、加入時の装備を付けて）。 */
  | { type: 'join'; member: CharacterId }
  /** 全員を全回復する。 */
  | { type: 'heal' }
  /**
   * 戦闘。勝つか逃げたら次の手順へ進む。
   * ifLose があれば、負けても全滅扱いにせず（HP 1 で起き上がり）ifLose を行う。なければ通常の全滅で、イベントはそこで終わる。
   */
  | { type: 'battle'; enemies: string[]; level: number; canEscape?: boolean; ifLose?: EventStep[] }
  | { type: 'warp'; mapId: string; x: number; y: number }
  /** イベントをここで終える。 */
  | { type: 'end' };

export interface EventDef {
  id: string;
  steps: EventStep[];
}
