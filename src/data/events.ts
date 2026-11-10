// イベントのデータ。シナリオ（フェーズ 4）はここに足していく。形は eventTypes.ts を参照。
import type { Facing } from '../systems/gameState';
import type { EventDef, EventStep } from './eventTypes';
import type { CharacterSpriteId } from './sprites';
import { BAKUTO_INTRO_EVENTS, JINGI_REQUEST_EVENTS } from './jingiRequests';
import { OYABUN_GIFT_EVENTS } from './oyabunGifts';
import { OYABUN_REQUEST_EVENTS, TATSUGORO_JINGI } from './oyabunRequests';

// 演出の手順の短い書き方（docs/events.md の「演出」）。
// 地の文で人の動きや居場所を語らず、人を画面に出して動かして見せる（テストプレイの指摘）。

/** 人をイベントの間だけ出す（x・y を省くと主人公の隣へ 1 歩出る）。 */
function actor(id: string, sprite: CharacterSpriteId, x?: number, y?: number, facing?: Facing): EventStep {
  return x === undefined || y === undefined ? { type: 'actor', id, sprite } : { type: 'actor', id, sprite, x, y, ...(facing ? { facing } : {}) };
}
/** 戦闘にしか出ない敵を、戦闘の画像でイベントの間だけ出す。 */
function enemyActor(id: string, enemy: string, x: number, y: number): EventStep {
  return { type: 'actor', id, enemy, x, y };
}
function walk(who: string, path: string): EventStep {
  return { type: 'walk', who, path };
}
function face(who: string, dir: Facing): EventStep {
  return { type: 'face', who, dir };
}
function faceTo(who: string, toward: string): EventStep {
  return { type: 'face', who, toward };
}
function vanish(who: string): EventStep {
  return { type: 'vanish', who };
}
function wait(ms: number): EventStep {
  return { type: 'wait', ms };
}
/** フィールドで姿を見せる一行の仲間（兵庫は第 5 章のゲスト）。 */
type PartySprite = 'kasumi' | 'gendo' | 'orin' | 'hyogo';
/** 一行の仲間が主人公から出て隣に立つ（台詞を言う間、姿を見せる）。 */
function partyOut(member: PartySprite): EventStep {
  return actor(member, member);
}
/** 出ていた仲間が主人公のところへ戻って見えなくなる。 */
function partyIn(member: PartySprite): EventStep[] {
  return [{ type: 'walk', who: member, to: 'hero' }, vanish(member)];
}

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
      '{hero}「親分、裏山の洞の奥で、狐を仕留めてきやした。……ただの狐じゃねえ。額に、真鍮の歯車が埋め込まれてやがった」',
      '{hero}「奥には木箱がひとつ。中身はゼンマイ仕掛けの人形の残骸で、箱には駿府の工房の焼き印がありやした」',
    ],
    linesF: [
      '{hero}「親分、裏山の洞の奥で、狐を仕留めてきたよ。……ただの狐じゃない。額に、真鍮の歯車が埋め込まれてた」',
      '{hero}「奥には木箱がひとつ。中身はゼンマイ仕掛けの人形の残骸で、箱には駿府の工房の焼き印があったのさ」',
    ],
  },
  {
    type: 'say',
    lines: [
      '辰五郎「狐の正体が、からくり仕掛けだと……？ それに、駿府の工房の焼き印か」',
      '辰五郎「消えた者たちは、そのからくりに連れていかれたのかもしれねえ。すまねえが、もうひと肌脱いじゃくれねえか」',
      '辰五郎「駿府の城下へ行って、その工房を探ってほしい。町の東の外れから街道へ出りゃ、駿府はすぐ西隣だ」',
      '辰五郎「これは礼だ。取っといてくんな」',
      '辰五郎から 300 文を受け取った。',
    ],
  },
  { type: 'giveMoney', amount: 300 },
  // 親分の頼みを果たしたので仁義ポイントを得る（src/data/oyabunRequests.ts）
  { type: 'addJingi', amount: TATSUGORO_JINGI },
  { type: 'say', lines: ['辰五郎「一家の頼みを、よう果たしてくれた。この恩は、街道筋の親分衆にも伝えておくぜ」', '渡世人としての名が上がった。（仁義 {jingi}）'] },
  { type: 'setFlag', flag: 'talkedToTatsugoro' },
  { type: 'setFlag', flag: 'prologueCleared' },
];

/** 葛籠のイベントの ID（開けるとこの ID のフラグが立つ。マップの葛籠は開いた姿になる）。 */
export const CHEST_EVENTS = new Set<string>();

/** 葛籠（宝箱）。一度だけ道具が手に入る。持ちきれないときはフラグを立てず、また来たときに受け取れるようにする。 */
function chest(id: string, item: string, itemName: string): EventDef {
  CHEST_EVENTS.add(id);
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

/** からくり屋敷の奥の間の装置のまわりに座らされた人々（鉄瓶の場面）。 */
const KARAKURI_CAPTIVES: EventStep[] = [
  actor('captiveYokichi', 'npc_ninsoku', 23, 2),
  actor('captiveHaha', 'npc_okami', 22, 1),
  actor('captiveRojin', 'npc_rojin', 16, 2),
  actor('captiveMusume', 'npc_musume', 15, 3),
];

/** 駿府に初めて入ったとき。 */
const SUNPU_ARRIVE: EventStep[] = [
  // 東の街道から入ったところ（47, 15）のそばで、町の娘と商人が、からくり一座の噂をしている
  actor('sunpuUwasaMusume', 'npc_musume', 44, 16, 'right'),
  actor('sunpuUwasaShonin', 'npc_merchant', 45, 16, 'left'),
  {
    type: 'say',
    lines: [
      '娘「ねえ、聞いた？ 大坂の道頓堀から、からくり一座が興行に来てるんだって」',
      '商人「町の南西の芝居小屋だろう。人形が茶を運ぶわ、文字を書くわで、えらい評判だ」',
      '商人「もっとも、小屋の裏の工房には、誰も入れてもらえねえそうだがね」',
    ],
  },
  // 娘は飛脚問屋へ、商人は刀鍛冶へ入っていく
  { type: 'walk', who: 'sunpuUwasaMusume', path: 'ddddrru', wait: false },
  walk('sunpuUwasaShonin', 'lddddlllu'),
  vanish('sunpuUwasaMusume'),
  vanish('sunpuUwasaShonin'),
  {
    type: 'say',
    lines: ['{hero}「からくり一座の工房か……。洞の木箱の焼き印は、そこのものかもしれねえ」'],
    linesF: ['{hero}「からくり一座の工房ね……。洞の木箱の焼き印は、そこのものかもしれない」'],
  },
  { type: 'setFlag', flag: 'sunpuArrived' },
];

/** 鉄瓶を倒して駿府に戻ったとき（第 1 章の終わり）。第 2 章（名古屋）への導線。 */
const SUNPU_CHAPTER_END: EventStep[] = [
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「助かった人たちは、家へ送り届けたよ。与吉は、清水の長屋へ帰るってさ」',
      '霞「黒田は役目を解かれた。一座のほうは、一夜のうちに小屋をたたんで消えちまった」',
      '霞「さらった人をからくりに変えて、何に使うつもりだったのか……。手がかりは、名簿の最後の行だね」',
      '霞「『金の鱗、尾張より届く』……名古屋だ。西へ行くよ、{hero}」',
      '霞「大井川は川止めだって話だけど、行ってみりゃなんとかなるさ」',
    ],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'chapter1Cleared' },
];

/** 大井川の渡し場（第 1 章を終えたあと）。川止めの本当のわけは、人足を水に引き込む川獺。 */
const OIGAWA_CROSSING: EventStep[] = [
  // 街道を東から来た主人公（104, 30）の前で、渡し場の口（103, 30）を人足頭がふさぎ、その後ろに人足が座り込んでいる（ワールドマップは道しか通れない）
  actor('oigawaGashira', 'npc_ninsoku', 103, 30, 'right'),
  actor('oigawaNinsoku', 'npc_ninsoku', 102, 30, 'right'),
  {
    type: 'say',
    lines: [
      '人足頭「川止めだよ。……いや、水かさのせいじゃねえ。夜になると、川獺どもが人足の足を引っぱって、川へ引きずり込みやがるんだ」',
      '人足頭「もう三人も流された。お役人は『化かされたんだろう』と取り合っちゃくれねえ」',
    ],
  },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「人を水に引き込む獣ねえ。片づけてやろうか、{hero}」', 'ザバッ……！'] },
  // 渡し場の西の浅瀬から、ずぶ濡れの川獺が二匹躍り出る
  enemyActor('oigawaKawausoA', 'kawauso', 101, 30),
  enemyActor('oigawaKawausoB', 'kawauso', 100, 30),
  face('oigawaNinsoku', 'left'),
  face('oigawaGashira', 'left'),
  { type: 'say', lines: ['人足「で、出た！ 川獺だ！」'] },
  {
    type: 'battle',
    enemies: ['kawauso', 'kawauso'],
    level: 7,
    ifLose: [{ type: 'say', lines: ['人足頭「おい、しっかりしろ！ ……無理するこたあねえ。出直してきな」'] }, { type: 'end' }],
  },
  // 川獺は、甲高い声をあげて川下へ逃げていく
  { type: 'walk', who: 'oigawaKawausoA', path: 'll', wait: false },
  walk('oigawaKawausoB', 'll'),
  vanish('oigawaKawausoA'),
  vanish('oigawaKawausoB'),
  faceTo('oigawaGashira', 'hero'),
  {
    type: 'say',
    lines: [
      '人足頭「ありがてえ！ これで川明けだ。お礼に、蓮台でお渡ししやしょう」',
      '人足頭「この先の東海道は、追い剥ぎの浪人や雲助が出る。尾張の名古屋までは、気を抜きなさんなよ」',
    ],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'oigawaOpen' },
  // 人足の担ぐ蓮台で、渡し場の西の岸へ渡る
  { type: 'warp', mapId: 'world', x: 102, y: 30 },
];

/** 名古屋に初めて入ったとき。 */
const NAGOYA_ARRIVE: EventStep[] = [
  // 東の通りから入ったところ（49, 18）のそばで、町の人が西の天守を見上げて騒いでいる
  actor('nagoyaYajiumaA', 'npc_merchant', 45, 17, 'left'),
  actor('nagoyaYajiumaB', 'npc_rojin', 46, 16, 'left'),
  actor('nagoyaYajiumaC', 'npc_kodomo', 44, 18, 'left'),
  {
    type: 'say',
    lines: [
      '町人「見ろよ、天守の金の鯱を。鱗がまだらに剥がされてやがる……！」',
      '老人「御三家筆頭の尾張様の御城で、なんとまあ罰当たりな」',
      '子ども「ねえ、鱗を盗んだのは凧揚げの金太兄ちゃんだって、ほんと？」',
    ],
  },
  // 町人は西の通りへ、老人は北の店へ、子どもは南の路地へ散っていく
  { type: 'walk', who: 'nagoyaYajiumaB', path: 'ulu', wait: false },
  { type: 'walk', who: 'nagoyaYajiumaC', path: 'ldd', wait: false },
  walk('nagoyaYajiumaA', 'llll'),
  vanish('nagoyaYajiumaA'),
  vanish('nagoyaYajiumaB'),
  vanish('nagoyaYajiumaC'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「『金の鱗、尾張より届く』。名簿にあった一文は、このことだったんだ」',
      '霞「鱗が盗まれたのは、一座が姿を消したのと同じころ。きっと同じ連中の仕業だよ。聞き込みといこう」',
    ],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'nagoyaArrived' },
];

/**
 * 金鯱からくりを倒して名古屋に戻ったとき（第 2 章の終わり）。第 3 章（京）への導線。
 * 天守から城の前（24, 11）へ移ったところで、城の役人が門から出てきて鱗を受け取り、金太が駆けつける。
 */
const NAGOYA_CHAPTER_END: EventStep[] = [
  actor('nagoyaShiroYakunin', 'npc_yakunin', 26, 10, 'down'),
  walk('nagoyaShiroYakunin', 'dl'),
  face('nagoyaShiroYakunin', 'left'),
  face('hero', 'right'),
  {
    type: 'say',
    lines: ['{hero}「天守の鯱から剥がされた金の鱗は、これで全部でさあ。お返ししやす」'],
    linesF: ['{hero}「天守の鯱から剥がされた金の鱗は、これで全部だよ。お返しするね」'],
  },
  {
    type: 'say',
    lines: [
      '役人「鱗を盗んだのは江戸から来た浪人どもで、軽業師の金太は無実であった。……銀次の書き置きは、弟をかばうためのものだったのじゃな」',
      '役人「殿より、褒美を下される」',
      '城の役人から 500 文を受け取った。',
    ],
  },
  { type: 'giveMoney', amount: 500 },
  // 役人は城へ戻り、入れ替わりに金太が東の通りから駆けてくる
  walk('nagoyaShiroYakunin', 'ru'),
  vanish('nagoyaShiroYakunin'),
  actor('nagoyaKinta', 'kinta', 31, 11, 'left'),
  walk('nagoyaKinta', 'llllll'),
  face('hero', 'right'),
  { type: 'say', lines: ['金太「兄貴は、凧の糸を少しでも長くするんだって、毎晩遅くまで働いてた。……おれ、兄貴の分まで高く揚げるよ」'] },
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「荷蔵の浪人が持ってた文に、もう一つ気になることが書いてあった。『京の鬼、首尾よく』……」',
      '霞「京で鬼が出るって噂、あんたも聞いたろ？ 次は京だよ、{hero}」',
    ],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'chapter2Cleared' },
];

/** 金太に初めて会う。兄の銀次が罪をかぶって消えたこと、堀川の荷蔵のことを聞き、荷蔵の前の荷車をどけてもらう。 */
const KINTA_MEET: EventStep[] = [
  // 大凧の陰に身を潜めていた金太が、身構えて振り向く
  faceTo('kinta', 'hero'),
  {
    type: 'say',
    lines: [
      '男「だ、誰だ！ ……役人じゃねえな。おれは金太。鱗なんか盗んじゃいねえ！」',
      '金太「あの晩、兄貴の銀次が『鱗を盗んだのはおれだ』って書き置きを残して、いなくなっちまったんだ」',
      '金太「兄貴がそんなことするはずねえ。……でも、あの晩、堀川の荷蔵に浪人どもが重そうな箱を運び込むのを見た。兄貴は、あいつらを追っかけてったんだと思う」',
    ],
  },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「その荷蔵、調べてみる価値はありそうだね」'] },
  ...partyIn('kasumi'),
  { type: 'say', lines: ['金太「荷蔵の戸口は荷車でふさがれてる。おれが動かしといてやるよ。……頼む、兄貴を見つけてくれ！」'] },
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
        lines: ['{hero}「荷蔵の奥に、浪人の文と、凧の絵の手ぬぐいがあった。鱗は天守へ運ばれたらしい」'],
        linesF: ['{hero}「荷蔵の奥に、浪人の文と、凧の絵の手ぬぐいがあったよ。鱗は天守へ運ばれたみたい」'],
      },
      {
        type: 'say',
        lines: [
          '金太「その手ぬぐい、兄貴のだ……！ 鱗は天守に……兄貴も、きっとそこにいるんだ」',
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
          // 金太が大凧のほうを向く
          face('kinta', 'left'),
          { type: 'say', lines: ['金太「しっかりつかまってな！ 夜風に乗って、一気に天守まで行くぜ！」'] },
          { type: 'setFlag', flag: 'kintaFlew' },
          // 天守の南西の欄干に降りる。金太は凧をつないで、そこで待つ（tenshuKinta）
          { type: 'warp', mapId: 'tenshu', x: 1, y: 23 },
          faceTo('hero', 'tenshuKinta'),
          { type: 'say', lines: ['金太「着いた……天守の五重目の欄干だ。鯱は、この上の大棟にいるはずだ」', '金太「おれは凧をつないでから、すぐ後を追う。先に行ってくれ！」'] },
        ],
      },
      { label: '支度をする', steps: [{ type: 'say', lines: ['金太「支度ができたら声をかけてくれ。凧はいつでも揚げられる」'] }] },
    ],
  },
];

/** 京に初めて入ったとき。東の入口（51, 13）のそばで、暮れ六つの鐘を聞いた町の人が、鬼の噂をしながら家へ急ぐ。 */
const KYO_ARRIVE: EventStep[] = [
  actor('kyoMachibitoA', 'npc_merchant', 47, 12, 'right'),
  actor('kyoMachibitoB', 'npc_musume', 46, 13, 'right'),
  { type: 'say', lines: ['ゴーン……ゴーン……'] },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「ここが京か。大火の焼け跡から、よくここまで立ち直ったもんだね」'] },
  {
    type: 'say',
    lines: [
      '町人「暮れ六つの鐘や。早う店じまいして、戸を閉めな」',
      '町娘「旅のお人？ 日が落ちたら、表を出歩いたらあかんえ」',
      '町人「夜な夜な、羅生門の跡に鬼が出るんや。鴨川の河原の者が、もう何人もさらわれとる」',
    ],
  },
  // 二人は西の通りへ、家路を急ぐ
  { type: 'walk', who: 'kyoMachibitoB', path: 'llllll', wait: false },
  walk('kyoMachibitoA', 'lllllll'),
  vanish('kyoMachibitoA'),
  vanish('kyoMachibitoB'),
  {
    type: 'say',
    lines: ['霞「通りから、すっかり人がいなくなっちまった」', '霞「『京の鬼、首尾よく』……やっぱり、鬼の噂の裏にも連中がいるね」'],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'kyoArrived' },
];

/**
 * 酒呑の大鬼を倒して京に戻ったとき（第 3 章の終わり）。清水湊から、辰五郎が殺されたという急報が届く。
 * 鬼の巣から北の峠道の口（19, 5）へ移ったところで、人に戻った河原の人々が鴨川の河原へ帰り、飛脚が南から駆けてくる。
 * 見送り: この変更より前のセーブで、酒呑の大鬼を倒したあと鬼の巣で全滅すると、東の入口のそば（全滅時の戻り先）でこの場面が始まり、
 * 人々と飛脚が画面の外に出る（今は shuten が勝ったあとすぐ 19, 5 へ移るので起きない）。直すなら、人の位置を主人公からの相対にする。
 */
const KYO_CHAPTER_END: EventStep[] = [
  actor('kyoKaeriA', 'npc_ninsoku', 18, 3, 'down'),
  actor('kyoKaeriB', 'npc_musume', 18, 2, 'down'),
  actor('kyoKaeriC', 'npc_rojin', 18, 1, 'down'),
  // 峠道を下りて、主人公のすぐ南の通り（y = 6）を東の河原へ帰っていく
  { type: 'walk', who: 'kyoKaeriC', path: 'dddddrrrrrrrrrrrrrrrr', wait: false },
  { type: 'walk', who: 'kyoKaeriB', path: 'ddddrrrrrrrrrrrrrrrrr', wait: false },
  walk('kyoKaeriA', 'dddrrrrrrrrrrrrrrrrrr'),
  vanish('kyoKaeriA'),
  vanish('kyoKaeriB'),
  vanish('kyoKaeriC'),
  face('hero', 'down'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「斬らずに済んだ。……仏の慈悲ってやつも、たまには役に立つもんだ」'] },
  // 汗まみれの飛脚が、南の通りから駆けてくる
  actor('kyoHikyaku', 'npc_hikyaku', 19, 13, 'up'),
  walk('kyoHikyaku', 'uuuuuuu'),
  { type: 'say', lines: ['飛脚「{hero}様でございやすか！ 清水湊の一家から、急ぎの文でございやす！」'] },
  {
    type: 'say',
    lines: ['{hero}「……『辰五郎親分、殺される。下手人は、からくりの腕を持つ男』」', '{hero}〈悲〉「……親分が」'],
  },
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「夜叉丸の言ってた『江戸の御老中』の手の者か……。お凛さんが心配だよ」',
      '玄道「清水湊か。わしも行こう。仏の弔いなら、本職だ」',
    ],
  },
  { type: 'say', lines: ['{hero}「清水湊へ急ぐぜ」'], linesF: ['{hero}「清水湊へ急ごう」'] },
  // 飛脚は、来た道を南へ戻っていく
  walk('kyoHikyaku', 'ddddddd'),
  vanish('kyoHikyaku'),
  ...partyIn('kasumi'),
  ...partyIn('gendo'),
  { type: 'setFlag', flag: 'chapter3Cleared' },
];

/** 清水湊に初めて入ったとき（序章の始まり）。 */
const INTRO: EventStep[] = [
  // 東海道に立つ主人公（20, 9）のところへ、辰五郎一家の子分が東から来て、仁義を受ける
  actor('introKobun', 'npc_ninsoku', 31, 10, 'left'),
  walk('introKobun', 'llllllllllu'),
  face('introKobun', 'left'),
  face('hero', 'right'),
  {
    type: 'say',
    lines: [
      '子分「もし、そこのお方。この湊に、何の御用で？」',
      '{hero}「お控えなすって。手前、廻船問屋の荷の護衛で、この湊へ流れてまいりやした渡世人、{hero}と申しやす」',
      '{hero}「鬼瓦の辰五郎親分に、一宿一飯のお願いに上がりやした」',
      '子分「こいつはご丁寧に。親分なら屋敷においででさ。この街道を東へ、川を渡った先の北側の大きな屋敷だ」',
      '子分「あっしは湊の見回りがありやすんで。ごゆっくり」',
    ],
    linesF: [
      '子分「もし、そこのお方。この湊に、何の御用で？」',
      '{hero}「お控えなすって。手前、廻船問屋の荷の護衛で、この湊へ流れてまいりました渡世人、{hero}と申します」',
      '{hero}「鬼瓦の辰五郎親分に、一宿一飯のお願いに上がりました」',
      '子分「こいつはご丁寧に。親分なら屋敷においででさ。この街道を東へ、川を渡った先の北側の大きな屋敷だ」',
      '子分「あっしは湊の見回りがありやすんで。ごゆっくり」',
    ],
  },
  // 来た道を東へ戻っていく（主人公のマスを通らないよう、街道の下の段へ下りてから）
  walk('introKobun', 'drrrrrrrrrr'),
  vanish('introKobun'),
  { type: 'say', lines: ['（十字キーで移動、決定で話す・調べる、取消でメニュー）'] },
  { type: 'setFlag', flag: 'intro' },
];

/**
 * 第 3 章を終えて清水湊に戻ったとき（第 4 章の始まり）。辰五郎の弔いで、お凛が仇討ちを誓って仲間になる。仇討免状の願いを飛脚で江戸へ出す。
 * 町の入口で弔いの鉦を聞き、辰五郎一家の屋敷の土間（shimizuOyabun の 8, 10）へ移る。奥の座敷には棺と逆さ屏風、枕元にお凛（orinTomurai）がいる。
 */
const SHIMIZU_FUNERAL: EventStep[] = [
  // 湊は静まり返り、辰五郎一家の屋敷のほうから、弔いの鉦の音だけが聞こえてくる
  { type: 'say', lines: ['カーン……カーン……'] },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「町じゅう、静まり返ってる……。鉦の音は、一家の屋敷のほうからだ」'] },
  ...partyIn('kasumi'),
  { type: 'warp', mapId: 'shimizuOyabun', x: 8, y: 10 },
  face('hero', 'up'),
  // 土間にいた子分が気づいて、駆け寄ってくる
  faceTo('shimizuKobun', 'hero'),
  walk('shimizuKobun', 'llllld'),
  face('shimizuKobun', 'left'),
  face('hero', 'right'),
  {
    type: 'say',
    lines: ['子分「……{hero}の兄い。来てくだすったんですかい」', '子分「親分は、奥の座敷の棺の中でさ。……お凛お嬢さんが、ずっと付きっきりで」'],
    linesF: ['子分「……{hero}の姐さん。来てくだすったんですかい」', '子分「親分は、奥の座敷の棺の中でさ。……お凛お嬢さんが、ずっと付きっきりで」'],
  },
  // 奥の座敷の棺の前へ
  walk('hero', 'lllluuuuuuu'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「約束どおり、経を上げさせてもらうぞ」', 'ナウマク・サマンダ・ボダナン……', '玄道「……辰五郎どの。迷わず、ゆかれよ」'] },
  // 父の枕元にいたお凛が、からくり鉄砲を膝に抱いたまま振り向く
  faceTo('orinTomurai', 'hero'),
  {
    type: 'say',
    lines: [
      'お凛〈悲〉「……おとっつぁんを斬ったのは、蛇骨の権六って男だよ。からくりの腕をした、鷲尾って老中の飼い犬さ」',
      'お凛「子分の一人が、伊賀上野のほうへ逃げてく後ろ姿を見てる」',
      'お凛「よそ者に頼るなんてって、あたしは言ったね。……前言を撤回するよ。お願いだ、あたしを一緒に連れてっておくれ」',
      'お凛〈怒〉「おとっつぁんの仇は、この鉄砲で、あたしが討つ」',
    ],
  },
  partyOut('kasumi'),
  faceTo('kasumi', 'orinTomurai'),
  {
    type: 'say',
    lines: [
      '霞「仇討ちなら、公儀の許し――仇討免状が要るよ。勝手に斬れば、ただの人殺しだ」',
      '霞「あたしのつてで、江戸の町奉行所に届けを出す。飛脚なら、伊賀に着くころには免状が追いついてくるはずさ」',
      '霞「……よし、書けた。子分さん、この願い書きを清水の飛脚屋へ頼むよ」',
    ],
  },
  // 子分が願い書きを受け取りに来て、飛脚屋へ駆けていく
  { type: 'walk', who: 'shimizuKobun', to: { x: 4, y: 4 } },
  faceTo('kasumi', 'shimizuKobun'),
  { type: 'say', lines: ['子分「へい！ ひとっ走り行ってめえりやす！」'] },
  walk('shimizuKobun', 'ddddddrrrrd'),
  vanish('shimizuKobun'),
  faceTo('kasumi', 'hero'),
  faceTo('gendo', 'orinTomurai'),
  {
    type: 'say',
    lines: ['玄道「仏の前で仇討ちの誓いとは、坊主としては止めねばならんところだが……。まあ、わしも破戒僧よ。付き合おう」'],
  },
  {
    type: 'say',
    lines: ['{hero}「親分の仇は、あっしにとっても仇だ。一緒に行こうぜ、お凛」'],
    linesF: ['{hero}「親分の仇は、あたしにとっても仇だよ。一緒に行こう、お凛」'],
  },
  {
    type: 'say',
    lines: ['お凛が仲間に加わった！', 'お凛「伊賀上野は、東海道を西へ。名古屋を過ぎて、京の手前の街道を南へ折れたところだよ」'],
  },
  { type: 'join', member: 'orin' },
  ...partyIn('kasumi'),
  ...partyIn('gendo'),
  // お凛は棺の前から一歩下がってから、主人公のところへ
  walk('orinTomurai', 'd'),
  { type: 'walk', who: 'orinTomurai', to: 'hero' },
  vanish('orinTomurai'),
  { type: 'setFlag', flag: 'orinJoined' },
];

/**
 * 伊賀上野に初めて入ったとき。江戸から仇討免状が届く。
 * 東の入口（47, 18。全滅時の戻り先は 45, 16）のそばで、後ろの街道から飛脚が駆けてきて、免状を渡して城下へ走っていく。
 */
const IGA_ARRIVE: EventStep[] = [
  actor('igaHikyaku', 'npc_hikyaku', 49, 17, 'left'),
  { type: 'say', lines: ['飛脚「お待ちを！ お待ちくだせえ！」'] },
  walk('igaHikyaku', 'lll'),
  partyOut('orin'),
  faceTo('orin', 'igaHikyaku'),
  faceTo('igaHikyaku', 'orin'),
  { type: 'say', lines: ['飛脚「清水湊のお凛様でございやすね。江戸の町奉行所から、お届け物でございやす！」'] },
  {
    type: 'say',
    lines: ['お凛「……公儀の印が押してある。仇討免状だ」', 'お凛「……これで、天下晴れての仇討ちだ」'],
  },
  { type: 'say', lines: ['飛脚「確かにお渡ししやした。ごめんなすって！」'] },
  // 飛脚は、城下の飛脚屋のほうへ駆けていく
  walk('igaHikyaku', 'llllll'),
  vanish('igaHikyaku'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「山あいの城下にしちゃ、ずいぶん張りつめた空気だね……」',
      '霞「権六は、この城下のどこかに……いや。伊賀で身を隠すなら、山の上の里だね」',
      '霞〈悲〉「伊賀者の里。……あたしが抜けてきた里さ」',
    ],
  },
  ...partyIn('kasumi'),
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'igaArrived' },
];

