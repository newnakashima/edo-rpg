// フィールドのマップ。序章〜第 6 章の町・ダンジョンと、ワールドマップを用意する。
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
  /** 範囲ごとの全滅時の戻り先の町（respawnMap より優先する。ワールドマップの地域ごとに近くの町へ戻す）。flag があれば、そのフラグが立っているときだけ使う。 */
  respawnZones?: { x: number; y: number; w: number; h: number; mapId: string; flag?: string }[];
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
  // 清水湊: 北西に寺、北東の川向こうに辰五郎一家の屋敷、中ほどに東海道と店、南に長屋と蔵、その先に湊（桟橋）
  shimizu: {
    id: 'shimizu',
    name: '駿河・清水湊',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTT==TTTTTTTTTTTTTTTTTTTTTTT',
      'T,TTTTTTTTTTTTTTTTT,,,,==,,~~,,WWWWWWWWWWWWWWW,T',
      'T,T..RRRRRRRRR..^.T,,,,==,,~~,,W.RRRRRRRRRRR.W,T',
      'T,T..RRRRRRRRR.^..T,,,,==,,~~,,W.RRRRRRRRRRR.W,T',
      'T,T..WWWWDWWWW....T,,,,==,,~~,,W.WWWWWDWWWWW.W,T',
      'T,T.............^.T,,,,==,,~~,,W.............W,T',
      'T,T...........^...T,,,,==,,~~,,W..T........T.W,T',
      'T,T...............T,,,,==,,~~,,W.............W,T',
      'T,TTTTTTT..TTTTTTTT,,,,==,,~~,,WWWWWW...WWWWWW,T',
      'T===============================================',
      'T===============================================',
      'T,,,,,,,,,,,,,,,,,,,,,=,,,,~~,,,,,,,,,,,,,,,,,,T',
      'T,RRRRRR,RRRRR,RRRRRR,=,,,,~~,,RRRRRRRRR,RRRRR,T',
      'T,RRRRRR,RRRRR,RRRRRR,=,,,,~~,,RRRRRRRRR,RRRRR,T',
      'T,WWDWWW,WWDWW,WWWDWW,=,,,,~~,,WWWWDWWWW,WWDWW,T',
      'T,....................=,,,,~~,,...............,T',
      'T,,,,,,,,,,,,,,,,,,,,,=,,,,~~,,,,,,,,,,,,,,,,,,T',
      'T==============================================T',
      'T,,,,,,,,,,,.,,,,,,,,,,,,,,~~,,,,,,,,,,,,,,,,,,T',
      'T,RRRRRRRRRR.,RRRRRRRRRR,,,~~,,RRRR,RRRR,RRRR,,T',
      'T,WDWWDWWDWW.,WWDWWDWWDW,,,~~,,RRRR,RRRR,RRRR,,T',
      'T,,,,,,,,,,,.,,,,,,,,,,,,,,~~,,WWWW,WWWW,WWWW,,T',
      'T,RRRRRRRRRR.,RRRRRRRRRR,,,~~,,,,,,,,,,,,,,,,,,T',
      'T,WDWWDWWDWW.,WWDWWDWWDW,,,~~,,,,,,,,,,,,,,,,,,T',
      'T,,,,,,,,,,,.,,,,,,,,,,,,,,~~,,,,,,,,,,,,,,,,,,T',
      'T..........................~~..................T',
      'T~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~T',
      'T~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~T',
      'T~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~T',
      'T~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~~====~~~~~~~T',
      'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'tatsugoro',
        name: '辰五郎',
        x: 38,
        y: 7,
        color: 0x8a3b2e,
        sprite: 'tatsugoro',
        event: 'tatsugoro',
        // 第 3 章の終わりに、鷲尾の配下の刺客に殺される（弔いの場面は第 4 章の始まり。shimizuEnter）
        hideFlag: 'chapter3Cleared',
      },
      {
        id: 'innkeeper',
        name: '旅籠の主人',
        x: 35,
        y: 15,
        color: 0x5a6b8c,
        lines: ['旅籠の主人「お泊まりですかい。ゆっくり休んでいきなせえ」'],
        action: 'inn',
      },
      {
        id: 'teahouse',
        name: '茶屋の娘',
        x: 4,
        y: 15,
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
        x: 11,
        y: 15,
        color: 0x6b8c5a,
        lines: ['よろず屋「傷薬に毒消し、なんでもそろってますよ」'],
        action: 'shop',
        shop: 'shimizuYorozu',
      },
      {
        id: 'kaji',
        name: '刀鍛冶',
        x: 18,
        y: 15,
        color: 0x5a5a6b,
        lines: ['刀鍛冶「旅の御仁、得物の手入れは怠りなさんな」'],
        action: 'shop',
        shop: 'shimizuKaji',
      },
      {
        id: 'temple',
        name: '寺の住職',
        x: 9,
        y: 7,
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
        x: 43,
        y: 15,
        color: 0x3e7cb0,
        lines: ['飛脚「へい、まいど！ 記録の言付けも、荷物の預かりも承りやす」'],
        action: 'hikyaku',
      },
      {
        id: 'nagaya',
        name: '長屋のおかみ',
        x: 6,
        y: 21,
        color: 0x9c8a5a,
        lines: ['長屋のおかみ「隣の与吉さんも、狐火を見たって言った晩にいなくなったんだよ。おお、こわい」'],
        after: { flag: 'yakoDefeated', lines: ['長屋のおかみ「裏山の狐を退治してくれたんだって？ 与吉さんも、どこかで生きてりゃいいんだけどねえ」'] },
      },
      {
        id: 'orin',
        name: 'お凛',
        x: 41,
        y: 7,
        color: 0xd04a4a,
        sprite: 'orin',
        lines: ['お凛「おとっつぁんもおとっつぁんだよ。よそ者なんかに頼るなんて」'],
        after: { flag: 'yakoDefeated', lines: ['お凛「……狐を退治したんだってね。礼は言っとくよ。けど、まだ認めたわけじゃないからね」'] },
        // 第 4 章の始まり（辰五郎の弔い）で仲間になる
        hideFlag: 'orinJoined',
      },
      {
        id: 'shimizuTeraotoko',
        name: '寺男',
        x: 4,
        y: 4,
        color: 0x7a6a4a,
        lines: ['寺男「裏山へは、町の北の道をまっすぐ上るんだ。山の祠にお参りしてから行くといい」'],
      },
      {
        id: 'shimizuKodomo',
        name: '子ども',
        x: 20,
        y: 24,
        color: 0xd0a060,
        lines: ['子ども「お侍さん、渡世人ってやつかい？ 辰五郎親分の家なら、北の川向こうの大きなお屋敷だよ」'],
        after: { flag: 'chapter3Cleared', lines: ['子ども「辰五郎親分、死んじゃったんだって……。お凛姉ちゃん、泣いてなかった？」'] },
      },
      {
        id: 'shimizuRyoshi',
        name: '漁師',
        x: 10,
        y: 28,
        color: 0x6a7a5a,
        lines: ['漁師「夜釣りの帰りに、裏山のほうで青い火がふわふわ揺れてるのを見たんだ。ありゃあ狐火だよ」'],
        after: { flag: 'yakoDefeated', lines: ['漁師「裏山の狐火が出なくなってから、夜釣りも安心してできるようになったよ」'] },
      },
      {
        id: 'shimizuSendo',
        name: '船頭',
        x: 36,
        y: 29,
        color: 0x4a6a8a,
        lines: ['船頭「清水の湊は、駿府へ江戸へと荷を運ぶ船でいつもにぎわってらあ」', '船頭「辰五郎親分の一家が湊をしきってるから、この辺じゃ悪さをする奴はいねえのさ」'],
      },
    ],
    exits: [
      // 北の道から裏山へ
      { x: 23, y: 0, to: 'urayama', toX: 23, toY: 31 },
      { x: 24, y: 0, to: 'urayama', toX: 24, toY: 31 },
      // 東海道からワールドマップへ
      { x: 47, y: 9, to: 'world', toX: 41, toY: 10 },
      { x: 47, y: 10, to: 'world', toX: 41, toY: 10 },
    ],
    respawn: { x: 35, y: 16 },
    // 初めて入ったときは序章の始まり、第 3 章を終えて戻ったときは辰五郎の弔い（お凛が加わるまで）
    onEnter: { event: 'shimizuEnter', unless: 'orinJoined' },
  },
  // 裏山: 麓から九十九折りに登る山道。西の脇道の奥に祠、東に沢、山頂近くの岩場、上の口が狐火の洞
  urayama: {
    id: 'urayama',
    name: '清水湊・裏山',
    areaLevel: 1,
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,TTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,T~~TTT',
      'TTTTTTTTTTTTTT,,,,^,,,TTTTTTTTTT,,T~~TTT',
      'TTTTTTTTTTTTTT,^,,,,,,TTTTTTTTTT,,T~~TTT',
      'TTTTTTTTTTTTTT,,,,,,,,,,,,,,,,,,,,T~~TTT',
      'TTTTTTTTTTTTTT,,,,,,^,,,,,,,,,,,,,T~~TTT',
      'TTTTTTTTTTTTTT,,^,,,,,TT,,TTTTTTTTT~~TTT',
      'TTTTTTTTTTTTTT,,,,,,,,TT,,TTTTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTTTTTTTT,,TTTTTTTTT~~TTT',
      'TT,,,,,,,TTT,,,,,,,,,,,,,,TTTTTTTTT~~TTT',
      'TT,,,,,,,TTT,,,,,,,,,,,,,,,,,,^,TTT~~TTT',
      'TT,,,,,,,TTT,,TTTTTTTTTTTT,^,,,,TTT~~TTT',
      'TT,,,,,,,^TT,,TTTTTTTTTTTT,,,,,,TTT~~TTT',
      'TTT,,TTTTTTT,,TTTTTTTTTTTTTTTTTTTTT~~TTT',
      'TTT,,TTTTTTT,,TTTTTTTTTTTTTTTTTTTTT~~,,T',
      'TTT,,TTTTTTT,,,,,,,,,,,,,,,,,,,,TTT~~,,T',
      'TTT,,TTTTTTT,,,,,,,,,,^,,,,,,,,,TTT~~,,T',
      'TTT,,TTTTTTTTT,,^,,,,,,,TTTTTT,,TTT~~,,T',
      'TTT,,TTTTTTTTT,,,,,,^,,,TTTTTT,,,,,==,,T',
      'TTT,,TTTTTTTTT,^,,,,,,,,TTTTTT,,TTT~~,,T',
      'TTT,,TTTTTTTTTTTTTTTTTTTTTTTTT,,TTT~~,,T',
      'TTT,,,,,,,,,,,,,,,,,,,,,,,,,,,,,TTT~~,,T',
      'TTT,,,,,,,,,,,,,,,,,,,,,,,^,,,,,TTT~~,,T',
      'TTTTTTTT,,TTTTTTTTTTTTTTTTTTTTTTTTT~~,,T',
      'TTTTTTTT,,^TTTTTTTTTTTTTTTTTTTTTTTT~~TTT',
      'TTTTTTTT,,TTTTTTTTTTTTTTTTTTTTTTTTT~~TTT',
      'TTTTTTTT,,TTTTTTTTTTTTTTTTTTTTTTTTT~~TTT',
      'TTTTTTTT,,,,,,,,,,,,,,,,TTTTTTTTTTT~~TTT',
      'TTTTTTTT,,,,,,,,,,,,,,,,,,,,TTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTT,,,,,,,,,,TTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTT,,,,,,,,,,TTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTT,,,,,,,,,,TTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTTTTTTT,,TTTTTTTTTT~~TTT',
      'TTTTTTTTTTTTTTTTTTTTTTT,,TTTTTTTTTTTTTTT',
    ],
    npcs: [
      {
        id: 'urayamaShrine',
        name: '祠',
        x: 4,
        y: 9,
        color: 0x8c8c7a,
        event: 'urayamaShrine',
      },
      {
        id: 'urayamaChest',
        name: '葛籠',
        x: 19,
        y: 4,
        color: 0x8a6a3a,
        event: 'urayamaChest',
      },
      {
        id: 'urayamaKusatori',
        name: '薬草取り',
        x: 38,
        y: 16,
        color: 0x5a7a4a,
        lines: ['薬草取り「沢の向こうは静かでいいよ。……けど、この先の洞の近くじゃ、狐の鳴き声が人の声みたいに聞こえるんだ」'],
        after: { flag: 'yakoDefeated', lines: ['薬草取り「洞の狐がいなくなって、山がすっかり静かになったよ。薬草もよく採れる」'] },
      },
    ],
    exits: [
      // 上の口から狐火の洞へ
      { x: 32, y: 0, to: 'kitsunebiCave', toX: 18, toY: 27 },
      { x: 33, y: 0, to: 'kitsunebiCave', toX: 19, toY: 27 },
      // 麓の道から清水湊へ
      { x: 23, y: 33, to: 'shimizu', toX: 23, toY: 1 },
      { x: 24, y: 33, to: 'shimizu', toX: 24, toY: 1 },
    ],
    encounter: 'urayama',
  },
  // 狐火の洞: 入口の広間から西の迷い道・東の地底の水たまりへ分かれ、1 マス幅の細い道の先が奥の間
  kitsunebiCave: {
    id: 'kitsunebiCave',
    name: '狐火の洞',
    areaLevel: 1,
    rows: [
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^..........^^^^^^^^^^^^^',
      '^^......^^^^^^^.^........^........^^^^',
      '^^......^^^^^^^..........^........^^^^',
      '^^......^^^^^^^........^.^........^^^^',
      '^^......^^^^^^^..........^........^^^^',
      '^^^..^^^^^^^^^^^^^^^^^^^.^^^^^..^^^^^^',
      '^^^..^^^^^^^^^^^^^^^^^^^.^^^^^..^^^^^^',
      '^^^..^^^^^^^^^^^^^^^^^^^.^........^^^^',
      '^^^..^^^^^^^^^^^^^^^^^^^..........^^^^',
      '^^^..^^^^^^^^^^^^^^^^^^^..^^^^^^..^^^^',
      '^^^.........^^^^^^^^^^^^..^^^^^^..^^^^',
      '^^^.........^^^^^^^^^^^^..^^^^^^..^^^^',
      '^^^^^^^^^^..^^......................^^',
      '^^^^^^^^^^..^^......................^^',
      '^^^^^^^^^^..^^..^^^^^^^^^^..~~~~....^^',
      '^^^^........^^..^^^^^^^^^^..~~~~....^^',
      '^^^^..^.....^^..^^^^^^^^^^..........^^',
      '^^^^..^^^^^^^^.......^^^^^..........^^',
      '^^^^..^^^^^^^^.......^^^^^^^^^^^..^^^^',
      '^^^^..^^^^^^^^^^^^^..^^^^^^^^^^^.^^^^^',
      '^^^^..^^^^^^^^^^^^^..^^^^^^^^^^^..^^^^',
      '^^^^..^^^^^^^^^^^^^..^^^^^^^^^^^..^^^^',
      '^^^^..^^^^^^^^^.........^^^^^^^^..^^^^',
      '^^^^....................^^^^^^^^..^^^^',
      '^^^^..............................^^^^',
      '^^^^^^^^^^^^^^^.....^.............^^^^',
      '^^^^^^^^^^^^^^^.........^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^..^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^..^^^^^^^^^^^^^^^^^^',
    ],
    npcs: [
      {
        id: 'cavecrate',
        name: '木箱',
        x: 17,
        y: 1,
        color: 0x7a5a3a,
        lines: ['木箱には駿府の工房の焼き印。中には、ゼンマイ仕掛けが埋め込まれた人形の残骸が入っている。'],
      },
      {
        id: 'caveChest1',
        name: '葛籠',
        x: 4,
        y: 3,
        color: 0x8a6a3a,
        event: 'caveChest1',
      },
      {
        id: 'caveChest2',
        name: '葛籠',
        x: 31,
        y: 3,
        color: 0x8a6a3a,
        event: 'caveChest2',
      },
    ],
    exits: [
      { x: 18, y: 29, to: 'urayama', toX: 32, toY: 1 },
      { x: 19, y: 29, to: 'urayama', toX: 33, toY: 1 },
    ],
    encounter: 'urayama',
    // 奥の間へ続く細い道で野狐が待ち構える
    triggers: [
      { x: 24, y: 6, event: 'yako', unless: 'yakoDefeated' },
    ],
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
      '~""O===O"~~~~""T""^""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""T"~~~~""""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~""""""""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  npcs: [],
  exits: [],
  towns: [
    { x: 41, y: 11, name: '清水湊', to: { mapId: 'shimizu', x: 45, y: 10 } },
    { x: 39, y: 10, name: '駿府', to: { mapId: 'sunpu', x: 47, y: 15 }, openFlag: 'prologueCleared', lines: ['駿府城下。（清水湊の辰五郎の頼みを片づけてから訪れる）'] },
    // 名古屋は大井川の西。大井川の渡し場（oigawaOpen）を越えなければ着かない
    { x: 32, y: 10, name: '名古屋', to: { mapId: 'nagoya', x: 28, y: 8 } },
    { x: 27, y: 11, name: '伊賀', to: { mapId: 'iga', x: 28, y: 6 }, openFlag: 'orinJoined', lines: ['伊賀上野。（清水湊の一家のことが気にかかる。まずは清水湊へ）'] },
    { x: 24, y: 10, name: '京', to: { mapId: 'kyo', x: 28, y: 6 }, openFlag: 'chapter2Cleared', lines: ['京。（尾張名古屋の一件を片づけてから訪れる）'] },
    { x: 21, y: 11, name: '大坂', to: { mapId: 'osaka', x: 28, y: 6 }, openFlag: 'chapter4Cleared', lines: ['大坂。（伊賀の仇討ちを済ませてから訪れる）'] },
    { x: 14, y: 11, name: '広島', to: { mapId: 'hiroshima', x: 40, y: 13 }, openFlag: 'chapter5Cleared', lines: ['安芸広島。（大坂の一件を片づけてから訪れる）'] },
    { x: 3, y: 16, name: '長崎', to: { mapId: 'nagasaki', x: 42, y: 13 }, openFlag: 'kasumiRejoined', lines: ['長崎。（広島で霞と落ち合ってから訪れる）'] },
    // 島原の原城跡（第 6 章のダンジョン）。長崎の南蛮寺跡で蘭学者の書き付けを見つけると入れる
    { x: 7, y: 16, name: '島原', to: { mapId: 'harajo', x: 3, y: 2 }, openFlag: 'shimabaraOpen', lines: ['島原の古城の跡。（長崎で手がかりを得てから訪れる）'] },
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
  // 出現範囲は今は駿河、大井川の西の東海道、京のまわり、伊賀のまわり、大坂のまわり、西国街道と長崎・島原のまわり。ほかの地域の範囲は、その地域の敵を作るとき（フェーズ 4 の各章）に足す
  // 先に書いた範囲が優先。駿府のまわり（大井川の渡し場から駿府まで）は、序章を終えたら駿府の敵（それまでは序章の敵）
  // 大井川の西（名古屋のまわり）は東海道の敵。伊賀のまわり（x 26〜28、伊賀の印の北の東海道）は、お凛が加わったら伊賀の敵（それまでは東海道の敵）
  // 大井川の西（東海道）で全滅したら名古屋に戻る（ほかは最初の町の清水湊）。伊賀のまわりは、お凛が加わったあとは伊賀上野に戻る
  // 京のまわり（大坂寄りの街道を含む）で全滅したら京に戻る。大坂のまわり（x 17〜21）は、第 4 章を終えたら大坂に戻る
  // 大坂より西（x 0〜16）は、第 5 章を終えたら広島に戻る。長崎・島原のまわり（x 0〜9、y 13 から下）は、長崎に着いたら長崎に戻る
  respawnZones: [
    { x: 0, y: 13, w: 10, h: 6, mapId: 'nagasaki', flag: 'nagasakiArrived' },
    { x: 0, y: 9, w: 17, h: 10, mapId: 'hiroshima', flag: 'chapter5Cleared' },
    { x: 17, y: 9, w: 5, h: 4, mapId: 'osaka', flag: 'chapter4Cleared' },
    { x: 21, y: 9, w: 4, h: 4, mapId: 'kyo' },
    { x: 26, y: 9, w: 3, h: 4, mapId: 'iga', flag: 'orinJoined' },
    { x: 25, y: 9, w: 11, h: 4, mapId: 'nagoya' },
  ],
  // 京のまわり（x 21〜24）は、第 2 章を終えたら京の敵（それまでは敵が出ない）
  // 大坂のまわり（x 17〜21、大坂の印とその西の街道）は、第 4 章を終えたら大坂の敵（京の範囲より優先）
  // 大坂より西の西国街道（x 0〜16）は、第 5 章を終えたら西国街道の敵。長崎・島原のまわり（x 0〜9、y 13 から下）は、霞が戻ったら長崎の敵
  encounterZones: [
    { x: 0, y: 13, w: 10, h: 6, encounter: 'nagasaki', flag: 'kasumiRejoined' },
    { x: 0, y: 9, w: 17, h: 10, encounter: 'saigoku', flag: 'chapter5Cleared' },
    { x: 17, y: 9, w: 5, h: 4, encounter: 'osaka', flag: 'chapter4Cleared' },
    { x: 21, y: 9, w: 4, h: 4, encounter: 'kyoto', flag: 'chapter2Cleared' },
    { x: 26, y: 9, w: 3, h: 4, encounter: 'iga', flag: 'orinJoined' },
    { x: 25, y: 9, w: 11, h: 4, encounter: 'tokaido' },
    { x: 36, y: 9, w: 4, h: 4, encounter: 'sunpu', flag: 'prologueCleared' },
    { x: 36, y: 9, w: 10, h: 4, encounter: 'suruga' },
  ],
};

export const START_POSITION = { mapId: 'shimizu', x: 20, y: 9 };

/** 第 1 章の駿府城下（中央に堀を巡らせた駿府城、北西に浅間神社、北東に武家屋敷町、南西に一座の芝居小屋、南東に安倍川の支流）と、工房・与力の屋敷・からくり屋敷。 */
MAPS.sunpu = {
  id: 'sunpu',
  name: '駿府城下',
  areaLevel: 4,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,,,,,,,,,,~~~~~~~~~~~~~~~~~~,,,,,,,,,,,,,,,T',
    'T,TTTTTTTTTTT,,,~~^^^^^^^^^^^^^^~~,,.WRRRRRRRRRW,T',
    'T,TTTTTTTTTTT,,,~~^^WRRRRRRRRW^^~~,,.WRRRRRRRRRW,T',
    'T,TT.RRRRR.TT,,,~~^^WRRRRRRRRW^^~~,,.WRRRRRRRRRW,T',
    'T,TT.RRRRR.TT,,,~~^^WRRRRRRRRW^^~~,,.WRRRRRRRRRW,T',
    'T,TT.WWDWW.TT,,,~~^^WRRRRRRRRW^^~~,,.WRRRRRRRRRW,T',
    'T,TT.......TT,,,~~^^WWWWWWWWWW^^~~,,.WWWWWWWWWWW,T',
    'T,TT.......TT,,,~~^^WWWWWWWWWW^^~~,,.WWWWW_WWWWW,T',
    'T,TT.T...T.TT,,,~~^^^^^^..^^^^^^~~,,.,,,,,.,,,,,,T',
    'T,TTTT...TTTT,,,~~^^^^^^..^^^^^^~~,,.RRRRR.RRRRR,T',
    'TRRRRR,,,RRRRR,,~~~~~~~~==~~~~~~~~,,.WWWWW.WWWWW,T',
    'TWWDWW,,,WWDWW,,~~~~~~~~==~~~~~~~~,,.,,,,,.,,,,,,T',
    'T,,,,,,,,,,,,,,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,,,,,,T',
    '==================================================',
    '==================================================',
    'T,,,,,,,,,,,,,,,,,,.,,,,.,,,,.,,,,,,,,,,,,,,,,,,,T',
    'T,,,,,,,,,,,,,,,,,,.,,,,.,,,,.RRRRRRRR,RRRRR,RRRRT',
    'T,RRRRRRRRRRRRRRRR,.RRRR.RRRR.RRRRRRRR,RRRRR,RRRRT',
    'T,RRRRRRRRRRRRRRRR,.WDWW.WDWW.WWWDWWWW,WWDWW,WDWWT',
    'T,RRRRRRRRRRRRRRRR,.,,,,.,,,,....................T',
    'T,RRRRRRRRRRRRRRRR,.,,,,.,,,,.,,,,,,,,,,,,,,,,,,,T',
    'T,RRRRRRRRRRRRRRRR,.RRRR.RRRR.,,,,,,,,,,,,,,,,,,,T',
    'T,WWWWWWW_WWWWWWWW,.WWDW.WWDW.,,~~~~~~==~~~~~~~~~T',
    'T,................,.,,,,.,,,,.,,~~~~~~==~~~~~~~~~T',
    'T,,,,,,,,,,,,,,,,,,...........,,~~~~~~==~~~~~~~~~T',
    'T,,,,,,,,,,,,,,,,TT==TTTTTTTTTTT,,,,,,,,,,,,,,,,,T',
    'T,,,T,,,,,,,,,,,,TT==TTTTTTTTTTT,,,,,,,,,,,,T,,,,T',
    'T,,,,,,,,,,,,T,,,TT==TTTTTTTTTTT,,T,,,,,,,,,,,,,,T',
    'T,,,,,,,T,,,,,,,,TT==TTTTTTTTTTT,,,,,,,,,,,,,,,,,T',
    'T,,,,,,,,,,,,,,,,TT==TTTTTTTTTTT,,,,,,,,,,,,,,T,,T',
    'T,,T,,,,,,,,,,,T,TT==TTTTTTTTTTT,,,,T,,,,,,,,,,,,T',
    'T,,,,,,,,,,,,,,,,TT==TTTTTTTTTTT,,,,,,,,,,,,,,,,,T',
    'TTTTTTTTTTTTTTTTTTT==TTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'sunpuTeahouse',
      name: '茶屋の娘',
      x: 3,
      y: 13,
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
      x: 11,
      y: 13,
      color: 0x6b8c5a,
      lines: ['よろず屋「駿府はお城下だ、品ぞろえは清水にゃ負けませんよ」'],
      action: 'shop',
      shop: 'sunpuYorozu',
    },
    {
      id: 'yorikiGuard',
      name: '門番',
      x: 42,
      y: 9,
      color: 0x4a4a6b,
      lines: ['門番「ここは町奉行所の与力、黒田様のお屋敷だ。町人風情が近寄るでない」'],
      hideFlag: 'kasumiJoined',
    },
    {
      id: 'sunpuInn',
      name: '旅籠の主人',
      x: 33,
      y: 20,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「駿府へようこそ。お泊まりですかい」'],
      action: 'inn',
    },
    {
      id: 'sengenKannushi',
      name: '浅間神社の神主',
      x: 7,
      y: 10,
      color: 0xb0b0a0,
      lines: ['神主「浅間の神のご加護を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'castleGuard',
      name: '城の門番',
      x: 25,
      y: 11,
      color: 0x4a4a6b,
      lines: ['門番「駿府城である。用なき者は通さぬ」'],
    },
    {
      id: 'yobikomi',
      name: '一座の呼び込み',
      x: 12,
      y: 24,
      color: 0xd08a3a,
      lines: [
        '呼び込み「さあさ、お立ち会い！ 大坂は道頓堀から下ってまいりました、からくり一座の大興行！」',
        '呼び込み「茶運び人形に文字書き人形、果ては生きた人と見まごう舞い人形まで！ ……工房？ この小屋の裏口の奥だが、見物衆は入れねえよ」',
      ],
      after: { flag: 'tetsubinDefeated', lines: ['呼び込み「座元が姿をくらましちまって、興行はおしまいだ。おれたちゃ何も知らなかったんだよ……」'] },
    },
    {
      id: 'sunpuKaji',
      name: '刀鍛冶',
      x: 41,
      y: 20,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「駿府の刀は家康公以来の名工ぞろいだ。見ていきなせえ」'],
      action: 'shop',
      shop: 'sunpuKaji',
    },
    {
      id: 'sunpuHikyaku',
      name: '飛脚',
      x: 46,
      y: 20,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 駿府の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'sunpuMachiya',
      name: '町のおかみ',
      x: 26,
      y: 25,
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
      x: 19,
      y: 32,
      color: 0x6a4a3a,
      lines: ['見張り「この先は一座の屋敷だ。座元のお許しがなけりゃ、誰も通さねえ」'],
      hideFlag: 'meiboFound',
    },
    {
      id: 'yashikiGuardE',
      name: '一座の見張り',
      x: 20,
      y: 32,
      color: 0x6a4a3a,
      lines: ['見張り「黒田様のお墨付きもある。帰んな」'],
      hideFlag: 'meiboFound',
    },
      {
        id: 'sunpuChugen',
        name: '武家の中間',
        x: 36,
        y: 12,
        color: 0x5a5a7a,
        lines: ['中間「この辺りは御城勤めのお武家の屋敷町だ。与力の黒田様の屋敷は、ほれ、あの大きな門よ」', '中間「黒田様の屋敷にゃ、夜な夜な大きな荷車が入っていくって噂だが……おっと、口がすべった」'],
        after: { flag: 'meiboFound', lines: ['中間「黒田様はお城からお呼び出しがあったきりだ。屋敷の蔵から、とんでもねえものが出てきたって話だぜ」'] },
      },
      {
        id: 'sunpuTsuribito',
        name: '釣り人',
        x: 39,
        y: 29,
        color: 0x4a6a7a,
        lines: ['釣り人「安倍川の流れは速くてな。釣れるのは小さな鮎ばかりさ。安倍川餅でも食ってくか？」'],
      },
      {
        id: 'sunpuChatsumi',
        name: '茶摘みの娘',
        x: 6,
        y: 30,
        color: 0x6a9a5a,
        lines: ['茶摘みの娘「駿河のお茶は将軍様にも献上されるのよ。……この先の古いお屋敷？ 一座の人たちが夜中に出入りしてて気味が悪いわ」'],
        after: { flag: 'tetsubinDefeated', lines: ['茶摘みの娘「南の古いお屋敷の騒ぎ、あなたたちが鎮めてくれたの？ これで安心して茶摘みができるわ」'] },
      },
  ],
  exits: [
    // 武家屋敷町の与力・黒田の屋敷の門（霞が加わるまでは門番がふさぐ）
    { x: 42, y: 8, to: 'yoriki', toX: 17, toY: 21 },
    // 西の東海道からワールドマップへ（駿府の印の西隣の街道）
    { x: 0, y: 14, to: 'world', toX: 38, toY: 10 },
    { x: 0, y: 15, to: 'world', toX: 38, toY: 10 },
    // 東の東海道からワールドマップへ（駿府の印の下）
    { x: 49, y: 14, to: 'world', toX: 39, toY: 11 },
    { x: 49, y: 15, to: 'world', toX: 39, toY: 11 },
    // 芝居小屋の裏の、一座の工房の入口
    { x: 9, y: 23, to: 'kobo', toX: 13, toY: 16 },
    // 南の林の道から、からくり屋敷へ（名簿が見つかるまでは見張りがふさぐ）
    { x: 19, y: 33, to: 'karakuriYashiki', toX: 19, toY: 29 },
    { x: 20, y: 33, to: 'karakuriYashiki', toX: 20, toY: 29 },
  ],
  respawn: { x: 34, y: 21 },
  onEnter: { event: 'sunpuEnter', unless: 'chapter1Cleared' },
};

