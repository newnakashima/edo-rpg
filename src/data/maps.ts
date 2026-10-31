// フィールドのマップ。序章〜第 3 章の町・ダンジョンと、ワールドマップを用意する。
// タイルの文字の意味は TILES を参照。
import type { Facing } from '../systems/gameState';
import type { CharacterSpriteId } from './sprites';

/** タイルの種類。画像は public/assets/tiles/<種類>.png（PixelLab で生成。記録は public/assets/README.md）。 */
export const TILE_KINDS = ['ground', 'grass', 'road', 'tree', 'water', 'wall', 'roof', 'door', 'floor', 'rock', 'plain', 'town', 'gate'] as const;
export type TileKind = (typeof TILE_KINDS)[number];

export interface TileDef {
  kind: TileKind;
  blocked: boolean;
}

export const TILES: Record<string, TileDef> = {
  '.': { kind: 'ground', blocked: false },
  ',': { kind: 'grass', blocked: false },
  '=': { kind: 'road', blocked: false },
  T: { kind: 'tree', blocked: true },
  '~': { kind: 'water', blocked: true },
  W: { kind: 'wall', blocked: true },
  R: { kind: 'roof', blocked: true },
  D: { kind: 'door', blocked: true },
  _: { kind: 'floor', blocked: false },
  '^': { kind: 'rock', blocked: true },
  // ワールドマップ用: 街道（=）と町（O）・関所（G）だけを歩ける。野原（"）は通れない
  '"': { kind: 'plain', blocked: true },
  O: { kind: 'town', blocked: false },
  G: { kind: 'gate', blocked: false },
};

export type NpcAction = 'inn' | 'teahouse' | 'shop' | 'temple' | 'hikyaku';

export interface NpcDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 画像ができるまでの仮の人の色（sprite がなければ使う）。 */
  color: number;
  /** 画像のある人はそのシート（src/data/sprites.ts）。 */
  sprite?: CharacterSpriteId;
  /** 最初の向き（sprite があるときだけ。既定は下）。 */
  facing?: Facing;
  /** 話しかけたときの台詞。1 要素が 1 ページ。event があれば使わない。 */
  lines?: string[];
  /** 台詞のあとに行う施設の処理。 */
  action?: NpcAction;
  /** action が 'shop' のときの店の ID（SHOPS）。 */
  shop?: string;
  /** このフラグが立っていたら、lines の代わりにこちらを話す。 */
  after?: { flag: string; lines: string[] };
  /** 話し終えたら立てるフラグ。 */
  setsFlag?: string;
  /** 話しかけたときに行うイベント（EVENTS の ID）。あれば lines などの代わりにこれを行う。 */
  event?: string;
  /** このフラグが立ったら姿を消す（通れるようになる）。仲間になった人、どいた見張りなど。 */
  hideFlag?: string;
}

/** マップに入ったとき、または決まった場所に乗ったときに行うイベント。unless のフラグが立っていれば行わない。 */
export interface EventTrigger {
  event: string;
  unless?: string;
}

export interface TownDef {
  x: number;
  y: number;
  name: string;
  to?: { mapId: string; x: number; y: number };
  /** to があっても、このフラグが立つまでは入れない（lines を出す）。 */
  openFlag?: string;
  /** まだ訪れられない町で出す台詞。 */
  lines?: string[];
}

export interface GateDef {
  x: number;
  y: number;
  flag: string;
  lines: string[];
  /** 通れないときに lines の代わりに行うイベント（EVENTS の ID）。関所を開けるイベント（大井川の川越し）に使う。 */
  event?: string;
}

export interface ExitDef {
  x: number;
  y: number;
  to: string;
  toX: number;
  toY: number;
}

export interface MapDef {
  id: string;
  name: string;
  rows: string[];
  npcs: NpcDef[];
  exits: ExitDef[];
  /** エンカウントの出現表の ID。町など戦闘のない場所は省略する。 */
  encounter?: string;
  /** 地域の敵レベル。宿代・茶屋の値段にも使う（docs/balance.md の「経済」）。 */
  areaLevel: number;
  /** 全滅したときに戻る場所（旅籠の前）。 */
  respawn?: { x: number; y: number };
  /** respawn のないマップ（ダンジョンなど）で全滅したときに戻る町のマップ。省くと最初の町（清水湊）。 */
  respawnMap?: string;
  /** 範囲ごとの全滅時の戻り先の町（respawnMap より優先する。ワールドマップの地域ごとに近くの町へ戻す）。 */
  respawnZones?: { x: number; y: number; w: number; h: number; mapId: string }[];
  /** ワールドマップの町の印。印の上で決定ボタンを押すと to の場所へ入る（to がなければ lines を出す）。乗っただけでは入らない。 */
  towns?: TownDef[];
  /** 関所。flag が立つまで通れず、lines を出す。 */
  gates?: GateDef[];
  /** 範囲ごとの出現表（encounter より優先する）。flag があれば、そのフラグが立っているときだけ使う。 */
  encounterZones?: { x: number; y: number; w: number; h: number; encounter: string; flag?: string }[];
  /** マップに入ったときに行うイベント。 */
  onEnter?: EventTrigger;
  /** その場所に乗ったときに行うイベント。 */
  triggers?: (EventTrigger & { x: number; y: number })[];
}

