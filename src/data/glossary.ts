// TIPS（用語の解説）。台詞に出てくる、今の人には読みにくい漢字や分かりにくい言葉の読みと意味。
// メッセージウィンドウでは、ここにある言葉に色と下線を付け、取消ボタン（「用語」と表示される）で解説を見せる。
//
// 言葉の選び方:
// - 江戸の暮らし・身分・役職・道具など、今はあまり使わない言葉
// - 読みが難しい漢字（葛籠・柄杓・水主など）
// - 人の名前・地名・技や道具の名前（そのまま読めば分かる固有の名前）は載せない
// - 一文字の言葉は、ほかの言葉の一部になる字（文・両など）は載せない。凧・祠のように、どの言葉の中でも同じ意味の字だけ載せる
// - 送り仮名のある言葉は送り仮名まで含める（「赤備え」「外法使い」。下線と読みの範囲をそろえる）
// - 敵の名前の一部になる言葉は、敵の名前のほかでも使われるときだけ載せる（「金鯱からくり」の金鯱は載せない）
// 長い言葉を先に当てる（「奉行所」は「奉行」より先に当たる）ので、短い言葉と重なってもよい。

export interface GlossaryEntry {
  /** 台詞の中で探す言葉。 */
  term: string;
  /** 読み（ひらがな）。 */
  reading: string;
  /** 意味。メッセージウィンドウ 2 行に収まる長さにする。 */
  description: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // 暮らし・町
  { term: '旅籠', reading: 'はたご', description: '街道や宿場にある、食事つきの宿屋。' },
  { term: '茶屋', reading: 'ちゃや', description: '道ばたや町で、旅人に茶や団子を出して休ませる店。' },
  { term: '長屋', reading: 'ながや', description: '一つの細長い建物をいくつもの部屋に仕切った、町人の住まい。' },
  { term: '葛籠', reading: 'つづら', description: 'つる草や竹で編んだ、ふたつきの箱。着物や道具をしまう。' },
  { term: '凧', reading: 'たこ', description: '竹の骨に紙を張り、糸をつけて風で空に揚げるもの。' },
  { term: '祠', reading: 'ほこら', description: '神をまつった小さなやしろ。' },
  { term: '川獺', reading: 'かわうそ', description: '川辺にすむ、イタチの仲間のけもの。人を化かすといわれた。' },
  { term: '柄杓', reading: 'ひしゃく', description: '長い柄のついた、水をくむ道具。' },
  { term: '千両箱', reading: 'せんりょうばこ', description: '小判を千両（千枚）入れておく、丈夫な木の箱。' },
  { term: '城下', reading: 'じょうか', description: '城のまわりに広がる町。武家屋敷や町人の家が並ぶ。' },
  { term: '町木戸', reading: 'まちきど', description: '町の境に設けた門。夜になると閉じて、人の出入りを見張った。' },
  { term: '木戸番', reading: 'きどばん', description: '町木戸の番をする人。' },
  { term: '高札', reading: 'こうさつ', description: 'お上の決まりや知らせを書いて、人目につく所に立てた板。' },
  { term: '半鐘', reading: 'はんしょう', description: '火の見櫓などにつるした小さな釣鐘。火事を知らせるために打ち鳴らした。' },
  { term: '番屋', reading: 'ばんや', description: '町の見張りをする人が詰めている小屋。' },
  { term: '火の見櫓', reading: 'ひのみやぐら', description: '火事をいち早く見つけるための、高い見張り台。半鐘を鳴らして知らせた。' },
  { term: '火消し', reading: 'ひけし', description: '火事を消す人たち。江戸では町ごとに「組」を作っていた。' },
  { term: '飛脚', reading: 'ひきゃく', description: '手紙やお金、荷物を走って届ける仕事の人。' },
  { term: '人足', reading: 'にんそく', description: '荷物運びや普請（工事）などの力仕事をする人。' },
  { term: '雲助', reading: 'くもすけ', description: '街道で駕籠かきや荷運びをした人足。旅人にたかる、たちの悪い者もいた。' },
  { term: '川止め', reading: 'かわどめ', description: '大雨で川の水が増え、渡し（川を渡ること）を止めること。' },
  { term: '渡し場', reading: 'わたしば', description: '舟で川を渡す所。橋のない大きな川では、舟や川越し人足に頼って渡った。' },
  { term: '関所', reading: 'せきしょ', description: '街道の要所で、旅人や荷物を調べた所。通るには手形が要る。' },
  { term: '手形', reading: 'てがた', description: '関所などを通るための通行証。' },
  { term: '廻船問屋', reading: 'かいせんどんや', description: '船で運ぶ荷を取り次ぐ商人。船主として船を持つ店も多かった。' },
  { term: '北前船', reading: 'きたまえぶね', description: '大坂と北国（日本海側）の港を行き来して商いをした船。' },
  { term: '水主', reading: 'かこ', description: '船乗り。船をこいだり帆をあやつったりする人。' },
  { term: '酒手', reading: 'さかて', description: '酒代という名目で渡す心づけ（ちょっとしたお礼のお金）。' },
  { term: '番頭', reading: 'ばんとう', description: '商家の奉公人のかしら。店を取りしきる。' },
  { term: '女将', reading: 'おかみ', description: '宿屋や料理屋の女主人。' },
  { term: '女中', reading: 'じょちゅう', description: '屋敷や宿で働く女の人。' },
  { term: '隠居', reading: 'いんきょ', description: '家の仕事を子にゆずって、勤めから退いた人。' },
  { term: '棟梁', reading: 'とうりょう', description: '大工の親方。' },
  { term: '刀鍛冶', reading: 'かたなかじ', description: '鉄を打ちきたえて刀を作る職人。' },
  { term: '具足師', reading: 'ぐそくし', description: '鎧や兜を作る職人。' },
  { term: '具足', reading: 'ぐそく', description: '鎧・兜・籠手などの武具ひとそろい。' },
  { term: '軽業師', reading: 'かるわざし', description: '綱渡りなど、身軽な芸を見せる芸人。' },
  { term: '渡世人', reading: 'とせいにん', description: '博打などで世を渡る、決まった仕事を持たない人。やくざ者。' },
  { term: '草鞋', reading: 'わらじ', description: 'わらで編んだはきもの。「草鞋を脱ぐ」は、旅の者が宿や一家に身を落ち着けること。' },
  { term: '親分', reading: 'おやぶん', description: '渡世人（博徒）の一家のかしら。子分を従える。' },
  { term: '用心棒', reading: 'ようじんぼう', description: '身や店を守るために雇われた、腕の立つ者。' },
  { term: '浪人', reading: 'ろうにん', description: '仕える主君をなくした武士。' },
  { term: '盗人', reading: 'ぬすっと', description: '泥棒。' },
  { term: '人相書き', reading: 'にんそうがき', description: '罪人などの顔つきや特徴を書いて、探すために配った書きつけ。' },
  { term: '上座', reading: 'かみざ', description: '部屋の中で、身分や立場の高い人がすわる所。' },
  { term: '座敷牢', reading: 'ざしきろう', description: '屋敷の中に設けた、人を閉じこめておく部屋。' },
  { term: '籠城', reading: 'ろうじょう', description: '城にたてこもって敵を防ぐこと。' },
  { term: '仇討免状', reading: 'あだうちめんじょう', description: '仇討ちを許すと公儀が認めた書きつけ。' },
  { term: '仇討ち', reading: 'あだうち', description: '主君や身内を殺された者が、その相手を討ち果たすこと。届け出て許しを受ければ認められた。' },
  { term: '祝詞', reading: 'のりと', description: '神主が神に申し上げる言葉。' },
  { term: '泰平', reading: 'たいへい', description: '世の中がよく治まって、おだやかなこと。' },
  { term: '大筒', reading: 'おおづつ', description: '大砲のこと。' },
  { term: '一宿一飯', reading: 'いっしゅくいっぱん', description: '一晩泊めてもらい、一度食事をふるまわれること。渡世人はこの恩を重んじた。' },
  { term: '博徒', reading: 'ばくと', description: 'ばくちを生業にする人。' },
  { term: '賭場', reading: 'とば', description: 'ばくちを打つ場所。' },
  { term: '盆茣蓙', reading: 'ぼんござ', description: '賭場で、さいころを振る場に敷いたござ。' },
  { term: '中盆', reading: 'なかぼん', description: '賭場で、盆茣蓙の勝負を取りしきる役の人。' },
  { term: '代貸', reading: 'だいがし', description: '一家で親分の次に立つ者。親分に代わって賭場を仕切る。' },
  { term: '瓦版', reading: 'かわらばん', description: '事件や評判を刷って、町で売り歩いた一枚刷りの読み物。今の号外のようなもの。' },
  { term: '妓楼', reading: 'ぎろう', description: '遊女をかかえ、客を座敷でもてなした店。' },
  { term: '太夫', reading: 'たゆう', description: '遊女の中で、いちばん位の高い人。芸事や教養にもすぐれていた。' },
  { term: '欄干', reading: 'らんかん', description: '橋や廊下のふちにつけた、落ちないための手すり。' },
  { term: '錫杖', reading: 'しゃくじょう', description: '僧や修験者が持つ杖。頭につけた輪が鳴る。' },
  { term: '托鉢', reading: 'たくはつ', description: '僧が家々を回り、経を読んで米やお金の施しを受けること。' },
  { term: '破戒', reading: 'はかい', description: '僧が、守るべきおきて（戒律）を破ること。' },
  { term: '掛けまくも畏き', reading: 'かけまくもかしこき', description: '祝詞の始めの言葉。「口に出して言うのもおそれ多い」という意味。' },
  // 身分・役職
  { term: '上様', reading: 'うえさま', description: '将軍をうやまって呼ぶ言い方。' },
  { term: '公儀隠密', reading: 'こうぎおんみつ', description: '幕府の命を受けて、ひそかに諸国を探る者。' },
  { term: '公儀', reading: 'こうぎ', description: '幕府のこと。おおやけ（政府）。' },
  { term: '老中', reading: 'ろうじゅう', description: '将軍のもとで、幕府の政治を取りしきった最も高い役職。' },
  { term: '旗本', reading: 'はたもと', description: '将軍にじかに仕える武士。' },
  { term: '御側役', reading: 'おそばやく', description: '殿様のそば近くに仕えて、身の回りや取り次ぎを務める役。' },
  { term: '足軽', reading: 'あしがる', description: 'いちばん身分の低い武士。戦では槍や鉄砲を持って戦った。' },
  { term: '家老', reading: 'かろう', description: '大名の家臣のうち、いちばん上の重臣。' },
  { term: '御家中', reading: 'ごかちゅう', description: '大名に仕える家臣たち。' },
  { term: '藩士', reading: 'はんし', description: '大名の家（藩）に仕える武士。' },
  { term: '奉行所', reading: 'ぶぎょうしょ', description: '奉行が務める役所。町奉行所は町の裁きや取り締まりを行った。' },
  { term: '奉行', reading: 'ぶぎょう', description: '幕府などで、一つの役目を受け持つ長。町奉行は町の行政・裁き・取り締まりをつかさどる。' },
  { term: '与力', reading: 'よりき', description: '奉行の下で働く役人。同心を指図する。' },
  { term: '同心', reading: 'どうしん', description: '与力の下で、町の見回りや罪人の取り締まりをした役人。' },
  { term: '通詞', reading: 'つうじ', description: '通訳。長崎ではオランダや清との通訳を務める役人がいた。' },
  { term: '影武者', reading: 'かげむしゃ', description: '敵の目をあざむくため、身分の高い人に似せて仕立てた身代わり。' },
  { term: '伊賀者', reading: 'いがもの', description: '伊賀（今の三重県の西部）の出の忍び。幕府に仕えて城の守りなどを務めた。' },
  { term: '外法使い', reading: 'げほうつかい', description: '仏の教えに外れた、怪しい術を使う者。' },
  { term: '赤備え', reading: 'あかぞなえ', description: '鎧や旗を赤一色にそろえた軍勢。井伊家の赤備えが名高い。' },
  // 城・幕府
  { term: '天守', reading: 'てんしゅ', description: '城の中心にある、いちばん高い櫓（やぐら）。' },
  { term: '大手門', reading: 'おおてもん', description: '城の正面の門。' },
  { term: '本丸御殿', reading: 'ほんまるごてん', description: '城の本丸（中心の区画）にある、殿様が政治を行い暮らす建物。' },
  { term: '大奥', reading: 'おおおく', description: '江戸城の中で、将軍の妻や子、奥女中が暮らした所。男は入れない。' },
  { term: '奥女中', reading: 'おくじょちゅう', description: '大奥で働く女の人。' },
  { term: '御錠口', reading: 'おじょうぐち', description: '大奥と表（政治の場）の境にある、錠のかかった出入り口。' },
  { term: '御鈴廊下', reading: 'おすずろうか', description: '将軍が大奥へ通る廊下。通るときに鈴を鳴らして知らせた。' },
  { term: '御金蔵', reading: 'ごきんぞう', description: '幕府のお金をしまっておく蔵。' },
  { term: '御薬園', reading: 'おやくえん', description: '幕府や藩が薬草を育てた畑。' },
  // 異国
  { term: '南蛮', reading: 'なんばん', description: 'ポルトガルやスペインなど、南の海から来た国々。そこから来た人や物。' },
  { term: '出島', reading: 'でじま', description: '長崎の港に造られた扇形の島。オランダとの貿易の窓口だった。' },
  { term: '商館', reading: 'しょうかん', description: '異国の商人が商いをする建物。長崎の出島にはオランダ商館があった。' },
  { term: '蘭学', reading: 'らんがく', description: 'オランダ語の書物を通して学んだ、西洋の学問。' },
  // 薬
  { term: '金創膏', reading: 'きんそうこう', description: '刀傷などの切り傷に塗る薬。' },
  { term: '万金丹', reading: 'まんきんたん', description: '腹痛や気付けに効くといわれた丸薬。' },
];

/** 台詞の中で見つけた言葉。start〜end（end は含まない）が text の中の位置。 */
export interface TermMatch {
  start: number;
  end: number;
  entry: GlossaryEntry;
}

// 長い言葉から先に当てる
const BY_LENGTH = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);

/**
 * text の中の用語を、前から順に重ならないように探す。同じ位置で当たる言葉が複数あれば長い方を取る。
 * 同じ言葉が何度出てきても、すべて返す（どれにも装飾を付ける）。
 */
export function findTerms(text: string): TermMatch[] {
  const matches: TermMatch[] = [];
  let i = 0;
  while (i < text.length) {
    const entry = BY_LENGTH.find((e) => text.startsWith(e.term, i));
    if (entry) {
      matches.push({ start: i, end: i + entry.term.length, entry });
      i += entry.term.length;
    } else {
      i++;
    }
  }
  return matches;
}

/** text に出てくる用語を、出てきた順に重複なく返す（解説を見せる順）。 */
export function termsIn(text: string): GlossaryEntry[] {
  const seen = new Set<GlossaryEntry>();
  for (const m of findTerms(text)) seen.add(m.entry);
  return [...seen];
}