MAPS.kobo = {
  id: 'kobo',
  name: '一座の工房',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W___________________W______W',
    'W___________________W______W',
    'W___________________W______W',
    'W___WWW___WWW___WWW_W______W',
    'W___WWW___WWW___WWW_W______W',
    'W__________________________W',
    'W___________________W______W',
    'W___________________W______W',
    'W___WWW___WWW_______WWWWWWWW',
    'W__________________________W',
    'W__________________________W',
    'WWWWWWWW______WWWWWW_WWWWWWW',
    'W______W___________________W',
    'W__________________________W',
    'W______W___________________W',
    'W______W___________________W',
    'WWWWWWWWWWWWW_WWWWWWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'koboKasumi',
      name: '霞',
      x: 12,
      y: 7,
      color: 0x3a3a5a,
      sprite: 'kasumi',
      event: 'kasumiMeet',
      hideFlag: 'kasumiJoined',
    },
    {
      id: 'koboDesk',
      name: '座元の文机',
      x: 25,
      y: 2,
      color: 0x7a5a3a,
      lines: ['文机の上に、書きかけの文がある。「黒田様　例の品、今月も屋敷の蔵へお届け申し候」'],
    },
    {
      id: 'koboDoll',
      name: '作りかけの人形',
      x: 3,
      y: 15,
      color: 0xb08a5a,
      lines: ['作りかけの人形だ。胸の中に、ゼンマイと、人の髪の束が巻き込まれている……。'],
    },
      {
        id: 'koboKashira',
        name: '人形の頭',
        x: 17,
        y: 2,
        color: 0xc0b090,
        lines: ['棚に人形の頭がずらりと並んでいる。どれも、町で見かけたような顔をしている……。'],
      },
      {
        id: 'koboDeshi',
        name: '一座の弟子',
        x: 22,
        y: 15,
        color: 0x8a7a6a,
        lines: ['弟子「座元さまは、作った人形をみんな夜のうちに荷車でどこかへ運ばせるんです。舞台には一度も出ないのに……」'],
      },
  ],
  exits: [
    { x: 13, y: 17, to: 'sunpu', toX: 9, toY: 24 },
  ],
  respawnMap: 'sunpu',
};