export const MAPS: Record<string, MapDef> = {
  shimizu: {
    id: 'shimizu',
    name: '駿河・清水湊',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTT==TTTTTTTTTTTT',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T,RRRRR,RRRRR,==,RRRRRRRRR,T',
      'T,WWDWW,WWDWW,==,WWDWWWDWW,T',
      'T,.....,,,,,,,==,,,,,.....,T',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T===========================',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T,RRRRRRR,RRR,==RRR,RRRRR,,T',
      'T,WWWDWWW,WDW,==WDW,WWDWW,,T',
      'T,.......,,,,,==,,,,.....,,T',
      'T,,,,,,,,,,,,,==,,,,,,,,,,,T',
      'T~~~~~~~~~~~~~~~~~~~~~~~~~~T',
      'T~~~~~~~~~~~~~~~~~~~~~~~~~~T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'tatsugoro',
        name: '辰五郎',
        x: 5,
        y: 10,
        color: 0x8a3b2e,
        sprite: 'tatsugoro',
        event: 'tatsugoro',
        // 第 3 章の終わりに、鷲尾の配下の刺客に殺される（弔いの場面は第 4 章で足す）
        hideFlag: 'chapter3Cleared',
      },
      {
        id: 'innkeeper',
        name: '旅籠の主人',
        x: 23,
        y: 4,
        color: 0x5a6b8c,
        lines: ['旅籠の主人「お泊まりですかい。ゆっくり休んでいきなせえ」'],
        action: 'inn',
      },
      {
        id: 'teahouse',
        name: '茶屋の娘',
        x: 4,
        y: 4,
        color: 0xc76b8f,
        lines: [
          '茶屋の娘「いらっしゃいまし。……お客さん、裏山の話を聞きに来たの？」',
          '茶屋の娘「このごろ夜になると、裏山のずっと上のほうで青白い狐火が揺れるんです。いなくなった人は、みんなそれを見たって」',
          '茶屋の娘「お団子はいかが？」',
        ],
        after: { flag: 'heardKitsunebi', lines: ['茶屋の娘「いらっしゃいまし。お団子はいかが？」'] },
        setsFlag: 'heardKitsunebi',
        action: 'teahouse',
      },
      {
        id: 'yorozuya',
        name: 'よろず屋',
        x: 10,
        y: 4,
        color: 0x6b8c5a,
        lines: ['よろず屋「傷薬に毒消し、なんでもそろってますよ」'],
        action: 'shop',
        shop: 'shimizuYorozu',
      },
      {
        id: 'kaji',
        name: '刀鍛冶',
        x: 19,
        y: 4,
        color: 0x5a5a6b,
        lines: ['刀鍛冶「旅の御仁、得物の手入れは怠りなさんな」'],
        action: 'shop',
        shop: 'shimizuKaji',
      },
      {
        id: 'temple',
        name: '寺の住職',
        x: 11,
        y: 10,
        color: 0xb08a3e,
        lines: [
          '住職「消えた者たちのことか。……江戸では、天狗にさらわれて山で暮らし、何年も経って帰ってきた少年の聞き書きが評判になっておる」',
          '住職「神隠しに遭うた者も、どこかで生きておるやもしれぬ。望みを捨てなさるな」',
          '住職「迷える者よ、倒れた者があればお祓いをして進ぜよう」',
        ],
        after: { flag: 'heardTengu', lines: ['住職「迷える者よ、倒れた者があればお祓いをして進ぜよう」'] },
        setsFlag: 'heardTengu',
        action: 'temple',
      },
      {
        id: 'hikyaku',
        name: '飛脚',
        x: 17,
        y: 10,
        color: 0x3e7cb0,
        lines: ['飛脚「へい、まいど！ 記録の言付けも、荷物の預かりも承りやす」'],
        action: 'hikyaku',
      },
      {
        id: 'nagaya',
        name: '長屋のおかみ',
        x: 22,
        y: 10,
        color: 0x9c8a5a,
        lines: ['長屋のおかみ「隣の与吉さんも、狐火を見たって言った晩にいなくなったんだよ。おお、こわい」'],
        after: { flag: 'yakoDefeated', lines: ['長屋のおかみ「裏山の狐を退治してくれたんだって？ 与吉さんも、どこかで生きてりゃいいんだけどねえ」'] },
      },
      {
        id: 'orin',
        name: 'お凛',
        x: 8,
        y: 11,
        color: 0xd04a4a,
        sprite: 'orin',
        lines: ['お凛「おとっつぁんもおとっつぁんだよ。よそ者なんかに頼るなんて」'],
        after: { flag: 'yakoDefeated', lines: ['お凛「……狐を退治したんだってね。礼は言っとくよ。けど、まだ認めたわけじゃないからね」'] },
      },
    ],
    exits: [
      { x: 14, y: 0, to: 'urayama', toX: 10, toY: 12 },
      { x: 15, y: 0, to: 'urayama', toX: 11, toY: 12 },
      // 東の街道からワールドマップへ
      { x: 27, y: 6, to: 'world', toX: 41, toY: 10 },
    ],
    respawn: { x: 23, y: 5 },
    onEnter: { event: 'intro', unless: 'intro' },
  },
  urayama: {
    id: 'urayama',
    name: '清水湊・裏山',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTTTTTTTT.TTTTT',
      'T,,,,,TTT,,,,,,^^^,,,,,,,T',
      'T,,T,,,,,,,,T,,,^,,,,,,,,T',
      'T,,TT,,,^^,,,,,,,,T,,,,,,T',
      'T,,,,,,,^,,,TT,,,,,,,,,,,T',
      'T,T,,,,,,,,,,,,,^,,,,,,,,T',
      'T,,,,TT,,,,,,,,,^^,,,,,,,T',
      'T,,,,,,,,T,,,,,,,,,T,,,,,T',
      'T,^^,,,,,,,,TTT,,,,,,,,,,T',
      'T,,,,,,T,,,,,,,,,,,,,,,,,T',
      'T,,TT,,,,,,,,,,,T,,,,,,,,T',
      'T,,,,,,,,,,,,,,,,,,,,,,,,T',
      'T,,,,,,,,,,,,,,,,,,,,,,,,T',
      'TTTTTTTTTT==TTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'urayamaShrine',
        name: '祠',
        x: 4,
        y: 1,
        color: 0x8c8c7a,
        event: 'urayamaShrine',
      },
    ],
    exits: [
      { x: 10, y: 13, to: 'shimizu', toX: 14, toY: 1 },
      { x: 11, y: 13, to: 'shimizu', toX: 15, toY: 1 },
      // 上端の口から狐火の洞へ
      { x: 20, y: 0, to: 'kitsunebiCave', toX: 10, toY: 12 },
    ],
    encounter: 'urayama',
  },
  kitsunebiCave: {
    id: 'kitsunebiCave',
    name: '狐火の洞',
    areaLevel: 1,
    rows: [
      '^^^^^^^^^^^^^^^^^^',
      '^^^^^^.....^^^^^^^',
      '^^^^^.......^^^^^^',
      '^^^^^^.....^^^^^^^',
      '^^^^^^^^.^^^^^^^^^',
      '^^^^^^^^.^^^^^^^^^',
      '^^^.......^^^^^^^^',
      '^^^.^^^^^......^^^',
      '^^^.^^^^^^^^^.^^^^',
      '^^^......^^^^.^^^^',
      '^^^^^^^^.^^^^.^^^^',
      '^^^^^^^^.......^^^',
      '^^^^^^^^^^.^^^^^^^',
      '^^^^^^^^^^.^^^^^^^',
    ],
    npcs: [
      {
        id: 'cavecrate',
        name: '木箱',
        x: 8,
        y: 1,
        color: 0x7a5a3a,
        lines: ['木箱には駿府の工房の焼き印。中には、ゼンマイ仕掛けが埋め込まれた人形の残骸が入っている。'],
      },
    ],
    exits: [{ x: 10, y: 13, to: 'urayama', toX: 20, toY: 1 }],
    encounter: 'urayama',
    // 奥の間へ続く細い道で野狐が待ち構える
    triggers: [{ x: 8, y: 5, event: 'yako', unless: 'yakoDefeated' }],
  },
};

