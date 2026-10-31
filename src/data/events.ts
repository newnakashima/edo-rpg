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

/** 大井川の渡し場（第 1 章を終えたあと）。川止めの本当のわけは、人足を水に引き込む川獺。 */
const OIGAWA_CROSSING: EventStep[] = [
  {
    type: 'say',
    lines: [
      '大井川の渡し場。川会所の前に、川越し人足たちが所在なげに座り込んでいる。',
      '人足頭「川止めだよ。……いや、水かさのせいじゃねえ。夜になると、川獺どもが人足の足を引っぱって、川へ引きずり込みやがるんだ」',
      '人足頭「もう三人も流された。お役人は『化かされたんだろう』と取り合っちゃくれねえ」',
      '霞「人を水に引き込む獣ねえ。片づけてやろうか、{hero}」',
      'ザバッ……！ 浅瀬から、ずぶ濡れの川獺が躍り出た！',
    ],
  },
  {
    type: 'battle',
    enemies: ['kawauso', 'kawauso'],
    level: 7,
    ifLose: [{ type: 'say', lines: ['人足たちが駆けつけ、一行を岸へ引き上げた。', '人足頭「無理するこたあねえ。出直してきな」'] }, { type: 'end' }],
  },
  {
    type: 'say',
    lines: [
      '川獺は、甲高い声をあげて川下へ逃げていった。',
      '人足頭「ありがてえ！ これで川明けだ。お礼に、蓮台でお渡ししやしょう」',
      '一行は人足の担ぐ蓮台に乗り、大井川を渡った。',
      '人足頭「この先の東海道は、追い剥ぎの浪人や雲助が出る。尾張の名古屋までは、気を抜きなさんなよ」',
    ],
  },
  { type: 'setFlag', flag: 'oigawaOpen' },
];

/** 名古屋に初めて入ったとき。 */
const NAGOYA_ARRIVE: EventStep[] = [
  {
    type: 'say',
    lines: [
      '尾張名古屋。御三家筆頭の城下は、天守の金の鯱を見上げる人だかりで騒然としていた。',
      '町人「見ろよ、鯱の鱗がまだらに剥がされてやがる……！」',
      '霞「『金の鱗、尾張より届く』。名簿にあった一文は、このことだったんだ」',
      '霞「鱗が盗まれたのは、一座が姿を消したのと同じころ。きっと同じ連中の仕業だよ。聞き込みといこう」',
    ],
  },
  { type: 'setFlag', flag: 'nagoyaArrived' },
];

/** 金鯱からくりを倒して名古屋に戻ったとき（第 2 章の終わり）。第 3 章（京）への導線。 */
const NAGOYA_CHAPTER_END: EventStep[] = [
  {
    type: 'say',
    lines: [
      '取り戻した金の鱗は、城の役人の手に戻された。',
      '役人「鱗を盗んだのは江戸から来た浪人どもで、軽業師の金太は無実であった。……銀次の書き置きは、弟をかばうためのものだったのじゃな」',
      '役人「殿より、褒美を下される」',
      '城の役人から 500 文を受け取った。',
      '金太「兄貴は、凧の糸を少しでも長くするんだって、毎晩遅くまで働いてた。……おれ、兄貴の分まで高く揚げるよ」',
      '霞「荷蔵の浪人が持ってた文に、もう一つ気になることが書いてあった。『京の鬼、首尾よく』……」',
      '霞「京で鬼が出るって噂、あんたも聞いたろ？ 次は京だよ、{hero}」',
    ],
  },
  { type: 'giveMoney', amount: 500 },
  { type: 'setFlag', flag: 'chapter2Cleared' },
];