MAPS.yoriki = {
  id: 'yoriki',
  name: '与力・黒田の屋敷',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'W,,,,,,,,,,,,,,,,,,,,,W,,RRRRRRRRR,W',
    'W,,,,,,,T,,,,,,,,,,,,,W,,RRRRRRRRR,W',
    'W,,T,,,,,,,,,,,,,,,,,,W,,RRRRRRRRR,W',
    'W,,,,,,,,,,,,,,,,,,,,,W,,WWWWDWWWW,W',
    'W,,,,,,,,,,,,,,,,,,,,,W,,,,,,,,,,,,W',
    'W,,,,,,,,,,,,,,,,,,,,,WWWWWW,,,WWWWW',
    'W,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=,,,,W',
    'W,,,RRRRRRRRRRRRRRRRRR,,,,,,,,=,,,,W',
    'W,,,RRRRRRRRRRRRRRRRRR,,,,,,,,=,,,,W',
    'W,,,RRRRRRRRRRRRRRRRRR,,,,,,,,=,,,,W',
    'W,,,RRRRRRRRRRRRRRRRRR=========,,,,W',
    'W,,,RRRRRRRRRRRRRRRRRR=,,,,,,,^,,,,W',
    'W,,,WWWWWWWWDWWWWWWWWW=,~~~~~~,,,,,W',
    'W,,,,,,,,,,,,,,,,,,,,,=,~~~~~~,,,,,W',
    'W,,,===============,,,=,~~~~~~,,,,,W',
    'W,,,,,,,,,,,,,,,,==,,,,,~~~~~~,,,,,W',
    'W,RRRRRRR,,,,,,,,==,,,,^,,,,,,,,,,,W',
    'W,RRRRRRR,,,,,,,,==,,,,,,,^,,,,,,,,W',
    'W,WWWDWWW,,,,,,,,==,,,,,,,,,,,,,,,,W',
    'W,,,,,,,,,,,,,,,,==,T,,,,,,,,,,,T,,W',
    'W,,,,,,,,,,,,,,,,==,,,,,,,,,,,,,,,,W',
    'W,,,,,,,,,,,,,,,,==,,,,,,,,,,,,,,,,W',
    'WWWWWWWWWWWWWWWWW=WWWWWWWWWWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'yorikiYonin',
      name: '用人',
      x: 11,
      y: 15,
      color: 0x5a5a6b,
      lines: ['用人「だ、旦那様はお留守じゃ。……奥の蔵？ 近づいてはならぬ、あそこには何もない！」'],
      after: { flag: 'meiboFound', lines: ['用人「旦那様は、お城からお呼び出しがあったきり戻られぬ……」'] },
    },
      {
        id: 'yorikiJochu',
        name: '女中',
        x: 5,
        y: 20,
        color: 0xa07a8a,
        lines: ['女中「奥の蔵には、夜になると重たい葛籠がいくつも運び込まれるんです。中から、こつこつと音が……」'],
      },
  ],
  exits: [
    { x: 17, y: 23, to: 'sunpu', toX: 41, toY: 9 },
  ],
  respawnMap: 'sunpu',
  // 奥の蔵の前で、雇われのごろつきに見つかる
  triggers: [
    { x: 28, y: 5, event: 'yorikiKura', unless: 'meiboFound' },
    { x: 29, y: 5, event: 'yorikiKura', unless: 'meiboFound' },
    { x: 30, y: 5, event: 'yorikiKura', unless: 'meiboFound' },
  ],
};

