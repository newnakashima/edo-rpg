// イベントのデータ。シナリオ（フェーズ 4）はここに足していく。形は eventTypes.ts を参照。
import type { EventDef, EventStep } from './eventTypes';

/** 辰五郎の頼み（野狐を倒す前）。 */
const TATSUGORO_REQUEST: EventStep[] = [
  {
    type: 'if',
    flag: 'talkedToTatsugoro',
    then: [{ type: 'say', lines: ['辰五郎「裏山は北の街道の先だ。狐火が出るのは、そのまた奥の洞穴らしい。無理はするんじゃねえぞ」'] }],
    else: [
      {
        type: 'say',
        lines: [
          '辰五郎「よく来なすった。一宿一飯、遠慮はいらねえ」',
          '辰五郎「……実はな、町の者が月に一人、二人と消えていく。神隠しだと皆は言うが、どうも臭う」',
          '辰五郎「消えた者は皆、夜に狐火を見たと言い残している。北の裏山に何かあるはずだ。調べちゃくれねえか」',
        ],
      },
      {
        type: 'choice',
        prompt: '辰五郎の頼みを引き受けるか？',
        options: [
          {
            label: '引き受ける',
            steps: [
              { type: 'say', lines: ['辰五郎「恩に着る。これは路銀の足しにしてくんな」', '辰五郎から 100 文を受け取った。'] },
              { type: 'giveMoney', amount: 100 },
              {
                type: 'giveItem',
                item: 'kizugusuri',
                count: 2,
                ifFull: [{ type: 'say', lines: ['辰五郎「傷薬も持たせてえところだが、もう持ちきれねえようだな」'] }],
              },
              { type: 'setFlag', flag: 'talkedToTatsugoro' },
            ],
          },
          {
            label: '少し考える',
            steps: [{ type: 'say', lines: ['辰五郎「無理にとは言わねえ。気が向いたら声をかけてくんな」'] }],
          },
        ],
      },
    ],
  },
];

/** 野狐を倒したあとの報告。序章の終わりで、駿府（第 1 章）へ向かう。頼みを聞く前に倒していても、ここで頼みを聞いたことにする。 */
const TATSUGORO_REPORT: EventStep[] = [
  {
    type: 'say',
    lines: [
      '{hero}は、狐火の洞で野狐を倒したこと、奥にあった木箱とゼンマイ仕掛けの人形の残骸のことを話した。',
      '辰五郎「狐の正体が、からくり仕掛けだと……？ それに、駿府の工房の焼き印か」',
      '辰五郎「消えた者たちは、そのからくりに連れていかれたのかもしれねえ。すまねえが、もうひと肌脱いじゃくれねえか」',
      '辰五郎「駿府の城下へ行って、その工房を探ってほしい。東の街道を出て、街道を西へ行った先だ」',
      '辰五郎「これは礼だ。取っといてくんな」',
      '辰五郎から 300 文を受け取った。',
    ],
  },
  { type: 'giveMoney', amount: 300 },
  { type: 'setFlag', flag: 'talkedToTatsugoro' },
  { type: 'setFlag', flag: 'prologueCleared' },
];

export const EVENTS: Record<string, EventDef> = {
  /** 清水湊に初めて入ったとき。 */
  intro: {
    id: 'intro',
    steps: [
      {
        type: 'say',
        lines: [
          '雨の夜、駿河の清水湊。廻船問屋の荷の護衛を終えた渡世人・{hero}は、この町の親分・辰五郎の一家に草鞋を脱いだ。',
          '（十字キーで移動、決定で話す・調べる、取消でメニュー）',
        ],
      },
      { type: 'setFlag', flag: 'intro' },
    ],
  },
  /** 辰五郎の頼みと、野狐を倒したあとの報告（序章の終わり）。 */
  tatsugoro: {
    id: 'tatsugoro',
    steps: [
      {
        type: 'if',
        flag: 'prologueCleared',
        then: [{ type: 'say', lines: ['辰五郎「駿府の工房、か……。気をつけて行ってきな。清水の一家は、いつでもおめえさんの味方だ」'] }],
        else: [{ type: 'if', flag: 'yakoDefeated', then: TATSUGORO_REPORT, else: TATSUGORO_REQUEST }],
      },
    ],
  },
  /** 狐火の洞の奥で待つ野狐（序章のボス）。逃げられず、負けたら通常の全滅。 */
  yako: {
    id: 'yako',
    steps: [
      {
        type: 'say',
        lines: [
          '洞の奥から、青白い狐火がいくつも漂ってくる。',
          '金色の毛並みの大きな狐が、行く手をふさいだ。額で、何かが鈍く光っている。',
          '野狐「……ヒトノ子ヨ。ココカラ先ヘハ、通サヌ」',
        ],
      },
      { type: 'battle', enemies: ['yako'], level: 4, canEscape: false },
      {
        type: 'say',
        lines: [
          '野狐は倒れた。額の光がふっと消え、カタカタと歯車の止まる音がした。',
          '……狐の額には、真鍮の歯車が埋め込まれていた。',
          '奥の間に、木箱が置かれている。中には、ゼンマイ仕掛けが埋め込まれた人形の残骸。箱には、駿府の工房の焼き印が押されている。',
          '辰五郎に知らせよう。',
        ],
      },
      { type: 'setFlag', flag: 'yakoDefeated' },
    ],
  },
  /** 裏山の祠。一度だけ供え物の薬が手に入る。 */
  urayamaShrine: {
    id: 'urayamaShrine',
    steps: [
      {
        type: 'if',
        flag: 'urayamaShrine',
        then: [{ type: 'say', lines: ['苔むした小さな祠だ。静かに手を合わせた。'] }],
        else: [
          { type: 'say', lines: ['苔むした小さな祠だ。供え物の中に、まだ使えそうな薬がある。'] },
          // 持ちきれないときは、また来たときに受け取れるようにフラグを立てない
          { type: 'giveItem', item: 'mankintan', ifFull: [{ type: 'say', lines: ['……これ以上は持てない。'] }, { type: 'end' }] },
          { type: 'say', lines: ['万金丹を手に入れた。'] },
          { type: 'setFlag', flag: 'urayamaShrine' },
        ],
      },
    ],
  },
};