/** 町に入る前の印（ワールドマップから町へ）。 */
const NOT_YET = (name: string, chapter: string): string[] => [`${name}。（${chapter}で訪れる）`];

MAPS.world = {
  id: 'world',
  name: '日本',
  areaLevel: 1,
  rows: [
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~"""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~"""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~""""O""""~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~"""""""""""""""""~~~~~~~~~"""""""""""""~~~',
      '~~~~~~~~~~~~~~""""""""^^"""""""~~~~~~~~~"""""""TT"O""~~~',
      '~~~~~~~~~~""""""""""""""""""""^^"^""""^""""^""""""=""~~~',
      '~~~~~~~~~~""""""^^"""""""^^""""^^"""^^""""^"""""""=""~~~',
      '~~~~~~~~~~""TT""""""""""""""""""""""""""""""""""""="""~~',
      '~~~~~~~~~~"""""""""""===O=======O===G==O"====G====O"""~~',
      '~~~~~~~~~~====O======O"""""O"""""""""""==O""""""""""""~~',
      '~~~~~~~~~~="""""""""""""""""TT"""""T""""T"""""""""""""~~',
      '~"""""=====""""""""""""""""""""""""""""""""""""""""~~~~~',
      '~""====""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""="^"""~~~~""""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""O"^"""~~~~""T""^""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""T"~~~~""""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  npcs: [],
  exits: [],
  towns: [
    { x: 41, y: 11, name: '清水湊', to: { mapId: 'shimizu', x: 26, y: 6 } },
    { x: 39, y: 10, name: '駿府', to: { mapId: 'sunpu', x: 28, y: 8 }, openFlag: 'prologueCleared', lines: ['駿府城下。（清水湊の辰五郎の頼みを片づけてから訪れる）'] },
    // 名古屋は大井川の西。大井川の渡し場（oigawaOpen）を越えなければ着かない
    { x: 32, y: 10, name: '名古屋', to: { mapId: 'nagoya', x: 28, y: 8 } },
    { x: 27, y: 11, name: '伊賀', lines: NOT_YET('伊賀上野', '第 4 章') },
    { x: 24, y: 10, name: '京', to: { mapId: 'kyo', x: 28, y: 6 }, openFlag: 'chapter2Cleared', lines: ['京。（尾張名古屋の一件を片づけてから訪れる）'] },
    { x: 21, y: 11, name: '大坂', lines: NOT_YET('大坂', '第 5 章') },
    { x: 14, y: 11, name: '広島', lines: NOT_YET('広島', '第 6 章') },
    { x: 3, y: 16, name: '長崎', lines: NOT_YET('長崎・出島', '第 6 章') },
    // 金沢へは街道でつながず、第 7 章で長崎から北前船（イベント）で渡る
    { x: 24, y: 4, name: '金沢', lines: NOT_YET('加賀金沢', '第 7 章') },
    { x: 50, y: 10, name: '江戸', lines: NOT_YET('江戸', '第 8 章') },
    { x: 50, y: 6, name: '仙台', lines: NOT_YET('仙台', '第 8 章') },
  ],
  gates: [
    // 第 1 章を終えると、川越し人足のイベント（oigawa）で渡れるようになる
    { x: 36, y: 10, flag: 'oigawaOpen', lines: ['大井川の渡し場だ。川越し人足「水かさが増えて、今は渡せねえよ」'], event: 'oigawa' },
    { x: 45, y: 10, flag: 'hakoneTegata', lines: ['箱根の関所だ。役人「通行手形なき者は、通すわけにはいかぬ」'] },
  ],
  // 出現範囲は今は駿河、大井川の西の東海道、京のまわり。ほかの地域の範囲は、その地域の敵を作るとき（フェーズ 4 の各章）に足す
  // 先に書いた範囲が優先。駿府のまわり（大井川の渡し場から駿府まで）は、序章を終えたら駿府の敵（それまでは序章の敵）
  // 大井川の西（名古屋・伊賀のまわり）は東海道の敵。伊賀の範囲は第 4 章で、この範囲より前に足す
  // 大井川の西（東海道）で全滅したら名古屋に戻る（ほかは最初の町の清水湊）
  // 京のまわり（大坂寄りの街道を含む）で全滅したら京に戻る
  respawnZones: [
    { x: 21, y: 9, w: 4, h: 4, mapId: 'kyo' },
    { x: 25, y: 9, w: 11, h: 4, mapId: 'nagoya' },
  ],
  // 京のまわり（x 21〜24）は、第 2 章を終えたら京の敵（それまでは敵が出ない）
  encounterZones: [
    { x: 21, y: 9, w: 4, h: 4, encounter: 'kyoto', flag: 'chapter2Cleared' },
    { x: 25, y: 9, w: 11, h: 4, encounter: 'tokaido' },
    { x: 36, y: 9, w: 4, h: 4, encounter: 'sunpu', flag: 'prologueCleared' },
    { x: 36, y: 9, w: 10, h: 4, encounter: 'suruga' },
  ],
};

export const START_POSITION = { mapId: 'shimizu', x: 14, y: 7 };

/** 第 1 章の駿府城下と、工房・与力の屋敷・からくり屋敷。 */
MAPS.sunpu = {
  id: 'sunpu',
  name: '駿府城下',
  areaLevel: 4,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T^^^^^^^^RRRRRRRRRRRR^^^^^^^^T',
    'T^^^^^^^^WWWWWDDWWWWW^^^^^^^^T',
    'T~~~~~~~~~~~~~==~~~~~~~~~~~~~T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRR,RRRRR,==,RRRRR,RRRRR,T',
    'T,WWDWW,WWDWW,==,WW_WW,WWDWW,T',
    'T,.....,.....,==,.....,.....,T',
    '==============================',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRRRR,RRR,==,RRRRRRRRRR,,T',
    'T,WWWDWWW,WDW,==,WWWW_WWWWW,,T',
    'T,.......,...,==,..........,,T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,,,TT,,,,,,,,==,,,,,,,,,TT,,T',
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'sunpuTeahouse',
      name: '茶屋の娘',
      x: 4,
      y: 7,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「いらっしゃいまし。からくり一座の興行、ごらんになりました？ 人形がまるで生きてるみたいに動くんですよ」',
        '茶屋の娘「でも……一座が来てから、城下でも人がいなくなるようになったって噂で」',
        '茶屋の娘「お団子はいかが？」',
      ],
      after: { flag: 'heardSunpuRumor', lines: ['茶屋の娘「いらっしゃいまし。お団子はいかが？」'] },
      setsFlag: 'heardSunpuRumor',
      action: 'teahouse',
    },
    {
      id: 'sunpuYorozu',
      name: 'よろず屋',
      x: 10,
      y: 7,
      color: 0x6b8c5a,
      lines: ['よろず屋「駿府はお城下だ、品ぞろえは清水にゃ負けませんよ」'],
      action: 'shop',
      shop: 'sunpuYorozu',
    },
    {
      id: 'yorikiGuard',
      name: '門番',
      x: 19,
      y: 6,
      color: 0x4a4a6b,
      lines: ['門番「ここは町奉行所の与力、黒田様のお屋敷だ。町人風情が近寄るでない」'],
      hideFlag: 'kasumiJoined',
    },
    {
      id: 'sunpuInn',
      name: '旅籠の主人',
      x: 25,
      y: 7,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「駿府へようこそ。お泊まりですかい」'],
      action: 'inn',
    },
    {
      id: 'sengenKannushi',
      name: '浅間神社の神主',
      x: 27,
      y: 4,
      color: 0xb0b0a0,
      lines: ['神主「浅間の神のご加護を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'castleGuard',
      name: '城の門番',
      x: 15,
      y: 3,
      color: 0x4a4a6b,
      lines: ['門番「駿府城である。用なき者は通さぬ」'],
    },
    {
      id: 'yobikomi',
      name: '一座の呼び込み',
      x: 5,
      y: 12,
      color: 0xd08a3a,
      lines: [
        '呼び込み「さあさ、お立ち会い！ 大坂は道頓堀から下ってまいりました、からくり一座の大興行！」',
        '呼び込み「茶運び人形に文字書き人形、果ては生きた人と見まごう舞い人形まで！ ……工房？ 南東の蔵だが、見物衆は入れねえよ」',
      ],
      after: { flag: 'tetsubinDefeated', lines: ['呼び込み「座元が姿をくらましちまって、興行はおしまいだ。おれたちゃ何も知らなかったんだよ……」'] },
    },
    {
      id: 'sunpuKaji',
      name: '刀鍛冶',
      x: 11,
      y: 12,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「駿府の刀は家康公以来の名工ぞろいだ。見ていきなせえ」'],
      action: 'shop',
      shop: 'sunpuKaji',
    },
    {
      id: 'sunpuHikyaku',
      name: '飛脚',
      x: 18,
      y: 12,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 駿府の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'sunpuMachiya',
      name: '町のおかみ',
      x: 24,
      y: 13,
      color: 0x9c8a5a,
      lines: [
        'おかみ「うちの亭主の弟も、一座の興行を見に行った晩から帰ってこないんだよ」',
        'おかみ「町奉行所に訴えても、与力の黒田様が『騒ぐな』の一点張りでさ。おかしいと思わないかい？」',
      ],
      after: { flag: 'tetsubinDefeated', lines: ['おかみ「からくり屋敷から、亭主の弟も帰ってきたよ。……帰ってこられなかった人もいるって聞いたけどね」'] },
    },
    {
      id: 'yashikiGuardW',
      name: '一座の見張り',
      x: 14,
      y: 15,
      color: 0x6a4a3a,
      lines: ['見張り「この先は一座の屋敷だ。座元のお許しがなけりゃ、誰も通さねえ」'],
      hideFlag: 'meiboFound',
    },
    {
      id: 'yashikiGuardE',
      name: '一座の見張り',
      x: 15,
      y: 15,
      color: 0x6a4a3a,
      lines: ['見張り「黒田様のお墨付きもある。帰んな」'],
      hideFlag: 'meiboFound',
    },
  ],
  exits: [
    // 東西の街道からワールドマップへ（駿府の印の下と西隣の街道）
    { x: 29, y: 8, to: 'world', toX: 39, toY: 11 },
    { x: 0, y: 8, to: 'world', toX: 38, toY: 10 },
    // 与力の屋敷と工房の入口
    { x: 19, y: 6, to: 'yoriki', toX: 9, toY: 9 },
    { x: 21, y: 11, to: 'kobo', toX: 7, toY: 7 },
    // 南の道から、からくり屋敷へ（名簿が見つかるまでは見張りがふさぐ）
    { x: 14, y: 15, to: 'karakuriYashiki', toX: 12, toY: 18 },
    { x: 15, y: 15, to: 'karakuriYashiki', toX: 13, toY: 18 },
  ],
  respawn: { x: 25, y: 8 },
  onEnter: { event: 'sunpuEnter', unless: 'chapter1Cleared' },
};