MAPS.karakuriYashiki = {
  id: 'karakuriYashiki',
  name: 'からくり屋敷',
  areaLevel: 4,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWW____________WWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWW____________WWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWW____________WWWW________WW',
    'WWWW_______WWWWWWWW__WWWWWWWWW________WW',
    'WWWW_______WWWWWWWW__WWWWWWWWW___W____WW',
    'WWWW_______WWWWWWWW__WWWWWWWWW________WW',
    'WWWW_______WWWWWWWW__WWWWWWWWW________WW',
    'WWWW_______WWWWWWWW__WWWWWWWWW________WW',
    'WWWWWWW__WWWWWWWWWW______________WWWWWWW',
    'WWWWWWW_________WWW______________WWWWWWW',
    'WWWWWWW_________WWW__WWWW__WWWWWWWWWWWWW',
    'WWWWWWWWWWWWWW_______WWWW__WWWWWWWWWWWWW',
    'WW________WWWW_______WWWW____________WWW',
    'WW________WWWW__WWWWWWWWW____________WWW',
    'WW___W____WWWW__WWWWWWWWWWWWWWWWWWW__WWW',
    'WW________WWWW__WWWWWWWWWWWWWWWWWWW__WWW',
    'WW________WWWW__WWWWWWWWWWWWWWWWWWW__WWW',
    'WWW__WWW________WWWWWWWWWWWWWWWWWWW__WWW',
    'WWW__WWW________WWWWWWWWWWWWW_____W__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWWWW_____W__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWWWW_____W__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWWWW_____W__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWWWWW__WWW__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWWWWW__WWW__WWW',
    'WWW__WWWWWWWWWWW________WWWWWW__WWW__WWW',
    'WWW__________________________________WWW',
    'WWW______________W___________________WWW',
    'WWWWWWWWWWWWWWWW______W_WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW________WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWW__WWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWW__WWWWWWWWWWWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'yashikiChest1',
      name: '葛籠',
      x: 3,
      y: 14,
      color: 0x8a6a3a,
      event: 'yashikiChest1',
    },
    {
      id: 'yashikiChest2',
      name: '葛籠',
      x: 36,
      y: 4,
      color: 0x8a6a3a,
      event: 'yashikiChest2',
    },
    {
      id: 'yashikiChest3',
      name: '葛籠',
      x: 5,
      y: 5,
      color: 0x8a6a3a,
      event: 'yashikiChest3',
    },
    {
      id: 'yashamaru',
      name: '夜叉丸',
      x: 19,
      y: 1,
      color: 0x6a2a6a,
      lines: ['……'],
      hideFlag: 'yashamaruFled',
    },
    {
      id: 'zenmaiDevice',
      name: '装置',
      x: 20,
      y: 1,
      color: 0x8a8a8a,
      lines: ['歯車と管が絡み合った、異様な装置だ。'],
      after: { flag: 'yashamaruFled', lines: ['人をゼンマイに封じる装置の残骸だ。夜叉丸に壊され、もう動かない。'] },
    },
      {
        id: 'yashikiChest4',
        name: '葛籠',
        x: 32,
        y: 21,
        color: 0x8a6a3a,
        event: 'yashikiChest4',
      },
  ],
  exits: [
    { x: 19, y: 31, to: 'sunpu', toX: 19, toY: 31 },
    { x: 20, y: 31, to: 'sunpu', toX: 20, toY: 31 },
  ],
  encounter: 'sunpu',
  respawnMap: 'sunpu',
  // 奥の間への細い廊下で、夜叉丸と鉄瓶が待ち構える
  triggers: [
    { x: 19, y: 4, event: 'tetsubin', unless: 'tetsubinDefeated' },
    { x: 20, y: 4, event: 'tetsubin', unless: 'tetsubinDefeated' },
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

/** 第 4 章の伊賀上野と、伊賀者の里（忍者屋敷）・鍵屋の辻。 */
MAPS.iga = {
  id: 'iga',
  name: '伊賀上野',
  areaLevel: 13,
  rows: [
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
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
    'T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T',
    'T,,TT,,,,,,,,,,,,,,,,,,,,TT,,T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'igaTeahouse',
      name: '茶屋の娘',
      x: 4,
      y: 4,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「いらっしゃいまし。……お客さん、山の上の里には近づかないほうがいいですよ」',
        '茶屋の娘「このごろ、からくりの鷹が里の上を飛び回ってるんです。よそ者を見ると、襲ってくるとか」',
        '茶屋の娘「お団子はいかが？」',
      ],
      after: { flag: 'heardIgaRumor', lines: ['茶屋の娘「いらっしゃいまし。お団子はいかが？」'] },
      setsFlag: 'heardIgaRumor',
      action: 'teahouse',
    },
    {
      id: 'igaYorozu',
      name: 'よろず屋',
      x: 10,
      y: 4,
      color: 0x6b8c5a,
      lines: ['よろず屋「山の里へ行くなら、毒消しは忘れずに。あそこの蜘蛛は質が悪い」'],
      action: 'shop',
      shop: 'igaYorozu',
    },
    {
      id: 'igaTenjin',
      name: '天神の神主',
      x: 19,
      y: 4,
      color: 0xb0b0a0,
      lines: ['神主「上野の天神さまのご加護を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'igaInn',
      name: '旅籠の主人',
      x: 25,
      y: 4,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「お泊まりですかい。伊賀の山の夜は冷えますよ」'],
      action: 'inn',
    },
    {
      id: 'kagiyaRojin',
      name: '鍵屋の隠居',
      x: 5,
      y: 10,
      color: 0x8a7a6a,
      lines: [
        '隠居「西の外れの辻は、鍵屋の辻というてな。むかし、あそこで名高い仇討ちがあった」',
        '隠居「弟の仇を、義兄の剣客が助太刀して討った。朝から昼まで斬り合うたそうな」',
        '隠居「仇討ちというのは、討つほうも討たれるほうも、命がけよ」',
      ],
      after: { flag: 'gonrokuDefeated', lines: ['隠居「鍵屋の辻で、また仇討ちがあったと聞いた。……娘さん、本懐を遂げなすったか」'] },
    },
    {
      id: 'igaKaji',
      name: '刀鍛冶',
      x: 11,
      y: 10,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「伊賀の鍛冶は忍びの得物も打つ。小太刀でも錫杖でも、なんでも言いなせえ」'],
      action: 'shop',
      shop: 'igaKaji',
    },
    {
      id: 'igaHikyaku',
      name: '飛脚',
      x: 22,
      y: 10,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 伊賀の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'igaKodomo',
      name: '町の子',
      x: 20,
      y: 12,
      color: 0xb08a5a,
      lines: ['子ども「北の山道をずっと登ると、忍者の里があるんだって。おっかあは、行っちゃだめだって言うんだ」'],
      after: { flag: 'oboroDefeated', lines: ['子ども「里の忍者が、鷹を山に放さなくなったんだって。なんでだろう？」'] },
    },
    {
      id: 'tsujiban',
      name: '辻番',
      x: 1,
      y: 6,
      color: 0x4a4a6b,
      lines: ['辻番「この先は鍵屋の辻だ。物騒な噂があってな、日の出までは誰も通さんことにしておる」'],
      // 朧から、権六が夜明けに鍵屋の辻を通ると聞くまではふさぐ
      hideFlag: 'oboroDefeated',
    },
  ],
  exits: [
    // 東の通りからワールドマップへ（伊賀の印の北の街道）
    { x: 29, y: 6, to: 'world', toX: 27, toY: 10 },
    // 北の山道から伊賀者の里へ
    { x: 14, y: 0, to: 'igaSato', toX: 10, toY: 14 },
    { x: 15, y: 0, to: 'igaSato', toX: 11, toY: 14 },
    // 西の外れの鍵屋の辻へ（朧を倒すまでは辻番がふさぐ）
    { x: 0, y: 6, to: 'kagiya', toX: 10, toY: 5 },
  ],
  respawn: { x: 25, y: 5 },
  onEnter: { event: 'igaEnter', unless: 'igaArrived' },
};