/**
 * 大坂に初めて入ったとき（第 5 章の始まり）。米の値が吊り上がっている。霞が江戸の上役へ報告に向かい、一時抜ける。
 * 東の入口（51, 15。全滅時の戻り先は 49, 13）のそばで、空の米びつを抱えた町人が嘆いて西へ帰り、霞は東の街道へ戻っていく。
 */
const OSAKA_ARRIVE: EventStep[] = [
  // 町のほう（西）を向く。仲間は主人公の上か下に出るので、霞が東へ戻る道（横、縦の順）が主人公のマスを通らない
  face('hero', 'left'),
  actor('osakaKomeOkami', 'npc_okami', 47, 16, 'right'),
  actor('osakaKomeNinsoku', 'npc_ninsoku', 46, 16, 'right'),
  {
    type: 'say',
    lines: [
      'おかみ「米が一升、去年の三倍や……。蔵には米が山ほどある言うのに、問屋はちっとも売らへん」',
      '町人「大黒屋の前に朝から並んでも、売り切れや言われて、空の米びつ抱えて帰るだけや」',
    ],
  },
  // 二人は、空の米びつを抱えて船場の長屋のほうへ帰っていく
  { type: 'walk', who: 'osakaKomeOkami', path: 'llllll', wait: false },
  walk('osakaKomeNinsoku', 'llllll'),
  vanish('osakaKomeOkami'),
  vanish('osakaKomeNinsoku'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「天下の台所が、米びつの底をさらってるなんてね……。権六は大坂へ向かう手はずだった。米の買い占めにも、鷲尾の手が回ってるんだろうね」',
      '霞「あたしは一度、江戸の上役に知らせに行く。鷲尾が老中の座で何をしてるか、上の方にも分かってもらわなきゃならない」',
    ],
  },
  partyOut('orin'),
  faceTo('orin', 'kasumi'),
  faceTo('kasumi', 'orin'),
  { type: 'say', lines: ['お凛「一人で大丈夫なのかい」'] },
  { type: 'say', lines: ['霞「抜け忍の足を、なめてもらっちゃ困るよ。……西へ行くなら、広島で落ち合おう。それまで、くたばるんじゃないよ」'] },
  // 霞は、来た道を東の街道へ駆け戻っていく
  { type: 'walk', who: 'kasumi', to: { x: 52, y: 15 } },
  walk('kasumi', 'r'),
  vanish('kasumi'),
  { type: 'leave', member: 'kasumi' },
  { type: 'say', lines: ['霞が一時、一行を離れた。'] },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「さて、わしらはわしらで、この町の飢えをなんとかせねばな」'] },
  ...partyIn('gendo'),
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'kasumiAway' },
  { type: 'setFlag', flag: 'osakaArrived' },
];

/**
 * 百俵からくりを倒して大坂に戻ったとき（第 5 章の終わり）。蜂起は止められず、兵庫は町を焼かぬよう自ら奉行所へ名乗り出る。
 * 米蔵から出た北岸（26, 4）で始まる（百俵からくりの場面がここへ移す）。門弟たちが堂島川の橋の南から押し寄せ、兵庫が橋の上で止める。
 */
const OSAKA_CHAPTER_END: EventStep[] = [
  // 橋（南）を向く。仲間は主人公の左右に出るので、蔵の戸（26, 3）や、飛脚の駆けてくる橋の道（x = 26）に重ならない
  face('hero', 'down'),
  // 夜明けとともに、町のあちこちで鬨の声が上がる
  { type: 'say', lines: ['ワアアアッ……！'] },
  actor('hyogo', 'hyogo', 27, 4, 'down'),
  { type: 'say', lines: ['兵庫「……あの声は、わしの門弟たちか。止められなかったか」'] },
  // 門弟たちが、船場の通りから橋のたもとへ駆けてくる
  actor('osakaMonteiA', 'npc_ronin', 24, 12, 'up'),
  actor('osakaMonteiB', 'npc_ronin', 27, 12, 'up'),
  actor('osakaMonteiC', 'npc_merchant', 25, 13, 'up'),
  { type: 'walk', who: 'osakaMonteiA', path: 'uuuu', wait: false },
  { type: 'walk', who: 'osakaMonteiB', path: 'uuuu', wait: false },
  walk('osakaMonteiC', 'uuuu'),
  {
    type: 'say',
    lines: [
      '門弟「先生！ 蔵の地下のからくりは潰れたと聞きました！ 今こそ大黒屋の蔵を打ちこわすときです！」',
      '門弟「蔵に火を放ちましょう！ 鷲尾の手先どもを焼き払うんです！」',
    ],
  },
  // 兵庫は橋の上へ下りて、門弟たちの前に立ちふさがる
  walk('hyogo', 'dld'),
  {
    type: 'say',
    lines: [
      '兵庫「ならん！ 火を放てば、町じゅうが焼ける。飢えた者が、今度は家まで失うのだ」',
      'カチャリ……',
      '兵庫「この刀は、ここに置く。……蔵の米は、町の者に配れ。騒ぎの咎は、すべてこの榊兵庫が負う」',
    ],
  },
  { type: 'say', lines: ['門弟「先生……！」'] },
  faceTo('hyogo', 'hero'),
  {
    type: 'say',
    lines: ['兵庫「{hero}殿。短い間だったが、ともに戦えてうれしかった。……鷲尾を、頼む」', '兵庫「わしは奉行所へ参る。……達者でな」'],
  },
  // 兵庫は橋を渡り、ひとりで奉行所へ向かっていく
  walk('hyogo', 'dddddddd'),
  vanish('hyogo'),
  { type: 'leave', member: 'hyogo' },
  { type: 'say', lines: ['榊兵庫が一行を離れた。'] },
  { type: 'say', lines: ['門弟「……蔵を開けて、米を配るんや。先生の言いつけや」'] },
  { type: 'walk', who: 'osakaMonteiA', path: 'dddd', wait: false },
  { type: 'walk', who: 'osakaMonteiB', path: 'dddd', wait: false },
  walk('osakaMonteiC', 'ddd'),
  wait(300),
  vanish('osakaMonteiA'),
  vanish('osakaMonteiB'),
  vanish('osakaMonteiC'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛〈悲〉「……あんな立派なお侍が、どうして咎めを受けなきゃならないんだい」'] },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道〈悲〉「……世の中の理不尽を、一人で背負って行きおった。わしら坊主より、よほど仏に近い」'] },
  // 入れ違いに、飛脚が橋を渡って駆けてくる
  actor('osakaHikyaku', 'npc_hikyaku', 26, 13, 'up'),
  // 主人公の 2 マス手前（26, 6）で止まる
  walk('osakaHikyaku', 'uuuuuuu'),
  { type: 'say', lines: ['飛脚「旅の衆！ 霞というお人から、文をお預かりしてまいりやした！」'] },
  walk('osakaHikyaku', 'ddddddd'),
  vanish('osakaHikyaku'),
  {
    type: 'say',
    lines: [
      '{hero}「霞からだ。……『江戸への知らせは済んだ。広島で待つ。南蛮のからくりの出どころを、長崎まで追う』」',
      '{hero}「西国街道を西へ、広島で霞と落ち合おう」',
    ],
    linesF: [
      '{hero}「霞からだよ。……『江戸への知らせは済んだ。広島で待つ。南蛮のからくりの出どころを、長崎まで追う』」',
      '{hero}「西国街道を西へ、広島で霞と落ち合おう」',
    ],
  },
  ...partyIn('gendo'),
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'chapter5Cleared' },
];

/**
 * 広島に初めて入ったとき（第 6 章の始まり）。霞が戻ってくる。
 * 東の入口（40, 13。全滅時の戻り先は 38, 14）のそばの橋（33〜34, 13）の東のたもと（35, 14）で、霞が欄干にもたれて待っている。
 */
const HIROSHIMA_ARRIVE: EventStep[] = [
  face('hero', 'left'),
  actor('kasumi', 'kasumi', 35, 14, 'up'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「川がいくつにも分かれて、どこもかしこも橋だらけの町だねえ」'] },
  { type: 'say', lines: ['霞「遅かったじゃないか。くたばってなくて何よりだよ」'] },
  faceTo('kasumi', 'hero'),
  faceTo('orin', 'kasumi'),
  { type: 'say', lines: ['お凛「霞！ 江戸はどうだったんだい」'] },
  {
    type: 'say',
    lines: [
      '霞「……上役は動かなかった。鷲尾の手は、公儀隠密の頭にまで回ってる。あたしの知らせは、握りつぶされたよ」',
      '霞「でも、ただで帰ってきたわけじゃない。からくりの出どころを突き止めた」',
      '霞「長崎だ。出島のオランダ商館から、南蛮の機械学の書が密かに持ち出されてる。持ち出したのは、出島で学んだ蘭学者らしい」',
    ],
  },
  partyOut('gendo'),
  faceTo('gendo', 'kasumi'),
  { type: 'say', lines: ['玄道「からくりの源流を断てば、鷲尾の兵も増やせぬというわけか」'] },
  { type: 'say', lines: ['霞「そういうこと。西国街道を西へ、長崎まで。……また、よろしく頼むよ」'] },
  // 玄道が先に戻る（主人公の下に出た玄道のマスを、霞が通らないように）
  ...partyIn('gendo'),
  // 霞は橋のたもとから主人公のところへ歩いてきて、一行に戻る
  ...partyIn('kasumi'),
  // 広島に着くのは第 5 章の終わりに兵庫が抜けた 3 人のときだけなので、満員で rejoin が空振りすることはない。
  // 仲間の人数の決まりが変わって満員になりうるなら、イベントに「仲間がいるか」の条件を足して、戻れたときだけフラグを立てる
  { type: 'rejoin', member: 'kasumi' },
  { type: 'say', lines: ['霞が一行に戻った！'] },
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'kasumiRejoined' },
];

/**
 * 長崎に初めて入ったとき。東の入口（42, 13）から入る（長崎に着く前は、全滅しても長崎には戻らない）。
 * 入口の西の通り（x = 33〜43、y = 13 の 1 マス幅の道）で、オランダ人と荷を担いだ人足が湊のほうへ歩いていく。
 */
const NAGASAKI_ARRIVE: EventStep[] = [
  // 町のほう（西）を向く。道が 1 マス幅なので、仲間は主人公の東（入口）と西に一人ずつ出る
  face('hero', 'left'),
  actor('nagasakiOranda', 'npc_oranda', 39, 13, 'right'),
  actor('nagasakiNinsoku', 'npc_ninsoku', 38, 13, 'right'),
  { type: 'say', lines: ['人足「カピタンさまのお荷物は、出島まで運びますけん。ほかに、なんか言いつけはなかですか」'] },
  faceTo('nagasakiOranda', 'nagasakiNinsoku'),
  { type: 'say', lines: ['オランダ人「ヤア。……ダンキュウ」'] },
  // 二人は、湊のほうへ坂を下りていく
  { type: 'walk', who: 'nagasakiNinsoku', path: 'llllll', wait: false },
  walk('nagasakiOranda', 'llllll'),
  vanish('nagasakiOranda'),
  vanish('nagasakiNinsoku'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「今の人、髪がお天道さまみたいな色だったね。……異国の言葉が、そこらじゅうで飛び交ってるよ」'] },
  partyOut('kasumi'),
  faceTo('kasumi', 'hero'),
  {
    type: 'say',
    lines: [
      '霞「ここが長崎さ。湊の先の、扇の形をした小さな島が出島だよ」',
      '霞「出島の通詞に話を聞こう。書が消えた蔵のことを、いちばんよく知ってるはずだ」',
    ],
  },
  ...partyIn('kasumi'),
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'nagasakiArrived' },
];

/**
 * 南蛮大筒からくりを倒して長崎に戻ったとき（第 6 章の終わり）。北前船で金沢へ向かう（第 7 章への導線）。
 * 東の入口（42, 13）、全滅時の戻り先（29, 9）、熊本からの渡し船の着く湊（14, 22）のどこでも始まるので、決まった場所に人は出さず、仲間だけで話す。
 * 船には、湊の北前船の船頭（kitamaeSendo、13, 22）に話して乗る。
 */
const NAGASAKI_CHAPTER_END: EventStep[] = [
  // 熊本からの渡し船の着く湊（14, 22）は、隣の空いたマスが東の 1 つしかない（西には北前船の船頭が立つ）。どこで始まっても重ならないよう、仲間は一人ずつ出て戻る
  face('hero', 'left'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「研究所から持ってきた蘭斎の帳面を読んだよ。研究所のからくりは、加賀の金沢にも送られてる」',
      '霞「加賀じゃ、殿様が病で伏せってることになってる。……だけど、人前に出てくる殿様は、顔色ひとつ変えないんだってさ」',
    ],
  },
  ...partyIn('kasumi'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「からくりの影武者か。江戸で鷲尾が将軍にしておることの、試しかもしれんな」'] },
  ...partyIn('gendo'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「だったら、金沢で尻尾をつかんでやろうじゃないか」'] },
  ...partyIn('orin'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: ['霞「ちょうど湊に、加賀へ回る北前船が入ってるって話だよ。日本海をぐるりと回って、加賀の湊まで運んでくれるはずさ」'],
  },
  {
    type: 'say',
    lines: ['{hero}「蘭斎さんから預かった祝詞もある。湊の船頭に頼んで、北の海を渡って金沢へ乗りこもうじゃねえか」'],
    linesF: ['{hero}「蘭斎さんから預かった祝詞もある。湊の船頭に頼んで、北の海を渡って金沢へ乗りこもうじゃないか」'],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'chapter6Cleared' },
];

/** 長崎の湊の北前船の船頭。第 6 章を終えると金沢へ渡れる。一度金沢に着いたら、あとは船旅を省いて湊から湊へ。 */
const KITAMAE_NAGASAKI: EventStep[] = [
  {
    type: 'if',
    flag: 'chapter6Cleared',
    then: [
      {
        type: 'if',
        flag: 'kanazawaArrived',
        then: [
          {
            type: 'choice',
            prompt: '船頭「金沢へ渡るかね？」',
            options: [
              {
                label: '金沢へ渡る',
                steps: [
                  { type: 'say', lines: ['船頭「よっしゃ、帆を上げえ！ 日本海をぐるりと回って、加賀の金石の湊まで送っちゃるけえ」'] },
                  { type: 'warp', mapId: 'kanazawa', x: 4, y: 22 },
                ],
              },
              { label: 'やめておく', steps: [{ type: 'say', lines: ['船頭「気が向いたら、いつでも声をかけんさい」'] }] },
            ],
          },
        ],
        else: [
          { type: 'say', lines: ['船頭「金沢へ行くんなら、わしの船に乗りんさい。海はしけとるが、北前船の船乗りをなめちゃいかんよ」'] },
          {
            type: 'choice',
            prompt: '北前船に乗るか？',
            options: [
              {
                label: '乗る',
                steps: [
                  { type: 'say', lines: ['船頭「よっしゃ、帆を上げえ！ 加賀の湊まで、十日の船旅じゃ」'] },
                  // 船に乗ったときだけ、甲板で船出の場面を出す（屋形から甲板へ出たときは出さない。KITAMAE_ENTER）
                  { type: 'setFlag', flag: 'kitamaeSetSail' },
                  { type: 'warp', mapId: 'kitamaebune', x: 11, y: 10 },
                ],
              },
              { label: 'まだ乗らない', steps: [{ type: 'say', lines: ['船頭「支度ができたら声をかけんさい。荷を積んで待っとるけえ」'] }] },
            ],
          },
        ],
      },
    ],
    else: [{ type: 'say', lines: ['船頭「わしは北前船の船頭じゃ。蝦夷地まで、日本の海をぐるりと回るんよ。……今は荷待ちで、しばらく出られん」'] }],
  },
];

/**
 * 北前船に乗ったとき（第 7 章の始まり）。長崎の船頭に乗せてもらったとき（kitamaeSetSail）だけ船出の場面を出す。
 * 甲板の屋形（src/data/buildingsOuter.ts）から甲板へ出たときもマップに入り直すので、そのときは出さない。
 * 船出の場面では、主人公は甲板の屋形の戸の東 (11, 10) にいる（KITAMAE_NAGASAKI の warp）。船頭が屋形の戸 (9, 10) から出てきて話し、屋形へ戻る。
 */
const KITAMAE_ENTER: EventStep[] = [
  {
    type: 'if',
    flag: 'kitamaeSetSail',
    then: [
      face('hero', 'left'),
      actor('kitamaeSendoE', 'npc_sendo', 9, 10, 'right'),
      walk('kitamaeSendoE', 'r'),
      {
        type: 'if',
        flag: 'kitamaeBoarded',
        then: [{ type: 'say', lines: ['船頭「さあ、もういっぺん北の海へ漕ぎ出すで。船首の化け物には、よう気をつけんさいよ」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '船頭「長崎の湊を出たら、玄界灘から日本海へ抜けて、西風を帆にはらんで北へ北へと上るんよ」',
              '船頭「船首の方へは近寄りなさんな。このあたりの海は、夜になると出るけえのう」',
            ],
          },
          partyOut('orin'),
          faceTo('orin', 'kitamaeSendoE'),
          { type: 'say', lines: ['お凛「出るって、何がだい」', '船頭「……船幽霊じゃ」'] },
          ...partyIn('orin'),
          { type: 'setFlag', flag: 'kitamaeBoarded' },
        ],
      },
      walk('kitamaeSendoE', 'l'),
      vanish('kitamaeSendoE'),
      { type: 'setFlag', flag: 'kitamaeSetSail', value: false },
    ],
  },
];

/**
 * 加賀金沢に初めて入ったとき。北前船で金石の湊 (4, 22) に着いたところで始まる（町に入る道は、第 7 章を終えるまで湊だけ）。
 * 湊の桟橋の主人公の隣には、空いたマスが 3 つ（西・東・南）あるので、仲間 3 人が並んで出る。
 */
const KANAZAWA_ARRIVE: EventStep[] = [
  face('hero', 'right'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「ここが加賀金沢。百万石の御城下さ。……雪が積もってるね」',
      '霞「殿様は病で伏せってることになってる。それなのに、ときどき櫓から手を振る姿が見えるらしい」',
    ],
  },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「顔色ひとつ変えずに、な。からくりの影武者なら、それも道理よ」'] },
  partyOut('orin'),
  { type: 'say', lines: ['お凛「でも、どうやって確かめるんだい。お城には入れてもらえないだろう」'] },
  faceTo('kasumi', 'orin'),
  { type: 'say', lines: ['霞「殿様に古くから仕えた老臣が、ご家老に疎まれて屋敷に引きこもってるって聞いた。長町の武家屋敷だ。まずはそこを訪ねよう」'] },
  ...partyIn('orin'),
  ...partyIn('gendo'),
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'kanazawaIntro' },
];

/**
 * 殿様を救い出して金沢に戻ったとき（第 7 章の終わり）。座敷牢から城の門の前 (28, 15) へ warp したところで始まる（tonoRescue）。
 * 殿様は城の門 (28, 13。鍵をかけた戸で人は立てない) の前の橋 (28, 14) に立っている。家臣が東の通りから玄蕃を捕らえた知らせを持って駆けてきて (29, 16)、
 * 長瀬左近も東の通りから歩いてくる (29, 15)。主人公の隣は西に門番 (27, 15)、北に殿様が立ち、左近が来たあとは東もふさがって空いたマスは南の 1 つになる。
 * どの時点でも重ならないよう、仲間は一人ずつ出て戻る（左近が来る前の霞は東、来たあとの玄道・お凛は南に出る）。
 */
const KANAZAWA_CHAPTER_END: EventStep[] = [
  face('hero', 'up'),
  actor('kanazawaTono', 'kagaTono', 28, 14, 'down'),
  actor('kanazawaKashin', 'npc_yakunin', 33, 16, 'left'),
  walk('kanazawaKashin', 'llll'),
  faceTo('kanazawaKashin', 'kanazawaTono'),
  {
    type: 'say',
    lines: [
      '家臣「殿！ ご家老・土橋玄蕃を捕らえましたぞ。からくりの影武者のことを問いただすと、ひと言も申し開きができませなんだ」',
      '殿様「うむ。……玄蕃は白状した。からくりの影武者は、江戸の老中・鷲尾但馬守の差し金。加賀は、その試しに使われたのだと」',
      '殿様「そなたたちのおかげで、加賀は救われた。礼を言う」',
      '殿様「鷲尾は、江戸城でも同じことをしておる。……上様のお姿を、もう一年も、誰もまともに見ておらぬのだ」',
    ],
  },
  partyOut('kasumi'),
  faceTo('kasumi', 'kanazawaTono'),
  { type: 'say', lines: ['霞「やっぱり……将軍様の影武者を操ってるのは、鷲尾だ」'] },
  ...partyIn('kasumi'),
  {
    type: 'say',
    lines: ['殿様「この手形を持っていくがよい。加賀百万石の名にかけて、江戸の御城の門をくぐれるようにしてある」', '{hero}たちは、加賀の殿様から江戸城の手形を授かった！'],
  },
  actor('kanazawaSakon', 'sakon', 33, 15, 'left'),
  walk('kanazawaSakon', 'llll'),
  { type: 'say', lines: ['長瀬左近「殿のお顔が、ようやく笑うてくだされた。……わしからも、これを」', '長瀬左近から 3000 文を受け取った。'] },
  { type: 'giveMoney', amount: 3000 },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「夜叉丸の娘は、江戸の鷲尾の屋敷か。……約束は、果たさねばならんな」'] },
  ...partyIn('gendo'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「行こう、江戸へ。おとっつぁんの仇の、そのまた親玉のところへ」'] },
  ...partyIn('orin'),
  {
    type: 'say',
    lines: [
      '殿様「待たれよ。手形はあっても、今の江戸の御城は鷲尾の手の者で固められておる。今すぐ門を叩くのは危うい。折を待たねばなるまい」',
      '殿様「それに、鷲尾の手は東北の藩にも伸びておると聞く。江戸へ入る前に、奥州の仙台を訪ねてはくれぬか」',
      '殿様「北国街道を東へ越えれば、陸路で仙台に出られる。伊達の家中で何が起きておるか、確かめてからでも遅くはあるまい」',
    ],
  },
  // 殿様は城の中へ戻り、家臣と左近は東の通りへ帰っていく
  vanish('kanazawaTono'),
  walk('kanazawaKashin', 'rrrr'),
  vanish('kanazawaKashin'),
  walk('kanazawaSakon', 'rrrr'),
  vanish('kanazawaSakon'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: [
      '霞「仙台なら、伊達の殿様の御側役の片平帯刀さまがいる。あたしの江戸の上役ともつながりのある味方だ。江戸の様子も、そこで聞けるはずだよ」',
      '霞「東の外れの番人も、もう通してくれるはずだ。北国街道を東へ、仙台へ向かおう」',
    ],
  },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'kagaTegata' },
  { type: 'setFlag', flag: 'chapter7Cleared' },
];

/**
 * 仙台に初めて入ったとき（第 8 章の始まり）。東の入口 (50, 18) から入ったところで始まる（全滅後の戻り先は sendaiIntro のあと）。
 * 入口の隣は西・北・南が空いているので、霞と玄道が並んで出る。
 */
const SENDAI_ARRIVE: EventStep[] = [
  face('hero', 'left'),
  partyOut('kasumi'),
  {
    type: 'say',
    lines: ['霞「雪の峠を越えて、やっと奥州の仙台だ。……加賀の殿様の話じゃ、鷲尾の手は東北の藩にも伸びてるらしい」'],
  },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「伊達の家中にも、加賀と同じ企みがあるやもしれんな」'] },
  faceTo('kasumi', 'gendo'),
  { type: 'say', lines: ['霞「殿様の御側役の片平帯刀さまは、江戸の上役と通じてる。片平丁のお屋敷を訪ねよう」'] },
  ...partyIn('gendo'),
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'sendaiIntro' },
];

/**
 * 寄り道の浜松に初めて入ったとき。凧揚げ合戦の支度でにぎわう町。
 * 浜松へは第 2 章から（第 5 章で霞が抜けている間にも）来られ、そろっている仲間が決まらないので、台詞は主人公と町の人だけにする。
 */
const HAMAMATSU_ARRIVE: EventStep[] = [
  // 東の入口 (50, 12) から入ったところで始まる（全滅後の戻り先は hamamatsuIntro のあと）。凧を抱えた町人が通りを歩いてくる
  face('hero', 'left'),
  actor('hamamatsuChonin', 'npc_ninsoku', 45, 12, 'right'),
  walk('hamamatsuChonin', 'rrrr'),
  {
    type: 'say',
    lines: [
      '町人「おや、旅のお方。浜松へようこそ。北の丘に見えるのが、浜松のお城の石垣さ」',
      '町人「町のあちこちで、畳より大きな四角い凧に、町ごとの印を描いてるだろう。もうすぐ中田島の砂丘で凧揚げ合戦があるんだ」',
      '町人「跡取りの男の子が生まれた家は、名前を書いた初凧を揚げて祝うのさ」',
      '{hero}「にぎやかな町だな。ちょいと寄っていくか」',
    ],
    linesF: [
      '町人「おや、旅のお方。浜松へようこそ。北の丘に見えるのが、浜松のお城の石垣さ」',
      '町人「町のあちこちで、畳より大きな四角い凧に、町ごとの印を描いてるだろう。もうすぐ中田島の砂丘で凧揚げ合戦があるんだ」',
      '町人「跡取りの男の子が生まれた家は、名前を書いた初凧を揚げて祝うのさ」',
      '{hero}「にぎやかな町だね。ちょいと寄っていこうか」',
    ],
  },
  walk('hamamatsuChonin', 'llll'),
  vanish('hamamatsuChonin'),
  { type: 'setFlag', flag: 'hamamatsuIntro' },
];

/** 若衆頭の源太の頼み。松林の浪人たちに奪われた初凧を取り返してほしい（hamamatsuTakoAsked）。 */
const HAMAMATSU_TAKO_ASK: EventStep[] = [
  {
    type: 'say',
    lines: [
      '若衆頭の源太「おう、旅の人。腕っぷしが強そうだな。ひとつ頼まれちゃくれねえか」',
      '源太「町の大工の棟梁に、初めての男の子が生まれてな。凧師の弥平じいさんが、名前入りの初凧を張ってくれたんだ」',
      '源太「ところが試し揚げの最中に糸が切れて、凧は砂丘の西の松林へ落ちちまった」',
      '源太「取りに行った若いのが、松林にたむろする浪人と雲助に追い返されてな。返してほしけりゃ酒手を出せと、ぬかしやがる」',
      '源太「合戦は明日だ。初凧が揚がらなきゃ、喜之助坊の祝いが台無しよ」',
      '{hero}「わかった。凧はあっしが取り返してこよう」',
      '源太「ありがてえ！ 松林は、この砂丘を西へ行った奥だ」',
    ],
    linesF: [
      '若衆頭の源太「おう、旅の人。腕っぷしが強そうだな。ひとつ頼まれちゃくれねえか」',
      '源太「町の大工の棟梁に、初めての男の子が生まれてな。凧師の弥平じいさんが、名前入りの初凧を張ってくれたんだ」',
      '源太「ところが試し揚げの最中に糸が切れて、凧は砂丘の西の松林へ落ちちまった」',
      '源太「取りに行った若いのが、松林にたむろする浪人と雲助に追い返されてな。返してほしけりゃ酒手を出せと、ぬかしやがる」',
      '源太「合戦は明日だ。初凧が揚がらなきゃ、喜之助坊の祝いが台無しよ」',
      '{hero}「わかったよ。凧はあたしが取り返してくる」',
      '源太「ありがてえ！ 松林は、この砂丘を西へ行った奥だ」',
    ],
  },
  { type: 'setFlag', flag: 'hamamatsuTakoAsked' },
];