MAPS.kobo = {
  id: 'kobo',
  name: '一座の工房',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWW',
    'W_____________W',
    'W_WW_____WW___W',
    'W_____________W',
    'W_____________W',
    'W___WW___WW___W',
    'W_____________W',
    'W_____________W',
    'WWWWWWW_WWWWWWW',
  ],
  npcs: [
    {
      id: 'koboKasumi',
      name: '霞',
      x: 7,
      y: 3,
      color: 0x3a3a5a,
      sprite: 'kasumi',
      event: 'kasumiMeet',
      hideFlag: 'kasumiJoined',
    },
    {
      id: 'koboDesk',
      name: '座元の文机',
      x: 12,
      y: 1,
      color: 0x7a5a3a,
      lines: ['文机の上に、書きかけの文がある。「黒田様　例の品、今月も屋敷の蔵へお届け申し候」'],
    },
    {
      id: 'koboDoll',
      name: '作りかけの人形',
      x: 2,
      y: 6,
      color: 0xb08a5a,
      lines: ['作りかけの人形だ。胸の中に、ゼンマイと、人の髪の束が巻き込まれている……。'],
    },
  ],
  exits: [{ x: 7, y: 8, to: 'sunpu', toX: 21, toY: 12 }],
  respawnMap: 'sunpu',
};

