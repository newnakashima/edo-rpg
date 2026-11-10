// イベントスクリプトの形。シナリオはこの形のデータ（events.ts）として書き、systems/eventScript.ts が実行する。
import type { Facing } from '../systems/gameState';
import type { CharacterId } from './characters';
import type { CharacterSpriteId } from './sprites';

/**
 * イベントの 1 手順。
 * 台詞の中の {hero} は主人公の名前に、{jingi} はその時点の仁義ポイントに置き換える。linesF があれば、主人公が女のときはそちらを使う。
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
  /** 仁義ポイントを増やす（負なら減らす。0〜上限に収める。src/systems/jingi.ts）。 */
  | { type: 'addJingi'; amount: number }
  /**
   * 新しい仲間を加える（その時点のパーティーの平均レベル〈切り捨て、最低 1〉で、加入時の装備を付けて）。ゲストは決まったレベル（guestLevel）で、
   * 加入時のレベルが決まっている仲間（joinLevel。お凛は Lv1）はそのレベルで加わる。平均レベルには joinLevel のある仲間を数えない。
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
  | { type: 'end' }
  /**
   * 演出: 人をイベントの間だけ出す（台詞を言う人をその場に見せる。docs/events.md の「演出」）。
   * x・y を省くと、主人公の足元から隣の空いたマスへ 1 歩出る（一行の仲間が主人公から出てくる。主人公の向きの横、後ろ、前の順に探す）。
   * 同じ id の人がもういれば、その人を置き直す。
   * イベントが終わると消える。残したい人はマップの NPC（showFlag）で置く。
   * 姿は sprite（人の画像）か enemy（戦闘にしか出ない敵の画像を半分の大きさで。ENEMIES の ID）のどちらか一つを書く。
   * enemy の画像は、scale で大きさを変えられる（既定 0.5。1 で戦闘と同じ大きさ。終章のからくり大権現の巨大な姿）。
   * grow を書くと、半分の大きさから scale（0.5 より大きく）までふくらんでから次の手順へ進む（変身の演出）。下端の中央は動かない。
   */
  | { type: 'actor'; id: string; sprite?: CharacterSpriteId; enemy?: string; scale?: number; grow?: true; x?: number; y?: number; facing?: Facing }
  /**
   * 演出: 歩かせる。who は 'hero'、マップの NPC の ID、actor で出した人の ID。path は u（上）・d（下）・l（左）・r（右）の並び。
   * path の代わりに to を書くと、その人（'hero' も書ける）かそのマス（{ x, y }）まで横、縦の順にまっすぐ歩く（仲間が主人公に戻るとき、戸口へ入るとき）。
   * 通れないマスの手前で止まる（eventStage.test.ts が、位置の分かる人の道が通れるかを確かめる）。
   * 歩き終えてから次の手順へ進む（wait: false なら歩き出したらすぐ次へ進み、二人を一緒に歩かせられる。
   * そのあとは、その人が歩き終える前にイベントが終わったり戦闘に入ったりしないよう、もっと長い歩きか wait を挟む）。
   * route を書くと、to へまっすぐではなく、通れて人のいないマスをたどる一番短い道を歩く（屋内の形が町ごとに違う頼まれごとで、
   * 戸口から入ってきた相手が主人公の隣まで来るとき・戸口へ去るとき）。to に入れなければ（人なら、そのマスに人が立っているので）、
   * to にいちばん近いマス（人ならその隣）で止まる。人のすぐ下（手前）のマスには止まらない（画像が重なって隠すため）。
   * 動かしたマップの NPC は、イベントが終わると元の位置に戻る（残さない人は hideFlag で消す）。
   */
  | { type: 'walk'; who: string; path?: string; to?: string | { x: number; y: number }; route?: true; wait?: false }
  /** 演出: 向きを変える。dir か、toward（その人のほうを向く。'hero' も書ける）のどちらかを書く。 */
  | { type: 'face'; who: string; dir?: Facing; toward?: string }
  /** 演出: 人を見えなくする（イベントの間。マップの NPC を後まで消すときは hideFlag も立てる）。主人公には使えない。 */
  | { type: 'vanish'; who: string }
  /** 演出: 少し待つ（ミリ秒）。 */
  | { type: 'wait'; ms: number }
  /** イベントを終え、エンディング（黒い画面に「終劇」）を出してタイトルへ戻る（終章のからくり大権現を倒したあと）。 */
  | { type: 'ending' };

export interface EventDef {
  id: string;
  steps: EventStep[];
}