MAPS.igaSato = {
  id: 'igaSato',
  name: '伊賀者の里',
  areaLevel: 13,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWW________WWWWWWW',
    'WWWWWWWWWW__WWWWWWWWWW',
    'W_______W____W_______W',
    'W_WWWWW_W_WW_W_WWWWW_W',
    'W_W___W___W____W___W_W',
    'W_W_W_WWWWW_WWWW_W_W_W',
    'W___W_______W____W___W',
    'WWWWW_WWWWW_W_WWWWWW_W',
    'W_____W_____W______W_W',
    'W_WWWWW_WWWWWWWWWW_W_W',
    'W_______W__________W_W',
    'WWWWWWWWWW__WWWWWWWW_W',
    'W____________________W',
    'WWWWWWWWWW__WWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'igaSatoChest1',
      name: '葛籠',
      x: 3,
      y: 6,
      color: 0x8a6a3a,
      event: 'igaSatoChest1',
    },
    {
      id: 'igaSatoChest2',
      name: '葛籠',
      x: 1,
      y: 14,
      color: 0x8a6a3a,
      event: 'igaSatoChest2',
    },
    {
      id: 'igaOboro',
      name: '朧',
      x: 11,
      y: 1,
      color: 0x6a6a6a,
      lines: ['……'],
      hideFlag: 'oboroDefeated',
    },
    {
      id: 'igaKakejiku',
      name: '掛け軸',
      x: 8,
      y: 1,
      color: 0x8a7a5a,
      lines: ['「忍」の一字が大書された掛け軸だ。刃の下に心と書く。'],
      after: { flag: 'oboroDefeated', lines: ['「忍」の一字の掛け軸だ。霞が、しばらく黙って見上げていた。'] },
    },
  ],
  exits: [
    { x: 10, y: 15, to: 'iga', toX: 14, toY: 1 },
    { x: 11, y: 15, to: 'iga', toX: 15, toY: 1 },
  ],
  encounter: 'iga',
  respawnMap: 'iga',
  // 広間へ上がる細い段で、朧が待ち構える
  triggers: [
    { x: 10, y: 3, event: 'oboro', unless: 'oboroDefeated' },
    { x: 11, y: 3, event: 'oboro', unless: 'oboroDefeated' },
  ],
};

MAPS.kagiya = {
  id: 'kagiya',
  name: '鍵屋の辻',
  areaLevel: 13,
  rows: [
    'TTTTTTTTTTTT',
    'TRRRRRTRRRRT',
    'TWWDWWTWWDWT',
    'T,,,,,,,,,,T',
    'T,,,,,,,,,,T',
    'T,,,,,,,,,,=',
    'T,,,,,,,,,,T',
    'TTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'kagiyaIshi',
      name: '石標',
      x: 2,
      y: 4,
      color: 0x8a8a8a,
      lines: ['「鍵屋の辻」と刻まれた古い石標だ。辻の茶屋の軒先に、朝の光が差している。'],
      after: { flag: 'gonrokuDefeated', lines: ['「鍵屋の辻」の石標だ。お凛が、そっと手を合わせた。'] },
    },
  ],
  exits: [{ x: 11, y: 5, to: 'iga', toX: 2, toY: 6 }],
  respawnMap: 'iga',
  // 辻の真ん中で、権六が待ち構える
  triggers: [3, 4, 5, 6].map((y) => ({ x: 8, y, event: 'gonroku', unless: 'gonrokuDefeated' })),
};

/** 第 5 章の大坂と、米蔵の地下（からくり工場）。 */
MAPS.osaka = {
  id: 'osaka',
  name: '大坂',
  areaLevel: 16,
  rows: [
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
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
    'T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'osakaTeahouse',
      name: '茶屋の娘',
      x: 4,
      y: 4,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「おいでやす。……すんまへん、お団子、米の粉が高うて小さなってしもて」',
        '茶屋の娘「米問屋の大黒屋はんが、蔵に米を山ほど溜めこんではるのに、ちっとも売らはらへんのです」',
        '茶屋の娘「お団子、いかがどす？」',
      ],
      after: { flag: 'heardOsakaRumor', lines: ['茶屋の娘「おいでやす。小さいお団子でよかったら、どうぞ」'] },
      setsFlag: 'heardOsakaRumor',
      action: 'teahouse',
    },
    {
      id: 'osakaYorozu',
      name: 'よろず屋',
      x: 10,
      y: 4,
      color: 0x6b8c5a,
      lines: ['よろず屋「まいど！ 天下の台所や、品物だけはなんでもありまっせ。米のほかはな」'],
      action: 'shop',
      shop: 'osakaYorozu',
    },
    {
      id: 'osakaTennoji',
      name: '天王寺の僧',
      x: 19,
      y: 4,
      color: 0xb08a3e,
      lines: ['僧「天王寺さんのお慈悲を。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'osakaInn',
      name: '旅籠の主人',
      x: 25,
      y: 4,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「お泊まりでっか。……飯は麦がちでかんにんしとくなはれ」'],
      action: 'inn',
    },
    {
      id: 'hyogoJuku',
      name: '浪人',
      x: 5,
      y: 10,
      color: 0x3a4a6a,
      event: 'hyogoMeet',
      hideFlag: 'hyogoJoined',
    },
    {
      id: 'osakaKaji',
      name: '刀鍛冶',
      x: 11,
      y: 10,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「大坂の刀は、刃文が波みたいに揺れとるやろ。濤乱刃いうんや」'],
      action: 'shop',
      shop: 'osakaKaji',
    },
    {
      id: 'daikokuya',
      name: '米問屋の番頭',
      x: 22,
      y: 10,
      color: 0x8a6a3a,
      lines: ['番頭「米を売れ？ 相場が上がりきるまで待つのが商いや。文句があるなら、江戸のお偉い方に言うてみなはれ」'],
      after: { flag: 'hyakuhyoDefeated', lines: ['番頭「く、蔵の地下のことは、わてらは何も知りまへん……！」'] },
    },
    {
      id: 'osakaHikyaku',
      name: '飛脚',
      x: 26,
      y: 10,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 大坂の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'uekoMother',
      name: '長屋の母親',
      x: 18,
      y: 11,
      color: 0x9c8a5a,
      lines: ['母親「この子に食べさせる米が、もう三日もあらへんのです……。お奉行所は、なんもしてくれへん」'],
      after: { flag: 'chapter5Cleared', lines: ['母親「蔵の米が、町に配られたんです。……あのお侍さまのおかげやて、みんな言うてます」'] },
    },
    {
      id: 'kuraGuardW',
      name: '用心棒',
      x: 14,
      y: 0,
      color: 0x5a4a3a,
      lines: ['用心棒「ここから先は大黒屋の蔵や。よそ者は通さへん」'],
      hideFlag: 'hyogoJoined',
    },
    {
      id: 'kuraGuardE',
      name: '用心棒',
      x: 15,
      y: 0,
      color: 0x5a4a3a,
      lines: ['用心棒「米が欲しけりゃ、相場の倍の銭を持ってきな」'],
      hideFlag: 'hyogoJoined',
    },
  ],
  exits: [
    // 東西の通りからワールドマップへ（大坂の印の北と西の街道）
    { x: 29, y: 6, to: 'world', toX: 21, toY: 10 },
    { x: 0, y: 6, to: 'world', toX: 20, toY: 11 },
    // 北の米蔵へ（兵庫が加わるまでは用心棒がふさぐ）
    { x: 14, y: 0, to: 'komeKura', toX: 10, toY: 14 },
    { x: 15, y: 0, to: 'komeKura', toX: 11, toY: 14 },
  ],
  respawn: { x: 25, y: 5 },
  onEnter: { event: 'osakaEnter', unless: 'chapter5Cleared' },
};

