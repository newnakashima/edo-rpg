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
      '辰五郎「駿府の城下へ行って、その工房を探ってほしい。町の東の外れから街道へ出りゃ、駿府はすぐ西隣だ」',
      '辰五郎「これは礼だ。取っといてくんな」',
      '辰五郎から 300 文を受け取った。',
    ],
  },
  { type: 'giveMoney', amount: 300 },
  { type: 'setFlag', flag: 'talkedToTatsugoro' },
  { type: 'setFlag', flag: 'prologueCleared' },
];

/** 葛籠（宝箱）。一度だけ道具が手に入る。持ちきれないときはフラグを立てず、また来たときに受け取れるようにする。 */
function chest(id: string, item: string, itemName: string): EventDef {
  return {
    id,
    steps: [
      {
        type: 'if',
        flag: id,
        then: [{ type: 'say', lines: ['葛籠は空だ。'] }],
        else: [
          { type: 'giveItem', item, ifFull: [{ type: 'say', lines: [`葛籠の中に${itemName}がある。……これ以上は持てない。`] }, { type: 'end' }] },
          { type: 'say', lines: [`葛籠の中に${itemName}があった。`] },
          { type: 'setFlag', flag: id },
        ],
      },
    ],
  };
}

/** 駿府に初めて入ったとき。 */
const SUNPU_ARRIVE: EventStep[] = [
  {
    type: 'say',
    lines: [
      '駿府城下。かつて大御所が隠居した城を中心に、大きな町が広がっている。',
      '町は、大坂の道頓堀から巡業に来たからくり一座の興行の噂で持ちきりだ。',
      '一座の工房を探れば、狐火の洞にあった木箱の出どころが分かるかもしれない。',
    ],
  },
  { type: 'setFlag', flag: 'sunpuArrived' },
];

