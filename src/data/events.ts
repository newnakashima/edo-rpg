// イベントのデータ。シナリオ（フェーズ 4）はここに足していく。形は eventTypes.ts を参照。
import type { EventDef } from './eventTypes';

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
  /** 辰五郎の頼み。 */
  tatsugoro: {
    id: 'tatsugoro',
    steps: [
      {
        type: 'if',
        flag: 'talkedToTatsugoro',
        then: [{ type: 'say', lines: ['辰五郎「裏山は北の街道の先だ。無理はするんじゃねえぞ」'] }],
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
                  { type: 'say', lines: ['辰五郎「恩に着る。これは路銀の足しにしてくんな」', '辰五郎から 100 文と傷薬を受け取った。'] },
                  { type: 'giveMoney', amount: 100 },
                  { type: 'giveItem', item: 'kizugusuri', count: 2 },
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
          { type: 'say', lines: ['苔むした小さな祠だ。供え物の中に、まだ使えそうな薬がある。', '万金丹を手に入れた。'] },
          { type: 'giveItem', item: 'mankintan' },
          { type: 'setFlag', flag: 'urayamaShrine' },
        ],
      },
    ],
  },
};