MAPS.komeKura = {
  id: 'komeKura',
  name: '米蔵の地下',
  areaLevel: 16,
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWW__________WWWWWW',
    'WWWWWW__________WWWWWW',
    'WWWWWWWWWW__WWWWWWWWWW',
    'W__________W_________W',
    'W_WWWWWWWW_W_WWWWWWW_W',
    'W_W______W___W_____W_W',
    'W_W_WWWW_WWWWW_WWW_W_W',
    'W___W__W_______W___W_W',
    'WWWWW__WWWWWWW_W_WWW_W',
    'W______W_______W_____W',
    'W_WWWWWW_WWWWWWWWWWW_W',
    'W____________________W',
    'WWWWWWWWW__WWWWWWWWWWW',
    'W____________________W',
    'WWWWWWWWWW__WWWWWWWWWW',
  ],
  npcs: [
    {
      id: 'komeKuraChest1',
      name: '葛籠',
      x: 3,
      y: 6,
      color: 0x8a6a3a,
      event: 'komeKuraChest1',
    },
    {
      id: 'komeKuraChest2',
      name: '葛籠',
      x: 5,
      y: 8,
      color: 0x8a6a3a,
      event: 'komeKuraChest2',
    },
    {
      id: 'komeKuraKikai',
      name: 'からくりの機械',
      x: 8,
      y: 1,
      color: 0x8a7a5a,
      lines: ['米俵をゼンマイの歯車で砕き、黒い粉に変える機械だ。粉は、からくり兵の油に混ぜるものらしい。'],
      after: { flag: 'hyakuhyoDefeated', lines: ['止まったからくりの機械だ。米俵が、手つかずのまま積まれている。'] },
    },
  ],
  exits: [
    { x: 10, y: 15, to: 'osaka', toX: 14, toY: 1 },
    { x: 11, y: 15, to: 'osaka', toX: 15, toY: 1 },
  ],
  encounter: 'osaka',
  respawnMap: 'osaka',
  // 工場の奥へ上がる細い段で、百俵からくりが待ち構える
  triggers: [
    { x: 10, y: 3, event: 'hyakuhyo', unless: 'hyakuhyoDefeated' },
    { x: 11, y: 3, event: 'hyakuhyo', unless: 'hyakuhyoDefeated' },
  ],
};

/** 第 6 章の広島（霞が戻る）。三本の川が南の海へ流れる城下町。北に城と堀、南に牡蠣船の桟橋。 */
MAPS.hiroshima = {
  id: 'hiroshima',
  name: '安芸広島',
  areaLevel: 19,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,,~~,~~~~~~~~~,~~,,,,,,,,,,~~TTTTTTT',
    'TRRR,RRR~~,~^RRRRR^~,~~TTTT,=,,,,~~TTTTTTT',
    'TWDW,WDW~~,~^RRRRR^~,~~TRRT,=,RRR~~RRRRRRT',
    'T...,...~~,~^WWDWW^~,~~TDWT,=,WDW~~WWDWWWT',
    'T,,,,,,,~~,~T.....T~,~~T..T,=,...~~......T',
    'T,,,=,,,~~,~T.....T~,~~T,,T,=,,,,~~,,,,,,T',
    'T,,,=,,,~~,~~~~=~~~~,~~,,,,,=,,,,~~,,,,,,T',
    'T,,,=,,,~~,,,,,=,,,,,~~,,,,,=,,,,~~,,,,,,T',
    'TRRR=RRR~~RRRR,=,RRRR~~RRRR,=,RRR~~RRR,TTT',
    'TWDW=WDW~~WWDW,=,WDWW~~WDWW,=,WDW~~WDW,TTT',
    'T...=...~~....,=,....~~....,=,...~~...,TTT',
    'T,,,=,,,~~,,,,,=,,,,,~~,,,,,=,,,,~~,,,,,,T',
    '==========================================',
    'T,,,=,,,~~,,,,,=,,,,,~~,,,,,=,,,,~~,,,,,,T',
    'T,,,=,,,~~RRRR,=,RRRR~~RRRR,=,RRR~~,,,,,,T',
    'TRRR=RRR~~WDWW,=,WWDW~~WWDW,=,WDW~~RRRRRRT',
    'TWDW=WDW~~....,=,....~~....,=,...~~WWWDWWT',
    'T...=...~~,,,,,=,,,,,~~,,,,,=,,,,~~......T',
    'TTTT=,,,~~,T,,,=,,T,,~~,T,,,=,,T,~~,TTTTTT',
    'TTTT=,,,~~,,,,,=,,,,,~~,,,,,=,,,,~~,TTTTTT',
    'T,,,=,,,~~,,,,,=,,,,,~~,,,,,=,,,,~~,,,,,,T',
    'T========================================T',
    'T~~~~~~~~~~~=~~~~~~~~~~~~~=~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'hiroshimaTeahouse',
      name: '茶屋の娘',
      x: 12,
      y: 11,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「おいでませ。……お客さん、上方から来んさったん？ 西の海は、このごろ物騒なんよ」',
        '茶屋の娘「夜の瀬戸の浜で、赤い蟹がぎょうさん這い上がってくるんじゃと。平家の侍の顔をした蟹じゃいうて、漁師も浜に出んのよ」',
        '茶屋の娘「お団子、どうぞ」',
      ],
      after: { flag: 'heardHeikegani', lines: ['茶屋の娘「おいでませ。お団子、どうぞ」'] },
      setsFlag: 'heardHeikegani',
      action: 'teahouse',
    },
    {
      id: 'hiroshimaYorozu',
      name: 'よろず屋',
      x: 18,
      y: 11,
      color: 0x6b8c5a,
      lines: ['よろず屋「いらっしゃい。西国街道を行くなら、薬は多めに持っていきんさい」'],
      action: 'shop',
      shop: 'hiroshimaYorozu',
    },
    {
      id: 'hiroshimaKaji',
      name: '刀鍛冶',
      x: 24,
      y: 11,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「忍びの得物も打っとるけえ、見ていきんさい。お城の御用の合間じゃがのう」'],
      action: 'shop',
      shop: 'hiroshimaKaji',
    },
    {
      id: 'hiroshimaHikyaku',
      name: '飛脚',
      x: 31,
      y: 11,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 広島の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'hiroshimaTemple',
      name: '寺の僧',
      x: 24,
      y: 5,
      color: 0xb08a3e,
      lines: ['僧「よう参られた。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'hiroshimaInn',
      name: '旅籠の主人',
      x: 36,
      y: 18,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「お泊まりかの。夕餉は牡蠣の土手鍋じゃ。ゆっくり休んでいきんさい」'],
      action: 'inn',
    },
    {
      id: 'kakibune',
      name: '牡蠣船の売り子',
      x: 26,
      y: 24,
      color: 0x7a8a9a,
      lines: ['売り子「牡蠣船じゃ、牡蠣飯はいらんかね。腹がふくれりゃ、傷の治りも早いけえの」'],
      action: 'shop',
      shop: 'hiroshimaKakibune',
    },
    {
      id: 'castleGuardW',
      name: '門番',
      x: 15,
      y: 7,
      color: 0x4a4a5a,
      lines: ['門番「御城に用のない者は、ここから先へは通さぬ」'],
    },
    {
      id: 'miyajimaPilgrim',
      name: '巡礼',
      x: 12,
      y: 23,
      color: 0xd0c8b0,
      lines: ['巡礼「厳島さまへ渡る舟を待っておりますじゃ。海の上に建つ社は、それはそれは見事なものだそうな」'],
    },
    {
      id: 'hiroshimaSendo',
      name: '船頭',
      x: 37,
      y: 5,
      color: 0x6a5a4a,
      lines: [
        '船頭「長崎へ行くなら、西国街道をまっすぐ西じゃ。海は荒れとるけえ、歩いたほうがええ」',
        '船頭「長崎の手前で街道が分かれて、東へ行くと島原じゃ。あそこは昔の乱の古城があってのう……近寄る者はおらんよ」',
      ],
    },
    {
      id: 'hiroshimaOkami',
      name: '長屋のおかみ',
      x: 6,
      y: 4,
      color: 0x9c8a5a,
      lines: ['おかみ「川が七つにも分かれとる町じゃけえ、橋を渡らんとどこへも行けんのよ」'],
    },
    {
      id: 'hiroshimaChild',
      name: '子ども',
      x: 2,
      y: 18,
      color: 0xd09a6a,
      lines: ['子ども「お城の堀には、でっかい鯉がおるんで！ 門番さんが通してくれんけど」'],
    },
    {
      id: 'hiroshimaRonin',
      name: '浪人',
      x: 31,
      y: 5,
      color: 0x4a4a4a,
      lines: ['浪人「大坂で打ちこわしがあったそうじゃな。……米の値が下がったと聞いて、ほっとしたわ」'],
    },
  ],
  exits: [
    // 東西の通り（西国街道）からワールドマップへ（広島の印の東と西の街道）
    { x: 41, y: 13, to: 'world', toX: 15, toY: 11 },
    { x: 0, y: 13, to: 'world', toX: 13, toY: 11 },
  ],
  respawn: { x: 38, y: 18 },
  onEnter: { event: 'hiroshimaEnter', unless: 'kasumiRejoined' },
};