/** 鉄瓶を倒して駿府に戻ったとき（第 1 章の終わり）。第 2 章（名古屋）への導線。 */
const SUNPU_CHAPTER_END: EventStep[] = [
  {
    type: 'say',
    lines: [
      'からくり屋敷から助け出された人々が、駿府の町へ戻ってきた。',
      '与力の黒田は役目を解かれ、からくり一座は一夜のうちに姿を消した。',
      '霞「さらった人をからくりに変えて、何に使うつもりだったのか……。手がかりは、名簿の最後の行だね」',
      '霞「『金の鱗、尾張より届く』……名古屋だ。西へ行くよ、{hero}」',
      '霞「大井川は川止めだって話だけど、行ってみりゃなんとかなるさ」',
    ],
  },
  { type: 'setFlag', flag: 'chapter1Cleared' },
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
  /** 駿府に入ったとき。初めてなら町の紹介、鉄瓶を倒したあとなら第 1 章の終わり。 */
  sunpuEnter: {
    id: 'sunpuEnter',
    steps: [
      {
        type: 'if',
        flag: 'tetsubinDefeated',
        then: SUNPU_CHAPTER_END,
        else: [{ type: 'if', flag: 'sunpuArrived', then: [], else: SUNPU_ARRIVE }],
      },
    ],
  },
  /**
   * 一座の工房で霞と鉢合わせる。霞が加わってから、見張りのからくり人形と戦う。
   * 負けても先へ進める（霞の煙玉で逃げる）ので、kasumiJoined（工房の霞を消し、与力の屋敷の門番をどかす）は戦ったあとに立てる。
   */
  kasumiMeet: {
    id: 'kasumiMeet',
    steps: [
      {
        type: 'say',
        lines: [
          '人形の棚の陰に、黒装束の女が立っていた。苦無の切っ先がこちらを向いている。',
          '女「……誰だい。一座の者じゃなさそうだね」',
          '女「あたしは霞。名乗ったところで身元は明かせないけどね。江戸の上の方の言いつけで、からくりの出どころを追ってる」',
          '{hero}は、清水湊で人が消えていること、狐火の洞のからくり仕掛けの狐と、駿府の工房の焼き印のことを話した。',
          '霞「……あたしの追ってる糸と、同じところに行き着きそうだね」',
          'カタ、カタカタカタ……！ 棚の人形が、ひとりでに立ち上がった！',
          '霞「見張りのからくりか。話はあとだ、手を貸しな！」',
          '霞が仲間に加わった！',
        ],
      },
      { type: 'join', member: 'kasumi' },
      {
        type: 'battle',
        enemies: ['karakuriNingyo', 'karakuriNingyo'],
        level: 4,
        ifLose: [{ type: 'say', lines: ['霞「ちっ、しつこい！」', '霞の煙玉が弾け、からくり人形が煙の中で立ち往生した。そのすきに、人形のゼンマイを抜き取った。'] }],
      },
      {
        type: 'say',
        lines: [
          '霞「……ふう。腕は確かなようだね」',
          '霞「利害は一致してる。しばらく組もうじゃないか、{hero}」',
          '霞「さっき文机の文を見た。黒田って与力が、一座の荷を屋敷の蔵で預かってる。表の門番は、あたしが眠らせておくよ」',
        ],
      },
      { type: 'setFlag', flag: 'kasumiJoined' },
    ],
  },
  /** 与力・黒田の屋敷の蔵。雇われのごろつきを倒すと、さらわれた人の名簿が見つかる。 */
  yorikiKura: {
    id: 'yorikiKura',
    steps: [
      {
        type: 'say',
        lines: ['蔵の前に、人影がふたつ。提灯がひとりでに揺れている。', 'ごろつき「おっと、ここから先は通さねえ。黒田の旦那に雇われてんだ」'],
      },
      { type: 'battle', enemies: ['gorotsuki', 'gorotsuki', 'bakeChochin'], level: 4 },
      {
        type: 'say',
        lines: [
          '蔵の中には、からくり人形の部品を詰めた木箱が積まれていた。その奥に、帳面が一冊。',
          '帳面には、清水湊と駿府で消えた人々の名が並んでいる。長屋の与吉の名もある。',
          '名の下には、朱で「からくり屋敷へ送る」と書き添えられていた。',
          '霞「城下の南の、一座の屋敷か。見張りは黒田の名で立ってたんだ。この名簿を見せりゃ、尻尾を巻いて逃げるさ」',
        ],
      },
      { type: 'setFlag', flag: 'meiboFound' },
    ],
  },
  /** からくり屋敷の奥の間。夜叉丸が装置を壊して逃げ、鉄瓶（第 1 章のボス）と戦う。負けて出直したときは鉄瓶だけが待つ。 */
  tetsubin: {
    id: 'tetsubin',
    steps: [
      // 負けて出直したときは、夜叉丸はもう逃げたあとで、装置も壊れている
      {
        type: 'if',
        flag: 'yashamaruFled',
        then: [
          {
            type: 'say',
            lines: ['奥の間では、壊れた装置のそばで、鉄瓶が蒸気を噴き上げて待ち構えていた。', '霞「今度こそ、片をつけるよ」'],
          },
        ],
        else: [
          {
            type: 'say',
            lines: [
              '奥の間に、異様な装置が据えられていた。歯車と管が絡み合い、そのまわりに、人が何人も眠るように座らされている。',
              '装置のそばに、白い面をつけた男が立っていた。',
              '男「おや、清水の狐を片づけたのは、おまえたちか」',
              '霞「……夜叉丸。妖術師が、からくり遊びかい」',
              '夜叉丸「遊び？ これは人の魂をゼンマイに巻き取る仕掛けよ。……まあいい。ここはもう用済みだ」',
              '夜叉丸が印を結ぶと、装置から青い火花が散った。',
              '夜叉丸「鉄瓶、あとは任せたぞ」',
              '夜叉丸の姿は、煙とともにかき消えた。',
              'ズシン……ズシン……。蒸気を噴き上げ、鉄の大男が行く手に立ちはだかった！',
            ],
          },
          // 夜叉丸はここで姿を消す（戦闘から戻ったときに、奥の間の夜叉丸を消す）
          { type: 'setFlag', flag: 'yashamaruFled' },
        ],
      },
      { type: 'battle', enemies: ['tetsubin'], level: 7 },
      {
        type: 'say',
        lines: [
          '鉄瓶は白い蒸気を吐いて、崩れ落ちた。',
          '一行は、装置に囚われていた人々を助け出した。清水湊の与吉の姿もある。',
          'だが、何人かは、もう目を覚まさなかった。',
          '胸にゼンマイを埋め込まれた女が、か細い声でつぶやいた。',
          '女「……坊や……あの子に……」',
          '女の胸のゼンマイが、カタ、カタとほどけていく。子守唄の調べが、からくりの音になって静かに鳴った。',
          '……やがて、音は止んだ。',
          '霞「……夜叉丸の後ろには、もっと大きな影がある。あたしはそれを追う」',
          '霞「{hero}、あんたも来るかい？ ……ふふ、聞くまでもないか」',
          '駿府の城下へ戻ろう。',
        ],
      },
      { type: 'setFlag', flag: 'tetsubinDefeated' },
    ],
  },
  yashikiChest1: chest('yashikiChest1', 'kintsuba', '金創膏'),
  yashikiChest2: chest('yashikiChest2', 'kitsukegusuri', '気付け薬'),
  yashikiChest3: chest('yashikiChest3', 'inro', '印籠'),
};