/**
 * 凧の糸巻きを渡す（hamamatsuTakoDone）。持ちきれなければ渡さず、また話しかけたときに受け取れる。
 * 持ちきれないときの台詞は、その場にいる人が言う（合戦の場面では弥平、あとで源太に話しかけたときは源太）。
 */
function hamamatsuTakoReward(ifFullLine: string): EventStep[] {
  return [
    { type: 'giveItem', item: 'takoItomaki', ifFull: [{ type: 'say', lines: [ifFullLine] }, { type: 'end' }] },
    { type: 'say', lines: ['凧の糸巻きを受け取った。'] },
    { type: 'setFlag', flag: 'hamamatsuTakoDone' },
  ];
}

/**
 * 初凧を源太に届けたあとの凧揚げ合戦。隣町の凧と糸を絡ませる「糸切り合戦」で、引けば隣町の糸を切って源太から祝儀（200 文）、
 * 繰り出せば勝負はつかない。どちらでも初凧は揚がり、弥平からお礼を受け取る（hamamatsuTakoFlown → hamamatsuTakoDone）。
 */
const HAMAMATSU_TAKO_GASSEN: EventStep[] = [
  { type: 'say', lines: ['源太「おお、初凧だ！ 破れもねえ。弥平じいさん、糸目を付け直してくれ！」'] },
  // 凧師の弥平が砂丘の東から歩いてくる（源太は 28, 29。主人公は源太の隣に立っている）
  actor('yahei', 'npc_rojin', 32, 29, 'left'),
  walk('yahei', 'll'),
  // 隣町の若衆（34, 30）は、砂丘の東で自分の町の凧の糸を握っている
  faceTo('tonariWakashu', 'genta'),
  {
    type: 'say',
    lines: [
      '凧師の弥平「任せておけ。……よし、揚げるぞ！」',
      '源太「揚がった揚がった！ 見ろ、初凧が砂丘の風をつかんだぜ！」',
      '隣町の若衆「へへっ、こっちも揚げるぜ！ 糸と糸を擦り合わせて切る、糸切り合戦だ！」',
      '源太「旅の人、糸を持ってくれ！ 隣町の凧が、上から糸をかぶせてきやがった！」',
    ],
  },
  {
    type: 'choice',
    prompt: '糸をどうする？',
    options: [
      {
        label: 'ぐいぐい引く',
        steps: [
          {
            type: 'say',
            lines: [
              'ギリ、ギリギリ……プツッ！',
              '隣町の若衆「あああっ、おれたちの糸が！」',
              '源太「やった！ 隣町の凧が、海の方へ流れていくぜ！ こいつは合戦の祝儀だ、取っといてくれ」',
            ],
          },
          { type: 'giveMoney', amount: 200 },
          { type: 'say', lines: ['200 文を受け取った。'] },
        ],
      },
      {
        label: '一気に繰り出す',
        steps: [
          {
            type: 'say',
            lines: [
              '隣町の若衆「ちぇっ、糸を緩めて逃げやがった。勝負はお預けだな」',
              '源太「ははっ、逃げるが勝ちってか。糸は切れずにすんだ。初凧が無事ならそれで十分よ」',
            ],
          },
        ],
      },
    ],
  },
  faceTo('yahei', 'hero'),
  {
    type: 'say',
    lines: [
      '弥平「見なされ、初凧が砂丘の空でいちばん高う揚がっておる。浜の衆も大喜びじゃ」',
      '弥平「旅のお方、ありがとうよ。これは、わしが使うておった凧の糸巻きじゃ」',
      '弥平「長年、遠州の空っ風に耐えてきた糸巻きでな。持っておれば、足が軽うなるぞ」',
    ],
  },
  // 持ち物がいっぱいで受け取れなかったとき、次に話しかけても合戦の場面を繰り返さない
  { type: 'setFlag', flag: 'hamamatsuTakoFlown' },
  ...hamamatsuTakoReward('弥平「……おや、荷物がいっぱいのようじゃな。源太に預けておくから、また寄っておくれ」'),
];

/**
 * 寄り道の彦根に初めて入ったとき。琵琶湖のほとりの井伊家の城下町。
 * 彦根へは第 3 章から（第 5 章で霞が抜けている間にも）来られ、そろっている仲間が決まらないので、台詞は主人公と町の人だけにする。
 */
const HIKONE_ARRIVE: EventStep[] = [
  // 東の入口 (50, 12) から入ったところで始まる（全滅後の戻り先は hikoneIntro のあと）。
  // 朱の具足の侍が北の通りを西の城の門へ歩いていき、町人が主人公のところへ来て話す
  face('hero', 'left'),
  actor('hikoneSamurai', 'npc_yakunin', 48, 10, 'left'),
  actor('hikoneChonin', 'npc_ninsoku', 45, 12, 'right'),
  { type: 'walk', who: 'hikoneSamurai', path: 'llllll', wait: false },
  walk('hikoneChonin', 'rrrr'),
  {
    type: 'say',
    lines: [
      '町人「旅のお方、彦根は初めてかい。西に光ってるのが琵琶湖、湖のほとりの丘の上が彦根のお城さ」',
      '町人「今通ったお侍、具足の紐も刀の鞘も朱の色だったろう。井伊の御家中は、赤備えといってな。戦の具足を朱一色にそろえるのが自慢なのさ」',
      '{hero}「赤鬼の城下ってわけか。ちょいと寄っていくか」',
    ],
    linesF: [
      '町人「旅のお方、彦根は初めてかい。西に光ってるのが琵琶湖、湖のほとりの丘の上が彦根のお城さ」',
      '町人「今通ったお侍、具足の紐も刀の鞘も朱の色だったろう。井伊の御家中は、赤備えといってな。戦の具足を朱一色にそろえるのが自慢なのさ」',
      '{hero}「赤鬼の城下ってわけだね。ちょいと寄っていこうか」',
    ],
  },
  vanish('hikoneSamurai'),
  walk('hikoneChonin', 'llll'),
  vanish('hikoneChonin'),
  { type: 'setFlag', flag: 'hikoneIntro' },
];

/** 具足師の甚兵衛の頼み。工房から盗まれた赤備えの具足を探してほしい（hikoneGusokuAsked）。 */
const HIKONE_GUSOKU_ASK: EventStep[] = [
  {
    type: 'say',
    lines: [
      '具足師の甚兵衛「……旅のお方。腕に覚えがおありなら、どうか話を聞いてくだせえ」',
      '甚兵衛「わしは御家中の具足の修理を請け負う具足師。足軽組頭の大庭さまから、赤備えの具足の塗り直しを預かっておりやした」',
      '甚兵衛「ところが一昨日の晩、その具足が櫃ごと盗まれたんでさ。三日後には、殿の御前で具足揃えがあるってえのに……」',
      '甚兵衛「長屋のおかみさんが、夜更けに櫃を担いで佐和山へ行く男を見たそうで。けど佐和山は、負け戦の侍の亡霊が出るってえ噂の山だ。誰も行きたがらねえ」',
      '{hero}「わかった。具足はあっしが取り返してこよう」',
      '甚兵衛「ありがてえ……！ 佐和山へは、長屋の南の道を抜けて東の山道を登ってくだせえ」',
    ],
    linesF: [
      '具足師の甚兵衛「……旅のお方。腕に覚えがおありなら、どうか話を聞いてくだせえ」',
      '甚兵衛「わしは御家中の具足の修理を請け負う具足師。足軽組頭の大庭さまから、赤備えの具足の塗り直しを預かっておりやした」',
      '甚兵衛「ところが一昨日の晩、その具足が櫃ごと盗まれたんでさ。三日後には、殿の御前で具足揃えがあるってえのに……」',
      '甚兵衛「長屋のおかみさんが、夜更けに櫃を担いで佐和山へ行く男を見たそうで。けど佐和山は、負け戦の侍の亡霊が出るってえ噂の山だ。誰も行きたがらねえ」',
      '{hero}「わかったよ。具足はあたしが取り返してくる」',
      '甚兵衛「ありがてえ……！ 佐和山へは、長屋の南の道を抜けて東の山道を登ってくだせえ」',
    ],
  },
  { type: 'setFlag', flag: 'hikoneGusokuAsked' },
];

/** 甚兵衛のお礼の赤備えの籠手を渡す（hikoneGusokuDone）。持ちきれなければ渡さず、また話しかけたときに受け取れる。 */
const HIKONE_GUSOKU_REWARD: EventStep[] = [
  {
    type: 'giveItem',
    item: 'akazonaeKote',
    ifFull: [{ type: 'say', lines: ['甚兵衛「……おや、荷物がいっぱいのようで。籠手は工房で預かっておきやすから、また寄ってくだせえ」'] }, { type: 'end' }],
  },
  { type: 'say', lines: ['赤備えの籠手を受け取った。'] },
  { type: 'setFlag', flag: 'hikoneGusokuDone' },
];

/** 取り返した具足を甚兵衛に届けたとき。大庭が礼に来て、甚兵衛からお礼を受け取る（hikoneGusokuReturned → hikoneGusokuDone）。 */
const HIKONE_GUSOKU_RETURN: EventStep[] = [
  { type: 'say', lines: ['甚兵衛「おお……！ この朱の色、間違いねえ、大庭さまの具足だ！ 傷ひとつねえ」'] },
  // 朱の羽織の大庭が工房の戸口 (11, 7) から入ってきて、甚兵衛（5, 3）の右下 (6, 4) まで歩く（主人公は甚兵衛の隣に立っている）
  actor('oba', 'npc_yakunin', 11, 7, 'left'),
  walk('oba', 'lllluuul'),
  faceTo('jinbei', 'oba'),
  {
    type: 'say',
    lines: [
      '大庭「御免。足軽組頭の大庭弥九郎である。甚兵衛、具足が盗まれたと聞いたが……おお、ここにあるではないか」',
      '甚兵衛「へえ。こちらの旅のお方が、佐和山の盗人から取り返してくだすったんで」',
    ],
  },
  faceTo('oba', 'hero'),
  {
    type: 'say',
    lines: [
      '大庭「そうであったか。この具足は、祖父が大坂の陣で着て戦ったもの。失えば、ご先祖に顔向けができぬところであった。かたじけない」',
      '大庭「甚兵衛、具足揃えを楽しみにしておるぞ」',
    ],
  },
  walk('oba', 'rdddrrrr'),
  vanish('oba'),
  faceTo('jinbei', 'hero'),
  {
    type: 'say',
    lines: ['甚兵衛「具足揃えまでには、きっちり塗り上げてみせやす。……旅のお方、これはわしが朱を塗った籠手でさ。せめてものお礼に、持っていってくだせえ」'],
  },
  // 持ち物がいっぱいで受け取れなかったとき、次に話しかけても届けた場面を繰り返さない
  { type: 'setFlag', flag: 'hikoneGusokuReturned' },
  ...HIKONE_GUSOKU_REWARD,
];

/**
 * 寄り道の熊本に初めて入ったとき。島原の湊から渡し船で有明の海を渡り、川尻の湊に着く。
 * 熊本へは第 6 章で島原の古城の手がかりを得たあと（shimabaraOpen）からで、そのときの仲間は霞・玄道・お凛と決まっているので、仲間の台詞を入れる。
 */
const KUMAMOTO_ARRIVE: EventStep[] = [
  // 渡し船で川尻の湊 (5, 32) に着いたところで始まる（町に入る道は湊だけ。全滅後の戻り先は kumamotoIntro のあと）。
  // 渡し船の船頭（3, 32）が見送り、空の桶を抱えたおかみが通りを歩いてきて、ため息をついて帰っていく
  face('hero', 'left'),
  { type: 'say', lines: ['船頭「着いたで。ここが肥後熊本の川尻の湊じゃ。北の丘に見えとるのが、熊本のお城じゃけん」'] },
  face('hero', 'up'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「あれが熊本の城か。石垣が上へいくほど反り返って、まるで崖のようじゃ。清正公が築いた、天下の名城よ」'] },
  ...partyIn('gendo'),
  actor('kawashiriOkami', 'npc_okami', 12, 32, 'left'),
  walk('kawashiriOkami', 'lll'),
  { type: 'say', lines: ['おかみ「はあ……今日も井戸の水は、桶に半分きりかね」'] },
  walk('kawashiriOkami', 'rrr'),
  vanish('kawashiriOkami'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「……なんだか町の人たち、桶を抱えて浮かない顔をしてるね」'] },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「長崎から目と鼻の先だ。鷲尾の手がここまで伸びてないか、様子を見ておこう」'] },
  ...partyIn('kasumi'),
  ...partyIn('orin'),
  { type: 'setFlag', flag: 'kumamotoIntro' },
];