/** 第 6 章の長崎。西は湊で、扇形の出島が橋でつながる。東の山の石段の上に南蛮寺跡、南に唐人屋敷、町なかを中島川が流れる。 */
MAPS.nagasaki = {
  id: 'nagasaki',
  name: '長崎',
  areaLevel: 19,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,^^^^^^^^^^^^^T',
    'T~~~~~~~~~~~=,RRRRRR,,,,=,RRRR^^^^,,TTTT,,^T',
    'T~~~~~~~~~~~=,WWDWWW,,,,=,WDWW^^^^,,,,,,,,^T',
    'T~~~~~~~~~~~=,......,,,,=,....^^^^,,,,,,,,^T',
    'T~~~~~~~~~~~=T,,,,,,,,,T=,,,,,^^^^,,,,,,,,^T',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,^^^^,,,,,,,,^T',
    'T~~~~~~~~~~~=,RRRR,RRRR,=,RRRR,,,^^^^==^^^^T',
    'T~~~~~~~~~~~=,WDWW,WDWW,=,WWDW,,,^^^^==^^^^T',
    'T~~~~~~~~~~~=,....,....,=,....,T,^^^^==^^^^T',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,,,,^^^^==^^^^T',
    'T~~~RRR~~~~~=,,,,,T,,,,,=,,,,,T,,^^^^==^^^^T',
    'T~~RRRRR~~~~=,,,,,,,,,,,=T,,,,,,,^^^^==^^^^T',
    'T~~RRRRW~~~~=,,,,,,,,,,,=,,,,,,,,===========',
    'T~~RRRR_=============================^^^^^^T',
    'T~~RRRRW~~~~=,,,,,,,,,,,=,,,,,,,,^^^^^^^^^^T',
    'T~~RRRRR~~~~=,RRRR,RRRR,=,RRRRRR,^^^^^^^^^^T',
    'T~~~RRR~~~~~=,WDWW,WWDW,=,WWDWWW,^^^^^^^^^^T',
    'T~~~~~~~~~~~=T....,....T=,......,^^^^^^^^^^T',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,,,,^^^^^^^^^^T',
    'T~~~~~~~~~~~=~~~~~==~~~~=~~~==~~~^^^^^^^^^^T',
    'T~~~~~~~~~~~=~~~~~==~~~~=~~~==~~~^^^^^^^^^^T',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,,,,^^^^^^^^^^T',
    'T~~~~~~~~~~~=,WWWWWWWWW,=,RRRRRR,^^^^^^^^^^T',
    'T~~~~~~~~~~~=,W_______W,=,WWWDWW,^^^^^^^^^^T',
    'T~~~~~~~~~~~=,WWWW_WWWW,=,......,,,,,,,,T,,T',
    'T~~~~~~~~~~~================================',
    'T~~~~~~~~~~~=,,,,,,,,,,,=,,,,,,,,,,,,,,,,,,T',
    'T~~~~~~~~~~~=T,,,,,,,,,,=,,,,,,,,^^^^^^^^^^T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    {
      id: 'bugyoYakunin',
      name: '奉行所の役人',
      x: 16,
      y: 4,
      color: 0x4a4a5a,
      lines: [
        '役人「ここは長崎奉行所である。……出島から南蛮の書が消えた件か。通詞の者が詳しい。出島へ行け」',
      ],
      after: { flag: 'shimabaraOpen', lines: ['役人「島原の古城だと？ あそこは乱のあと、人の住まぬ場所だ。……気をつけて行かれよ」'] },
    },
    {
      id: 'nagasakiTemple',
      name: '寺の僧',
      x: 15,
      y: 9,
      color: 0xb08a3e,
      lines: ['僧「唐寺へようこそ。倒れた者があれば、お祓いをして進ぜよう」'],
      action: 'temple',
    },
    {
      id: 'nagasakiHikyaku',
      name: '飛脚',
      x: 20,
      y: 9,
      color: 0x3e7cb0,
      lines: ['飛脚「へい、まいど！ 長崎の飛脚問屋でございやす」'],
      action: 'hikyaku',
    },
    {
      id: 'nagasakiInn',
      name: '旅籠の主人',
      x: 27,
      y: 9,
      color: 0x5a6b8c,
      lines: ['旅籠の主人「よう来なさった。卓袱料理でもてなしますけん、ゆっくり休んでいきなっせ」'],
      action: 'inn',
    },
    {
      id: 'ranpoI',
      name: '蘭方医',
      x: 27,
      y: 4,
      color: 0x8a8a7a,
      lines: [
        '蘭方医「若林蘭斎どのを探しておるのか。わしと同じく出島で学んだ男だ。南蛮の機械学に、取り憑かれたように打ち込んでおった」',
        '蘭方医「一年ほど前、江戸のお偉い方から金が出るようになったと喜んでおったが……それきり姿を見ぬ」',
      ],
      after: { flag: 'nanbanOzutsuDefeated', lines: ['蘭方医「蘭斎どのが……そうか。学問に罪はない。使う者の心の問題だ」'] },
    },
    {
      id: 'nagasakiTeahouse',
      name: '茶屋の娘',
      x: 15,
      y: 18,
      color: 0xc76b8f,
      lines: [
        '茶屋の娘「いらっしゃいまっせ。長崎の名物はカステラですばい。よろず屋で売っとります」',
        '茶屋の娘「東の山の南蛮寺跡には、夜な夜な鉄の鎧の兵が歩きよるって噂です。奉行所が石段をふさいでしまって」',
        '茶屋の娘「お茶、どうぞ」',
      ],
      after: { flag: 'heardNanbanji', lines: ['茶屋の娘「いらっしゃいまっせ。お茶、どうぞ」'] },
      setsFlag: 'heardNanbanji',
      action: 'teahouse',
    },
    {
      id: 'nagasakiYorozu',
      name: 'よろず屋',
      x: 20,
      y: 18,
      color: 0x6b8c5a,
      lines: ['よろず屋「いらっしゃい。カステラに金平糖、南蛮渡りの甘いものもそろっとりますばい」'],
      action: 'shop',
      shop: 'nagasakiYorozu',
    },
    {
      id: 'nagasakiKaji',
      name: '刀鍛冶',
      x: 27,
      y: 18,
      color: 0x5a5a6b,
      lines: ['刀鍛冶「肥前の刀に、オランダ渡りの銃に胴。長崎でしか手に入らんものばかりたい」'],
      action: 'shop',
      shop: 'nagasakiKaji',
    },
    {
      id: 'dejimaMonban',
      name: '出島の門番',
      x: 13,
      y: 13,
      color: 0x4a4a5a,
      lines: ['門番「出島へ入るのか。……公儀の御用の札があるなら、よかろう。通詞の部屋は北の並びだ」'],
    },
    {
      id: 'meganebashiChild',
      name: '子ども',
      x: 19,
      y: 22,
      color: 0xd09a6a,
      lines: ['子ども「この石の橋、川に映ると眼鏡みたいに見えるっちゃん！ 眼鏡橋っていうとよ」'],
    },
    {
      id: 'tojinShonin',
      name: '唐人の商人',
      x: 16,
      y: 24,
      color: 0x8a3a3a,
      lines: ['商人「唐の国から薬と絹を運んできたアル。……南蛮の鉄の兵の話？ 唐の船乗りも、海の上で見たと怖がっていたヨ」'],
    },
    {
      id: 'kitamaeSendo',
      name: '船頭',
      x: 13,
      y: 22,
      color: 0x6a5a4a,
      lines: ['船頭「わしは北前船の船頭じゃ。蝦夷地まで、日本の海をぐるりと回るんよ。……今は荷待ちで、しばらく出られん」'],
      after: { flag: 'chapter6Cleared', lines: ['船頭「金沢へ行くんなら、わしの船に乗りんさい。海はしけとるが、北前船の船乗りをなめちゃいかんよ」'] },
    },
    {
      id: 'nanbanjiYakuninW',
      name: '奉行所の役人',
      x: 37,
      y: 12,
      color: 0x4a4a5a,
      lines: ['役人「南蛮寺跡は、奉行所の命で立ち入りを禁じておる。……出島の件か？ ならば通詞の話を聞いてから来い」'],
      hideFlag: 'dejimaHeard',
    },
    {
      id: 'nanbanjiYakuninE',
      name: '奉行所の役人',
      x: 38,
      y: 12,
      color: 0x4a4a5a,
      lines: ['役人「夜な夜な鉄の兵が石段を下りてくると、町の者が怖がっておるのだ」'],
      hideFlag: 'dejimaHeard',
    },
  ],
  exits: [
    // 東の通りからワールドマップへ（長崎の印の東の街道）
    { x: 43, y: 13, to: 'world', toX: 4, toY: 16 },
    { x: 43, y: 26, to: 'world', toX: 4, toY: 16 },
    // 出島の表門へ
    { x: 7, y: 14, to: 'dejima', toX: 30, toY: 9 },
    // 東の山の南蛮寺跡へ（通詞の話を聞くまでは役人が石段をふさぐ）
    { x: 35, y: 2, to: 'nanbanji', toX: 17, toY: 25 },
  ],
  respawn: { x: 29, y: 9 },
  onEnter: { event: 'nagasakiEnter', unless: 'chapter6Cleared' },
};

/** 長崎の出島。扇形の島に、オランダ商館の建物と蔵が並ぶ。 */
MAPS.dejima = {
  id: 'dejima',
  name: '出島',
  areaLevel: 19,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~WWWWWWWWWWWWWWWW~~~~~~~~~',
    '~~~~~~W....................W~~~~~~',
    '~~~~W.RRRRRR..RRRRRR..RRRRRR.W~~~~',
    '~~~W..WWDWWW..WWDWWW..WWDWWW..W~~~',
    '~~W............................W~~',
    '~~WTT........................T.W~~',
    '~~WTT........................T.W~~',
    '~~W............................W~~',
    '~~W============================_==',
    '~~W............................W~~',
    '~~W.RRRRRR..RRRR..RRRR..TTTTTT.W~~',
    '~~W.WWDWWW..WDWW..WDWW..,,,,,,.W~~',
    '~~W.....................,,,,,,.W~~',
    '~~W.....................T,,,,T.W~~',
    '~~W............................W~~',
    '~~WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  npcs: [
    {
      id: 'tsuji',
      name: '通詞',
      x: 16,
      y: 5,
      color: 0x5a6a8a,
      event: 'tsujiMeet',
    },
    {
      id: 'kapitan',
      name: 'カピタン',
      x: 8,
      y: 5,
      color: 0xb0a080,
      lines: ['カピタン「ヨウコソ、デジマヘ。……ワタシタチノ機械ノ本ヲ、悪イコトニ使ウ人ガイル。トテモ悲シイ」'],
    },
    {
      id: 'dejimaShop',
      name: '商館の手代',
      x: 24,
      y: 5,
      color: 0x8a7a5a,
      lines: ['手代「オランダ渡りの品をお分けしましょう。御公儀の御用の方には、特別ですよ」'],
      action: 'shop',
      shop: 'dejimaShop',
    },
    {
      id: 'dejimaDoctor',
      name: '商館の医者',
      x: 13,
      y: 13,
      color: 0xa0a090,
      lines: ['医者「ワタシハ医者。日本ノ若イ人タチニ、蘭方ヲ教エテイマス。ランサイモ、ソノ一人デシタ」'],
    },
    {
      id: 'dejimaCow',
      name: '牛',
      x: 26,
      y: 13,
      color: 0x8a6a4a,
      lines: ['牛が草を食んでいる。オランダの人たちは、牛の乳を飲むらしい。'],
    },
    {
      id: 'dejimaKura',
      name: '蔵番',
      x: 6,
      y: 13,
      color: 0x6a6a5a,
      lines: ['蔵番「この蔵には砂糖と更紗が山ほど入っとる。……例の書は、隣の書物蔵から消えたんじゃ」'],
    },
  ],
  exits: [{ x: 33, y: 9, to: 'nagasaki', toX: 8, toY: 14 }],
  respawnMap: 'nagasaki',
};