MAPS.yoriki = {
  id: 'yoriki',
  name: '与力・黒田の屋敷',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWWWWWW',
    'W,,,,,,,,,,,RRRRR,W',
    'W,,T,,,,,,,,WWDWW,W',
    'W,,,,,,,,,,,,,,,,,W',
    'W,RRRRRRRRR,,,,T,,W',
    'W,WWWWWWWWW,,,,,,,W',
    'W,,,,,,,,,,,,,,,,,W',
    'W,,,T,,,,,,,,,T,,,W',
    'W,,,,,,,,,,,,,,,,,W',
    'W,,,,,,,,,,,,,,,,,W',
    'WWWWWWWWW_WWWWWWWWW',
  ],
  npcs: [
    {
      id: 'yorikiYonin',
      name: '用人',
      x: 6,
      y: 6,
      color: 0x5a5a6b,
      lines: ['用人「だ、旦那様はお留守じゃ。……奥の蔵？ 近づいてはならぬ、あそこには何もない！」'],
      after: { flag: 'meiboFound', lines: ['用人「旦那様は、お城からお呼び出しがあったきり戻られぬ……」'] },
    },
  ],
  exits: [{ x: 9, y: 10, to: 'sunpu', toX: 19, toY: 7 }],
  respawnMap: 'sunpu',
  // 奥の蔵の前で、雇われのごろつきに見つかる
  triggers: [
    { x: 14, y: 3, event: 'yorikiKura', unless: 'meiboFound' },
    { x: 13, y: 3, event: 'yorikiKura', unless: 'meiboFound' },
    { x: 15, y: 3, event: 'yorikiKura', unless: 'meiboFound' },
  ],
};

MAPS.karakuriYashiki = {
  id: 'karakuriYashiki',
  name: 'からくり屋敷',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWW________WWWWWWWWW',
    'WWWWWWWWW________WWWWWWWWW',
    'WWWWWWWWW________WWWWWWWWW',
    'WWWWWWWWWWWW__WWWWWWWWWWWW',
    'W____WWWWWWW__WWWWWW_____W',
    'W____WWWWWWW__WWWWWW_____W',
    'W__________________W_____W',
    'WWWW_WWWWWWWWWWWWW_WWW_WWW',
    'WWWW_WWWWWWWWWWWWW_WWW_WWW',
    'W______WWWWWWWWW_______WWW',
    'W_WWWW_WWWWWWWWW_WWWWWWWWW',
    'W_WWWW__________________WW',
    'W_WWWWWWWWWW__WWWWWWWWW_WW',
    'W______WWWWW__WWWWWWWWW_WW',
    'WWWWWW_WWWWW__WWW_______WW',
    'W______WWWWW__WWW_WWWWWWWW',
    'W_WWWWWWWWWW__WWW______WWW',
    'W__________W__WWWWWWWW_WWW',
    'WWWWWWWWWWWW__WWWWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'yashikiChest1',
      name: '葛籠',
      x: 2,
      y: 5,
      color: 0x8a6a3a,
      event: 'yashikiChest1',
    },
    {
      id: 'yashikiChest2',
      name: '葛籠',
      x: 24,
      y: 5,
      color: 0x8a6a3a,
      event: 'yashikiChest2',
    },
    {
      id: 'yashikiChest3',
      name: '葛籠',
      x: 1,
      y: 18,
      color: 0x8a6a3a,
      event: 'yashikiChest3',
    },
    {
      id: 'yashamaru',
      name: '夜叉丸',
      x: 12,
      y: 2,
      color: 0x6a2a6a,
      lines: ['……'],
      hideFlag: 'yashamaruFled',
    },
    {
      id: 'zenmaiDevice',
      name: '装置',
      x: 13,
      y: 1,
      color: 0x8a8a8a,
      lines: ['歯車と管が絡み合った、異様な装置だ。'],
      after: { flag: 'yashamaruFled', lines: ['人をゼンマイに封じる装置の残骸だ。夜叉丸に壊され、もう動かない。'] },
    },
  ],
  exits: [
    { x: 12, y: 19, to: 'sunpu', toX: 14, toY: 14 },
    { x: 13, y: 19, to: 'sunpu', toX: 15, toY: 14 },
  ],
  encounter: 'sunpu',
  respawnMap: 'sunpu',
  // 奥の間への細い廊下で、夜叉丸と鉄瓶が待ち構える
  triggers: [
    { x: 12, y: 4, event: 'tetsubin', unless: 'tetsubinDefeated' },
    { x: 13, y: 4, event: 'tetsubin', unless: 'tetsubinDefeated' },
  ],
};