/** 井戸掘りの茂作の頼み。城下の井戸が涸れていくわけを、清正の古井戸の底で確かめてほしい（kumamotoIdoAsked）。 */
const KUMAMOTO_IDO_ASK: EventStep[] = [
  {
    type: 'say',
    lines: [
      '井戸掘りの茂作「……旅のお方。ちょいと、この井戸をのぞいてみてくだせえ」',
      '井戸の底に、わずかな水が濁って溜まっている。',
      '茂作「十日ほど前から、城下の井戸という井戸が、日ごとに細っていくんでさ。水前寺の池の湧き水まで減っちまった」',
      '茂作「清正公は、お城に百二十もの井戸を掘らせなすった。籠城しても水に困らねえようにってな。城下の井戸も、みんな同じ地の下の水脈から水をもらっとる」',
      '茂作「その水脈の上に、清正公の古井戸がある。お城の北東の、大銀杏の根元のやつでさ。夜になると、あの井戸の底から、ごうん、ごうんと鉄の鳴るような音がするんで」',
    ],
  },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「鉄の鳴る音……からくりか」'] },
  ...partyIn('kasumi'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「城の水の手を断てば、どんな名城も籠城はできぬ。戦の前に、まず井戸を枯らすのは古い手よ」'] },
  ...partyIn('gendo'),
  {
    type: 'say',
    lines: ['{hero}「わかった。古井戸の底は、あっしらが見てこよう」', '茂作「ありがてえ……！ 古井戸には石段が切ってありやす。足もとに気をつけてくだせえ」'],
    linesF: ['{hero}「わかったよ。古井戸の底は、あたしらが見てくる」', '茂作「ありがてえ……！ 古井戸には石段が切ってありやす。足もとに気をつけてくだせえ」'],
  },
  { type: 'setFlag', flag: 'kumamotoIdoAsked' },
];

/** 茂作のお礼の肥後象嵌の鍔を渡す（kumamotoIdoDone）。持ちきれなければ渡さず、また話しかけたときに受け取れる。 */
const KUMAMOTO_IDO_REWARD: EventStep[] = [
  {
    type: 'giveItem',
    item: 'higoZoganTsuba',
    ifFull: [{ type: 'say', lines: ['茂作「……おや、荷物がいっぱいのようで。鍔はあっしが預かっときやすから、また寄ってくだせえ」'] }, { type: 'end' }],
  },
  { type: 'say', lines: ['肥後象嵌の鍔を受け取った。'] },
  { type: 'setFlag', flag: 'kumamotoIdoDone' },
];

/** 古井戸の底のからくりを壊したあと、茂作に知らせたとき（kumamotoIdoReturned → kumamotoIdoDone）。 */
const KUMAMOTO_IDO_RETURN: EventStep[] = [
  { type: 'say', lines: ['茂作「おお……見てくだせえ！ 井戸の水が、底からどんどん湧いてきやがる！」'] },
  {
    type: 'say',
    lines: ['{hero}「古井戸の底の水脈に、からくりが仕掛けてあった。鷲尾の手の者が、水を吸い上げて岩の割れ目へ捨ててやがったのさ。からくりは叩き壊してきたぜ」'],
    linesF: ['{hero}「古井戸の底の水脈に、からくりが仕掛けてあったのさ。鷲尾の手の者が、水を吸い上げて岩の割れ目へ捨ててたんだよ。からくりは叩き壊してきた」'],
  },
  // 井戸端の町娘（37, 22）と老女（44, 23）が、茂作（40, 22）のほうを向いて喜ぶ
  faceTo('idobataMusume', 'mosaku'),
  faceTo('idobataRoba', 'mosaku'),
  { type: 'say', lines: ['町娘「水だ！ 水が戻ってきたよ！ 桶を持ってきて！」', '老女「ありがたや、ありがたや……これで飯が炊ける」'] },
  { type: 'say', lines: ['茂作「水脈の水を、からくりで吸い上げて捨てていた……ですかい。鷲尾とかいう老中の手の者が、そんなことを」'] },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「熊本の城は、西国でいちばんの備えだ。城が水を失えば、肥後の殿様は鷲尾に逆らえなくなる」'] },
  ...partyIn('kasumi'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「井戸ひとつで城を落とそうなんて、汚い手を考えるもんだね」'] },
  ...partyIn('orin'),
  {
    type: 'say',
    lines: [
      '茂作「清正公の井戸を守ってくだすって、かたじけねえ。……これは、あっしの爺さまが殿様からいただいた鍔でさ。肥後の職人が、鉄に金と銀を打ち込んだもんだ」',
      '茂作「井戸掘りの手には、もったいねえ品で。どうか、旅の役に立ててくだせえ」',
    ],
  },
  // 持ち物がいっぱいで受け取れなかったとき、次に話しかけても知らせた場面を繰り返さない
  { type: 'setFlag', flag: 'kumamotoIdoReturned' },
  ...KUMAMOTO_IDO_REWARD,
];

/**
 * 寄り道の会津若松に初めて入ったとき。東の入口 (50, 13) から入ったところで始まる（全滅後の戻り先は aizuIntro のあと）。
 * 町人が通りを歩いてきて、鶴ヶ城と日新館の什のことを話す。什の少年たちが掟を唱える場面は、日新館の庭で新之助に話しかけたとき（AIZU_JUU_ASK）に見せる。
 */
const AIZU_ARRIVE: EventStep[] = [
  face('hero', 'left'),
  actor('aizuChonin', 'npc_ninsoku', 45, 13, 'right'),
  walk('aizuChonin', 'rrrr'),
  {
    type: 'say',
    lines: [
      '町人「おや、旅のお方。雪の中をよう来なすった。向こうに見える白い天守が、会津の鶴ヶ城だ」',
      '町人「城の西の日新館じゃ、藩士の子どもらが毎日、什の掟を唱えておってな。寄っていくといい」',
    ],
  },
  walk('aizuChonin', 'llll'),
  vanish('aizuChonin'),
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「江戸までの寄り道だ。鷲尾の手がここまで伸びてないか、町の様子を見ておこう」'] },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'aizuIntro' },
];

/**
 * 什長の新之助の頼み。平太が飯盛山へ行ったきり戻らないので、年長者の一行に探してほしい（aizuJuuAsked）。
 * 日新館の庭で、新之助（6, 8）と什の少年たち（4, 8・8, 8）が掟を唱えているところへ話しかける。
 */
const AIZU_JUU_ASK: EventStep[] = [
  {
    type: 'say',
    lines: [
      '少年たち「一つ、年長者の言ふことに背いてはなりませぬ。一つ、虚言を言ふ事はなりませぬ。一つ、卑怯な振舞をしてはなりませぬ……」',
      '少年たち「ならぬことはならぬものです！」',
    ],
  },
  partyOut('orin'),
  { type: 'say', lines: ['お凛「……ちっちゃいのに、えらく気合いが入ってるね」'] },
  ...partyIn('orin'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「会津の什の掟じゃな。同じ町内の藩士の子が十人ほどで組を作り、毎日ああして掟を確かめ合うのよ」'] },
  ...partyIn('gendo'),
  faceTo('shinnosuke', 'hero'),
  {
    type: 'say',
    lines: [
      '什長の新之助「旅のお方とお見受けいたします。年長者に、おたずねしたき儀がございます」',
      '新之助「わたしどもの什の平太が、今日の集まりに来ませぬ。昨日、用があると申して、日の暮れに飯盛山の方へ歩いていくのを見た者がおります」',
      '新之助「飯盛山には、このごろ送り狼が出ます。子どもだけで山に入ってはならぬと、父上たちに固く言われております」',
      '新之助「年長者の言ふことに背いてはなりませぬ。……ですから、わたしどもは探しに行けませぬ」',
      '新之助「平太が嘘をついたのなら、什の掟に背いたことになります。けれど……それでも、平太はわたしどもの什の者なのです」',
      '{hero}「わかった。年長者のあっしらが探しに行く分には、掟に背いちゃいねえだろう」',
      '新之助「かたじけのうございます！ 飯盛山は、町の東の外れの山です」',
    ],
    linesF: [
      '什長の新之助「旅のお方とお見受けいたします。年長者に、おたずねしたき儀がございます」',
      '新之助「わたしどもの什の平太が、今日の集まりに来ませぬ。昨日、用があると申して、日の暮れに飯盛山の方へ歩いていくのを見た者がおります」',
      '新之助「飯盛山には、このごろ送り狼が出ます。子どもだけで山に入ってはならぬと、父上たちに固く言われております」',
      '新之助「年長者の言ふことに背いてはなりませぬ。……ですから、わたしどもは探しに行けませぬ」',
      '新之助「平太が嘘をついたのなら、什の掟に背いたことになります。けれど……それでも、平太はわたしどもの什の者なのです」',
      '{hero}「わかったよ。年長者のあたしらが探しに行く分には、掟に背いちゃいないだろう」',
      '新之助「かたじけのうございます！ 飯盛山は、町の東の外れの山です」',
    ],
  },
  { type: 'setFlag', flag: 'aizuJuuAsked' },
];

/** 什のお礼の起き上がり小法師を渡す（aizuJuuDone）。持ちきれなければ渡さず、また話しかけたときに受け取れる。 */
const AIZU_JUU_REWARD: EventStep[] = [
  {
    type: 'giveItem',
    item: 'okiagariKoboshi',
    ifFull: [{ type: 'say', lines: ['新之助「……お荷物がいっぱいのようですね。また、お立ち寄りください」'] }, { type: 'end' }],
  },
  { type: 'say', lines: ['起き上がり小法師を受け取った。'] },
  { type: 'setFlag', flag: 'aizuJuuDone' },
];

/** 平太を連れ帰ったあと、什長の新之助の前で。平太が嘘を詫び、什の皆が看病を手伝うと決める（aizuJuuDone）。 */
const AIZU_JUU_END: EventStep[] = [
  // 日新館の庭で、連れ帰った平太（9, 8）が什の皆の前で詫びる
  faceTo('shinnosuke', 'heitaHome'),
  faceTo('juuBoy2', 'heitaHome'),
  faceTo('heitaHome', 'shinnosuke'),
  {
    type: 'say',
    lines: [
      '平太「皆、すまぬ。用があるというのは嘘だった。母上の薬を採りに、ひとりで飯盛山に入った」',
      '什の少年たち「…………」',
      '新之助「虚言を言ふ事はなりませぬ。年長者の言ふことに背いてはなりませぬ。……平太は、二つの掟に背いた」',
      '新之助「什の決まりにより、平太は皆の前で『無念でありました』と頭を下げること」',
      '平太「……無念でありました」',
      '新之助「よし。……それから、明日から什の皆で、平太の母上の看病を手伝う。困っている仲間を見捨てるのは、卑怯な振舞であろう」',
      '什の少年たち「ならぬことはならぬものです！」',
    ],
  },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「ははは。掟を守るだけでなく、掟の心まで分かっておる。会津の子は末頼もしいわ」'] },
  ...partyIn('gendo'),
  faceTo('shinnosuke', 'hero'),
  {
    type: 'say',
    lines: [
      '新之助「旅のお方、ありがとうございました。これは、わたしどもの什からのお礼です」',
      '新之助「会津の起き上がり小法師です。何度転んでも起き上がれますように」',
    ],
  },
  // 持ち物がいっぱいで受け取れなかったとき、次に話しかけても裁きの場面を繰り返さない
  { type: 'setFlag', flag: 'aizuJuuJudged' },
  ...AIZU_JUU_REWARD,
];


/**
 * 江戸に初めて入ったとき。奥州街道からの南の入口 (32, 44) から入ったところで始まる（全滅後の戻り先は edoIntro のあと）。
 * 日本橋のたもとで、町人とおかみが高札の人相書きを読み上げて去っていき、仲間が一人ずつ出て話す。
 */
const EDO_ARRIVE: EventStep[] = [
  face('hero', 'up'),
  actor('edoKosatsuChonin', 'npc_ninsoku', 31, 42, 'up'),
  actor('edoKosatsuOkami', 'npc_okami', 33, 42, 'up'),
  { type: 'say', lines: ['町人「日本橋のたもとの高札に、新しいお触れが出てるぜ。……謀反人の一行、江戸に潜伏の由。見つけ次第、届け出るべし。老中 鷲尾但馬守。……だとよ」'] },
  faceTo('edoKosatsuOkami', 'edoKosatsuChonin'),
  { type: 'say', lines: ['おかみ「人相書きまで出てるじゃないか。物騒だねえ。さ、行こう行こう」'] },
  { type: 'walk', who: 'edoKosatsuChonin', path: 'llll', wait: false },
  walk('edoKosatsuOkami', 'rrrr'),
  vanish('edoKosatsuChonin'),
  vanish('edoKosatsuOkami'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「今の人相書き……。あたしたちのことだね」'] },
  ...partyIn('orin'),
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「鷲尾に先手を打たれた。これじゃ表立っては動けない」'] },
  ...partyIn('kasumi'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「片平どのは、神田の長屋の大家・源兵衛を頼れと言っておったな」'] },
  ...partyIn('gendo'),
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「日本橋川の北の長屋だ。人目につかないうちに行こう」'] },
  ...partyIn('kasumi'),
  { type: 'setFlag', flag: 'edoIntro' },
];

/**
 * 火車からくりを倒して長屋に戻ったとき（第 8 章の終わり）。大火の町から長屋の路地 (22, 16) へ warp したところで始まる（kashaKarakuri）。
 * 小吉は北東の隣 (23, 15) に立っていて、大家の源兵衛が西の家の前 (11, 15) から路地を歩いてきて主人公の西 (21, 16) に立つ。
 * 主人公の隣で空くのは北 (22, 15) と東 (23, 16) なので、仲間は一人ずつ出て戻る。
 */
const EDO_CHAPTER_END: EventStep[] = [
  faceTo('kokichi', 'hero'),
  face('hero', 'right'),
  {
    type: 'say',
    lines: [
      '小吉「やったな！ 神田の火は消えたぜ。火消しが早く家を引き倒したおかげで、焼けたのは一町だけだ」',
    ],
  },
  walk('nagayaOoya', 'drrrrrrrrrr'),
  face('hero', 'left'),
  {
    type: 'say',
    lines: ['大家「おかえり。八百屋のお春ちゃんは、泣きながら町の衆に詫びて回ってたよ。……もう、あの子は大丈夫さ」'],
  },
  face('hero', 'right'),
  {
    type: 'say',
    lines: [
      '小吉「それより大事な話だ。火事騒ぎで、御城が門を開けて、焼け出された者を中へ入れてる」',
      '小吉「鷲尾はからくり兵で御城の奥を固めてる。だが今なら、どさくさに紛れて入り込めるぜ」',
    ],
  },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「加賀の殿様の手形もある。大手門は通れるはずだ」'] },
  ...partyIn('kasumi'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「いよいよ、鷲尾と決着をつけるときか」'] },
  ...partyIn('gendo'),
  partyOut('orin'),
  { type: 'say', lines: ['お凛「おとっつぁんの仇の、そのまた親玉だ。……行こう、江戸城へ」'] },
  ...partyIn('orin'),
  face('hero', 'left'),
  { type: 'say', lines: ['大家「これは長屋の衆からの餞別だ。持っていっておくれ」', '大家から 4000 文を受け取った。'] },
  { type: 'giveMoney', amount: 4000 },
  { type: 'setFlag', flag: 'chapter8Cleared' },
];

/**
 * 長屋の小吉が、江戸城と鷲尾の屋敷から戻ったとき。将軍がからくりであること、今夜の火付けの企みを知らせる。
 * 小吉は背にお鈴を負ぶって戻ってきたところ（お鈴はこのあと大家の家に移る。edoGenbeiIe の osuzu）。
 */
const KOKICHI_REPORT: EventStep[] = [
  {
    type: 'say',
    lines: [
      '小吉「待たせたな。夜明け前に、ようやく戻れたぜ」',
      '小吉「鷲尾の屋敷の奥の土蔵で、この子を見つけた。お鈴ちゃんだ。……背中で、ぐっすり眠ってらあ」',
    ],
  },
  partyOut('gendo'),
  faceTo('gendo', 'kokichi'),
  { type: 'say', lines: ['玄道〈悲〉「……よう眠っておる。夜叉丸よ、お鈴は無事じゃ。約束は、果たしたぞ」'] },
  ...partyIn('gendo'),
  {
    type: 'say',
    lines: [
      '小吉「それから御城だ。大広間の上座に、上様はいた。……だが、ありゃあ人じゃねえ」',
      '小吉「夜中に、鷲尾の手の者が上様の背中を開けて、ゼンマイを巻いてやがった」',
    ],
  },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「やっぱり……将軍様の影武者も、からくりだったんだ」'] },
  ...partyIn('kasumi'),
  {
    type: 'say',
    lines: [
      '小吉「それだけじゃねえ。鷲尾の手下の話を聞いちまった。今夜、江戸の町に火を放つってよ」',
      '小吉「火事の騒ぎに紛れて、からくり兵で御城を固めちまう腹らしい」',
    ],
  },
  partyOut('orin'),
  { type: 'say', lines: ['お凛〈怒〉「なんだって！ 町の人たちを巻き込むつもりかい」'] },
  ...partyIn('orin'),
  { type: 'say', lines: ['小吉「火付けの手引きに、日本橋の八百屋の娘を使うらしい。坊主に化けた手下が、何やら吹き込んでた」'] },
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「八百屋の娘か。……急ごう、日本橋川の南だ」'] },
  ...partyIn('gendo'),
  { type: 'setFlag', flag: 'kokichiReport' },
];

/**
 * 八百屋の娘お春を止める。火付け盗賊を退けると、神田から火が出る（taikaStarted。町木戸の木戸番がどく）。
 * お春は八百屋の店先 (52, 32) に座っていて、主人公はその西・東・南のどれかに立っている。
 * 火付け盗賊とからくり同心は東の通り（55〜56, 32〜34）まで駆けてきて、主人公の立つマスを通らない。火消しの頭は西の通りから (49, 33) まで駆けてくる。
 */
const OHARU_FIRE: EventStep[] = [
  {
    type: 'say',
    lines: ['{hero}「……袂の中で、何か握りしめてるな。その手の中のものを、見せちゃくれねえか」'],
    linesF: ['{hero}「……袂の中で、何か握りしめてるね。その手の中のものを、見せてくれないかい」'],
  },
  {
    type: 'say',
    lines: [
      'コトン……。',
      '{hero}「ゼンマイ仕掛けの……火付けの道具か」',
      'お春「……お寺のお坊さまがくれたの。これで火事を起こせば、また清さまに会えるって」',
      'お春「去年の火事で逃げたお寺で、寺小姓の清さまに会ったの。火事になれば、またあのお寺へ……」',
    ],
    linesF: [
      'コトン……。',
      '{hero}「ゼンマイ仕掛けの……火付けの道具だね」',
      'お春「……お寺のお坊さまがくれたの。これで火事を起こせば、また清さまに会えるって」',
      'お春「去年の火事で逃げたお寺で、寺小姓の清さまに会ったの。火事になれば、またあのお寺へ……」',
    ],
  },
  partyOut('orin'),
  { type: 'say', lines: ['お凛〈怒〉「ばか言うんじゃないよ！ 火事になったら、その清さまだって焼け出されるんだ」'] },
  ...partyIn('orin'),
  partyOut('gendo'),
  { type: 'say', lines: ['玄道「その坊主は鷲尾の手の者だ。娘心につけこんで、火付けの罪を負わせる気よ」'] },
  ...partyIn('gendo'),
  { type: 'say', lines: ['お春「……そんな。わたし、わたし……」'] },
  enemyActor('oharuTozokuA', 'hitsukeTozoku', 60, 33),
  enemyActor('oharuDoshin', 'karakuriDoshin', 60, 34),
  enemyActor('oharuTozokuB', 'hitsukeTozoku', 60, 32),
  { type: 'walk', who: 'oharuTozokuA', path: 'lllll', wait: false },
  { type: 'walk', who: 'oharuDoshin', path: 'llll', wait: false },
  walk('oharuTozokuB', 'llll'),
  { type: 'say', lines: ['火付け盗賊「ちっ、娘はしくじったか。まあいい、火はとうに放ってあらあ！」'] },
  { type: 'battle', enemies: ['hitsukeTozoku', 'karakuriDoshin', 'hitsukeTozoku'], level: 25 },
  // 火付け盗賊は倒れ、からくり同心は崩れる
  vanish('oharuTozokuA'),
  vanish('oharuTozokuB'),
  { type: 'say', lines: ['ガシャン……。'] },
  vanish('oharuDoshin'),
  { type: 'say', lines: ['ジャン、ジャン、ジャン！'] },
  partyOut('kasumi'),
  { type: 'say', lines: ['霞「半鐘だ！ 北の火の見櫓が鳴ってる！」'] },
  ...partyIn('kasumi'),
  actor('oharuGashira', 'npc_hikeshi', 44, 33, 'right'),
  walk('oharuGashira', 'rrrrr'),
  {
    type: 'say',
    lines: [
      '頭「神田から火が出た！ 風に乗って、こっちへ来るぞ！」',
      '頭「火の中で、車輪のからくりが火を撒いてやがる。おれたちだけじゃ近寄れねえ。手を貸してくれ！」',
      '頭「こいつを持っていきな。組の手拭いだ。火の粉くらいは、よけてくれるぜ」',
    ],
  },
  {
    type: 'giveItem',
    item: 'hikeshiTenugui',
    ifFull: [{ type: 'say', lines: ['頭「……なんだ、手拭いも持てねえほどの荷物か。まあいい、行くぞ！」'] }],
  },
  { type: 'say', lines: ['頭「北東の町木戸を開けさせた。神田へ急いでくんな！」'] },
  walk('oharuGashira', 'lllll'),
  vanish('oharuGashira'),
  { type: 'setFlag', flag: 'taikaStarted' },
];

/** 鷲尾を倒したあと（からくり大権現との戦いの前）。閉じ込められた魂の光が一行を癒やす。 */
const DAIGONGEN_BATTLE: EventStep[] = [
  {
    type: 'say',
    lines: [
      '大権現の胸の奥で、閉じ込められた魂のゼンマイが、青く光っている。',
      '……その光が、ふっと一行を包んだ。体の傷が、すっと癒えていく。',
      '玄道「さらわれた者たちの魂が、力を貸してくれておる。……蘭斎どのの祝詞を唱える。それまで、あやつを弱らせてくれ！」',
    ],
  },
  { type: 'heal' },
  { type: 'battle', enemies: ['karakuriDaigongen'], level: 32 },
  {
    type: 'say',
    lines: [
      '玄道が、蘭斎の祝詞を朗々と唱えた。',
      '大権現の胸のゼンマイが、ひとつ、またひとつとほどけ、青い光が天井へ昇っていく。',
      '鷲尾「やめろ……わしの……わしの泰平が……」',
      '金色の腕が崩れ落ち、歯車の山の中に、鷲尾の姿は消えた。',
      '昇っていく光の中に、寄り添うふたつの影が見えた。夜叉丸と、その妻らしい女の影だった。',
      '玄道〈悲〉「夜叉丸よ。お鈴は、確かに守った。……安心して行け」',
    ],
  },
  { type: 'setFlag', flag: 'daigongenDefeated' },
];

/** からくり大権現を倒したあとのエンディング。本物の上様が戻り、仲間たちはそれぞれの道へ。街道の茶屋でお凛が待っている。 */
const EPILOGUE: EventStep[] = [
  {
    type: 'say',
    lines: [
      '御座の間の奥の座敷牢から、本物の上様が救い出された。',
      '上様「そなたたちが、余を救ってくれたのか」',
      '上様「鷲尾の企みは、加賀の殿からも、仙台の片平からも聞いておる。……礼を言う。望むものがあれば申せ」',
      '霞「公儀隠密として、申し上げます。この者たちは、名乗るほどの者ではございません」',
      '上様「ふふ、そうか。ならば名は聞くまい。……江戸の町を、頼んだぞ」',
      '鷲尾の一派は捕らえられ、諸国のからくりの工房は、すべて打ち壊された。',
      'ゼンマイから解き放たれた人々は、それぞれの町へ帰っていった。',
      '霞は、公儀隠密の務めに戻っていった。「またどこかの町で会うかもね」と言い残して。',
      '玄道は、お鈴を連れて、焼けた神田に小さな寺を建てるという。',
      '榊兵庫は、上様の御沙汰で罪を許され、大坂の町の立て直しを任された。',
      '金太は空に凧を揚げ、小吉は長屋に小判を投げ込み、火消したちは今日も江戸の町を走る。',
      '……そして、ひとりの渡世人が、誰にも名乗らずに江戸を去った。',
    ],
  },
  {
    type: 'say',
    lines: [
      '東海道の、とある茶屋。',
      'お凛は、清水の一家に文を残して、ひと足先に江戸を発っていた。',
      'お凛「遅かったじゃないか、{hero}」',
      '縁台に、旅支度のお凛が座っていた。',
      '{hero}「お凛……。清水の一家は、どうするんでえ」',
      'お凛「一家は若い衆に任せてきた。おとっつぁんも、きっとそうしろって言うよ」',
      'お凛「あんたの気の向くままの旅に、あたしもついていく。……文句はないだろう？」',
      '{hero}「……へっ。勝手にしな」',
      '二人の渡世人は、街道を西へ歩き出した。',
    ],
    linesF: [
      '東海道の、とある茶屋。',
      'お凛は、清水の一家に文を残して、ひと足先に江戸を発っていた。',
      'お凛「遅かったじゃないか、{hero}」',
      '縁台に、旅支度のお凛が座っていた。',
      '{hero}「お凛……。清水の一家は、どうするのさ」',
      'お凛「一家は若い衆に任せてきた。おとっつぁんも、きっとそうしろって言うよ」',
      'お凛「あんたの気の向くままの旅に、あたしもついていく。……文句はないだろう？」',
      '{hero}「……ふふ。勝手におし」',
      '二人の渡世人は、街道を西へ歩き出した。',
    ],
  },
  { type: 'setFlag', flag: 'gameCleared' },
  { type: 'ending' },
];

export const EVENTS: Record<string, EventDef> = {
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
      // 細い道（24, 6）の先の奥の間から、野狐が出てきて行く手をふさぐ
      enemyActor('yako', 'yako', 24, 2),
      walk('yako', 'dd'),
      face('hero', 'up'),
      {
        type: 'say',
        lines: ['野狐「……ヒトノ子ヨ。ココカラ先ヘハ、通サヌ」', '{hero}「額に何か光ってやがる……。化け狐の正体、拝ませてもらうぜ」'],
        linesF: ['野狐「……ヒトノ子ヨ。ココカラ先ヘハ、通サヌ」', '{hero}「額に何か光ってる……。化け狐の正体、見せてもらうよ」'],
      },
      { type: 'battle', enemies: ['yako'], level: 4, canEscape: false },
      { type: 'say', lines: ['カタ、カタカタ……。'] },
      wait(300),
      vanish('yako'),
      {
        type: 'say',
        lines: ['{hero}「……歯車の音？ こいつは、真鍮の歯車……。からくり仕掛けの狐だったのか」'],
        linesF: ['{hero}「……歯車の音？ これは、真鍮の歯車……。からくり仕掛けの狐だったのかい」'],
      },
      // 奥の間の木箱（17, 1）の前まで歩く
      walk('hero', 'uuulllllllu'),
      {
        type: 'say',
        lines: ['{hero}「木箱に、駿府の工房の焼き印……。中身は、ゼンマイ仕掛けの人形の残骸か」', '{hero}「辰五郎親分に知らせねえと」'],
        linesF: ['{hero}「木箱に、駿府の工房の焼き印……。中身は、ゼンマイ仕掛けの人形の残骸だね」', '{hero}「辰五郎親分に知らせないと」'],
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
      faceTo('koboKasumi', 'hero'),
      {
        type: 'say',
        lines: [
          '女「動くんじゃないよ。……誰だい。一座の者じゃなさそうだね」',
          '{hero}「待ちな、怪しいもんじゃねえ。清水湊で人が消えてる件を追ってきた」',
          '{hero}「裏山の洞にいたからくり仕掛けの狐と、駿府の工房の焼き印の入った木箱……その出どころを確かめに来たのさ」',
          '女「……あたしは霞。名乗ったところで身元は明かせないけどね。江戸の上の方の言いつけで、からくりの出どころを追ってる」',
          '霞「あたしの追ってる糸と、同じところに行き着きそうだね」',
        ],
        linesF: [
          '女「動くんじゃないよ。……誰だい。一座の者じゃなさそうだね」',
          '{hero}「待っとくれ、怪しい者じゃないよ。清水湊で人が消えてる件を追ってきたのさ」',
          '{hero}「裏山の洞にいたからくり仕掛けの狐と、駿府の工房の焼き印の入った木箱……その出どころを確かめにね」',
          '女「……あたしは霞。名乗ったところで身元は明かせないけどね。江戸の上の方の言いつけで、からくりの出どころを追ってる」',
          '霞「あたしの追ってる糸と、同じところに行き着きそうだね」',
        ],
      },
      // 奥の棚（17, 2）の陰から、見張りのからくり人形が二体、歩き出してくる
      { type: 'say', lines: ['カタ、カタカタカタ……！'] },
      enemyActor('koboNingyoA', 'karakuriNingyo', 15, 3),
      enemyActor('koboNingyoB', 'karakuriNingyo', 19, 3),
      walk('koboNingyoA', 'ddd'),
      walk('koboNingyoB', 'ddddl'),
      faceTo('koboKasumi', 'koboNingyoA'),
      { type: 'say', lines: ['霞「見張りのからくりか。話はあとだ、手を貸しな！」', '霞が仲間に加わった！'] },
      { type: 'join', member: 'kasumi' },
      {
        type: 'battle',
        enemies: ['karakuriNingyo', 'karakuriNingyo'],
        level: 4,
        ifLose: [{ type: 'say', lines: ['霞「ちっ、しつこい！ ……煙玉で目をくらませてる間に、ゼンマイを抜いてやったよ」'] }],
      },
      vanish('koboNingyoA'),
      vanish('koboNingyoB'),
      faceTo('koboKasumi', 'hero'),
      {
        type: 'say',
        lines: [
          '霞「……ふう。腕は確かなようだね」',
          '霞「利害は一致してる。しばらく組もうじゃないか、{hero}」',
          '霞「さっき文机の文を見た。黒田って与力が、一座の荷を屋敷の蔵で預かってる。表の門番は、あたしが眠らせておくよ」',
        ],
      },
      { type: 'walk', who: 'koboKasumi', to: 'hero' },
      vanish('koboKasumi'),
      { type: 'setFlag', flag: 'kasumiJoined' },
    ],
  },
  /** 与力・黒田の屋敷の蔵。雇われのごろつきを倒すと、さらわれた人の名簿が見つかる。 */
  yorikiKura: {
    id: 'yorikiKura',
    steps: [
      // 蔵の戸（29, 4）から雇われのごろつきが出てきて、もう一人と化け提灯が脇から寄ってくる
      actor('kuraGorotsukiA', 'npc_ronin', 29, 4, 'down'),
      actor('kuraGorotsukiB', 'npc_ronin', 33, 5, 'left'),
      enemyActor('kuraChochin', 'bakeChochin', 24, 5),
      walk('kuraGorotsukiB', 'l'),
      walk('kuraChochin', 'rr'),
      face('hero', 'up'),
      { type: 'say', lines: ['ごろつき「おっと、ここから先は通さねえ。黒田の旦那に雇われてんだ」'] },
      { type: 'battle', enemies: ['gorotsuki', 'gorotsuki', 'bakeChochin'], level: 4 },
      // 化け提灯は消え、主人公が蔵の前から下がると、ごろつきは東の庭へ逃げ出す
      vanish('kuraChochin'),
      { type: 'walk', who: 'hero', to: { x: 29, y: 6 } },
      face('hero', 'up'),
      { type: 'walk', who: 'kuraGorotsukiB', path: 'rr', wait: false },
      walk('kuraGorotsukiA', 'drrrr'),
      vanish('kuraGorotsukiA'),
      vanish('kuraGorotsukiB'),
      // 霞が主人公から出て蔵に入り、帳面を持って出てくる
      actor('kasumi', 'kasumi', 29, 6, 'up'),
      { type: 'say', lines: ['霞「中を見てくる。見張ってな」'] },
      walk('kasumi', 'uu'),
      vanish('kasumi'),
      wait(800),
      actor('kasumi', 'kasumi', 29, 4, 'down'),
      walk('kasumi', 'd'),
      {
        type: 'say',
        lines: [
          '霞「蔵の中は、からくり人形の部品を詰めた木箱の山さ。それと、奥にこの帳面が一冊」',
          '霞「清水湊と駿府で消えた人たちの名が並んでる。……清水の長屋の与吉って名もあるよ」',
          '霞「名の下には、朱で『からくり屋敷へ送る』。城下の南の、一座の屋敷だね」',
          '霞「見張りは黒田の名で立ってたんだ。この名簿を見せりゃ、尻尾を巻いて逃げるさ」',
        ],
      },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'meiboFound' },
    ],
  },
  /**
   * からくり屋敷の奥の間。夜叉丸が装置を壊して逃げ、鉄瓶（第 1 章のボス）と戦う。負けて出直したときは鉄瓶だけが待つ。
   * 勝つと囚われていた人々を連れて駿府の城下へ移る（sunpuEnter が第 1 章の終わりを行う）。
   */
  tetsubin: {
    id: 'tetsubin',
    steps: [
      // 装置のまわりに、囚われた人々が眠るように座らされている。霞が主人公の隣に出る
      ...KARAKURI_CAPTIVES,
      partyOut('kasumi'),
      // 負けて出直したときは、夜叉丸はもう逃げたあとで、装置も壊れている
      {
        type: 'if',
        flag: 'yashamaruFled',
        then: [enemyActor('tetsubin', 'tetsubin', 20, 3), { type: 'say', lines: ['霞「今度こそ、片をつけるよ」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '霞「……人が座らされてる。あの装置に、何か吸い取られてるみたいだ」',
              '男「おや、清水の狐を片づけたのは、おまえたちか」',
              '霞「……夜叉丸。妖術師が、からくり遊びかい」',
              '夜叉丸「遊び？ これは人の魂をゼンマイに巻き取る仕掛けよ。……まあいい。ここはもう用済みだ」',
              '夜叉丸「鉄瓶、あとは任せたぞ」',
            ],
          },
          wait(300),
          vanish('yashamaru'),
          // 夜叉丸はここで姿を消す（戦闘から戻ったときも、奥の間の夜叉丸を消したままにする）
          { type: 'setFlag', flag: 'yashamaruFled' },
          { type: 'say', lines: ['ズシン……ズシン……。'] },
          enemyActor('tetsubin', 'tetsubin', 25, 3),
          walk('tetsubin', 'lllll'),
          { type: 'say', lines: ['霞「蒸気仕掛けの大男……！ 来るよ、{hero}！」'] },
        ],
      },
      { type: 'battle', enemies: ['tetsubin'], level: 7 },
      vanish('tetsubin'),
      { type: 'say', lines: ['霞「……止まった。みんな、しっかりおし！」'] },
      walk('captiveYokichi', 'd'),
      faceTo('captiveYokichi', 'hero'),
      { type: 'say', lines: ['与吉「う……ここは……？ おれは、清水の長屋の与吉だ。狐火を追いかけて、それから……」'] },
      faceTo('kasumi', 'captiveHaha'),
      {
        type: 'say',
        lines: ['女「……坊や……あの子に……子守唄を……」', '……カタ、カタ……カタ……。', '霞〈悲〉「……胸に、ゼンマイを埋め込まれてる。何人かは、もう目を覚まさないよ」'],
      },
      faceTo('kasumi', 'hero'),
      {
        type: 'say',
        lines: [
          '霞「……夜叉丸の後ろには、もっと大きな影がある。あたしはそれを追う」',
          '霞「{hero}、あんたも来るかい？ ……ふふ、聞くまでもないか」',
          '霞「さあ、助けた人たちを連れて、駿府の城下へ戻ろう」',
        ],
      },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'tetsubinDefeated' },
      // 屋敷を出た林の道へ（駿府に入ったときのイベントで第 1 章が終わる）
      { type: 'warp', mapId: 'sunpu', x: 19, y: 31 },
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
                then: [{ type: 'say', lines: ['金太「堀川の荷蔵は、町の西の外れ、堀川を渡った岸の蔵だ。荷車はどけといたぜ」'] }],
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
      // 奥の間から浪人がふたり出てきて細い廊下の口をふさぎ、ゼンマイ仕掛けの犬が唸る
      actor('horikawaRoninA', 'npc_ronin', 19, 2, 'down'),
      actor('horikawaRoninB', 'npc_ronin', 21, 2, 'down'),
      enemyActor('horikawaInu', 'zenmaiInu', 23, 4),
      face('hero', 'up'),
      { type: 'walk', who: 'horikawaRoninA', path: 'dd', wait: false },
      { type: 'walk', who: 'horikawaInu', path: 'll', wait: false },
      walk('horikawaRoninB', 'ldd'),
      { type: 'say', lines: ['ウゥゥ……。', '浪人「嗅ぎつけたか。江戸の御方の御用だ、生かしては帰さん」'] },
      { type: 'battle', enemies: ['oihagiRonin', 'oihagiRonin', 'zenmaiInu'], level: 7 },
      vanish('horikawaInu'),
      vanish('horikawaRoninA'),
      vanish('horikawaRoninB'),
      // 主人公が奥の間に入り、千両箱（16, 1）の前に立つ
      walk('hero', 'u'),
      { type: 'walk', who: 'hero', to: { x: 16, y: 2 } },
      face('hero', 'up'),
      { type: 'say', lines: ['空の千両箱だ。底に、金の粉がこびりついている。'] },
      {
        type: 'say',
        lines: ['{hero}「千両箱のそばに、手ぬぐいが落ちてる。凧の絵の染め抜き……銀次のものか」'],
        linesF: ['{hero}「千両箱のそばに、手ぬぐいが落ちてる。凧の絵の染め抜き……銀次のものかな」'],
      },
      partyOut('kasumi'),
      {
        type: 'say',
        lines: [
          '霞「浪人の懐に、文が一通あったよ。『金の鱗はからくりの心臓とせよ。鯱は天守にて組み上ぐべし』」',
          '霞「鱗で鯱のからくりを動かすつもりか。天守へ行くしかないね。……金太に相談しよう」',
        ],
      },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'urokoClue' },
    ],
  },
  /**
   * 天守の大棟。銀次を心臓に組み込まれた金鯱からくり（第 2 章のボス）と戦う。負けて出直したときは短い台詞にする。
   * 勝つと城の前（24, 11）へ移る（nagoyaEnter が第 2 章の終わりを行う）。
   */
  kinshachi: {
    id: 'kinshachi',
    steps: [
      // 欄干で凧をつないでいた金太（tenshuKinta）が、後ろから駆け上がってくる
      vanish('tenshuKinta'),
      face('hero', 'up'),
      {
        type: 'if',
        flag: 'kinshachiMet',
        then: [
          enemyActor('kinshachi', 'kinshachi', 17, 2),
          actor('kinta', 'kinta', 16, 7, 'up'),
          walk('kinta', 'uu'),
          { type: 'say', lines: ['金太「兄貴……今度こそ、止めてやるからな！」'] },
        ],
        else: [
          // 大棟の上で、天守の鯱がからくり仕掛けで動いている
          enemyActor('kinshachi', 'kinshachi', 17, 2),
          partyOut('kasumi'),
          {
            type: 'say',
            lines: [
              '霞「天守の鯱が、からくり仕掛けで動いてる……！ 剥がされた鱗は、胸の歯車に打ちつけてあるよ」',
              '霞「待って、胸の奥に人がいる。手足をゼンマイに絡め取られてる！」',
            ],
          },
          actor('kinta', 'kinta', 16, 7, 'up'),
          walk('kinta', 'uu'),
          {
            type: 'say',
            lines: [
              '金太「兄貴！ 銀次兄貴！」',
              '銀次「……金太……来るな……。おれは……もう……」',
              '霞〈怒〉「人をからくりの心臓にしたのか……！ {hero}、鯱を止めるよ！」',
            ],
          },
          ...partyIn('kasumi'),
          { type: 'setFlag', flag: 'kinshachiMet' },
        ],
      },
      { type: 'say', lines: ['ギギギ……！'] },
      walk('kinshachi', 'd'),
      { type: 'battle', enemies: ['kinshachi'], level: 10 },
      { type: 'say', lines: ['ガラガラ……！'] },
      // 金鯱からくりが崩れ、胸の歯車の中から銀次が転がり出る
      vanish('kinshachi'),
      actor('ginji', 'npc_ninsoku', 17, 3, 'down'),
      faceTo('kinta', 'ginji'),
      partyOut('kasumi'),
      faceTo('kasumi', 'ginji'),
      {
        type: 'say',
        lines: [
          '霞〈悲〉「腕も足も、もう半分がからくりになってる……」',
          '銀次「……金太……おれが盗んだことにすりゃ……おめえは疑われねえと……思ったんだが……」',
          '銀次「浪人どもを追っかけて……このざまだ……。すまねえ……」',
          '金太「しゃべるな、兄貴！ 今、医者を……！」',
          '銀次「……おめえの凧は……いつも……空のいちばん高えところで……揺れてたなあ……」',
          'カタリ……。',
          '金太「……兄貴？ 兄貴ぃっ！」',
        ],
      },
      wait(1200),
      faceTo('kasumi', 'hero'),
      {
        type: 'say',
        lines: ['霞「……散らばった鱗を拾い集めて、城下へ戻ろう。銀次さんも、連れて帰ってやらなきゃ」'],
      },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'kinshachiDefeated' },
      // 天守を下りた城の前へ（名古屋に入ったときのイベントで第 2 章が終わる）
      { type: 'warp', mapId: 'nagoya', x: 24, y: 11 },
    ],
  },
  /** 京に入ったとき。初めてなら町の紹介、酒呑の大鬼を倒したあとなら第 3 章の終わり。 */
  kyoEnter: {
    id: 'kyoEnter',
    steps: [
      {
        type: 'if',
        flag: 'shutenDefeated',
        then: KYO_CHAPTER_END,
        else: [{ type: 'if', flag: 'kyoArrived', then: [], else: KYO_ARRIVE }],
      },
    ],
  },
  /** 鴨川の河原で酔いつぶれている破戒僧・玄道。鬼退治に加わり、仲間になる。 */
  gendoMeet: {
    id: 'gendoMeet',
    steps: [
      // 河原の葦の陰で、大柄な坊主が酒徳利を抱えて寝ている
      { type: 'say', lines: ['ぐおぉ……ぐおぉ……'] },
      partyOut('kasumi'),
      faceTo('kasumi', 'gendoKawara'),
      { type: 'say', lines: ['霞「坊さんが、酒徳利を抱えて高いびきだよ。……ちょいと、起きな」'] },
      faceTo('gendoKawara', 'hero'),
      {
        type: 'say',
        lines: [
          '坊主「……ん？ なんだ、おぬしら。酒なら分けてやらんぞ」',
          '坊主「わしは玄道。寺を追い出された生臭坊主よ。今は、河原の衆に頼まれて鬼退治を請け負っておる」',
        ],
      },
      {
        type: 'say',
        lines: [
          '{hero}「駿府でも名古屋でも、人をからくりや化け物に変える一味を見てきた。都の鬼も、そいつらの仕業かもしれねえ」',
        ],
        linesF: [
          '{hero}「駿府でも名古屋でも、人をからくりや化け物に変える一味を見てきたよ。都の鬼も、そいつらの仕業かもしれない」',
        ],
      },
      {
        type: 'say',
        lines: [
          '玄道〈悲〉「……やはりな。あの鬼ども、斬りかかってきても、目が泣いておった。あれは人だ。妖術で鬼の姿に変えられた、河原の衆よ」',
          '玄道「わしは、あやつらを斬らずに祓う。手伝ってくれるなら、ありがたい」',
          '玄道が仲間に加わった！',
          '玄道「鬼が出るのは、五条の橋を渡った南、羅生門の跡だ。行くぞ」',
        ],
      },
      { type: 'join', member: 'gendo' },
      ...partyIn('kasumi'),
      { type: 'walk', who: 'gendoKawara', to: 'hero' },
      vanish('gendoKawara'),
      { type: 'setFlag', flag: 'gendoJoined' },
    ],
  },
  /** 羅生門跡。鬼にされた河原者を倒すと、玄道が祓って人に戻す。鬼の巣（北の山）への道が開く。 */
  rashomonOni: {
    id: 'rashomonOni',
    steps: [
      {
        type: 'if',
        flag: 'gendoJoined',
        then: [
          // 門の跡の基壇の両脇の暗がりから、赤い鬼が二匹、のそりと現れる
          { type: 'say', lines: ['ズシン……ズシン……'] },
          enemyActor('rashomonOniA', 'akaoni', 11, 9),
          enemyActor('rashomonOniB', 'akaoni', 24, 9),
          { type: 'walk', who: 'rashomonOniA', path: 'rrrrrr', wait: false },
          walk('rashomonOniB', 'llllll'),
          partyOut('gendo'),
          { type: 'say', lines: ['玄道「来おったな。斬るなよ、{hero}。弱らせれば、わしが祓う」'] },
          { type: 'battle', enemies: ['akaoni', 'akaoni'], level: 10 },
          // 玄道が数珠を鳴らして経を唱えると、鬼の角が落ち、痩せた河原の男たちの姿に戻る
          faceTo('gendo', 'rashomonOniA'),
          { type: 'say', lines: ['玄道「オン・アビラウンケン……。迷うな。人に戻れ」', 'シャラン……'] },
          vanish('rashomonOniA'),
          vanish('rashomonOniB'),
          actor('rashomonOtokoA', 'npc_ninsoku', 17, 9, 'down'),
          actor('rashomonOtokoB', 'npc_ninsoku', 18, 9, 'down'),
          {
            type: 'say',
            lines: [
              '男「……お坊さま……わしら、北の山の古寺で、白い面の男に……」',
            ],
          },
          partyOut('kasumi'),
          {
            type: 'say',
            lines: [
              '霞「白い面……夜叉丸だ」',
              '玄道「北の山の古寺か。鬼の巣とはよく言ったものよ。都の役人も、もう道をふさいではおるまい」',
              '玄道「おぬしらは、河原へ帰って休め。家の者が待っておろう」',
              '男「へ、へえ……！ ありがとうございます……！」',
            ],
          },
          ...partyIn('kasumi'),
          ...partyIn('gendo'),
          { type: 'setFlag', flag: 'rashomonCleared' },
        ],
        // 玄道に会う前は、鬼の影だけ（祓える者がいないので戦わない）
        else: [
          enemyActor('rashomonKage', 'akaoni', 18, 7),
          partyOut('kasumi'),
          faceTo('kasumi', 'rashomonKage'),
          {
            type: 'say',
            lines: [
              '霞「門の跡の暗がりに、何か大きなものがうずくまってる……鬼だ」',
              '霞「……斬っちまっていいのかい、これ。鴨川の坊さんに話を聞いてからにしよう」',
            ],
          },
          // 鬼の影は、門の跡の奥の暗がりへ引っ込む
          walk('rashomonKage', 'u'),
          vanish('rashomonKage'),
          ...partyIn('kasumi'),
        ],
      },
    ],
  },
  /**
   * 鬼の巣の本堂。夜叉丸が黒幕をほのめかして酒呑の大鬼を呼び、姿を消す（第 3 章のボス）。負けて出直したときは大鬼だけが待つ。
   * 勝つと北の峠道の口（京の 19, 5）へ移る（kyoEnter が第 3 章の終わりを行う）。
   */
  shuten: {
    id: 'shuten',
    steps: [
      face('hero', 'up'),
      {
        type: 'if',
        flag: 'yashamaruKyoFled',
        then: [
          // 本堂では、酒呑の大鬼が大盃をあおって待ち構えている
          enemyActor('shuten', 'shuten', 20, 5),
          partyOut('gendo'),
          { type: 'say', lines: ['玄道「酒呑の大鬼め、大盃をあおって待っておったか。……酔っておっても、わしは負けんぞ」'] },
          ...partyIn('gendo'),
        ],
        else: [
          // 崩れかけた本堂の奥に、白い面の男（kyoYashamaru）が座している
          faceTo('kyoYashamaru', 'hero'),
          {
            type: 'say',
            lines: ['夜叉丸「また会ったな、清水の渡世人。駿府の次は名古屋、名古屋の次は都か。よくもまあ、嗅ぎ回る」'],
          },
          partyOut('kasumi'),
          {
            type: 'say',
            lines: [
              '霞「夜叉丸……あんたの後ろにいるのは誰だい」',
              '夜叉丸「ふふ。……江戸の御城の、ずっと上の方の御方さ。老中さまがお望みなのは、ゼンマイで動く天下よ」',
              '夜叉丸「おれは命じられたとおりにやるだけだ。……おれにも、守らにゃならんものがあるんでな」',
            ],
          },
          // 夜叉丸が印を結ぶと、本堂の床が裂け、巨大な鬼が這い出してくる
          { type: 'say', lines: ['ゴゴゴゴ……！'] },
          enemyActor('shuten', 'shuten', 20, 5),
          { type: 'say', lines: ['夜叉丸「酒呑の大鬼。都の鬼どもの親玉だ。遊んでやれ」'] },
          // 護摩の煙とともに、夜叉丸の姿がかき消える
          { type: 'say', lines: ['ボウッ……'] },
          vanish('kyoYashamaru'),
          { type: 'say', lines: ['霞〈怒〉「待ちな！ ……ちっ、また煙に巻かれた」'] },
          ...partyIn('kasumi'),
          { type: 'setFlag', flag: 'yashamaruKyoFled' },
        ],
      },
      walk('shuten', 'd'),
      { type: 'say', lines: ['ウオォォォ……！'] },
      { type: 'battle', enemies: ['shuten'], level: 13 },
      { type: 'say', lines: ['ズシン……！'] },
      partyOut('gendo'),
      faceTo('gendo', 'shuten'),
      { type: 'say', lines: ['玄道〈悲〉「……おぬしも、元は人であったか」', '玄道「オン・アビラウンケン……。迷わず、ゆけ」'] },
      // 大鬼の体は、ほどけるように崩れて消える
      vanish('shuten'),
      partyOut('kasumi'),
      {
        type: 'say',
        lines: ['霞「鬼の体が、ほどけるように消えちまった……」'],
      },
      // 本堂の奥の牢に、鬼に変えられかけていた河原の人々が囚われている。玄道が一人ずつ祓い、縄を解く
      actor('oninosuToraware1', 'npc_ninsoku', 15, 4, 'down'),
      actor('oninosuToraware2', 'npc_musume', 23, 4, 'down'),
      actor('oninosuToraware3', 'npc_rojin', 25, 5, 'down'),
      { type: 'say', lines: ['霞「……待って、本堂の奥の牢に、人が囚われてる！」'] },
      {
        type: 'say',
        lines: [
          '玄道「じっとしておれ。今、祓ってやる。……オン・アビラウンケン」',
          'シャラン……',
          '娘「角が……消えた。人の手に戻っとる……！」',
          '老人「お坊さま、皆さま……ありがとうございます……」',
        ],
      },
      faceTo('gendo', 'hero'),
      {
        type: 'say',
        lines: [
          '玄道「江戸の老中、か。……寺を追われたわしが、また天下の大事に首を突っ込むとはな」',
          '玄道「まあよい。乗りかかった舟だ。おぬしらに付き合おう」',
          '霞「さあ、皆を連れて都へ帰ろう」',
        ],
      },
      ...partyIn('kasumi'),
      ...partyIn('gendo'),
      { type: 'setFlag', flag: 'shutenDefeated' },
      // 囚われていた人々を連れて山を下り、京の北の峠道の口へ（京に入ったときのイベントで第 3 章が終わる）
      { type: 'warp', mapId: 'kyo', x: 19, y: 5 },
    ],
  },
  /** 清水湊に入ったとき。初めてなら序章の始まり、第 3 章を終えていれば辰五郎の弔い（第 4 章の始まり）。 */
  shimizuEnter: {
    id: 'shimizuEnter',
    steps: [
      {
        type: 'if',
        flag: 'intro',
        // お凛が加わったあと（orinJoined）は、マップの onEnter の unless で呼ばれない
        then: [{ type: 'if', flag: 'chapter3Cleared', then: SHIMIZU_FUNERAL, else: [] }],
        else: INTRO,
      },
    ],
  },
  /** 伊賀上野に入ったとき。初めてなら仇討免状が届く。 */
  igaEnter: {
    id: 'igaEnter',
    steps: [{ type: 'if', flag: 'igaArrived', then: [], else: IGA_ARRIVE }],
  },
  /**
   * 伊賀者の里の奥で待つ、霞のかつての師・朧（igaOboro、広間の 20, 4）。倒すと、権六が夜明けに鍵屋の辻を通ると明かし、煙とともに消える。
   * 負けて出直したときは口上を短くする。広間へ上がる細い段（19, 8 か 20, 8）で始まり、広間に 2 歩上がってから話す。
   */
  oboro: {
    id: 'oboro',
    steps: [
      walk('hero', 'uu'),
      partyOut('kasumi'),
      faceTo('kasumi', 'igaOboro'),
      faceTo('igaOboro', 'hero'),
      {
        type: 'if',
        flag: 'oboroMet',
        then: [{ type: 'say', lines: ['朧「戻ったか、霞。……掟は掟だ。来い」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '霞〈悲〉「……お師匠」',
              '朧「霞か。里を抜けた者が、よくも戻ってきたものよ」',
              '朧「蛇骨の権六なら、この里でかくまっておる。江戸の御老中から、里にはたんと金が入るのでな」',
              '霞〈怒〉「金で人殺しをかくまうのが、伊賀の忍びのすることかい！」',
              '朧「忍びは道具よ。そう教えたはずだ。……そして、抜け忍は斬る。それが掟だ」',
            ],
          },
          { type: 'setFlag', flag: 'oboroMet' },
        ],
      },
      walk('igaOboro', 'd'),
      { type: 'battle', enemies: ['oboro'], level: 15 },
      {
        type: 'say',
        lines: [
          '朧「……ぐっ。……ふ、ふふ」',
          '朧「……強うなったな、霞。道具は、使い手を選べぬ。だが、おまえは選んだのだな」',
          '朧「権六は、夜明けに里を出る。鍵屋の辻を抜けて、大坂へ向かう手はずだ」',
          '朧「行け。里の者には、手出しをさせぬ」',
          '霞〈悲〉「……お師匠。達者で」',
        ],
      },
      // 朧は、煙玉の煙とともに姿を消す
      { type: 'say', lines: ['ボウッ……'] },
      vanish('igaOboro'),
      partyOut('orin'),
      { type: 'say', lines: ['お凛「鍵屋の辻……伊賀上野の城下の、西の外れだね。夜明けまでに行くよ」'] },
      ...partyIn('orin'),
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'oboroDefeated' },
    ],
  },
  /**
   * 鍵屋の辻で、辰五郎の仇・蛇骨の権六を討つ（第 4 章のボス）。勝つと第 4 章が終わる。負けて出直したときは口上を短くする。
   * 辻の真ん中（13, 9〜11）で始まり、西の石標のほうから権六が歩いてくる。
   */
  gonroku: {
    id: 'gonroku',
    steps: [
      face('hero', 'left'),
      // 夜明けの辻に、編み笠の男が西から歩いてくる。左の袖から、鈍く光る鉄の腕がのぞいている
      enemyActor('kagiyaGonroku', 'gonroku', 5, 10),
      walk('kagiyaGonroku', 'rrrrr'),
      partyOut('orin'),
      faceTo('orin', 'kagiyaGonroku'),
      {
        type: 'if',
        flag: 'gonrokuMet',
        then: [{ type: 'say', lines: ['権六「懲りねえ連中だ。何度来ても同じことよ」', 'お凛〈怒〉「今度こそ、おとっつぁんの仇を討つ！」'] }],
        else: [
          {
            type: 'say',
            lines: [
              'お凛〈怒〉「蛇骨の権六！ 清水湊の辰五郎の娘、凛だ。公儀の免状を持って、父の仇を討ちに来た！」',
              '権六「……辰五郎の娘か。あの頑固親父にゃ、手を焼かされたぜ」',
              '権六「このからくりの腕はな、御老中さまからの頂き物よ。鉄砲玉なんざ、はじき返してやらあ」',
            ],
          },
          { type: 'setFlag', flag: 'gonrokuMet' },
        ],
      },
      { type: 'battle', enemies: ['gonroku'], level: 16 },
      // お凛の放った一発が、権六の胸を撃ち抜く。からくりの腕が、きしんで止まる
      { type: 'say', lines: ['ダーン……！', 'ギ……ギギ……'] },
      {
        type: 'say',
        lines: [
          '権六「……へっ……。辰五郎の野郎はな……おれたちの仲間になるのを、断りやがったのよ」',
          '権六「清水の湊を……からくりの荷の通り道にしてえって話をな……。義理がどうの、人情がどうのと……」',
          '権六「…………」',
        ],
      },
      // 権六は、それきり動かなくなり、辻に崩れ落ちる
      { type: 'say', lines: ['ドサッ……'] },
      vanish('kagiyaGonroku'),
      wait(600),
      { type: 'say', lines: ['お凛〈悲〉「……おとっつぁん。仇は、討ったよ」', 'お凛「…………」'] },
      faceTo('orin', 'hero'),
      {
        type: 'say',
        lines: [
          'お凛「……{hero}。あんたたちの旅、まだ続くんだろ。鷲尾って老中を、このままにしておけない」',
          'お凛「あたしも行くよ。おとっつぁんが守ろうとしたものを、あたしが守る」',
        ],
      },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「権六は大坂へ向かう手はずだった、と師匠は言ってた。……次は、天下の台所だね」'] },
      ...partyIn('kasumi'),
      ...partyIn('orin'),
      { type: 'setFlag', flag: 'gonrokuDefeated' },
      { type: 'setFlag', flag: 'chapter4Cleared' },
    ],
  },
  /** 大坂に入ったとき。初めてなら町の紹介と霞の一時離脱、百俵からくりを倒したあとなら第 5 章の終わり。 */
  osakaEnter: {
    id: 'osakaEnter',
    steps: [
      {
        type: 'if',
        flag: 'hyakuhyoDefeated',
        then: OSAKA_CHAPTER_END,
        else: [{ type: 'if', flag: 'osakaArrived', then: [], else: OSAKA_ARRIVE }],
      },
    ],
  },
  /**
   * 長屋の私塾で、元与力の侍・榊兵庫（hyogoJuku、私塾の 4, 2）と会う。兵庫が一時加入（ゲスト）し、米蔵の用心棒がどく。
   * 兵庫に話しかけて始まる。門弟に講じ終えてから振り向き、加わると主人公のところへ歩いて消える。
   */
  hyogoMeet: {
    id: 'hyogoMeet',
    steps: [
      { type: 'say', lines: ['兵庫「……民の飢えを見て見ぬふりをするは、学ぶ者の恥と知れ。今日はここまでとする」'] },
      faceTo('hyogoJuku', 'hero'),
      { type: 'say', lines: ['兵庫「……旅の方か。わしは榊兵庫。元は町奉行所の与力だったが、今はこうして子らに読み書きを教えておる」'] },
      {
        type: 'say',
        lines: [
          '{hero}「あっしらは、鷲尾って老中の手先を追ってる。駿府でも名古屋でも京でも、からくりで人を食い物にしてやがった」',
          '{hero}「この町の米の買い占めも、奴らの仕業じゃねえかと思いやしてね」',
        ],
        linesF: [
          '{hero}「あたしらは、鷲尾って老中の手先を追ってるんだ。駿府でも名古屋でも京でも、からくりで人を食い物にしてた」',
          '{hero}「この町の米の買い占めも、あいつらの仕業じゃないかと思ってね」',
        ],
      },
      {
        type: 'say',
        lines: [
          '兵庫「やはりか。大黒屋の蔵の地下では、夜な夜な歯車の音がする。米を砕いて、からくりの油にしておるらしい」',
          '兵庫「奉行所に訴えても、上から握りつぶされた。……門弟たちは、蔵を打ちこわせと息巻いておる。わしも、もはやそれしかないかと考えておった」',
        ],
      },
      faceTo('osakaJukuMontei1', 'hyogoJuku'),
      { type: 'say', lines: ['門弟「先生！ やるなら今です。わしらは、いつでも蔵へ押しかけまっせ！」'] },
      partyOut('gendo'),
      faceTo('gendo', 'hyogoJuku'),
      { type: 'say', lines: ['玄道「打ちこわしは、火が出る。町ごと焼けるぞ」'] },
      {
        type: 'say',
        lines: [
          '兵庫「分かっておる。だから迷っておるのだ。……地下のからくり工場さえつぶせば、米は町に戻せる。手を貸してはもらえぬか」',
          '榊兵庫が一時、一行に加わった！（兵庫の装備は変えられない）',
          '兵庫「大黒屋の蔵は、町の北だ。用心棒どもは、わしの顔を見ればどく。元与力の顔も、まだ少しは役に立つ」',
        ],
      },
      { type: 'join', member: 'hyogo' },
      faceTo('hyogoJuku', 'osakaJukuMontei1'),
      { type: 'say', lines: ['兵庫「おまえたちは、ここで待て。……決して、早まるでないぞ」'] },
      ...partyIn('gendo'),
      { type: 'walk', who: 'hyogoJuku', to: 'hero' },
      vanish('hyogoJuku'),
      { type: 'setFlag', flag: 'hyogoJoined' },
    ],
  },
  /**
   * 米蔵の地下のからくり工場の奥で待つ百俵からくり（第 5 章のボス）。負けて出直したときは口上を短くする。
   * 奥へ上がる細い段（34, 12 か 34, 13）で始まり、工場の奥の俵の山が立ち上がって歩いてくる。勝つと北岸の蔵の前（大坂の 26, 4）へ移る（osakaEnter が第 5 章の終わりを行う）。
   */
  hyakuhyo: {
    id: 'hyakuhyo',
    steps: [
      face('hero', 'right'),
      // 歯車のうなりとともに、天井まで積まれた俵の山がきしみながら立ち上がる
      { type: 'say', lines: ['ギリ……ギリギリ……'] },
      enemyActor('komeKuraHyakuhyo', 'hyakuhyo', 40, 13),
      walk('komeKuraHyakuhyo', 'll'),
      partyOut('hyogo'),
      faceTo('hyogo', 'komeKuraHyakuhyo'),
      partyOut('orin'),
      faceTo('orin', 'komeKuraHyakuhyo'),
      {
        type: 'if',
        flag: 'hyakuhyoMet',
        then: [{ type: 'say', lines: ['兵庫「また立ち上がるか。……今度こそ、止めてみせる」'] }],
        else: [
          { type: 'say', lines: ['兵庫「百の米俵を、鎧のようにまとっておるのか……。これが、町の米を食らう化け物の正体か」'] },
          { type: 'say', lines: ['お凛〈怒〉「米を返してもらうよ！」'] },
          { type: 'setFlag', flag: 'hyakuhyoMet' },
        ],
      },
      { type: 'battle', enemies: ['hyakuhyo'], level: 19 },
      // 百俵からくりは俵をまき散らして崩れ落ち、歯車が止まる
      { type: 'say', lines: ['ガラガラガラ……！'] },
      vanish('komeKuraHyakuhyo'),
      { type: 'say', lines: ['シュウゥ……'] },
      { type: 'say', lines: ['兵庫「……これで、米は町に戻せる。あとは、門弟たちを説き伏せるだけだ」'] },
      partyOut('gendo'),
      faceTo('gendo', 'hyogo'),
      { type: 'say', lines: ['玄道「火を出さずに済めばよいがな」', '兵庫「夜が明ける前に、町へ戻ろう」'] },
      ...partyIn('gendo'),
      ...partyIn('orin'),
      ...partyIn('hyogo'),
      { type: 'setFlag', flag: 'hyakuhyoDefeated' },
      // 工場を出た北岸の蔵の前へ（大坂に入ったときのイベントで第 5 章が終わる）
      { type: 'warp', mapId: 'osaka', x: 26, y: 4 },
    ],
  },
  /** 広島に入ったとき。初めてなら霞が戻る（away から戻し、平均レベルまで引き上げる）。 */
  hiroshimaEnter: { id: 'hiroshimaEnter', steps: HIROSHIMA_ARRIVE },
  /** 長崎に入ったとき。初めてなら町の紹介、南蛮大筒からくりを倒したあとなら第 6 章の終わり。 */
  nagasakiEnter: {
    id: 'nagasakiEnter',
    steps: [
      {
        type: 'if',
        flag: 'nanbanOzutsuDefeated',
        then: NAGASAKI_CHAPTER_END,
        else: [{ type: 'if', flag: 'nagasakiArrived', then: [], else: NAGASAKI_ARRIVE }],
      },
    ],
  },
  /** 出島の通詞。南蛮の機械学の書を持ち出した蘭学者・若林蘭斎のことを聞く（dejimaHeard。南蛮寺跡の石段の役人がどく）。 */
  tsujiMeet: {
    id: 'tsujiMeet',
    steps: [
      {
        type: 'if',
        flag: 'dejimaHeard',
        then: [{ type: 'say', lines: ['通詞「蘭斎どのの行方は、東の山の南蛮寺跡が手がかりです。どうか、お気をつけて」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '通詞「公儀の御用の方ですか。……はい、書物蔵から消えたのは、南蛮の機械学の書、十二冊です」',
              '通詞「ゼンマイと歯車で、人の手を借りずに動く仕掛けの書です。オランダでも、まだ試しの段の学問だとか」',
              '通詞「持ち出したのは、若林蘭斎という蘭学者でしょう。出島で学び、誰よりもあの書に夢中でした」',
              '通詞「一年ほど前から、江戸の偉いお方の後ろ盾を得たと言って、長崎を離れていました。ところがこのごろ、東の山の南蛮寺跡で姿を見たという者がいるのです」',
            ],
          },
          partyOut('kasumi'),
          faceTo('kasumi', 'tsuji'),
          { type: 'say', lines: ['霞「南蛮寺跡か。奉行所が石段をふさいでたね。……公儀の札を見せれば通してくれるだろう」'] },
          { type: 'say', lines: ['通詞「蘭斎どのは、悪い人ではないのです。学問のためなら、誰の金でも受け取ってしまう……それだけの人なのです」'] },
          ...partyIn('kasumi'),
          { type: 'setFlag', flag: 'dejimaHeard' },
        ],
      },
    ],
  },
  /**
   * 南蛮寺跡の礼拝堂の跡。研究所のからくり兵と戦い、蘭斎の書き付けから島原の原城跡を知る（shimabaraOpen）。
   * 礼拝堂の跡の入口（17, 10 か 18, 10）で始まる。からくり兵が礼拝堂の左右から、外法使いが祭壇の脇から出てくる。
   */
  nanbanjiOku: {
    id: 'nanbanjiOku',
    steps: [
      face('hero', 'up'),
      { type: 'say', lines: ['ガシャリ……ガシャリ……'] },
      enemyActor('nanbanjiHeiA', 'nanbanHei', 12, 8),
      enemyActor('nanbanjiHeiB', 'nanbanHei', 23, 8),
      enemyActor('nanbanjiGeho', 'gehoTsukai', 18, 6),
      { type: 'walk', who: 'nanbanjiHeiA', path: 'rrrr', wait: false },
      { type: 'walk', who: 'nanbanjiHeiB', path: 'llll', wait: false },
      walk('nanbanjiGeho', 'd'),
      wait(400),
      {
        type: 'if',
        flag: 'nanbanjiOkuMet',
        then: [{ type: 'say', lines: ['外法使い「懲りぬ奴らだ。……今度こそ、ゼンマイの糧にしてくれる」'] }],
        else: [
          { type: 'say', lines: ['外法使い「南蛮の鎧をまとうた鉄の兵の味、とくと見るがよい。……蘭斎先生の邪魔はさせぬ」'] },
          { type: 'setFlag', flag: 'nanbanjiOkuMet' },
        ],
      },
      { type: 'battle', enemies: ['nanbanHei', 'gehoTsukai', 'nanbanHei'], level: 19 },
      // からくり兵は崩れ、外法使いは煙を残して消える
      { type: 'say', lines: ['ガシャン……！'] },
      vanish('nanbanjiHeiA'),
      vanish('nanbanjiHeiB'),
      { type: 'say', lines: ['外法使い「ぐっ……蘭斎先生……！」', 'ボンッ！'] },
      vanish('nanbanjiGeho'),
      // 霞が、外法使いの立っていた所（18, 7）の前（18, 8）まで行き、書き付けの束を拾う
      partyOut('kasumi'),
      { type: 'walk', who: 'kasumi', to: { x: 18, y: 8 } },
      face('kasumi', 'down'),
      {
        type: 'say',
        lines: [
          '霞「外法使いが、書き付けの束を落としていったよ。……蘭斎の字だ」',
          '霞「『魂のゼンマイ、ここにては力足らず。島原の古城の地の底にて、試しを続けるべし』」',
          '霞「『乱にて死せる者、あまたあり。かの地には、魂の力が満ちておる』」',
        ],
      },
      partyOut('gendo'),
      faceTo('gendo', 'kasumi'),
      { type: 'say', lines: ['玄道〈怒〉「……死者の魂まで、からくりの糧にする気か」'] },
      { type: 'say', lines: ['霞「島原の原城跡だ。長崎から東の街道で行ける」'] },
      ...partyIn('kasumi'),
      ...partyIn('gendo'),
      { type: 'setFlag', flag: 'shimabaraOpen' },
    ],
  },
  /**
   * 原城跡の地下の研究所で待つ南蛮大筒からくり（第 6 章のボス）。倒すと、深手の蘭斎が祝詞を託して息を引き取る。
   * 奥の研究室への細い入口（15, 19 か 16, 19）で始まる。大筒からくりが研究室の奥から入口の前（16, 20）へ出てきてふさぎ、蘭斎は机の脇（14, 21）にいる。
   */
  nanbanOzutsu: {
    id: 'nanbanOzutsu',
    steps: [
      face('hero', 'down'),
      actor('kenkyujoRansai', 'npc_rojin', 14, 21, 'up'),
      { type: 'say', lines: ['ギギ……ギギギギ……'] },
      enemyActor('kenkyujoOzutsu', 'nanbanOzutsu', 17, 21),
      walk('kenkyujoOzutsu', 'lu'),
      partyOut('kasumi'),
      faceTo('kasumi', 'kenkyujoOzutsu'),
      {
        type: 'if',
        flag: 'nanbanOzutsuMet',
        then: [{ type: 'say', lines: ['霞「また大筒がこっちを向いたよ！ 構えに入ったら、身を守るんだ！」'] }],
        else: [
          { type: 'say', lines: ['蘭斎「……来るな。その子は、止められん。わしにも、もう止められんのだ……」'] },
          {
            type: 'say',
            lines: ['霞「背中に南蛮の大筒、胸にはゼンマイが青く光ってる……。こいつが研究所の番人か」', '霞「大筒の構えに入ったら、身を守るんだよ！」'],
          },
          { type: 'setFlag', flag: 'nanbanOzutsuMet' },
        ],
      },
      { type: 'battle', enemies: ['nanbanOzutsu'], level: 22 },
      // 胸のゼンマイがはじけ、大筒からくりが崩れ落ちる
      { type: 'say', lines: ['バチンッ……！ ガラガラガラ……！'] },
      vanish('kenkyujoOzutsu'),
      // 主人公は研究室に入り、机の脇の蘭斎の前（14, 20）へ。玄道は主人公の左（13, 20）に出る
      { type: 'walk', who: 'hero', to: { x: 15, y: 20 } },
      walk('hero', 'l'),
      face('hero', 'down'),
      partyOut('gendo'),
      { type: 'say', lines: ['玄道「……ゼンマイに閉じ込められておった魂が、青い光になって昇っていく」'] },
      faceTo('kenkyujoRansai', 'hero'),
      {
        type: 'say',
        lines: [
          '蘭斎「……わしが、若林蘭斎だ。からくりで、人を重い仕事から解き放てると……そう信じて、鷲尾様の金を受け取った」',
          '蘭斎「だが、からくりを動かすには、人の魂をゼンマイに巻き込まねばならなかった。気づいたときには、もう引き返せなかった」',
          '蘭斎「……せめて、これを持っていってくれ。魂のゼンマイをほどき、閉じ込めた魂を解き放つ祝詞だ」',
        ],
      },
      walk('gendo', 'd'),
      faceTo('gendo', 'kenkyujoRansai'),
      { type: 'say', lines: ['玄道は、蘭斎から祝詞の書き付けを受け取った。'] },
      { type: 'say', lines: ['玄道「……確かに預かった。おぬしの学問は、わしらが正しく使おう」'] },
      { type: 'say', lines: ['蘭斎「出島の、あの書は……美しかった。わしは、ただ……」'] },
      wait(600),
      { type: 'say', lines: ['ドサッ……'] },
      vanish('kenkyujoRansai'),
      partyOut('orin'),
      { type: 'say', lines: ['お凛〈悲〉「……蘭斎さん？」'] },
      { type: 'say', lines: ['玄道〈悲〉「……逝きおった。南無阿弥陀仏、南無阿弥陀仏……」'] },
      { type: 'walk', who: 'kasumi', to: { x: 16, y: 20 } },
      face('kasumi', 'down'),
      { type: 'say', lines: ['霞「……机の帳面は、あたしが預かっていくよ。からくりをどこへ送ったか、書いてあるかもしれない」'] },
      {
        type: 'say',
        lines: ['{hero}「……蘭斎さんの祝詞、無駄にはしねえ。長崎へ戻ろう」'],
        linesF: ['{hero}「……蘭斎さんの祝詞、無駄にはしないよ。長崎へ戻ろう」'],
      },
      ...partyIn('kasumi'),
      ...partyIn('gendo'),
      ...partyIn('orin'),
      { type: 'setFlag', flag: 'nanbanOzutsuDefeated' },
      { type: 'setFlag', flag: 'noritoLearned' },
    ],
  },
  // 第 7 章「百万石の影」
  /** 長崎の湊の北前船の船頭（第 6 章を終えると金沢へ渡れる）。 */
  kitamaeNagasaki: { id: 'kitamaeNagasaki', steps: KITAMAE_NAGASAKI },
  /** 北前船に乗ったとき。 */
  kitamaeEnter: { id: 'kitamaeEnter', steps: KITAMAE_ENTER },
  /**
   * 北前船の船首のくびれ (31, 10〜11)。船幽霊と海坊主が船を襲う。倒すと金沢の湊に着く（kanazawaArrived）。
   * 船幽霊は船首の両舷 (33, 9)(33, 12) から這い上がり、海坊主は船首の先 (37, 10) に身を起こす。船頭は後ろから駆けつける。
   */
  funayureiAttack: {
    id: 'funayureiAttack',
    steps: [
      face('hero', 'right'),
      enemyActor('funayureiA', 'funayurei', 33, 9),
      enemyActor('funayureiB', 'funayurei', 33, 12),
      walk('funayureiA', 'd'),
      walk('funayureiB', 'u'),
      {
        type: 'if',
        flag: 'funayureiMet',
        then: [{ type: 'say', lines: ['船幽霊「柄杓を……柄杓を貸せえ……」'] }],
        else: [
          partyOut('kasumi'),
          { type: 'say', lines: ['霞「……日が暮れたとたんに、この霧だ。見な、波間から青白い手が何本も伸びてくる」', '船幽霊「柄杓を……柄杓を貸せえ……」'] },
          ...partyIn('kasumi'),
        ],
      },
      // 船頭が船尾のほうから駆けつける
      actor('funayureiSendo', 'npc_sendo', 26, 10, 'right'),
      walk('funayureiSendo', 'rr'),
      {
        type: 'if',
        flag: 'funayureiMet',
        then: [{ type: 'say', lines: ['船頭「また出よったか！ 底を抜いた柄杓を投げるけえ、追い払うてくれ！」'] }],
        else: [
          {
            type: 'say',
            lines: ['船頭「船幽霊じゃ！ 柄杓を渡したら、それで水を汲み入れて船を沈めよる！」', '船頭「底を抜いた柄杓を投げるけえ、そのあいだに追い払うてくれ！」'],
          },
          { type: 'setFlag', flag: 'funayureiMet' },
        ],
      },
      // 霧の向こうの海から、黒い大きな影が船首の先へ身を起こす
      enemyActor('funayureiUmibozu', 'umibozu', 37, 10),
      walk('funayureiUmibozu', 'l'),
      { type: 'battle', enemies: ['funayurei', 'umibozu', 'funayurei'], level: 22 },
      vanish('funayureiUmibozu'),
      vanish('funayureiA'),
      vanish('funayureiB'),
      {
        type: 'say',
        lines: ['船頭「助かったわい。見い、底の抜けた柄杓で、空しく水をすくいながら消えていきよった」', '船頭「……ありゃあ、海で死んだ者の魂よ。成仏できずに、仲間を探しとるんじゃ」'],
      },
      partyOut('gendo'),
      face('gendo', 'right'),
      { type: 'say', lines: ['玄道「……南無。迷わず、行くべきところへ行かれよ」'] },
      ...partyIn('gendo'),
      { type: 'say', lines: ['船頭「霧も晴れた。この先は穏やかな海じゃ。あと幾日かで、加賀の金石の湊に着くけえの」'] },
      { type: 'setFlag', flag: 'kanazawaArrived' },
      { type: 'warp', mapId: 'kanazawa', x: 4, y: 22 },
    ],
  },
  /** 金沢の湊の北前船の船頭。長崎へ戻れる。 */
  kitamaeKanazawa: {
    id: 'kitamaeKanazawa',
    steps: [
      { type: 'say', lines: ['船頭「わしの船は、しばらく金石の湊に泊まっとるけえ。長崎へ戻るなら乗せちゃるよ」'] },
      {
        type: 'choice',
        prompt: '長崎へ戻るか？',
        options: [
          {
            label: '長崎へ戻る',
            steps: [
              { type: 'say', lines: ['船頭「よっしゃ、帆を上げえ！ 日本海を西へ回って、長崎の湊まで送っちゃるけえ」'] },
              { type: 'warp', mapId: 'nagasaki', x: 14, y: 22 },
            ],
          },
          { label: '金沢に残る', steps: [{ type: 'say', lines: ['船頭「そうかね。用があったら、また来んさい」'] }] },
        ],
      },
    ],
  },
  /** 金沢に入ったとき。初めてなら町の紹介、殿様を救い出したあとなら第 7 章の終わり。 */
  kanazawaEnter: {
    id: 'kanazawaEnter',
    steps: [
      {
        type: 'if',
        flag: 'tonoRescued',
        // 褒美は一度だけ（onEnter の unless に加え、イベントの側でも chapter7Cleared を見る）
        then: [{ type: 'if', flag: 'chapter7Cleared', then: [], else: KANAZAWA_CHAPTER_END }],
        else: [{ type: 'if', flag: 'kanazawaIntro', then: [], else: KANAZAWA_ARRIVE }],
      },
    ],
  },
  /** 長町の武家屋敷の老臣・長瀬左近。殿様が地下に閉じ込められていると聞き、兼六園の抜け穴を教わる（sakonHeard。兼六園の番人がどく）。 */
  sakonMeet: {
    id: 'sakonMeet',
    steps: [
      {
        type: 'if',
        flag: 'tonoRescued',
        then: [{ type: 'say', lines: ['長瀬左近「殿をお救いくだされたこと、生涯忘れませぬ」'] }],
        else: [
          {
            type: 'if',
            flag: 'sakonHeard',
            then: [{ type: 'say', lines: ['長瀬左近「抜け穴の入口は、霞ヶ池の北の岸の、二本足の灯籠じゃ。殿を……殿を頼みましたぞ」'] }],
            else: [
              partyOut('kasumi'),
              faceTo('kasumi', 'sakon'),
              {
                type: 'say',
                lines: [
                  '長瀬左近「……公儀の隠密どのか。よう来てくだされた」',
                  '長瀬左近「殿が病に伏せられたのは、半年前のこと。それからは、家老の土橋玄蕃が何もかも取り仕切っておる」',
                  '長瀬左近「月に一度、殿は大広間にお出ましになる。だが、あれは殿ではない。……三十年お仕えしたわしには分かる」',
                  '長瀬左近「目が、笑わぬのだ。わしが幼いころの殿の話をしても、ただうなずくばかりで」',
                  '霞「からくりの影武者だね。じゃあ、本物の殿様は」',
                  '長瀬左近「城の地下の蔵に閉じ込められておるのだろう。玄蕃が江戸から呼んだ職人どもが、毎晩そこへ下りていく」',
                  '長瀬左近「城の門は玄蕃の手の者が固めておる。だが、昔から言い伝えがある。兼六園から、城の地下へ通じる抜け穴じゃ」',
                  '長瀬左近「霞ヶ池の北の岸に、二本足の灯籠……徽軫灯籠がある。その奥のどこかに入口があるはずじゃ」',
                  '長瀬左近「兼六園の番人には、わしから話を通しておこう。……殿を、お救いくだされ」',
                ],
              },
              ...partyIn('kasumi'),
              { type: 'setFlag', flag: 'sakonHeard' },
            ],
          },
        ],
      },
    ],
  },
  /**
   * 兼六園の徽軫灯籠 (18, 8)。家老の配下の忍びに襲われ、退けると抜け穴の石 (14, 3)(15, 3) がどく（nukeanaOpen）。
   * 主人公は灯籠の北・東・南のどれかに立って調べるので、忍びとからくり藩士はそのどこにも重ならない池の北の道 (16, 9)(21, 9) と北の道 (19, 5) に出る。
   */
  kotojiToro: {
    id: 'kotojiToro',
    steps: [
      {
        type: 'if',
        flag: 'nukeanaOpen',
        then: [{ type: 'say', lines: ['二本の足で池をまたぐ灯籠だ。片方の足の下の石が、ずれたままになっている。'] }],
        else: [
          { type: 'say', lines: ['池をまたぐように、二本の足で立つ石の灯籠。琴の糸を支える琴柱に似ていることから、徽軫灯籠と呼ばれる。'] },
          partyOut('kasumi'),
          {
            type: 'say',
            lines: ['霞「……見な。片方の足のまわりだけ、雪が踏み固められてる。足もとの石を押してみな」'],
          },
          // 主人公が足もとの石を押すと、北の木立の奥で重い音がする
          { type: 'say', lines: ['ゴトリ……'] },
          face('kasumi', 'up'),
          { type: 'say', lines: ['霞「北の木立の奥で、何か動いたね」'] },
          ...partyIn('kasumi'),
          enemyActor('toroShinobiA', 'kagaShinobi', 15, 9),
          enemyActor('toroShinobiB', 'kagaShinobi', 22, 9),
          enemyActor('toroHanshi', 'karakuriHanshi', 19, 4),
          walk('toroShinobiA', 'r'),
          walk('toroShinobiB', 'l'),
          walk('toroHanshi', 'd'),
          { type: 'say', lines: ['加賀の忍び「そこまでだ。ご家老の秘密を知った者は、生かして帰さぬ」'] },
          { type: 'battle', enemies: ['kagaShinobi', 'karakuriHanshi', 'kagaShinobi'], level: 22 },
          // 忍びは煙玉で逃げ、からくり藩士は崩れ落ちる
          { type: 'say', lines: ['ボウッ……'] },
          vanish('toroShinobiA'),
          vanish('toroShinobiB'),
          vanish('toroHanshi'),
          // 灯籠の仕掛けで動いた石が、北の細い道の脇へずれる
          vanish('nukeIshiW'),
          vanish('nukeIshiE'),
          partyOut('gendo'),
          face('gendo', 'up'),
          {
            type: 'say',
            lines: [
              '玄道「見よ。北の細い道をふさいでおった苔むした石がずれて、地の底へ下りる石段が口を開けておる」',
              '玄道「城の地下へ通じる抜け穴、か。……左近どのの言い伝えは、まことであったな」',
            ],
          },
          ...partyIn('gendo'),
          { type: 'setFlag', flag: 'nukeanaOpen' },
        ],
      },
    ],
  },
  /**
   * からくり蔵の影武者の間。殿様に化けていたからくりの影武者（中ボス）。倒すと玄道が祝詞で魂のゼンマイを解き放つ。
   * 主人公は間への細い入口 (3〜4, 21) にいる。上座の人形 (9, 24) が立ち上がり、入口の前 (5, 24) まで歩いてくる。
   */
  kagemusha: {
    id: 'kagemusha',
    steps: [
      face('hero', 'down'),
      // 上座の人形が、影武者として立ち上がる（人形の置物を、戦闘の影武者の姿に置き換える）
      vanish('kagemushaZa'),
      enemyActor('guraKagemusha', 'kagemusha', 9, 24),
      {
        type: 'if',
        flag: 'kagemushaMet',
        then: [walk('guraKagemusha', 'llll'), { type: 'say', lines: ['影武者「控えよ……控えよ……」'] }],
        else: [
          partyOut('kasumi'),
          faceTo('kasumi', 'guraKagemusha'),
          { type: 'say', lines: ['霞「上座に、殿様の装束を着た人が座ってる……」', '影武者「……何者じゃ。余は加賀の主であるぞ。控えよ」'] },
          walk('guraKagemusha', 'llll'),
          // 胸の奥から、ゼンマイの巻ける音がする
          { type: 'say', lines: ['ギリ……ギリ……'] },
          partyOut('orin'),
          faceTo('orin', 'guraKagemusha'),
          {
            type: 'say',
            lines: ['お凛「声は殿様でも、口が声より遅れて動いてるよ。それに、胸の奥からゼンマイの音がする」', '霞「大広間でうなずいてたのは、あんただね」', '影武者「控えよ。控えよ。控えよ……」'],
          },
          ...partyIn('orin'),
          ...partyIn('kasumi'),
          { type: 'setFlag', flag: 'kagemushaMet' },
        ],
      },
      { type: 'battle', enemies: ['kagemusha'], level: 24 },
      partyOut('gendo'),
      faceTo('gendo', 'guraKagemusha'),
      {
        type: 'say',
        lines: [
          '玄道「胸が割れて、青く光るゼンマイがのぞいておる。……ゼンマイに、人の名を書いた札が下がっておるな」',
          '玄道「蘭斎の祝詞を使うときが来たようだ」',
          '玄道「……ゼンマイに縛られし御魂よ、ほどけて天へ昇られよ」',
        ],
      },
      // ゼンマイがほどけ、青い光が天井へ昇っていく。影武者は抜け殻になって崩れる
      { type: 'say', lines: ['ガシャン……'] },
      vanish('guraKagemusha'),
      { type: 'say', lines: ['玄道「囚われておった魂は、これで行くべきところへ行ける」'] },
      ...partyIn('gendo'),
      partyOut('orin'),
      { type: 'say', lines: ['お凛「殿様はどこだい。この先かい」'] },
      ...partyIn('orin'),
      partyOut('kasumi'),
      face('kasumi', 'right'),
      { type: 'say', lines: ['霞「東の通路の奥から、人の気配がする。……それと、嫌な気配もね」'] },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'kagemushaDefeated' },
    ],
  },
  /**
   * 座敷牢の前で待つ夜叉丸（第 7 章のボス）。倒すと、鷲尾に家族を人質に取られていたことを明かし、息を引き取る。
   * 主人公は座敷牢の前の細い通路 (31, 25〜26) にいる。夜叉丸 (34, 25) が 1 歩進み出て立ちはだかる。
   */
  yashamaruBattle: {
    id: 'yashamaruBattle',
    steps: [
      face('hero', 'right'),
      walk('yashamaruGura', 'l'),
      {
        type: 'if',
        flag: 'yashamaruMet',
        then: [{ type: 'say', lines: ['夜叉丸「何度来ても同じこと。……この先へは、行かせぬ」'] }],
        else: [
          partyOut('kasumi'),
          faceTo('kasumi', 'yashamaruGura'),
          { type: 'say', lines: ['霞〈怒〉「黒い狩衣に、般若の面……夜叉丸！」', '夜叉丸「駿府、京……そして加賀。よくもここまで追ってきたものだ」'] },
          ...partyIn('kasumi'),
          { type: 'say', lines: ['{hero}「殿様を返してもらおうか」'], linesF: ['{hero}「殿様を返してもらうよ」'] },
          { type: 'say', lines: ['夜叉丸「それはできぬ。この牢の主を江戸へ連れ帰るのが、おれに課せられた役目だ」'] },
          partyOut('gendo'),
          faceTo('gendo', 'yashamaruGura'),
          { type: 'say', lines: ['玄道「おぬしほどの術者が、なぜ鷲尾の走狗に甘んじる」', '夜叉丸「……問答は無用」'] },
          ...partyIn('gendo'),
          { type: 'setFlag', flag: 'yashamaruMet' },
        ],
      },
      { type: 'battle', enemies: ['yashamaru'], level: 25 },
      // 夜叉丸は膝をつき、割れた面の下から、やつれた男の顔がのぞく
      { type: 'say', lines: ['ピシッ……'] },
      { type: 'say', lines: ['夜叉丸「……強いな。駿府で会ったときとは、別人だ」'] },
      partyOut('gendo'),
      faceTo('gendo', 'yashamaruGura'),
      {
        type: 'say',
        lines: [
          '玄道「胸もとに、青く光るゼンマイの印……。これは、鷲尾の呪の印か。しくじれば命を巻き取る仕掛けを、己の体に」',
          '夜叉丸「鷲尾は、おれの妻と娘を屋敷に閉じ込めている。言うことを聞かねば、ふたりの魂をゼンマイに巻くと」',
          '夜叉丸「妻は、もう……。だが、娘のお鈴は、まだ生きているはずだ」',
          '夜叉丸「頼む。お鈴を……鷲尾の屋敷から……」',
          '玄道「……蘭斎どのの祝詞よ。この者を縛るゼンマイを、ほどきたまえ」',
          '夜叉丸「……ああ、軽い。これほど体が軽いのは、何年ぶりか……」',
        ],
      },
      // 夜叉丸は静かに目を閉じ、崩れ落ちる
      { type: 'say', lines: ['ドサッ……'] },
      vanish('yashamaruGura'),
      ...partyIn('gendo'),
      partyOut('kasumi'),
      { type: 'say', lines: ['霞〈悲〉「……約束するよ。あんたの娘は、あたしたちが連れ出す」'] },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'yashamaruDefeated' },
    ],
  },
  /** 座敷牢の加賀の殿様。救い出すと、抜け穴から城へ戻る（tonoRescued。城の門の前へ warp し、金沢に入ったときの第 7 章の終わりへ）。 */
  tonoRescue: {
    id: 'tonoRescue',
    steps: [
      { type: 'say', lines: ['殿様「……そなたらは、玄蕃の手の者ではないな」'] },
      partyOut('kasumi'),
      faceTo('kasumi', 'kagaTono'),
      {
        type: 'say',
        lines: [
          '霞「公儀の……いや、ただの渡世人の一行さ。長瀬左近さまに頼まれて、お迎えにあがりました」',
          '殿様「左近が……。あの頑固者め、まだわしを見捨てておらなんだか」',
        ],
      },
      ...partyIn('kasumi'),
      { type: 'say', lines: ['{hero}「下がっていてくだせえ。格子の錠を断ち切りやす」'], linesF: ['{hero}「下がっていてください。格子の錠を断ち切るよ」'] },
      { type: 'say', lines: ['ガキン！'] },
      { type: 'say', lines: ['殿様「礼を言う。……城へ戻るぞ。わしの顔を、家臣どもに見せてやらねばならぬ」'] },
      { type: 'setFlag', flag: 'tonoRescued' },
      { type: 'warp', mapId: 'kanazawa', x: 28, y: 15 },
    ],
  },
  // 第 8 章「火事と喧嘩は江戸の華」
  /** 仙台に入ったとき。初めてなら町の紹介。 */
  sendaiEnter: { id: 'sendaiEnter', steps: [{ type: 'if', flag: 'sendaiIntro', then: [], else: SENDAI_ARRIVE }] },
  /**
   * 片平丁の屋敷の伊達の重臣・片平帯刀。鷲尾が東北の藩にも影武者を送ろうとしていると聞き、刺客を退ける（sendaiHeard。江戸に入れる）。
   * 帯刀は西の座敷 (5, 2) にいる。刺客は東の庭から、座敷と庭の間の通り口 (10, 3) を抜けて座敷の東 (8〜9, 2〜4) へ入ってくる
   * （主人公は帯刀の隣に立っているので、刺客の道は主人公の立つマスを通らない）。
   */
  tatewaki: {
    id: 'tatewaki',
    steps: [
      {
        type: 'if',
        flag: 'sendaiHeard',
        then: [{ type: 'say', lines: ['片平帯刀「江戸へ急がれよ。奥州街道を南へ下れば、江戸はすぐじゃ。神田の源兵衛によろしくな」'] }],
        else: [
          partyOut('kasumi'),
          faceTo('tatewaki', 'kasumi'),
          {
            type: 'say',
            lines: [
              '片平帯刀「……公儀の隠密どのか。加賀のことは、飛脚の便りで聞いておる」',
              '片平帯刀「実はな、伊達の家中にも江戸から妙な客人が来た。殿の御姿を、細かく写させてくれと」',
              '片平帯刀「からくりの人形を作るためであろう。追い返したが、それから屋敷が見張られておる」',
              '霞「鷲尾は、東北の藩にも影武者を送り込むつもりだね」',
              '片平帯刀「左様。諸国の大名をからくりにすげ替え、天下をその手に収める腹なのだ」',
              'ガサッ……！',
            ],
          },
          ...partyIn('kasumi'),
          // 庭の植え込みから、加賀の忍び 2 人とからくり同心が座敷へ踏み込んでくる
          enemyActor('tatewakiShinobiA', 'kagaShinobi', 12, 3),
          walk('tatewakiShinobiA', 'llllu'),
          enemyActor('tatewakiDoshin', 'karakuriDoshin', 12, 3),
          walk('tatewakiDoshin', 'llll'),
          enemyActor('tatewakiShinobiB', 'kagaShinobi', 12, 3),
          walk('tatewakiShinobiB', 'llld'),
          faceTo('tatewaki', 'tatewakiDoshin'),
          { type: 'say', lines: ['加賀の忍び「片平帯刀、その口を閉じてもらう」'] },
          { type: 'battle', enemies: ['kagaShinobi', 'karakuriDoshin', 'kagaShinobi'], level: 25 },
          // 忍びは煙玉で逃げ、からくり同心は崩れ落ちる
          { type: 'say', lines: ['ボンッ！'] },
          vanish('tatewakiShinobiA'),
          vanish('tatewakiShinobiB'),
          { type: 'say', lines: ['ガシャン……。'] },
          vanish('tatewakiDoshin'),
          faceTo('tatewaki', 'hero'),
          {
            type: 'say',
            lines: [
              '片平帯刀「……助かった。そなたらの腕、確かに見届けた」',
              '片平帯刀「江戸の上様のことは、わしも案じておる。上様のお声を、もう一年も誰も聞いておらぬ」',
              '片平帯刀「江戸に入られたら、神田の長屋の大家・源兵衛を訪ねられよ。昔、わしの家に仕えた者じゃ」',
              '片平帯刀「これは路銀じゃ。奥州街道を南へ下れば、江戸に着く」',
              '片平帯刀から 2000 文を受け取った。',
            ],
          },
          { type: 'giveMoney', amount: 2000 },
          { type: 'setFlag', flag: 'sendaiHeard' },
        ],
      },
    ],
  },
  // 寄り道の浜松（第 2 章、大井川を渡ったあと）
  /** 浜松に入ったとき。初めてなら町の紹介。 */
  hamamatsuEnter: { id: 'hamamatsuEnter', steps: [{ type: 'if', flag: 'hamamatsuIntro', then: [], else: HAMAMATSU_ARRIVE }] },
  /** 砂丘の若衆頭・源太。初凧を取り返してほしいと頼み（hamamatsuTakoAsked）、取り返したら（hamamatsuTakoFound）凧揚げ合戦（hamamatsuTakoFlown）とお礼（hamamatsuTakoDone）。 */
  hamamatsuGenta: {
    id: 'hamamatsuGenta',
    steps: [
      {
        type: 'if',
        flag: 'hamamatsuTakoDone',
        then: [{ type: 'say', lines: ['源太「初凧が揚がりゃ、その子は丈夫に育つ。遠州の空っ風みてえに、たくましくな」'] }],
        else: [
          {
            type: 'if',
            flag: 'hamamatsuTakoFlown',
            then: [
              { type: 'say', lines: ['源太「弥平じいさんから、糸巻きを預かってるぜ。受け取ってくんな」'] },
              ...hamamatsuTakoReward('源太「……なんだ、まだ荷物がいっぱいじゃねえか。糸巻きは預かっとくから、また寄ってくんな」'),
            ],
            else: [
              {
                type: 'if',
                flag: 'hamamatsuTakoFound',
                then: HAMAMATSU_TAKO_GASSEN,
                else: [
                  {
                    type: 'if',
                    flag: 'hamamatsuTakoAsked',
                    then: [{ type: 'say', lines: ['源太「初凧は、砂丘を西へ行った松林の奥だ。……頼んだぜ」'] }],
                    else: HAMAMATSU_TAKO_ASK,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  /**
   * 中田島の松林（MAPS.hamamatsuMatsubayashi）の奥の浪人 (4, 5)。源太の頼みを聞いたあとなら、浪人・雲助・獺（Lv7）を退けて初凧を取り返す（hamamatsuTakoFound）。
   * 雲助と獺は空き地の東 (8, 4)(8, 6) から出てきて (6, 4)(6, 6) に並ぶ。
   * 負けた雲助と獺は東へ逃げる。浪人の四方はどれも主人公が立っているかもしれないマスなので、浪人は歩かせずに足音で逃げたことを見せる。
   */
  hamamatsuTako: {
    id: 'hamamatsuTako',
    steps: [
      {
        type: 'if',
        flag: 'hamamatsuTakoAsked',
        then: [
          { type: 'say', lines: ['浪人「なんだ、てめえ。この凧は、おれたちが拾ったもんだ。返してほしけりゃ、酒手を置いていきな」'] },
          enemyActor('takoKumosuke', 'kumosuke', 8, 4),
          enemyActor('takoKawauso', 'kawauso', 8, 6),
          { type: 'walk', who: 'takoKumosuke', path: 'll', wait: false },
          walk('takoKawauso', 'll'),
          {
            type: 'say',
            lines: ['{hero}「拾ったもんなら、持ち主に返すのが筋だろう。初凧は、子どもの祝いの凧だぜ」', '浪人「うるせえ！ やっちまえ！」'],
            linesF: ['{hero}「拾ったもんなら、持ち主に返すのが筋だろう。初凧は、子どもの祝いの凧だよ」', '浪人「うるせえ！ やっちまえ！」'],
          },
          { type: 'battle', enemies: ['oihagiRonin', 'kumosuke', 'kawauso'], level: 7 },
          { type: 'say', lines: ['浪人「ちっ、覚えてやがれ！」'] },
          { type: 'walk', who: 'takoKumosuke', path: 'rr', wait: false },
          walk('takoKawauso', 'rr'),
          vanish('takoKumosuke'),
          vanish('takoKawauso'),
          // 浪人の四方はどれも主人公が立っているかもしれないマスなので、浪人は背を向け、足音を残して松の陰へ消える
          face('takoRonin', 'left'),
          { type: 'say', lines: ['ダダダッ……！'] },
          vanish('takoRonin'),
          {
            type: 'say',
            lines: [
              '{hero}「松の枝に引っかかってるのが初凧だな。……真ん中に太い筆で『初　喜之助』。こいつだ」',
              '{hero}「砂丘で源太が待ってる。届けてやろう」',
            ],
            linesF: [
              '{hero}「松の枝に引っかかってるのが初凧だね。……真ん中に太い筆で『初　喜之助』。これだ」',
              '{hero}「砂丘で源太が待ってる。届けてあげよう」',
            ],
          },
          { type: 'setFlag', flag: 'hamamatsuTakoFound' },
        ],
        else: [{ type: 'say', lines: ['浪人「なんだ、てめえ。見せもんじゃねえぞ。とっとと失せな」'] }],
      },
    ],
  },
  hamamatsuChest1: chest('hamamatsuChest1', 'kintsuba', '金創膏'),
  hamamatsuChest2: chest('hamamatsuChest2', 'unagi', 'うなぎの蒲焼'),
  hamamatsuChest3: chest('hamamatsuChest3', 'kitsukegusuri', '気付け薬'),
  hamamatsuChest4: chest('hamamatsuChest4', 'michishirube', '道しるべの札'),
  // 寄り道の彦根（第 3 章、名古屋から京へ向かう途中）
  /** 彦根に入ったとき。初めてなら町の紹介。 */
  hikoneEnter: { id: 'hikoneEnter', steps: [{ type: 'if', flag: 'hikoneIntro', then: [], else: HIKONE_ARRIVE }] },
  /** 具足師の甚兵衛。盗まれた赤備えの具足を探してほしいと頼み（hikoneGusokuAsked）、取り返したら（hikoneGusokuFound）届けてお礼（hikoneGusokuReturned → hikoneGusokuDone）。 */
  hikoneJinbei: {
    id: 'hikoneJinbei',
    steps: [
      {
        type: 'if',
        flag: 'hikoneGusokuDone',
        then: [{ type: 'say', lines: ['甚兵衛「朱の漆はな、塗っては乾かし、塗っては乾かし。手間を惜しまねえから、何十年経っても色があせねえんでさ」'] }],
        else: [
          {
            type: 'if',
            flag: 'hikoneGusokuReturned',
            then: [{ type: 'say', lines: ['甚兵衛「お待ちしておりやした。お預かりしていた籠手でさ」'] }, ...HIKONE_GUSOKU_REWARD],
            else: [
              {
                type: 'if',
                flag: 'hikoneGusokuFound',
                then: HIKONE_GUSOKU_RETURN,
                else: [
                  {
                    type: 'if',
                    flag: 'hikoneGusokuAsked',
                    then: [{ type: 'say', lines: ['甚兵衛「佐和山へは、長屋の南の道を抜けて東の山道を登ってくだせえ。……どうか、お頼み申しやす」'] }],
                    else: HIKONE_GUSOKU_ASK,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  /**
   * 佐和山（MAPS.hikoneSawayama）の頂の城跡の盗人 (18, 2)。甚兵衛の頼みを聞いたあとなら、赤備えに怒って現れる亡霊武者 2（Lv11）を退けて具足を取り返す（hikoneGusokuFound）。
   * 城跡へは南の細い道 (18, 4) からしか上がれず、盗人の西は具足櫃 (17, 2) なので、主人公は盗人の南 (18, 3) か東 (19, 2) に立っている。
   * 亡霊武者は崩れた石垣の陰の西 (16, 2) と東 (20, 3) に立ち上がる。勝ったら主人公が南東 (19, 3) へ下がり、盗人は南の道を逃げていく。
   */
  hikoneGusoku: {
    id: 'hikoneGusoku',
    steps: [
      {
        type: 'if',
        flag: 'hikoneGusokuAsked',
        then: [
          {
            type: 'say',
            lines: ['盗人「な、なんだ、てめえ。この具足は、おれが京で高く売りさばくんだ。邪魔をするな！」', '{hero}「そいつは、具足師が命がけで預かってる品だ。返してもらうぜ」'],
            linesF: ['盗人「な、なんだ、てめえ。この具足は、おれが京で高く売りさばくんだ。邪魔をするな！」', '{hero}「そいつは、具足師が命がけで預かってる品だよ。返してもらおうか」'],
          },
          enemyActor('sawayamaBoreiW', 'boreiMusha', 16, 2),
          wait(300),
          enemyActor('sawayamaBoreiE', 'boreiMusha', 20, 3),
          wait(300),
          { type: 'say', lines: ['盗人「ひっ、亡霊……！ た、助けてくれえ！」'] },
          // 盗人は石垣のほうを向いてうずくまる
          face('gusokuNusubito', 'up'),
          { type: 'say', lines: ['亡霊武者「……赤備え……井伊の赤鬼……この城を……返せ……」'] },
          { type: 'battle', enemies: ['boreiMusha', 'boreiMusha'], level: 11 },
          // 亡霊武者は崩れた石垣のほうを振り返って頭を下げ、消える
          face('sawayamaBoreiW', 'up'),
          face('sawayamaBoreiE', 'up'),
          { type: 'say', lines: ['亡霊武者「……見事……なり……」'] },
          vanish('sawayamaBoreiW'),
          vanish('sawayamaBoreiE'),
          { type: 'walk', who: 'hero', to: { x: 19, y: 3 } },
          faceTo('gusokuNusubito', 'hero'),
          { type: 'say', lines: ['盗人「も、もう盗みなんかしねえ！ 具足は返す！」'] },
          walk('gusokuNusubito', 'dddddd'),
          vanish('gusokuNusubito'),
          {
            type: 'say',
            lines: ['{hero}「朱の具足櫃は無事だ。甚兵衛の工房へ届けてやろう」'],
            linesF: ['{hero}「朱の具足櫃は無事だね。甚兵衛の工房へ届けてあげよう」'],
          },
          { type: 'setFlag', flag: 'hikoneGusokuFound' },
        ],
        else: [{ type: 'say', lines: ['盗人「なんだ、てめえ。この山に用はねえはずだ。とっとと失せな」'] }],
      },
    ],
  },
  hikoneChest1: chest('hikoneChest1', 'mankintan', '万金丹'),
  hikoneChest2: chest('hikoneChest2', 'itokiriMochi', '糸切餅'),
  hikoneChest3: chest('hikoneChest3', 'kintsuba', '金創膏'),
  hikoneChest4: chest('hikoneChest4', 'michishirube', '道しるべの札'),
  // 寄り道の熊本（第 6 章、島原の湊から渡し船で渡る）
  /** 熊本に入ったとき。初めてなら町の紹介。 */
  kumamotoEnter: { id: 'kumamotoEnter', steps: [{ type: 'if', flag: 'kumamotoIntro', then: [], else: KUMAMOTO_ARRIVE }] },
  /** 井戸掘りの茂作。井戸が涸れていくわけを確かめてほしいと頼み（kumamotoIdoAsked）、古井戸の底のからくりを壊したら（kumamotoIdoFound）お礼（kumamotoIdoReturned → kumamotoIdoDone）。 */
  kumamotoMosaku: {
    id: 'kumamotoMosaku',
    steps: [
      {
        type: 'if',
        flag: 'kumamotoIdoDone',
        then: [{ type: 'say', lines: ['茂作「井戸ってのは、掘って終わりじゃねえ。毎年さらって、石を組み直して、水の道を守ってやるんでさ」'] }],
        else: [
          {
            type: 'if',
            flag: 'kumamotoIdoReturned',
            then: [{ type: 'say', lines: ['茂作「お待ちしておりやした。お預かりしていた鍔でさ」'] }, ...KUMAMOTO_IDO_REWARD],
            else: [
              {
                type: 'if',
                flag: 'kumamotoIdoFound',
                then: KUMAMOTO_IDO_RETURN,
                else: [
                  {
                    type: 'if',
                    flag: 'kumamotoIdoAsked',
                    then: [{ type: 'say', lines: ['茂作「清正公の古井戸は、お城の北東の、大銀杏の根元でさ。……どうか、お頼み申しやす」'] }],
                    else: KUMAMOTO_IDO_ASK,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  /** 大銀杏の根元の清正の古井戸。茂作の頼みを聞いたあとなら、石段を下りて地の下の水脈へ（からくりを壊したあとも下りられる）。 */
  kumamotoFuruido: {
    id: 'kumamotoFuruido',
    steps: [
      {
        type: 'if',
        flag: 'kumamotoIdoAsked',
        then: [
          // からくりを壊したあとも、取り残した葛籠のために下りられる
          {
            type: 'if',
            flag: 'kumamotoIdoFound',
            then: [{ type: 'say', lines: ['古井戸の底から、水の流れる音が聞こえてくる。'] }],
            else: [{ type: 'say', lines: ['石を組んだ古い井戸だ。内側の壁に石段が切ってあり、暗い底へ続いている。……ごうん、ごうんと、鉄の鳴る音がする。'] }],
          },
          {
            type: 'choice',
            prompt: '古井戸の底へ下りるか？',
            options: [
              {
                label: '下りる',
                steps: [{ type: 'warp', mapId: 'kiyomasaIdo', x: 3, y: 2 }],
              },
              { label: 'やめておく', steps: [] },
            ],
          },
        ],
        else: [{ type: 'say', lines: ['石を組んだ古い井戸だ。内側の壁に石段が切ってあり、暗い底へ続いている。……底の方から、かすかに鉄の鳴る音がする。'] }],
      },
    ],
  },
  /**
   * 古井戸の底の水脈のからくり (29, 20)。外法使いと南蛮兵 3（Lv21）を退けて壊すと、城下の井戸に水が戻る（kumamotoIdoFound）。
   * 主人公はからくりの西・東・北・南のどれかに立っている。外法使いは北東の岩陰 (31, 17) に、南蛮兵は西 (26, 18)(26, 21) と東 (31, 19) に出て、
   * どれも主人公の立てるマスに重ならない。勝ったあと、仲間が一人ずつ出てからくりを止める。
   */
  kumamotoKarakuri: {
    id: 'kumamotoKarakuri',
    steps: [
      {
        type: 'say',
        lines: [
          '地の下を流れる水脈に、鉄の筒が何本も突き立てられている。歯車が回るたびに、水が吸い上げられ、岩の割れ目へ捨てられていく。',
        ],
      },
      enemyActor('mizuGeho', 'gehoTsukai', 31, 17),
      {
        type: 'say',
        lines: [
          '外法使い「……見られたか。だが、もう遅い。あと十日もすれば、熊本の城の井戸はすべて涸れる」',
          '外法使い「水の手を断たれた城など、籠城もできぬ張り子の虎よ。肥後の殿様も、鷲尾さまに逆らえなくなる」',
        ],
      },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「やっぱり鷲尾か。からくりで城を落とすつもりだね」'] },
      ...partyIn('kasumi'),
      {
        type: 'say',
        lines: ['{hero}〈怒〉「清正公の井戸を、てめえらの好きにはさせねえ！」', '外法使い「南蛮兵ども、こやつらを水脈に沈めてしまえ！」'],
        linesF: ['{hero}〈怒〉「清正公の井戸を、あんたたちの好きにはさせないよ！」', '外法使い「南蛮兵ども、こやつらを水脈に沈めてしまえ！」'],
      },
      enemyActor('mizuHeiA', 'nanbanHei', 26, 18),
      enemyActor('mizuHeiB', 'nanbanHei', 26, 21),
      enemyActor('mizuHeiC', 'nanbanHei', 31, 19),
      wait(300),
      { type: 'battle', enemies: ['gehoTsukai', 'nanbanHei', 'nanbanHei', 'nanbanHei'], level: 21 },
      // 外法使いは煙とともに消え、南蛮兵は崩れる
      { type: 'say', lines: ['ボンッ！'] },
      vanish('mizuGeho'),
      { type: 'say', lines: ['ガシャン、ガシャン……。'] },
      vanish('mizuHeiA'),
      vanish('mizuHeiB'),
      vanish('mizuHeiC'),
      // 仲間が一人ずつ出て、からくりを止める
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「歯車の間に、鎖を噛ませてやる！」', 'ギギ……ギギギ……。'] },
      ...partyIn('kasumi'),
      partyOut('orin'),
      { type: 'say', lines: ['お凛「鉄の筒は、あたしが撃ち抜くよ！」', 'ダーン！'] },
      ...partyIn('orin'),
      partyOut('gendo'),
      { type: 'say', lines: ['玄道「とどめじゃ！」', 'ガシャーン！', 'ごぼ、ごぼごぼ……。'] },
      { type: 'say', lines: ['玄道「吸い上げられていた水が、水脈へ戻っていく。これで城下の井戸にも、水が戻るじゃろう」'] },
      ...partyIn('gendo'),
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「茂作に知らせてやろう。井戸端で待ってるはずだ」'] },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'kumamotoIdoFound' },
    ],
  },
  /** 熊本の川尻の湊の渡し船の船頭。長崎か、島原の湊へ渡れる。 */
  kumamotoWatashi: {
    id: 'kumamotoWatashi',
    steps: [
      { type: 'say', lines: ['船頭「有明の海を渡る船じゃ。長崎へも、島原へも乗せちゃるけん」'] },
      {
        type: 'choice',
        prompt: '船頭「どこへ渡るね？」',
        options: [
          {
            label: '長崎へ渡る',
            steps: [
              { type: 'say', lines: ['船頭「よっしゃ、有明の海を抜けて、天草の島々を回って長崎の湊まで送っちゃるけん」'] },
              { type: 'warp', mapId: 'nagasaki', x: 14, y: 22 },
            ],
          },
          {
            label: '島原へ渡る',
            steps: [
              { type: 'say', lines: ['船頭「よっしゃ、有明の海を西へ渡って、島原の湊まで送っちゃるけん」'] },
              { type: 'warp', mapId: 'world', x: 17, y: 53 },
            ],
          },
          { label: 'やめておく', steps: [{ type: 'say', lines: ['船頭「用があったら、また声をかけんしゃい」'] }] },
        ],
      },
    ],
  },
  kumamotoChest1: chest('kumamotoChest1', 'konpeito', '金平糖'),
  kumamotoChest2: chest('kumamotoChest2', 'karashiRenkon', '辛子蓮根'),
  kumamotoChest3: chest('kumamotoChest3', 'hangontan', '反魂丹'),
  // 寄り道の会津若松（第 8 章、仙台のあと）
  /** 会津若松に入ったとき。初めてなら町の紹介。 */
  aizuEnter: { id: 'aizuEnter', steps: [{ type: 'if', flag: 'aizuIntro', then: [], else: AIZU_ARRIVE }] },
  /** 日新館の庭の什長・新之助。平太を探してほしいと頼み（aizuJuuAsked）、平太が戻ったら（heitaFound）什の裁き（aizuJuuJudged）とお礼（aizuJuuDone）。 */
  aizuJuu: {
    id: 'aizuJuu',
    steps: [
      {
        type: 'if',
        flag: 'aizuJuuDone',
        then: [{ type: 'say', lines: ['新之助「ならぬことはならぬものです。……でも、何がならぬのかは、自分の頭で考えねばならぬ。平太に教わりました」'] }],
        else: [
          {
            type: 'if',
            flag: 'aizuJuuJudged',
            then: [{ type: 'say', lines: ['新之助「旅のお方、先ほどのお礼です。お受け取りください」'] }, ...AIZU_JUU_REWARD],
            else: [
              {
                type: 'if',
                flag: 'heitaFound',
                then: AIZU_JUU_END,
                else: [
                  {
                    type: 'if',
                    flag: 'aizuJuuAsked',
                    then: [{ type: 'say', lines: ['新之助「平太は飯盛山へ行ったはずです。町の東の外れの、細い山道を登った先です。……どうか、お願いいたします」'] }],
                    else: AIZU_JUU_ASK,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  /**
   * 飯盛山（MAPS.aizuIimoriyama）の頂の洞門の前の平太 (19, 2)。新之助の頼みを聞いたあとなら、送り狼の群れ（Lv25）を退けて連れ帰る（heitaFound）。
   * 主人公は平太の西・東・南のどれかに立っている。送り狼と雪女は山道の南の木の陰 (16〜20, 4〜5) から出てきて、主人公の立てるマスに重ならない。
   * 勝つと平太は主人公のところへ歩いて一行に加わる（日新館の庭の平太 heitaHome が現れる）。
   */
  heita: {
    id: 'heita',
    steps: [
      {
        type: 'if',
        flag: 'aizuJuuAsked',
        then: [
          {
            type: 'say',
            lines: ['{hero}「おい、坊主。こんな雪の中にうずくまって、草の根なんか掘ってどうした」', '少年「く、来るな！ ……あれ、人？」'],
            linesF: ['{hero}「ちょいと、坊や。こんな雪の中にうずくまって、草の根なんか掘ってどうしたんだい」', '少年「く、来るな！ ……あれ、人？」'],
          },
          partyOut('kasumi'),
          { type: 'say', lines: ['霞「平太だね。什の仲間が心配してたよ」', 'グルルル……。'] },
          ...partyIn('kasumi'),
          enemyActor('iimoriOkamiA', 'okuriOkami', 20, 5),
          walk('iimoriOkamiA', 'u'),
          enemyActor('iimoriOkamiB', 'okuriOkami', 18, 5),
          enemyActor('iimoriOkamiC', 'okuriOkami', 17, 5),
          enemyActor('iimoriYukiOnna', 'yukiOnna', 16, 5),
          partyOut('gendo'),
          { type: 'say', lines: ['玄道「わしらの後ろへ下がっておれ、小僧！」'] },
          ...partyIn('gendo'),
          { type: 'battle', enemies: ['okuriOkami', 'okuriOkami', 'yukiOnna', 'okuriOkami'], level: 25 },
          vanish('iimoriOkamiA'),
          vanish('iimoriOkamiB'),
          vanish('iimoriOkamiC'),
          vanish('iimoriYukiOnna'),
          {
            type: 'say',
            lines: [
              '平太「……ありがとうございます。母上が、冬の初めからずっと咳が止まらないのです」',
              '平太「黄連の根を煎じれば効くと聞きました。でも、御薬園の薬草は殿の御用のもので、町の者には分けられぬと」',
              '平太「飯盛山なら生えていると聞いて……皆に話せば止められると思って、用があると嘘をつきました」',
            ],
          },
          partyOut('orin'),
          { type: 'say', lines: ['お凛〈悲〉「……おっかさんのためか。それじゃ、叱れないね」'] },
          ...partyIn('orin'),
          partyOut('kasumi'),
          { type: 'say', lines: ['霞「でも、嘘をついたことは、自分の口で什の皆に話すんだよ」', '平太「……はい。ならぬことは、ならぬものですから」'] },
          { type: 'say', lines: ['霞「さあ、山を下りよう。日新館の庭で、新之助たちが待ってるよ」'] },
          ...partyIn('kasumi'),
          // 平太は黄連の根を懐にしまい、一行と山を下りる
          { type: 'walk', who: 'heita', to: 'hero' },
          vanish('heita'),
          { type: 'setFlag', flag: 'heitaFound' },
        ],
        else: [{ type: 'say', lines: ['少年「……知らない人と話してはならぬと、母上に言われております。放っておいてくだされ」'] }],
      },
    ],
  },
  /** 江戸に入ったとき。初めてなら人相書きの高札、火車からくりを倒したあとなら第 8 章の終わり。 */
  edoEnter: {
    id: 'edoEnter',
    steps: [
      {
        type: 'if',
        flag: 'kashaDefeated',
        // 褒美は一度だけ（onEnter の unless に加え、イベントの側でも chapter8Cleared を見る）
        then: [{ type: 'if', flag: 'chapter8Cleared', then: [], else: EDO_CHAPTER_END }],
        else: [{ type: 'if', flag: 'edoIntro', then: [], else: EDO_ARRIVE }],
      },
    ],
  },
  /** 神田の長屋の大家・源兵衛。一行をかくまい、鼠の小吉のことを教える（edoHideout。長屋に小吉が現れる）。 */
  nagayaOoya: {
    id: 'nagayaOoya',
    steps: [
      {
        type: 'if',
        flag: 'edoHideout',
        then: [
          {
            type: 'if',
            flag: 'kokichiReport',
            then: [{ type: 'say', lines: ['大家「お鈴ちゃんの面倒は、うちで見るよ。安心して行っておいで」'] }],
            else: [{ type: 'say', lines: ['大家「奥の部屋は好きに使っておくれ。小吉は、井戸の西の家にいるよ」'] }],
          },
        ],
        else: [
          {
            type: 'say',
            lines: [
              '大家「……片平さまのお使いかい。話は飛脚で聞いてるよ。さあ、早く中へ」',
              '大家「わしは源兵衛。若いころ、片平さまのお屋敷で下働きをしておったのさ」',
              '大家「長屋の者は口が堅い。お上の手先なんぞに、客人を売ったりはせんよ」',
              '大家「それに、この長屋には、あんたらの役に立ちそうなやつがいる。鼠の小吉ってえ、手癖の悪い男さ」',
              '大家「今夜は帰ってるはずだ。井戸の西の家を訪ねてごらん」',
            ],
          },
          { type: 'setFlag', flag: 'edoHideout' },
        ],
      },
    ],
  },
  /**
   * 長屋の鼠の小吉 (23, 15)。初めは追っ手を退けて江戸城と鷲尾の屋敷の偵察を頼み（kokichiMet）、火消しの頭に会ったあとは偵察の知らせ（kokichiReport）。
   * 初めて会うとき、主人公は小吉の西・東・南のどれかに立っている。追っ手は路地の東 (32, 16〜18) から駆けてきて (25〜26, 16〜18) で止まり、主人公の立てるマスを通らない。
   */
  kokichi: {
    id: 'kokichi',
    steps: [
      {
        type: 'if',
        flag: 'kokichiMet',
        then: [
          {
            type: 'if',
            flag: 'kokichiReport',
            then: [{ type: 'say', lines: ['小吉「御城の中は、からくりの番兵だらけだ。入るときは、おれが抜け道を案内するぜ」'] }],
            else: [
              {
                type: 'if',
                flag: 'hikeshiMet',
                then: KOKICHI_REPORT,
                else: [{ type: 'say', lines: ['小吉「おれは夜更けを待って御城へ忍び込む。そのあいだに、番屋の頭に会っといてくんな」'] }],
              },
            ],
          },
        ],
        else: [
          { type: 'say', lines: ['小吉「おっと、すまねえ！ 追われてるんだ、かくまってくんな！」'] },
          // 路地の東から、十手を構えたからくり同心と、派手な着物の旗本奴が駆けてくる
          enemyActor('kokichiDoshinA', 'karakuriDoshin', 32, 16),
          enemyActor('kokichiYakko', 'hatamotoYakko', 32, 17),
          enemyActor('kokichiDoshinB', 'karakuriDoshin', 32, 18),
          { type: 'walk', who: 'kokichiDoshinA', path: 'lllllll', wait: false },
          { type: 'walk', who: 'kokichiDoshinB', path: 'llllll', wait: false },
          walk('kokichiYakko', 'llllll'),
          { type: 'say', lines: ['旗本奴「鼠め、どこへ逃げた！ ……なんだ、てめえらは」'] },
          { type: 'battle', enemies: ['karakuriDoshin', 'hatamotoYakko', 'karakuriDoshin'], level: 25 },
          // からくり同心は崩れ、旗本奴は路地の東へ逃げていく
          { type: 'say', lines: ['ガシャン、ガシャン……。'] },
          vanish('kokichiDoshinA'),
          vanish('kokichiDoshinB'),
          { type: 'say', lines: ['旗本奴「お、覚えてやがれ！」'] },
          walk('kokichiYakko', 'rrrrrr'),
          vanish('kokichiYakko'),
          {
            type: 'say',
            lines: [
              '小吉「助かったぜ。おれは小吉。世間じゃ、鼠の小吉なんて呼ばれてる」',
              '小吉「鷲尾の息のかかった旗本の屋敷から、千両箱をいただいてきたのさ。長屋の連中に配ろうと思ってね」',
            ],
          },
          partyOut('kasumi'),
          faceTo('kasumi', 'kokichi'),
          {
            type: 'say',
            lines: [
              '霞「……ちょうどいい。あんたの腕を見込んで頼みがある」',
              '霞「江戸城に忍び込んで、上様の姿を確かめてきてほしい。からくりの影武者かもしれないんだ」',
              '小吉「御城だって？ ……へへ、そいつはでかい仕事だ。面白え、乗った！」',
            ],
          },
          ...partyIn('kasumi'),
          partyOut('gendo'),
          faceTo('gendo', 'kokichi'),
          { type: 'say', lines: ['玄道「もうひとつ頼みたい。鷲尾の屋敷に、お鈴という娘が捕らわれておるはずだ」', '小吉「鷲尾の屋敷なら、御城の帰りに寄れるぜ。任せときな」'] },
          ...partyIn('gendo'),
          { type: 'say', lines: ['小吉「おれが戻るまで、長屋の東の番屋を訪ねてくんな。火消しの頭は、おれの幼なじみだ」'] },
          { type: 'setFlag', flag: 'kokichiMet' },
        ],
      },
    ],
  },
  /** 火消しの番屋の頭・銀次。小吉の知り合いと分かると力を貸すと約束する（hikeshiMet）。 */
  hikeshiGashira: {
    id: 'hikeshiGashira',
    steps: [
      {
        type: 'if',
        flag: 'kokichiMet',
        then: [
          {
            type: 'if',
            flag: 'hikeshiMet',
            then: [
              {
                type: 'if',
                flag: 'kashaDefeated',
                then: [{ type: 'say', lines: ['頭「あんたらのおかげで、神田の火は消えた。江戸の火消しを代表して、礼を言うぜ」'] }],
                else: [
                  {
                    type: 'if',
                    flag: 'taikaStarted',
                    then: [{ type: 'say', lines: ['頭「火元は神田だ！ 北東の町木戸から入ってくんな。おれたちも、すぐに追いつく！」'] }],
                    else: [{ type: 'say', lines: ['頭「小吉が御城から戻るのを待ちな。長屋で落ち合うんだろう」'] }],
                  },
                ],
              },
            ],
            else: [
              {
                type: 'say',
                lines: [
                  '頭「小吉の知り合いだって？ おう、あいつから聞いてるぜ」',
                  '頭「おれは、この組を預かる頭の銀次だ。……この頃、江戸のあちこちで付け火が続いててな」',
                  '頭「火元にはいつも、車輪で轢いたような焼け跡が残ってる。ただの火付けじゃねえ」',
                ],
              },
              partyOut('kasumi'),
              faceTo('kasumi', 'hikeshiGashira'),
              { type: 'say', lines: ['霞「からくりの仕業だね。鷲尾の」'] },
              ...partyIn('kasumi'),
              {
                type: 'say',
                lines: ['頭「鷲尾だか何だか知らねえが、江戸の町を焼くやつは、おれたち火消しが許さねえ」', '頭「何かあったら半鐘を鳴らす。そのときは、手を貸してくんな」'],
              },
              { type: 'setFlag', flag: 'hikeshiMet' },
            ],
          },
        ],
        else: [{ type: 'say', lines: ['頭「見ねえ顔だな。……悪いが、今は余所者に構ってる暇はねえんだ」'] }],
      },
    ],
  },
  /** 日本橋の八百屋の娘お春。小吉の知らせのあと、火付けを止めると火付け盗賊が現れ、神田から火が出る（taikaStarted）。 */
  oharu: {
    id: 'oharu',
    steps: [
      {
        type: 'if',
        flag: 'taikaStarted',
        then: [
          {
            type: 'if',
            flag: 'kashaDefeated',
            then: [{ type: 'say', lines: ['お春「わたし、なんてことを……。火が消えて、本当によかった。清さまにも、ちゃんと謝りに行きます」'] }],
            else: [{ type: 'say', lines: ['お春「神田のほうから火が……。わたしが、あんな人の言うことを聞いたから……」'] }],
          },
        ],
        else: [
          {
            type: 'if',
            flag: 'kokichiReport',
            then: OHARU_FIRE,
            else: [{ type: 'say', lines: ['八百屋の娘「……え？ あ、いらっしゃいまし……」', '八百屋の娘「…………」'] }],
          },
        ],
      },
    ],
  },
  /**
   * 神田の大火の町に初めて入ったとき。江戸の北東の町木戸から、大火の町の西の口 (1, 32) に入ったところで始まる（町に入る道はここだけで、全滅すると江戸へ戻る）。
   * 主人公が 1 歩進み (2, 32)、隣の火消し（3, 33）が家を引き倒しながら声をかける。霞は主人公の南 (2, 33) に出る。
   */
  taikaEnter: {
    id: 'taikaEnter',
    steps: [
      walk('hero', 'r'),
      { type: 'say', lines: ['ガラガラ……ドドーン！'] },
      faceTo('taikaHikeshi1', 'hero'),
      { type: 'say', lines: ['火消し「梁が落ちたぞ、下がってな！ 鳶口で風下の長屋を引き倒して、火の通り道をふさぐんだ！」'] },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「ひどい火の海だ……。火元は東の奥、火の見櫓のあたりだ。火の粉に気をつけて！」'] },
      ...partyIn('kasumi'),
      { type: 'setFlag', flag: 'taikaEntered' },
    ],
  },
  /**
   * 火の見櫓の下の火元で待つ火車からくり（第 8 章のボス）。倒すと火が鎮まり、長屋へ戻る（kashaDefeated。江戸に入ると第 8 章の終わり）。
   * 火の見櫓の下の広場の口 (44, 25) に乗ると始まる。火車からくりは広場 (45〜48, 26〜31) の奥から出てきて (46, 26) に止まる。
   * 主人公の隣で空くのは西 (43, 25) と東 (45, 25) だけなので、仲間は一人ずつ出る。勝つと火消しの頭が西の通りから駆けつけて (43, 25) に立つ。
   */
  kashaKarakuri: {
    id: 'kashaKarakuri',
    steps: [
      face('hero', 'right'),
      enemyActor('kasha', 'kashaKarakuri', 47, 28),
      walk('kasha', 'uul'),
      {
        type: 'if',
        flag: 'kashaMet',
        then: [{ type: 'say', lines: ['ギリ、ギリギリ……ゴウッ！'] }],
        else: [
          partyOut('kasumi'),
          {
            type: 'say',
            lines: [
              '霞「見な、火の見櫓の下だ。火を噴く車輪の真ん中に、猫とも鬼ともつかない顔がある」',
              '霞「からくりの腕で、燃える油を撒き散らしてる！」',
            ],
          },
          ...partyIn('kasumi'),
          partyOut('gendo'),
          { type: 'say', lines: ['玄道「火車……死者を地獄へ運ぶという妖怪を、からくりで作ったか」'] },
          ...partyIn('gendo'),
          partyOut('kasumi'),
          { type: 'say', lines: ['霞「あいつを止めないと、火はいつまでも消えない！」'] },
          ...partyIn('kasumi'),
          { type: 'setFlag', flag: 'kashaMet' },
        ],
      },
      { type: 'battle', enemies: ['kashaKarakuri'], level: 28 },
      // 車輪が止まり、燃える油の樽が地に落ちて砕ける
      { type: 'say', lines: ['ギギ……ガシャーン！'] },
      vanish('kasha'),
      actor('kashaGashira', 'npc_hikeshi', 38, 25, 'right'),
      walk('kashaGashira', 'rrrrr'),
      {
        type: 'say',
        lines: [
          '頭「からくりを止めてくれたか！ 今だ、野郎ども！ 風下の家を引き倒せ！ 火の通り道をふさぐんだ！」',
          '頭「夜明けまでには、きっと火を鎮めてみせる。あんたらは長屋へ戻って休んでくんな」',
        ],
      },
      { type: 'setFlag', flag: 'kashaDefeated' },
      { type: 'warp', mapId: 'edo', x: 22, y: 16 },
    ],
  },
  // 終章「将軍の間」
  /**
   * 江戸の大手門の門番。第 8 章を終えると、加賀の手形で門を開ける（otemonOpen。門番がどき、橋から江戸城の本丸御殿へ入れる）。
   * 門番は大手門の橋 (32, 8) に立ち、主人公は南の (32, 9) から話す（北の (32, 7) は本丸御殿への出口）。
   * 門番が開門を呼ばわると扉が開き、門番は橋を北へ扉の前 (32, 6) まで歩いて消える（扉 (32, 5) のマスには歩いて入れないので、門の内へ入ったことにする）。
   */
  otemon: {
    id: 'otemon',
    steps: [
      {
        type: 'if',
        flag: 'chapter8Cleared',
        then: [
          {
            type: 'say',
            lines: [
              '門番「止まれ。……その御手形は、加賀さまの」',
              '門番「火事で焼け出された者を、御城の中へ入れておる。加賀さまの御手形とあらば、通られよ」',
            ],
          },
          face('edoMonban', 'up'),
          { type: 'say', lines: ['門番「開門ーっ！」', 'ギギギ……ゴゴン……！'] },
          walk('edoMonban', 'uu'),
          vanish('edoMonban'),
          { type: 'setFlag', flag: 'otemonOpen' },
        ],
        else: [{ type: 'say', lines: ['門番「ここは江戸城の大手門。お触れにより、何人も通すことはならぬ」'] }],
      },
    ],
  },
  /**
   * 江戸城の本丸御殿に初めて入ったとき。小吉が待っていて、御金蔵の鍵のことを教える。
   * 本丸御殿へは大手門の橋からしか入れず（全滅すると江戸へ戻る）、主人公は玄関 (20, 29) に立つ。
   * 小吉は玄関の脇の持ち場 (17, 27) から主人公の西 (19, 29) まで歩いてきて話し、持ち場へ戻る。
   */
  edojoEnter: {
    id: 'edojoEnter',
    steps: [
      walk('kokichiJo', 'rrdd'),
      faceTo('kokichiJo', 'hero'),
      faceTo('hero', 'kokichiJo'),
      {
        type: 'say',
        lines: [
          '小吉「待ってたぜ。御殿の中は、からくりの番兵だらけだ」',
          '小吉「上様の御座所は、大奥を抜けた先の松の廊下の、そのまた奥だ。だが、大奥の御錠口をからくりの番兵がふさいでる」',
          '小吉「番兵を止める鍵は、西の御金蔵にあるらしい。蔵の千両箱は、みんな鷲尾がからくりを作るための金だとよ」',
        ],
      },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「御金蔵で鍵を探して、大奥を抜けるんだね」'] },
      ...partyIn('kasumi'),
      { type: 'say', lines: ['小吉「おれはここで見張っとく。外へ文を出すなら、声をかけてくんな」'] },
      walk('kokichiJo', 'uull'),
      face('kokichiJo', 'down'),
      { type: 'setFlag', flag: 'edojoEntered' },
    ],
  },
  /**
   * 大奥への御錠口 (20, 14)。御金蔵で鍵を回す（okaneguraCleared）までは、両脇 (19, 15)・(21, 15) のからくりの番兵が押し戻す。
   * 番兵が槍を交差させる音と声のあと、主人公を南の (20, 17) へ戻し、霞が出て話す。
   */
  jouguchi: {
    id: 'jouguchi',
    steps: [
      { type: 'say', lines: ['ガシャン！', 'からくりの番兵「ギギ……御錠口ヨリ先ハ、何人モ通サヌ」'] },
      { type: 'warp', mapId: 'edojo', x: 20, y: 17 },
      face('hero', 'up'),
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「小吉の言ってた番兵だね。止める鍵は、西の御金蔵か」'] },
      ...partyIn('kasumi'),
    ],
  },
  /**
   * 御金蔵の口で待つからくり旗本。勝つと金太が凧で舞い降り、御錠口の番兵を止める鍵を回す（okaneguraCleared）。
   * 御金蔵 (1〜10, 15〜24) から東の広間へ抜ける 1 マスの口 (11, 22) に乗ると始まる（主人公は西を向く）。
   * からくり旗本は蔵の奥 (10, 20) から歩いてきて主人公の西 (10, 22) をふさぎ、からくり御庭番が蔵の中 (9, 23) に出る。
   * 勝つと崩れて消え、金太が天窓から凧で蔵の中 (10, 20) に降りて主人公の西まで歩いてくる。話し終えると凧で天窓へ戻る。
   */
  okanegura: {
    id: 'okanegura',
    steps: [
      face('hero', 'left'),
      enemyActor('hatamoto', 'karakuriHatamoto', 10, 20),
      walk('hatamoto', 'dd'),
      enemyActor('oniwaban', 'karakuriOniwaban', 9, 23),
      {
        type: 'if',
        flag: 'okaneguraMet',
        then: [{ type: 'say', lines: ['からくり旗本「ギギ……斬ル」'] }],
        else: [
          { type: 'say', lines: ['からくり旗本「ギギ……御金蔵ニ近ヅク者ハ、斬ル」'] },
          partyOut('orin'),
          { type: 'say', lines: ['お凛「鷲尾は、この蔵の金でからくりを作ってたんだね」'] },
          ...partyIn('orin'),
          { type: 'setFlag', flag: 'okaneguraMet' },
        ],
      },
      { type: 'battle', enemies: ['karakuriHatamoto', 'karakuriOniwaban', 'karakuriHatamoto'], level: 28 },
      { type: 'say', lines: ['ギギ……ガシャーン！'] },
      vanish('hatamoto'),
      vanish('oniwaban'),
      // 天窓から大きな凧が舞い降りる
      { type: 'say', lines: ['バサバサッ……！'] },
      actor('kinta', 'kinta', 10, 20, 'down'),
      walk('kinta', 'dd'),
      {
        type: 'say',
        lines: [
          '金太「よっと！ 間に合った！ 久しぶりだな、{hero}！」',
          '金太「江戸の空で凧を揚げてたら、御城の騒ぎが見えてさ。名古屋の恩を返しに来たぜ」',
          '金太「からくりの番兵の鍵ってのは、これだろ？ 天窓の上の梁に隠してあった。……こいつを、こう回すと」',
          'カチリ。……ジジジ、シュルルル……',
          '金太「ほら、遠くでゼンマイのほどける音がしたろ。これで御錠口の番兵は止まったはずだ」',
          '金太「それから、ほら、傷の手当てくらいはさせてくれよ。名古屋の薬屋で分けてもらった薬だ」',
        ],
      },
      { type: 'heal' },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「……ふう、生き返ったよ。ありがとね、金太」'] },
      ...partyIn('kasumi'),
      { type: 'say', lines: ['金太「おれは凧で先回りしとく。松の廊下の手前で会おうぜ！」'] },
      walk('kinta', 'uu'),
      { type: 'say', lines: ['バサバサッ……！'] },
      vanish('kinta'),
      { type: 'setFlag', flag: 'okaneguraCleared' },
    ],
  },
  /**
   * 松の廊下への口で待つ大奥の化け猫。勝つと銀次の火消しが駆けつけ、御鈴廊下で追っ手を食い止める（ookuCleared）。
   * 大奥の東の奥の細い口 (35, 0〜6) の (35, 5) に乗ると始まる（主人公は北を向く）。口の奥 (35, 3) に打掛の女が背を向けて立ち、
   * 振り向くと化け猫（戦闘の画像）に変わる。主人公の隣で空くのは北 (35, 4) と南 (35, 6) だけなので、仲間は一人ずつ出る。
   * 勝つと化け猫は煙で消え、火消しの頭が御鈴廊下の持ち場 (37, 9) から主人公の南 (35, 6) まで駆けてきて、話し終えると持ち場へ戻る。
   */
  ookuBakeneko: {
    id: 'ookuBakeneko',
    steps: [
      face('hero', 'up'),
      {
        type: 'if',
        flag: 'ookuMet',
        then: [enemyActor('bakeneko', 'ookuBakeneko', 35, 3), { type: 'say', lines: ['化け猫「にゃあ……懲りぬ者どもよ」'] }],
        else: [
          actor('uchikake', 'npc_maiko', 35, 3, 'up'),
          { type: 'say', lines: ['……'] },
          face('uchikake', 'down'),
          { type: 'say', lines: ['にゃあ……'] },
          vanish('uchikake'),
          enemyActor('bakeneko', 'ookuBakeneko', 35, 3),
          { type: 'say', lines: ['化け猫「大奥の主は、このわらわじゃ。鷲尾さまのお邪魔はさせぬ」'] },
          partyOut('gendo'),
          { type: 'say', lines: ['玄道〈怒〉「奥女中を化け猫に変えたか。鷲尾め、どこまで外道を」'] },
          ...partyIn('gendo'),
          { type: 'setFlag', flag: 'ookuMet' },
        ],
      },
      { type: 'battle', enemies: ['ookuBakeneko', 'karakuriOniwaban', 'ookuBakeneko', 'onryo'], level: 28 },
      { type: 'say', lines: ['化け猫「ふぎゃあ……！」', 'ボンッ！'] },
      vanish('bakeneko'),
      { type: 'say', lines: ['……えいさー、えいさー！'] },
      actor('ginjiKashira', 'npc_hikeshi', 37, 9, 'up'),
      walk('ginjiKashira', 'uullu'),
      face('hero', 'down'),
      {
        type: 'say',
        lines: [
          '頭「おう、やっぱりここだったか！ 江戸の火消し、銀次の組の見参だ！」',
          '頭「御城の外で、からくりの追っ手が集まってやがる。御鈴廊下は、おれたちが食い止める！」',
          '頭「若い衆に、水と握り飯を持たせてきた。食って、ひと息つきな」',
        ],
      },
      { type: 'heal' },
      partyOut('kasumi'),
      { type: 'say', lines: ['霞「恩に着るよ、頭」'] },
      ...partyIn('kasumi'),
      { type: 'say', lines: ['頭「なあに、礼は鷲尾を叩きのめしてからだ。行ってきな！」'] },
      walk('ginjiKashira', 'drrdd'),
      vanish('ginjiKashira'),
      { type: 'setFlag', flag: 'ookuCleared' },
    ],
  },
  /** 松の廊下に初めて入ったとき。伝馬町の牢から抜けてきた榊兵庫が待っている（matsuEntered。休息の間に兵庫が現れる）。 */
  matsuEnter: {
    id: 'matsuEnter',
    steps: [
      {
        type: 'say',
        lines: [
          '大奥を抜けた先に、長い廊下が続いていた。襖には、見事な松の絵が描かれている。',
          '玄道「松の廊下……。この廊下で刀を抜けば、身分を問わず切腹と聞く」',
          '……廊下の手前の小部屋から、聞き覚えのある声がした。',
          '兵庫「待っていたぞ、{hero}殿」',
          'お凛「兵庫さま！ 奉行所に名乗り出たって……」',
          '兵庫「大坂の一件の裁きのため、江戸の伝馬町の牢に移されていた。昨夜、小吉という男が牢の錠を開けてな」',
          '兵庫「鷲尾を討つまでの間だけ、牢を抜ける。……裁きは、そのあとで受ける」',
          '兵庫「傷を負ったら、この休息の間へ戻れ。手当ては、わしが引き受けよう」',
        ],
      },
      { type: 'setFlag', flag: 'matsuEntered' },
    ],
  },
  /** 松の廊下の休息の間の榊兵庫。話しかけると全回復する。 */
  hyogoRoka: {
    id: 'hyogoRoka',
    steps: [
      { type: 'say', lines: ['兵庫「傷を見せろ。……これでいい。鷲尾のところまで、あとひと息だ」'] },
      { type: 'heal' },
      { type: 'say', lines: ['一行の傷が癒えた。'] },
    ],
  },
  /**
   * 松の廊下の中ほどで待つ鬼塚典膳（終章の中ボス）。廊下 (1〜34, 18〜19) の (20, 18) か (20, 19) に乗ると始まる（主人公は東を向く）。
   * 典膳は (22, 18) に立っていて、1 歩西 (21, 18) へ進み出て話す。勝つと刀を納める音のあと、崩れ落ちて消える（tenzenDefeated で廊下から消える）。
   */
  tenzen: {
    id: 'tenzen',
    steps: [
      face('hero', 'right'),
      walk('tenzenRoka', 'l'),
      {
        type: 'if',
        flag: 'tenzenMet',
        then: [{ type: 'say', lines: ['典膳「懲りぬ奴らよ。何度来ようと、この廊下は通さぬ」'] }],
        else: [
          {
            type: 'say',
            lines: [
              '典膳「鬼塚典膳。鷲尾さまの御用人を務めておる」',
              '典膳「この廊下で刀を抜けば切腹。……だが、わしは鷲尾さまより、抜く許しを得ておる」',
              '典膳「人の将軍は、病み、老い、気まぐれに国を乱す。からくりの将軍なら、千年でも国を治めよう」',
            ],
          },
          partyOut('kasumi'),
          { type: 'say', lines: ['霞〈怒〉「そのために、さらった人の魂をゼンマイに詰めたのかい」'] },
          ...partyIn('kasumi'),
          { type: 'say', lines: ['典膳「天下の泰平のためよ。……問答は無用。抜け！」'] },
          { type: 'setFlag', flag: 'tenzenMet' },
        ],
      },
      { type: 'battle', enemies: ['onizukaTenzen'], level: 30 },
      {
        type: 'say',
        lines: [
          '典膳「……見事。わしの居合が、届かぬとは……」',
          '典膳「鷲尾さまは、上様の影武者と己の体を、つなぐおつもりだ……。止められるものなら……止めてみよ……」',
          'チン……。',
          'ドサッ……',
        ],
      },
      vanish('tenzenRoka'),
      { type: 'setFlag', flag: 'tenzenDefeated' },
    ],
  },
  /**
   * 将軍の間の口で待つ鷲尾（終章のボス）。勝つと（washioDefeated）、鷲尾が将軍の影武者と一つになったからくり大権現と続けて戦う。
   * 大権現を倒すと（daigongenDefeated）エンディング（gameCleared）。大権現に負けて出直すと、鷲尾とは戦わずに大権現とだけ戦う。
   */
  shogunNoMa: {
    id: 'shogunNoMa',
    steps: [
      {
        type: 'if',
        flag: 'washioDefeated',
        then: [{ type: 'say', lines: ['将軍の間の上座で、からくり大権現が金色の腕を広げて待ち構えていた。'] }],
        else: [
          {
            type: 'if',
            flag: 'washioMet',
            then: [{ type: 'say', lines: ['鷲尾「まだ懲りぬか、下郎ども」'] }],
            else: [
              {
                type: 'say',
                lines: [
                  '将軍の間。上座に、上様が端然と座している。そのかたわらに、白髪まじりの老人が立っていた。',
                  '鷲尾「よくぞ参った。わしが老中、鷲尾但馬守宗衡である」',
                  '鷲尾「見よ、この上様を。病みもせず、老いもせず、愚かな下知も下さぬ。まことの名君よ」',
                  '霞〈怒〉「本物の上様はどこだ！」',
                  '鷲尾「御座の間の奥の座敷牢で、生かしてある。からくりの上様の手本としてな」',
                  'お凛〈怒〉「おとっつぁんは、あんたの仲間になるのを断って殺された。……権六に、そう聞いたよ」',
                  '鷲尾「辰五郎か。惜しい男であった。清水の湊を、からくりの荷の受け口にしたかったのだがな」',
                  '玄道「さらった者の魂をゼンマイに封じ、天下を人形で治める。……それが、おぬしの泰平か」',
                  '鷲尾「人の世は乱れる。乱れぬのは、からくりだけよ。……そなたらも、ゼンマイの中で泰平を見るがよい」',
                  '{hero}「長い旅の決着だ。……その泰平とやら、叩き斬らせてもらうぜ」',
                ],
                linesF: [
                  '将軍の間。上座に、上様が端然と座している。そのかたわらに、白髪まじりの老人が立っていた。',
                  '鷲尾「よくぞ参った。わしが老中、鷲尾但馬守宗衡である」',
                  '鷲尾「見よ、この上様を。病みもせず、老いもせず、愚かな下知も下さぬ。まことの名君よ」',
                  '霞〈怒〉「本物の上様はどこだ！」',
                  '鷲尾「御座の間の奥の座敷牢で、生かしてある。からくりの上様の手本としてな」',
                  'お凛〈怒〉「おとっつぁんは、あんたの仲間になるのを断って殺された。……権六に、そう聞いたよ」',
                  '鷲尾「辰五郎か。惜しい男であった。清水の湊を、からくりの荷の受け口にしたかったのだがな」',
                  '玄道「さらった者の魂をゼンマイに封じ、天下を人形で治める。……それが、おぬしの泰平か」',
                  '鷲尾「人の世は乱れる。乱れぬのは、からくりだけよ。……そなたらも、ゼンマイの中で泰平を見るがよい」',
                  '{hero}「長い旅の決着だよ。……その泰平とやら、叩き斬らせてもらうからね」',
                ],
              },
              { type: 'setFlag', flag: 'washioMet' },
            ],
          },
          { type: 'battle', enemies: ['washio'], level: 31 },
          {
            type: 'say',
            lines: [
              '鷲尾「ぐ……人の身では、ここまでか……」',
              '鷲尾「ならば、人の身など捨ててくれよう！ からくりの上様よ……わしと一つになれ！」',
              '鷲尾が上座の上様の背に手をかけると、上様の胸が開き、無数の歯車があふれ出した。',
              '歯車は鷲尾の体を呑み込み、金色の腕を何本も生やして、天井まで膨れ上がっていく……！',
              '霞「なんだ、あれは……！」',
              '鷲尾「これぞ、からくり大権現！ 天下を千年治める、神の御姿よ！」',
            ],
          },
          { type: 'setFlag', flag: 'washioDefeated' },
        ],
      },
      ...DAIGONGEN_BATTLE,
      ...EPILOGUE,
    ],
  },
  edojoChest1: chest('edojoChest1', 'aoiNagawaki', '葵の長脇差'),
  edojoChest2: chest('edojoChest2', 'aoiZutsu', '葵の御筒'),
  edojoChest3: chest('edojoChest3', 'sakuraMochi', '桜餅'),
  edojoChest4: chest('edojoChest4', 'nyoraiShakujo', '如来錫杖'),
  edojoChest5: chest('edojoChest5', 'oniwabanKodachi', '御庭番小太刀'),
  edojoChest6: chest('edojoChest6', 'ninjin', '朝鮮人参'),
  matsuChest1: chest('matsuChest1', 'kitsukegusuri', '気付け薬'),
  matsuChest2: chest('matsuChest2', 'konpeito', '金平糖'),
  sendaiChest1: chest('sendaiChest1', 'zundaMochi', 'ずんだ餅'),
  sendaiChest2: chest('sendaiChest2', 'kitsukegusuri', '気付け薬'),
  aizuChest1: chest('aizuChest1', 'ninjin', '朝鮮人参'),
  aizuChest2: chest('aizuChest2', 'mishirazuGaki', '身不知柿'),
  aizuChest3: chest('aizuChest3', 'bocha', '加賀棒茶'),
  aizuChest4: chest('aizuChest4', 'michishirube', '道しるべの札'),
  edoChest1: chest('edoChest1', 'sakuraMochi', '桜餅'),
  edoChest2: chest('edoChest2', 'hangontan', '反魂丹'),
  taikaChest1: chest('taikaChest1', 'kitsukegusuri', '気付け薬'),
  taikaChest2: chest('taikaChest2', 'sashikoBanten', '刺子半纏'),
  taikaChest3: chest('taikaChest3', 'ninjin', '朝鮮人参'),
  taikaChest4: chest('taikaChest4', 'konpeito', '金平糖'),
  taikaChest5: chest('taikaChest5', 'kunitomoZutsu', '国友筒'),
  kitamaeChest: chest('kitamaeChest', 'kakimeshi', '牡蠣飯'),
  kenrokuChest1: chest('kenrokuChest1', 'bocha', '加賀棒茶'),
  kenrokuChest2: chest('kenrokuChest2', 'yukiShozoku', '雪隠れ装束'),
  kenrokuChest3: chest('kenrokuChest3', 'kitsukegusuri', '気付け薬'),
  guraChest1: chest('guraChest1', 'shibafune', '柴舟'),
  guraChest2: chest('guraChest2', 'kinpakuMamori', '金箔の御守り'),
  guraChest3: chest('guraChest3', 'ninjin', '朝鮮人参'),
  guraChest4: chest('guraChest4', 'kagaZutsu', '加賀筒'),
  nanbanjiChest1: chest('nanbanjiChest1', 'konpeito', '金平糖'),
  nanbanjiChest2: chest('nanbanjiChest2', 'kitsukegusuri', '気付け薬'),
  nanbanjiChest3: chest('nanbanjiChest3', 'tomegane', '遠眼鏡'),
  harajoChest1: chest('harajoChest1', 'kasutera', 'カステラ'),
  harajoChest2: chest('harajoChest2', 'rakanShakujo', '羅漢錫杖'),
  harajoChest3: chest('harajoChest3', 'kitsukegusuri', '気付け薬'),
  kenkyujoChest1: chest('kenkyujoChest1', 'ninjin', '朝鮮人参'),
  kenkyujoChest2: chest('kenkyujoChest2', 'orandaDo', '阿蘭陀胴'),
  komeKuraChest1: chest('komeKuraChest1', 'mankintan', '万金丹'),
  komeKuraChest2: chest('komeKuraChest2', 'renpatsuju', '連発からくり銃'),
  igaSatoChest1: chest('igaSatoChest1', 'hyorogan', '兵糧丸'),
  igaSatoChest2: chest('igaSatoChest2', 'igaShozoku', '伊賀装束'),
  igaSatoChest3: chest('igaSatoChest3', 'kitsukegusuri', '気付け薬'),
  komeKuraChest3: chest('komeKuraChest3', 'kintsuba', '金創膏'),
  osakaChest: chest('osakaChest', 'awaokoshi', '粟おこし'),
  oninosuChest1: chest('oninosuChest1', 'kintsuba', '金創膏'),
  oninosuChest2: chest('oninosuChest2', 'dokko', '独鈷杵'),
  horikawaChest1: chest('horikawaChest1', 'kintsuba', '金創膏'),
  horikawaChest2: chest('horikawaChest2', 'kitsukegusuri', '気付け薬'),
  tenshuChest: chest('tenshuChest', 'hachigane', '鉢金'),
  tenshuChest2: chest('tenshuChest2', 'kitsukegusuri', '気付け薬'),
  horikawaChest3: chest('horikawaChest3', 'kumanoi', '熊の胆'),
  rashomonChest: chest('rashomonChest', 'matcha', '宇治の抹茶'),
  oninosuChest3: chest('oninosuChest3', 'kintsuba', '金創膏'),
  yashikiChest1: chest('yashikiChest1', 'kintsuba', '金創膏'),
  yashikiChest2: chest('yashikiChest2', 'kitsukegusuri', '気付け薬'),
  yashikiChest3: chest('yashikiChest3', 'inro', '印籠'),
  yashikiChest4: chest('yashikiChest4', 'chochin', '提灯'),
  urayamaChest: chest('urayamaChest', 'omamori', '御守り'),
  caveChest1: chest('caveChest1', 'kitsukegusuri', '気付け薬'),
  caveChest2: chest('caveChest2', 'amazake', '甘酒'),
  // ワールドマップの脇道の行き止まり
  worldChestFuji: chest('worldChestFuji', 'kitsukegusuri', '気付け薬'),
  worldChestHiei: chest('worldChestHiei', 'matcha', '宇治の抹茶'),
  worldChestIse: chest('worldChestIse', 'mankintan', '万金丹'),
  // レア装備の葛籠は、中身を変える前に開けた記録でも手に入るよう、前の葛籠（worldChestKoya など）と別の ID にする
  worldChestKoyaJuzu: chest('worldChestKoyaJuzu', 'kodamaJuzu', '木霊の数珠'),
  worldChestIzumoIdaten: chest('worldChestIzumoIdaten', 'idatenMamori', '韋駄天の守り'),
  worldChestAsoKagebunshin: chest('worldChestAsoKagebunshin', 'kagebunshin', '影分身の秘伝書'),
  // 賭場・居酒屋・妓楼の頼まれごとと、博徒の紹介（仁義ポイントを得る。src/data/jingiRequests.ts）
  ...JINGI_REQUEST_EVENTS,
  ...BAKUTO_INTRO_EVENTS,
  ...OYABUN_REQUEST_EVENTS,
  ...OYABUN_GIFT_EVENTS,
};
