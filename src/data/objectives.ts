// メニューの所持金の窓に出す「次にすべきこと」。本筋のフラグから、いま向かう先を一言で返す。
// 並びは本筋の進む順（docs/story.md の各章の「実装」）。後ろから見て、最初に立っているフラグの案内を出す。
// events.ts の setFlag は場面ごとにまとめて書かれていて、ファイルの中の順は進む順と一致しないので、並びはテストで確かめられない。フラグを足すときは story.md と突き合わせる。
// 寄り道の町のサブイベントは出さない（本筋の案内だけ）。

/** [立っていれば、この案内を出すフラグ, 案内]。先頭の flag: null は、まだ何も始まっていないとき。 */
export const OBJECTIVES: readonly (readonly [flag: string | null, text: string])[] = [
  [null, '辰五郎一家の屋敷で、親分の話を聞く'],
  // 序章
  ['talkedToTatsugoro', '北の裏山の、狐火の洞を調べる'],
  ['yakoDefeated', '清水湊の辰五郎に、洞のことを知らせる'],
  ['prologueCleared', '西の駿府の城下へ向かう'],
  // 第 1 章
  ['sunpuArrived', 'からくり一座の工房を探る'],
  ['kasumiJoined', '与力・黒田の屋敷の蔵を調べる'],
  ['meiboFound', '城下の南の、からくり屋敷へ乗り込む'],
  ['tetsubinDefeated', '駿府の城下へ戻る'],
  ['chapter1Cleared', '東海道を西へ。大井川の渡し場へ向かう'],
  // 第 2 章
  ['oigawaOpen', '東海道を西へ、尾張の名古屋へ向かう'],
  ['nagoyaArrived', '鱗盗みの疑いをかけられた、軽業師の金太を訪ねる'],
  ['kintaMet', '堀川の荷蔵を調べる'],
  ['urokoClue', '金太に、天守へ行く手立てを相談する'],
  ['kintaFlew', '天守の金鯱からくりを止める'],
  ['kinshachiDefeated', '名古屋の城下へ戻る'],
  ['chapter2Cleared', '鬼の噂の立つ京へ向かう'],
  // 第 3 章
  ['kyoArrived', '鴨川の河原で、鬼退治を請け負う僧を探す'],
  ['gendoJoined', '五条の橋を渡った南、羅生門の跡へ向かう'],
  ['rashomonCleared', '北の山の古寺（鬼の巣）へ向かう'],
  ['shutenDefeated', '京の都へ戻る'],
  ['chapter3Cleared', '急ぎ清水湊へ戻る'],
  // 第 4 章
  ['orinJoined', '仇の権六を追って、伊賀上野へ向かう'],
  ['igaArrived', '山の上の、伊賀者の里へ向かう'],
  ['oboroDefeated', '城下の西の外れ、鍵屋の辻で権六を討つ'],
  ['chapter4Cleared', '天下の台所、大坂へ向かう'],
  // 第 5 章
  ['osakaArrived', '長屋の私塾を訪ねる'],
  ['hyogoJoined', '米蔵の地下の、からくり工場をつぶす'],
  ['hyakuhyoDefeated', '大坂の町へ戻る'],
  ['chapter5Cleared', '西国街道を西へ。広島で霞と落ち合う'],
  // 第 6 章
  ['kasumiRejoined', '西国街道をさらに西へ、長崎へ向かう'],
  ['nagasakiArrived', '出島の通詞に話を聞く'],
  ['dejimaHeard', '東の山の上の、南蛮寺跡を調べる'],
  ['shimabaraOpen', '島原の原城跡へ向かう'],
  ['noritoLearned', '長崎へ戻る'],
  ['chapter6Cleared', '長崎の湊の北前船で、金沢へ向かう'],
  // 第 7 章
  ['kanazawaArrived', '長町の武家屋敷の、長瀬左近を訪ねる'],
  ['sakonHeard', '兼六園の、徽軫灯籠のあたりを調べる'],
  ['nukeanaOpen', '抜け穴から、城の地下のからくり蔵へ下りる'],
  ['tonoRescued', '金沢城の殿様の話を聞く'],
  ['chapter7Cleared', '北国街道を東へ、陸路で仙台へ向かう'],
  // 第 8 章
  ['sendaiIntro', '片平丁の屋敷の、片平帯刀を訪ねる'],
  ['sendaiHeard', '奥州街道を南へ、江戸へ向かう'],
  ['edoIntro', '日本橋川の北、神田の長屋の大家を訪ねる'],
  ['edoHideout', '長屋の井戸の西の家の、鼠の小吉を訪ねる'],
  ['kokichiMet', '長屋の東の、火消しの番屋を訪ねる'],
  ['hikeshiMet', '長屋に戻って、小吉に偵察の知らせを聞く'],
  ['kokichiReport', '日本橋川の南の、八百屋の娘を止める'],
  ['taikaStarted', '北東の町木戸から、燃える神田へ急ぐ'],
  ['kashaDefeated', '神田の長屋へ戻る'],
  ['chapter8Cleared', '加賀の手形を持って、江戸城の大手門へ'],
  // 終章
  ['otemonOpen', '大手門をくぐり、本丸御殿へ入る'],
  ['edojoEntered', '西の御金蔵で、番兵を止める鍵を探す'],
  ['okaneguraCleared', '御錠口から大奥を抜ける'],
  ['ookuCleared', '松の廊下へ向かう'],
  ['tenzenDefeated', '将軍の間で、鷲尾を討つ'],
  ['washioDefeated', 'からくり大権現を倒す'],
];

/** 次にすべきこと（本筋の案内）。 */
export function nextObjective(flags: Readonly<Record<string, boolean>>): string {
  for (let i = OBJECTIVES.length - 1; i >= 0; i--) {
    const [flag, text] = OBJECTIVES[i]!;
    if (flag === null || flags[flag]) return text;
  }
  return OBJECTIVES[0]![1];
}