/** 第 2 章の尾張名古屋と、金太の凧屋・堀川の荷蔵・名古屋城の天守。 */
MAPS.nagoya = {
  id: 'nagoya',
  name: '尾張名古屋',
  areaLevel: 7,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T^^^^^^^^RRRRRRRRRRRR^^^^^^^^T',
    'T^^^^^^^^WWWWWDDWWWWW^^^^^^^^T',
    'T~~~~~~~~~~~~~==~~~~~~~~~~~~~T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRR,RRRRR,==,RRRRR,RRRRR,T',
    'T,WWDWW,WWDWW,==,WW_WW,WWDWW,T',
    'T,.....,.....,==,.....,.....,T',
    '==============================',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRRRR,RRR,==,RRRRRRRRRR,,T',
    'T,WWWDWWW,WDW,==,WWWW_WWWWW,,T',
    'T,.......,...,==,..........,,T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,,,TT,,,,,,,,,,,,,,,,,,,TT,,T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'nagoyaTeahouse',
      name: '茶屋の娘',
      x: 4,
      y: 7,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「いらっしゃいまし。お城の金の鯱の鱗が、ひと晩でごっそり剥がされたんですって」',
        '茶屋の娘「あんな高いところ、凧にでも乗らなきゃ届かないって……それで、軽業師の金太さんが疑われてるの。金太さん、そんな人じゃないのに」',
        '茶屋の娘「お団子はいかが？」',
      ],
      after: { flag: 'heardKinshachiRumor', lines: ['茶屋の娘「いらっしゃいまし。お団子はいかが？」'] },
      setsFlag: 'heardKinshachiRumor',
      action: 'teahouse',
    },
    {
      id: 'nagoyaYorozu',
      name: 'よろず屋',
      x: 10,
      y: 7,
      color: 0x6b8c5a,
      lines: ['よろず屋「尾張の城下は東海道いちの品ぞろえだよ。金創膏も置いてるよ」'],
      action: 'shop',
      shop: 'nagoyaYorozu',
    },
    {
      id: 'nagoyaInn',
      name: '旅籠の主人',
      x: 25,
      y: 7,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「名古屋へようこそ。お泊まりですかい」'],
      action: 'inn',
    },
    {
      id: 'atsutaKannushi',
      name: '熱田の神主',
      x: 27,
      y: 4,
      color: 0xb0b0a0,
      lines: ['神主「熱田の宮のご加護を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'nagoyaCastleGuard',
      name: '城の門番',
      x: 15,
      y: 3,
      color: 0x4a4a6b,
      lines: ['門番「名古屋城である。鱗の一件で、ご城内は立ち入り禁止じゃ」'],
      after: { flag: 'kinshachiDefeated', lines: ['門番「金の鱗を取り返したのは、おぬしらか。……殿もたいそうお喜びじゃ」'] },
    },
    {
      id: 'nagoyaDoshin',
      name: '同心',
      x: 21,
      y: 9,
      color: 0x3a4a6a,
      lines: [
        '同心「軽業師の金太を見なかったか。鱗を盗んだのはあやつに違いない」',
        '同心「兄の銀次が『盗んだのはおれだ』と書き置きを残して消えたが、弟をかばっておるのだろう。あの兄弟の凧なら、天守にも届くからな」',
      ],
      after: { flag: 'kinshachiDefeated', lines: ['同心「金太の疑いは晴れた。……疑ってすまなんだと、伝えておいてくれ」'] },
    },
    {
      id: 'nagoyaKaji',
      name: '刀鍛冶',
      x: 11,
      y: 12,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「関の刀に鎖鎌、尾張にゃ腕のいい職人がそろってるぜ」'],
      action: 'shop',
      shop: 'nagoyaKaji',
    },
    {
      id: 'nagoyaHikyaku',
      name: '飛脚',
      x: 18,
      y: 12,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 名古屋の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'horikawaCart',
      name: '荷車',
      x: 21,
      y: 11,
      color: 0x7a5a3a,
      lines: ['堀川の荷蔵の戸口を、重い荷車がふさいでいる。びくともしない。'],
      hideFlag: 'kintaMet',
    },
    {
      id: 'nagoyaMachiya',
      name: '長屋のおかみ',
      x: 24,
      y: 13,
      color: 0x9c8a5a,
      lines: [
        'おかみ「金太と銀次の兄弟は、凧揚げの芸で町の子らの人気者さ。北の通りの凧屋に住んでるよ」',
        'おかみ「近ごろ、堀川の荷蔵に夜な夜な人の出入りがあってね。運び込んでるのは、江戸から来たっていう浪人どもさ」',
      ],
      after: { flag: 'kinshachiDefeated', lines: ['おかみ「銀次のこと、聞いたよ。……金太はひとりで、また凧を揚げてる。兄貴に届くようにってさ」'] },
    },
  ],
  exits: [
    // 東西の街道からワールドマップへ（名古屋の印の両隣の街道）
    { x: 29, y: 8, to: 'world', toX: 33, toY: 10 },
    { x: 0, y: 8, to: 'world', toX: 31, toY: 10 },
    // 金太の凧屋と堀川の荷蔵（金太に会うまでは荷車がふさぐ）
    { x: 19, y: 6, to: 'takoya', toX: 6, toY: 5 },
    { x: 21, y: 11, to: 'horikawaKura', toX: 10, toY: 14 },
  ],
  respawn: { x: 25, y: 8 },
  onEnter: { event: 'nagoyaEnter', unless: 'chapter2Cleared' },
};

MAPS.takoya = {
  id: 'takoya',
  name: '金太の凧屋',
  areaLevel: 7,
  rows: [
    'WWWWWWWWWWWWW',
    'W___________W',
    'W_WW_____WW_W',
    'W___________W',
    'W___________W',
    'W___________W',
    'WWWWWW_WWWWWW',
  ],
  npcs: [
    {
      id: 'kinta',
      name: '金太',
      x: 6,
      y: 2,
      color: 0xd08a3a,
      event: 'kinta',
    },
    {
      id: 'oodako',
      name: '大凧',
      x: 2,
      y: 4,
      color: 0xc04030,
      lines: ['人がぶら下がれるほどの大凧だ。骨は竹、紙には赤い字で「金」と大きく書かれている。'],
    },
    {
      id: 'ginjiLetter',
      name: '文机',
      x: 10,
      y: 4,
      color: 0x7a5a3a,
      lines: ['文机の上に、銀次の筆の跡がある。「凧の糸は、あと二十間あれば天守に届く」'],
    },
  ],
  exits: [{ x: 6, y: 6, to: 'nagoya', toX: 19, toY: 7 }],
  respawnMap: 'nagoya',
};

MAPS.horikawaKura = {
  id: 'horikawaKura',
  name: '堀川の荷蔵',
  areaLevel: 7,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWWWWW__WWWWWWWWWW',
    'W____WWWWW__WWWW_____W',
    'W____WWWWW__WWWW_____W',
    'W_________________W__W',
    'WWW_WWWWWWWWWWWW__W__W',
    'WWW_WWWWWWWWWWWW__W__W',
    'W______WWWWW_______WWW',
    'W_WWWW_WWWWW_WWWWW_WWW',
    'W_WWWW_________WWW___W',
    'W____WWWWW__WWWWWWWW_W',
    'WWWW_WWWWW__WWW______W',
    'W____WWWWW__WWW_WWWWWW',
    'WWWWWWWWWW__WWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'horikawaChest1',
      name: '葛籠',
      x: 20,
      y: 8,
      color: 0x8a6a3a,
      event: 'horikawaChest1',
    },
    {
      id: 'horikawaChest2',
      name: '葛籠',
      x: 1,
      y: 14,
      color: 0x8a6a3a,
      event: 'horikawaChest2',
    },
    {
      id: 'urokoBox',
      name: '千両箱',
      x: 8,
      y: 1,
      color: 0xb08a3a,
      lines: ['空の千両箱だ。底に、金の粉がこびりついている。'],
    },
  ],
  exits: [
    { x: 10, y: 15, to: 'nagoya', toX: 21, toY: 12 },
    { x: 11, y: 15, to: 'nagoya', toX: 21, toY: 12 },
  ],
  encounter: 'nagoya',
  respawnMap: 'nagoya',
  // 奥の間への細い通路で、鷲尾の配下が待ち構える
  triggers: [
    { x: 10, y: 3, event: 'horikawaOku', unless: 'urokoClue' },
    { x: 11, y: 3, event: 'horikawaOku', unless: 'urokoClue' },
  ],
};