/** 長崎の東の山の南蛮寺跡（第 6 章のダンジョン）。焼け落ちた塀が迷路のように残る。奥の礼拝堂の跡で、蘭斎の書き付けを見つける。 */
MAPS.nanbanji = {
  id: 'nanbanji',
  name: '南蛮寺跡',
  areaLevel: 19,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^^^^^^^^^^TT,,,,,,,,,,,,TT^^^^^^^^^',
    '^^^^^^^^^^^TT,,,,,,,,,,,,TT^^^^^^^^^',
    '^^^^^^^^^^^TT,,,,,,,,,,,,TT^^^^^^^^^',
    '^^^^^WWWWWWWWWWWWWW.WWWWWWWWWWW^^^^^',
    '^^^^^W,,,,,WWWWWWWW_WWWWW,,,,,W^^^^^',
    '^^^^^W^^^,,W_WW______WW_W,R,R,W^^^^^',
    '^^^^^W^^^,,W____________W,,,,,W^^^^^',
    '^^^^^W^^^,,W____________W,R,R,W^^^^^',
    '^^^^^W,.,,,W____________W,,,,,W^^^^^',
    '^^^^^W,,,T,WWWWWW__WWWWWWT,,,,W^^^^^',
    '^^^^^W,,,,,,,,,,,,,,,,,,,,,,,,W^^^^^',
    '^^^^^WWWW.WWW,,WW..WW,,WWWW.WWW^^^^^',
    '^^^^^W,,,,,,,,,W,,,,W,,,,,,,,,W^^^^^',
    '^^^^^W,T,,,,,,,W,.,,W,,,,,,,,,W^^^^^',
    '^^^^^W,,,,,,T,,W,,.,W,,T,,,,,,W^^^^^',
    '^^^^^W,,,,,,,,,W,,,,W,,,,,,,,,W^^^^^',
    '^^^^^WWWWW.WWWWW,,,,WWWW.WWWWWW^^^^^',
    '^^^^^W,,,,,,,,,,,,,,,,,,,,,,,,W^^^^^',
    '^^^^^W,,T,..,,,,,,,,,,,,,..,T,W^^^^^',
    '^^^^^W,,,,,,,,,,,,,,,,,,,,,,,,W^^^^^',
    '^^^^^WWWWWWWWWWWW..WWWWWWWWWWWW^^^^^',
    '^^^^^^^^^^^^^,,,,,,,,,,^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^TTTT..TTTT^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^TTTT..TTTT^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^TTTT..TTTT^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^TTTT..TTTT^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  ],
  npcs: [
    { id: 'nanbanjiChest1', name: '葛籠', x: 14, y: 2, color: 0x8a6a3a, event: 'nanbanjiChest1' },
    { id: 'nanbanjiChest2', name: '葛籠', x: 29, y: 20, color: 0x8a6a3a, event: 'nanbanjiChest2' },
    { id: 'nanbanjiChest3', name: '葛籠', x: 6, y: 5, color: 0x8a6a3a, event: 'nanbanjiChest3' },
    {
      id: 'shoroAto',
      name: '鐘楼の跡',
      x: 7,
      y: 9,
      color: 0x7a6a5a,
      lines: ['焼け落ちた鐘楼の跡だ。溶けて固まった鐘のかけらが、草の中に埋もれている。'],
    },
    {
      id: 'nanbanjiHaka',
      name: '墓',
      x: 27,
      y: 7,
      color: 0x8a8a8a,
      lines: ['名も刻まれていない小さな墓が並んでいる。誰かが、野の花を供えていった。'],
    },
    {
      id: 'nanbanjiSaidan',
      name: '焼け残りの祭壇',
      x: 17,
      y: 6,
      color: 0x7a5a3a,
      lines: ['焼け残りの祭壇だ。床には、歯車と油の跡が残っている。'],
    },
  ],
  exits: [
    { x: 17, y: 26, to: 'nagasaki', toX: 35, toY: 3 },
    { x: 18, y: 26, to: 'nagasaki', toX: 35, toY: 3 },
  ],
  encounter: 'nagasaki',
  respawnMap: 'nagasaki',
  // 礼拝堂の跡の入口で、研究所のからくり兵に出くわす
  triggers: [
    { x: 17, y: 10, event: 'nanbanjiOku', unless: 'shimabaraOpen' },
    { x: 18, y: 10, event: 'nanbanjiOku', unless: 'shimabaraOpen' },
  ],
};

/** 島原の原城跡（第 6 章のダンジョン）。三の丸・二の丸・本丸の石垣が残る海辺の古城。本丸の奥の石段から地下の研究所へ下りる。 */
MAPS.harajo = {
  id: 'harajo',
  name: '原城跡',
  areaLevel: 19,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTT..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~T',
    'TTT..TTTTTTTTTTTTT^^^^^^^^^^^^^^^^^^^^~~~~~~~T',
    'TTT..TTTTTTTTTTTTT^,,,,,,,,,,,,^..__.^~~~~~~~T',
    'TTT..TTTTTTTTTTTTT^,T,,,,,,,,T,^.....^~~~~~~~T',
    'TTT..,,,,,,,,,,,,,^,,,,,,,,,,,,^.....^~~~~~~~T',
    'TTT..^^^^^^^^^^^^^^,,,,^^^^^^,,^,^^^^^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,^....^,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,^.R..^,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,,,,T,,^,,,,^....^,,^,,,,T^~~~~~~~T',
    'TTT,,,^^^,,^^^,,,,^,,,,^^..^^,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,,,,,,,,,^^^^^,^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,T,,,,,,,,,,,,.....,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,^,,,,,^,,,,,,,,,,,,^T,,,,^~~~~~~~T',
    'TTT,,,,,,T,,^,,,,,^,,T,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,^,,,,,^,,,,,,,,,,,,^,^^^^^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,,,,,,T,,^,,,,,^~~~~~~~T',
    'TTT,,^^^^^,,^,,,,,^,,,,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,^,,,,,^,T,,,,,,,,,,.,,,,T^~~~~~~~T',
    'TTT,,,,,,,,,^,,,,,^,,,,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,^,,,,,^^^^^^..^^^^^^^^^^,^~~~~~~~T',
    'TTT,,,,T,,,,,,^^^^^,,,,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,.,.R..R..R..,^,,,,,^~~~~~~~T',
    'TTT,T,,,,,,,,,,,T,^,..........,^T,,,,^~~~~~~~T',
    'TTT,,,,,,,,,,,,,,,^,,,,,,,,,,,,^,,,,,^~~~~~~~T',
    'TTT^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  npcs: [
    { id: 'harajoChest1', name: '葛籠', x: 5, y: 24, color: 0x8a6a3a, event: 'harajoChest1' },
    { id: 'harajoChest2', name: '葛籠', x: 25, y: 24, color: 0x8a6a3a, event: 'harajoChest2' },
    { id: 'harajoChest3', name: '葛籠', x: 35, y: 24, color: 0x8a6a3a, event: 'harajoChest3' },
    {
      id: 'harajoTsuka',
      name: '塚',
      x: 8,
      y: 8,
      color: 0x8a8a7a,
      lines: ['土を盛った塚だ。乱で籠城し、討ち死にした人々を弔うものらしい。玄道が、静かに手を合わせた。'],
    },
    {
      id: 'harajoBorei',
      name: '亡霊',
      x: 26,
      y: 8,
      color: 0x9ab0c0,
      lines: [
        '亡霊「……なぜ、眠らせてくれぬ。地の底で、鉄の音が鳴りやまぬのだ……」',
        '亡霊は、すうっと消えていった。',
      ],
      after: { flag: 'nanbanOzutsuDefeated', lines: ['櫓台の跡に、静かな風が吹いている。'] },
    },
    {
      id: 'harajoIshidan',
      name: '石段',
      x: 33,
      y: 4,
      color: 0x7a7a6a,
      lines: ['本丸の奥に、新しく積み直した石段がある。地の底から、歯車の音が響いてくる。'],
    },
  ],
  exits: [
    // 北西の入口からワールドマップへ（島原の印の西の街道）
    { x: 3, y: 1, to: 'world', toX: 6, toY: 16 },
    { x: 4, y: 1, to: 'world', toX: 6, toY: 16 },
    // 本丸の奥の石段から地下の研究所へ
    { x: 34, y: 3, to: 'kenkyujo', toX: 15, toY: 1 },
    { x: 35, y: 3, to: 'kenkyujo', toX: 16, toY: 1 },
  ],
  encounter: 'harajo',
  respawnMap: 'nagasaki',
};

/** 原城跡の地下の研究所。蘭斎がからくりと外法を合わせる研究をしていた。奥の研究室の手前で南蛮大筒からくりが待つ。 */
MAPS.kenkyujo = {
  id: 'kenkyujo',
  name: '地下の研究所',
  areaLevel: 19,
  rows: [
    'WWWWWWWWWWWWWWW__WWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWW__WWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWW__WWWWWWWWWWWWWWW',
    'WWW__________________________WWW',
    'WWW__W___W____________W___W__WWW',
    'WWW__W___W____________W___W__WWW',
    'WWW__________________________WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWW__WWW',
    'WWW__WWWWWWWWWWWWWWWWWWWWWW__WWW',
    'WWW__WW__________________WW__WWW',
    'WWW__WW__________________WW__WWW',
    'WWW______R___R____R___R__WW__WWW',
    'WWW__WW__R___R____R___R______WWW',
    'WWW__WW__________________WW__WWW',
    'WWW__WW__________________WW__WWW',
    'WWW__WWWWWW____WW____WWWWWW__WWW',
    'WWW__WWWWWW____WW____WWWWWW__WWW',
    'WWW__WWWWWW_WWWWWWWW_WWWWWW__WWW',
    'WWW__________________________WWW',
    'WWWWWWWWWWWWWWW__WWWWWWWWWWWWWWW',
    'WWWWWWWWW______________WWWWWWWWW',
    'WWWWWWWWW__R________R__WWWWWWWWW',
    'WWWWWWWWW______________WWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ],
  npcs: [
    { id: 'kenkyujoChest1', name: '葛籠', x: 3, y: 3, color: 0x8a6a3a, event: 'kenkyujoChest1' },
    { id: 'kenkyujoChest2', name: '葛籠', x: 28, y: 17, color: 0x8a6a3a, event: 'kenkyujoChest2' },
    {
      id: 'zenmaiKura',
      name: 'ゼンマイの棚',
      x: 7,
      y: 3,
      color: 0x8a7a5a,
      lines: ['棚に、大小のゼンマイがびっしりと並んでいる。ひとつひとつに、人の名を書いた札が下がっている……。'],
    },
    {
      id: 'jikkenDai',
      name: '実験の台',
      x: 11,
      y: 11,
      color: 0x6a6a7a,
      lines: ['からくりの腕と、護符を貼った鉄の箱が台に縛りつけられている。外法の文字が、箱の中で青く光っている。'],
      after: { flag: 'nanbanOzutsuDefeated', lines: ['護符の光は消えている。からくりの腕は、もう動かない。'] },
    },
    {
      id: 'ransaiTsukue',
      name: '蘭斎の机',
      x: 15,
      y: 21,
      color: 0x7a5a3a,
      lines: ['蘭斎の机だ。南蛮の書と、細かな字で埋まった帳面が積まれている。'],
    },
  ],
  exits: [
    { x: 15, y: 0, to: 'harajo', toX: 34, toY: 4 },
    { x: 16, y: 0, to: 'harajo', toX: 35, toY: 4 },
  ],
  encounter: 'harajo',
  respawnMap: 'nagasaki',
  // 奥の研究室への細い入口で、南蛮大筒からくりが待ち構える
  triggers: [
    { x: 15, y: 19, event: 'nanbanOzutsu', unless: 'nanbanOzutsuDefeated' },
    { x: 16, y: 19, event: 'nanbanOzutsu', unless: 'nanbanOzutsuDefeated' },
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
 * そのマップで全滅したときに戻る場所。マップに respawn がなければ、(x, y) を含む respawnZones の町（flag の立っていない範囲は飛ばす）、
 * なければ respawnMap の町、それもなければ最初の町。
 */
export function respawnPoint(mapId: string, x?: number, y?: number, flags: Record<string, boolean> = {}): { mapId: string; x: number; y: number } {
  const map = MAPS[mapId];
  const zone =
    x === undefined || y === undefined
      ? undefined
      : map?.respawnZones?.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h && (!z.flag || flags[z.flag]));
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