/** 金太に初めて会う。兄の銀次が罪をかぶって消えたこと、堀川の荷蔵のことを聞き、荷蔵の前の荷車をどけてもらう。 */
const KINTA_MEET: EventStep[] = [
  {
    type: 'say',
    lines: [
      '凧屋の奥で、若い男が大凧の陰に身を潜めていた。',
      '男「……役人じゃねえな。おれは金太。鱗なんか盗んじゃいねえ！」',
      '金太「あの晩、兄貴の銀次が『鱗を盗んだのはおれだ』って書き置きを残して、いなくなっちまったんだ」',
      '金太「兄貴がそんなことするはずねえ。……でも、あの晩、堀川の荷蔵に浪人どもが重そうな箱を運び込むのを見た。兄貴は、あいつらを追っかけてったんだと思う」',
      '霞「その荷蔵、調べてみる価値はありそうだね」',
      '金太「荷蔵の戸口は荷車でふさがれてる。おれが動かしといてやるよ。……頼む、兄貴を見つけてくれ！」',
    ],
  },
  { type: 'setFlag', flag: 'kintaMet' },
];

/** 荷蔵の奥で手がかりを得たあと、金太の大凧で天守へ飛ぶ。負けて出直すときも、ここから飛ぶ。 */
const KINTA_FLIGHT: EventStep[] = [
  {
    type: 'if',
    flag: 'kintaFlew',
    then: [{ type: 'say', lines: ['金太「もう一度、天守へ飛ぶかい？ 風はまだ止んじゃいねえ」'] }],
    else: [
      {
        type: 'say',
        lines: [
          '{hero}は、荷蔵の奥で見つけた文と、銀次の手ぬぐいのことを話した。',
          '金太「鱗は天守に……兄貴も、きっとそこにいるんだ」',
          '金太「お城の門は通れねえ。でも、兄貴とおれの大凧なら、天守の屋根まで飛べる！」',
        ],
      },
    ],
  },
  {
    type: 'choice',
    prompt: '金太の大凧で天守へ飛ぶか？',
    options: [
      {
        label: '飛ぶ',
        steps: [
          { type: 'say', lines: ['夜風に乗って、大凧が名古屋の空へ舞い上がった。', '眼下に城下の灯が遠ざかり、金の鯱の天守が迫ってくる……！'] },
          { type: 'setFlag', flag: 'kintaFlew' },
          { type: 'warp', mapId: 'tenshu', x: 8, y: 9 },
        ],
      },
      { label: '支度をする', steps: [{ type: 'say', lines: ['金太「支度ができたら声をかけてくれ。凧はいつでも揚げられる」'] }] },
    ],
  },
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
  /** 大井川の渡し場。第 1 章を終えるまでは川止めの案内だけ。 */
  oigawa: {
    id: 'oigawa',
    steps: [
      {
        type: 'if',
        flag: 'chapter1Cleared',
        then: OIGAWA_CROSSING,
        else: [{ type: 'say', lines: ['大井川の渡し場だ。川越し人足「水かさが増えて、今は渡せねえよ」'] }],
      },
    ],
  },
  /** 名古屋に入ったとき。初めてなら町の紹介、金鯱からくりを倒したあとなら第 2 章の終わり。 */
  nagoyaEnter: {
    id: 'nagoyaEnter',
    steps: [
      {
        type: 'if',
        flag: 'kinshachiDefeated',
        then: NAGOYA_CHAPTER_END,
        else: [{ type: 'if', flag: 'nagoyaArrived', then: [], else: NAGOYA_ARRIVE }],
      },
    ],
  },
  /** 凧屋の金太。会う → 荷蔵の手がかりのあとで天守へ飛ぶ → 第 2 章のあと。 */
  kinta: {
    id: 'kinta',
    steps: [
      {
        type: 'if',
        flag: 'kinshachiDefeated',
        then: [{ type: 'say', lines: ['金太「兄貴の凧は、おれが揚げ続ける。……ありがとうな、{hero}」'] }],
        else: [
          {
            type: 'if',
            flag: 'urokoClue',
            then: KINTA_FLIGHT,
            else: [
              {
                type: 'if',
                flag: 'kintaMet',
                then: [{ type: 'say', lines: ['金太「堀川の荷蔵は、町の南東だ。荷車はどけといたぜ」'] }],
                else: KINTA_MEET,
              },
            ],
          },
        ],
      },
    ],
  },
  /** 堀川の荷蔵の奥。鷲尾の配下の浪人を倒すと、鱗が天守へ運ばれたことが分かる。 */
  horikawaOku: {
    id: 'horikawaOku',
    steps: [
      {
        type: 'say',
        lines: ['奥の間の前に、浪人がふたり。足もとで、ゼンマイ仕掛けの犬が唸っている。', '浪人「嗅ぎつけたか。江戸の御方の御用だ、生かしては帰さん」'],
      },
      { type: 'battle', enemies: ['oihagiRonin', 'oihagiRonin', 'zenmaiInu'], level: 7 },
      {
        type: 'say',
        lines: [
          '奥の間には、空の千両箱が転がっていた。底に、金の粉がこびりついている。',
          '浪人の懐から、文が一通。「金の鱗はからくりの心臓とせよ。鯱は天守にて組み上ぐべし」',
          '千両箱のそばに、凧の絵を染め抜いた手ぬぐいが落ちていた。……銀次のものだろうか。',
          '霞「鱗で鯱のからくりを動かすつもりか。天守へ行くしかないね。……金太に相談しよう」',
        ],
      },
      { type: 'setFlag', flag: 'urokoClue' },
    ],
  },
  /** 天守の大棟。銀次を心臓に組み込まれた金鯱からくり（第 2 章のボス）と戦う。負けて出直したときは短い台詞にする。 */
  kinshachi: {
    id: 'kinshachi',
    steps: [
      {
        type: 'if',
        flag: 'kinshachiMet',
        then: [{ type: 'say', lines: ['大棟の上で、金鯱からくりが鱗を逆立てて待ち構えていた。', '金太「兄貴……今度こそ、止めてやるからな！」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '大棟の上に、金色の巨体がとぐろを巻いていた。天守の鯱が、からくり仕掛けで動いている！',
              '剥がされた鱗は、鯱の胸の歯車に打ちつけられ、青白い火花を散らしている。',
              '胸の奥に、人の姿が見えた。手足をゼンマイに絡め取られている。',
              '金太「兄貴！ 銀次兄貴！」',
              '銀次「……金太……来るな……。おれは……もう……」',
              '霞「人をからくりの心臓にしたのか……！ {hero}、鯱を止めるよ！」',
              'ギギギ……と歯車がきしみ、金鯱からくりが尾を振り上げた！',
            ],
          },
          { type: 'setFlag', flag: 'kinshachiMet' },
        ],
      },
      { type: 'battle', enemies: ['kinshachi'], level: 10 },
      {
        type: 'say',
        lines: [
          '金鯱からくりは、金の鱗をまき散らして崩れ落ちた。',
          '胸の歯車の中から、銀次の体が転がり出た。腕も足も、もう半分がからくりになっている。',
          '銀次「……金太……おれが盗んだことにすりゃ……おめえは疑われねえと……思ったんだが……」',
          '銀次「浪人どもを追っかけて……このざまだ……。すまねえ……」',
          '金太「しゃべるな、兄貴！ 今、医者を……！」',
          '銀次「……おめえの凧は……いつも……空のいちばん高えところで……揺れてたなあ……」',
          '銀次の胸のゼンマイが、カタリと止まった。',
          '……夜明けの風が、天守の上を吹き抜けていった。',
          '一行は、散らばった金の鱗を拾い集めた。城下へ戻ろう。',
        ],
      },
      { type: 'setFlag', flag: 'kinshachiDefeated' },
    ],
  },
  horikawaChest1: chest('horikawaChest1', 'kintsuba', '金創膏'),
  horikawaChest2: chest('horikawaChest2', 'kitsukegusuri', '気付け薬'),
  tenshuChest: chest('tenshuChest', 'hachigane', '鉢金'),
  yashikiChest1: chest('yashikiChest1', 'kintsuba', '金創膏'),
  yashikiChest2: chest('yashikiChest2', 'kitsukegusuri', '気付け薬'),
  yashikiChest3: chest('yashikiChest3', 'inro', '印籠'),
};