MAPS.tenshu = {
  id: 'tenshu',
  name: '名古屋城 天守',
  areaLevel: 7,
  rows: [
    'WWWWWWWWWWWWWWWWWW',
    'W________________W',
    'W__WW________WW__W',
    'W________________W',
    'WWWWWWWW__WWWWWWWW',
    'W________W_______W',
    'W_WWWWWW_W_WWWWW_W',
    'W_W______W_____W_W',
    'W_W_WWWWWWWWWW_W_W',
    'W________________W',
    'WWWWWWWW__WWWWWWWW',
  ],
  npcs: [
    {
      id: 'shachiDaiza',
      name: '鯱の台座',
      x: 8,
      y: 1,
      color: 0xb08a3a,
      lines: ['大棟の上に、金の鯱の台座がある。鯱の姿はない。'],
      after: { flag: 'kinshachiDefeated', lines: ['金の鱗を取り戻した。鯱は、明日にも職人の手で元の姿に戻されるという。'] },
    },
    {
      id: 'tenshuChest',
      name: '葛籠',
      x: 16,
      y: 5,
      color: 0x8a6a3a,
      event: 'tenshuChest',
    },
  ],
  exits: [
    // 石落としの穴から、お堀端（城の門の前）へ下りる
    { x: 8, y: 10, to: 'nagoya', toX: 14, toY: 4 },
    { x: 9, y: 10, to: 'nagoya', toX: 14, toY: 4 },
  ],
  encounter: 'nagoya',
  respawnMap: 'nagoya',
  // 大棟へ上がる細い段で、金鯱からくりが待ち構える
  triggers: [
    { x: 8, y: 4, event: 'kinshachi', unless: 'kinshachiDefeated' },
    { x: 9, y: 4, event: 'kinshachi', unless: 'kinshachiDefeated' },
  ],
};

/** 第 3 章の京と、羅生門跡・鬼の巣（山寺の廃墟）。 */
MAPS.kyo = {
  id: 'kyo',
  name: '京',
  areaLevel: 10,
  rows: [
    'TTTTTTTTTTTTTT__TTTTTTTTTTTTTT',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRR,RRRRR,==,RRRRR,RRRRR,T',
    'T,WWDWW,WWDWW,==,WWDWW,WWDWW,T',
    'T,.....,.....,==,.....,.....,T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    '==============================',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T,RRRRRRR,RRR,==,RRRRRRRRRR,,T',
    'T,WWWDWWW,WDW,==,WWWWWDWWWW,,T',
    'T,.......,...,==,..........,,T',
    'T,,,,,,,,,,,,,==,,,,,,,,,,,,,T',
    'T.............==.............T',
    'T~~~~~~~~~~~~~==~~~~~~~~~~~~~T',
    'T.............==.............T',
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'kyoTeahouse',
      name: '茶屋の娘',
      x: 4,
      y: 4,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「おいでやす。……お客はん、夜は出歩かんほうがよろしおす。羅生門の跡に、鬼が出るんやて」',
        '茶屋の娘「鬼退治を請け負うたお坊さんがいてはるそうやけど、鴨川の河原で酔いつぶれてはるとか」',
        '茶屋の娘「お団子はいかがどす？」',
      ],
      after: { flag: 'heardOniRumor', lines: ['茶屋の娘「おいでやす。お団子はいかがどす？」'] },
      setsFlag: 'heardOniRumor',
      action: 'teahouse',
    },
    {
      id: 'kyoYorozu',
      name: 'よろず屋',
      x: 10,
      y: 4,
      color: 0x6b8c5a,
      lines: ['よろず屋「都の品は確かどすえ。鬼退治のお供に、薬はたんと持っておいきやす」'],
      action: 'shop',
      shop: 'kyoYorozu',
    },
    {
      id: 'kyoInn',
      name: '旅籠の主人',
      x: 25,
      y: 4,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「ようお越しやす。お泊まりどすか」'],
      action: 'inn',
    },
    {
      id: 'yasakaKannushi',
      name: '八坂の神主',
      x: 27,
      y: 1,
      color: 0xb0b0a0,
      lines: ['神主「祇園さんのご加護を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'kyoKaji',
      name: '刀鍛冶',
      x: 11,
      y: 10,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「江戸の虎徹に南蛮渡りの胴、都にはなんでも集まりますわ」'],
      action: 'shop',
      shop: 'kyoKaji',
    },
    {
      id: 'kyoHikyaku',
      name: '飛脚',
      x: 18,
      y: 10,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 京の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'kyoMachiya',
      name: '町のおかみ',
      x: 20,
      y: 7,
      color: 0x9c8a5a,
      lines: [
        'おかみ「鬼に連れていかれたんは、鴨川の河原に住む人らばっかりや。お奉行所も、河原者のことやと本気で探してくれへん」',
        'おかみ「むかしの大火のあとから、河原には行き場のない人が集まってはるんよ」',
      ],
      after: { flag: 'shutenDefeated', lines: ['おかみ「河原の人らが帰ってきはった。鬼にされとったなんて、ほんまに恐ろしいことや……」'] },
    },
    {
      id: 'gendoKawara',
      name: '破戒僧',
      x: 5,
      y: 12,
      color: 0x6a4a2a,
      sprite: 'gendo',
      facing: 'down',
      event: 'gendoMeet',
      hideFlag: 'gendoJoined',
    },
    {
      id: 'kawaramono',
      name: '河原の男',
      x: 22,
      y: 14,
      color: 0x7a6a5a,
      lines: ['河原の男「弟が、鬼に……いや、弟が鬼になって、夜の都をさまよっとるんや。見たもんがおるんや！」'],
      after: { flag: 'rashomonCleared', lines: ['河原の男「弟が帰ってきた！ あのお坊さんが、鬼を祓うてくれはったんや……！」'] },
    },
    {
      id: 'kitaGuardW',
      name: '奉行所の役人',
      x: 14,
      y: 0,
      color: 0x4a4a6b,
      lines: ['役人「北の山へは通さぬ。鬼が出るのでな。……羅生門の鬼の一件が片づくまでは、誰であろうと通さん」'],
      hideFlag: 'rashomonCleared',
    },
    {
      id: 'kitaGuardE',
      name: '奉行所の役人',
      x: 15,
      y: 0,
      color: 0x4a4a6b,
      lines: ['役人「羅生門の跡は、五条の橋を渡った南だ。行くなら止めはせぬが……」'],
      hideFlag: 'rashomonCleared',
    },
  ],
  exits: [
    // 東西の通りからワールドマップへ（京の印の両隣の街道）
    { x: 29, y: 6, to: 'world', toX: 25, toY: 10 },
    { x: 0, y: 6, to: 'world', toX: 23, toY: 10 },
    // 北の山道から鬼の巣へ（羅生門の鬼を祓うまでは役人がふさぐ）
    { x: 14, y: 0, to: 'oninosu', toX: 11, toY: 14 },
    { x: 15, y: 0, to: 'oninosu', toX: 11, toY: 14 },
    // 五条の橋を渡って南の羅生門跡へ
    { x: 14, y: 15, to: 'rashomon', toX: 5, toY: 8 },
    { x: 15, y: 15, to: 'rashomon', toX: 6, toY: 8 },
  ],
  respawn: { x: 25, y: 5 },
  onEnter: { event: 'kyoEnter', unless: 'chapter3Cleared' },
};

MAPS.rashomon = {
  id: 'rashomon',
  name: '羅生門跡',
  areaLevel: 10,
  rows: [
    'TTTTTTTTTTTT',
    'T^^RRRRRR^^T',
    'T^^WWWWWW^^T',
    'T,,,,,,,,,,T',
    'T,^,,,,,,^,T',
    'TTTT,,,,TTTT',
    'T,,,,,,,,,,T',
    'T,T,,,,,,T,T',
    'T,,,,,,,,,,T',
    'TTTTT,,TTTTT',
  ],
  npcs: [
    {
      id: 'rashomonIshi',
      name: '石碑',
      x: 6,
      y: 3,
      color: 0x8a8a8a,
      lines: ['「羅城門跡」と刻まれた古い石碑だ。むかし、この門の楼上には鬼が棲んだという。'],
    },
  ],
  exits: [
    { x: 5, y: 9, to: 'kyo', toX: 14, toY: 14 },
    { x: 6, y: 9, to: 'kyo', toX: 15, toY: 14 },
  ],
  encounter: 'kyoto',
  respawnMap: 'kyo',
  // 門の跡の手前で、鬼にされた河原者たちが待ち構える
  triggers: [4, 5, 6, 7].map((x) => ({ x, y: 5, event: 'rashomonOni', unless: 'rashomonCleared' })),
};

MAPS.oninosu = {
  id: 'oninosu',
  name: '鬼の巣',
  areaLevel: 10,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWWWWW__WWWWWWWWWW',
    'W______WWW__WWW______W',
    'W_WWWW_WWW__WWW_WWWW_W',
    'W_W__W_____________W_W',
    'W_W__WWWWW_WWWWW_W_W_W',
    'W____W_____W_____W___W',
    'WWWW_W_WWWWW_WWWWWWW_W',
    'W____W_W_____W_______W',
    'W_WWWW_W_WWWWW_WWWWWWW',
    'W______W_______W_____W',
    'WWWWWWWWWW__WWWW_WWW_W',
    'W_________________W__W',
    'WWWWWWWWWW__WWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'oninosuChest1',
      name: '葛籠',
      x: 3,
      y: 6,
      color: 0x8a6a3a,
      event: 'oninosuChest1',
    },
    {
      id: 'oninosuChest2',
      name: '葛籠',
      x: 20,
      y: 14,
      color: 0x8a6a3a,
      event: 'oninosuChest2',
    },
    {
      id: 'kyoYashamaru',
      name: '夜叉丸',
      x: 12,
      y: 1,
      color: 0x6a2a6a,
      lines: ['……'],
      hideFlag: 'yashamaruKyoFled',
    },
    {
      id: 'oninosuButsudan',
      name: '朽ちた本尊',
      x: 8,
      y: 1,
      color: 0x8a7a5a,
      lines: ['首の落ちた仏像だ。台座に、まだ新しい護摩の灰が積もっている。'],
      after: { flag: 'shutenDefeated', lines: ['首の落ちた仏像だ。玄道が、静かに経を唱えている。'] },
    },
  ],
  exits: [
    { x: 10, y: 15, to: 'kyo', toX: 14, toY: 1 },
    { x: 11, y: 15, to: 'kyo', toX: 15, toY: 1 },
  ],
  encounter: 'kyoto',
  respawnMap: 'kyo',
  // 本堂へ上がる細い段で、夜叉丸と大鬼が待ち構える
  triggers: [
    { x: 10, y: 3, event: 'shuten', unless: 'shutenDefeated' },
    { x: 11, y: 3, event: 'shuten', unless: 'shutenDefeated' },
  ],
};

export type TownAction =
  | { kind: 'enter'; to: { mapId: string; x: number; y: number } }
  | { kind: 'info'; lines: string[] }
  | { kind: 'label'; text: string };

/**
 * ワールドマップの町の印での動き。乗ったとき（step）は名前を出すだけで入らず、
 * 決定ボタン（ok）で入る（まだ入れない町は案内を出す）。印がなければ null。
 */
export function townAction(map: MapDef, x: number, y: number, by: 'step' | 'ok', flags: Record<string, boolean>): TownAction | null {
  const town = map.towns?.find((t) => t.x === x && t.y === y);
  if (!town) return null;
  const to = town.to && (!town.openFlag || flags[town.openFlag]) ? town.to : undefined;
  if (by === 'step') return { kind: 'label', text: to ? `${town.name}（決定で入る）` : town.name };
  if (to) return { kind: 'enter', to };
  return { kind: 'info', lines: town.lines ?? [town.name] };
}

/** その NPC が今いるか（hideFlag が立つと姿を消す）。 */
export function npcVisible(npc: NpcDef, flags: Record<string, boolean>): boolean {
  return !npc.hideFlag || !flags[npc.hideFlag];
}

/**
 * そのマップで全滅したときに戻る場所。マップに respawn がなければ、(x, y) を含む respawnZones の町、
 * なければ respawnMap の町、それもなければ最初の町。
 */
export function respawnPoint(mapId: string, x?: number, y?: number): { mapId: string; x: number; y: number } {
  const map = MAPS[mapId];
  const zone =
    x === undefined || y === undefined ? undefined : map?.respawnZones?.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  const town = map?.respawn ? map : MAPS[zone?.mapId ?? map?.respawnMap ?? START_POSITION.mapId];
  return town?.respawn ? { mapId: town.id, ...town.respawn } : START_POSITION;
}

/** その場所の出現表の ID（範囲の指定が優先。flag の立っていない範囲は飛ばす。なければマップ全体の encounter）。 */
export function encounterAt(map: MapDef, x: number, y: number, flags: Record<string, boolean>): string | undefined {
  const zone = map.encounterZones?.find(
    (z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h && (!z.flag || flags[z.flag]),
  );
  return zone?.encounter ?? map.encounter;
}

/** 通れない関所（flag がまだ立っていない）。 */
export function closedGateAt(map: MapDef, x: number, y: number, flags: Record<string, boolean>): GateDef | undefined {
  return map.gates?.find((g) => g.x === x && g.y === y && !flags[g.flag]);
}

export function tileAt(map: MapDef, x: number, y: number): TileDef | undefined {
  const ch = map.rows[y]?.[x];
  return ch === undefined ? undefined : TILES[ch];
}
