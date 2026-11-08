// 親分の頼み（docs/balance.md の「仁義ポイント」）。シナリオ上で親分の頼みを引き受けて果たすと、仁義ポイントを得る。
// - 清水湊: 序章の辰五郎の頼み（裏山の狐火を調べる。src/data/events.ts の TATSUGORO_REPORT で果たしたときに得る）
// - ほかの屋敷のある 14 町: 屋敷の若い衆のメニューに「親分の頼みを聞く」が出る。若い衆が親分の頼み（一家の縄張りを荒らす連中を追い払う）を伝え、
//   引き受けると、ちょうど屋敷へ押しかけてきた相手と戦う。勝つと仁義ポイントを得る。町ごとに 1 回。
//   親分は屋敷の奥にいて画面に出ないので、話すのは若い衆と、押しかけてきた相手だけにする。
import type { EventDef, EventStep } from './eventTypes';
import type { MenuRequest } from './jingiRequests';
import { MAPS } from './maps';
import { OYABUN } from './oyabun';
import { oyabunStayCost } from '../systems/jingi';

/** 辰五郎の頼み（序章）を果たしたときに得る仁義ポイント。ほかの町の親分の頼みと同じく、その町（清水湊）の屋敷の 3 泊分。 */
export const TATSUGORO_JINGI = oyabunStayCost(1) * 3;

/**
 * 親分の頼みで得る仁義ポイント。その町の親分の屋敷の 3 泊分（序盤 3・中盤 6・終盤 9）。
 * 一家の出入りを引き受ける分、施設の頼まれごと（2 泊分）より多い。町ごとに 1 回。
 */
export function oyabunRequestReward(areaLevel: number): number {
  return oyabunStayCost(areaLevel) * 3;
}

/** 親分の頼みの戦闘の敵のレベル（その町の敵レベルより 2 つ上。一家の若い衆では手に負えない相手）。 */
export function oyabunRequestLevel(areaLevel: number): number {
  return areaLevel + 2;
}

/** 親分の頼みのイベントの ID（果たしたら、この名前のフラグが立つ）。 */
export function oyabunRequestId(town: string): string {
  return `oyabun_${town}_request`;
}

interface OyabunRequestDef {
  /** 若い衆が伝える親分の頼み。 */
  ask: string[];
  /** 引き受けたところへ、相手が屋敷に押しかけてくる（戦闘の前）。 */
  confront: string[];
  /** 戦う相手（3 人）。 */
  enemies: string[];
  /** 勝ったあとの台詞（仁義ポイントの知らせの前）。 */
  thanks: string[];
}

/** 屋敷のある町（清水湊を除く）の親分の頼み。清水湊は序章の辰五郎の頼みがあたる。 */
export const OYABUN_REQUESTS: Record<string, OyabunRequestDef> = {
  sunpu: {
    ask: [
      '若い衆「渡世人のお方、親分から折り入っての頼みがござんす。安倍川の渡しで、川向こうの流れ者どもが渡し賃の上前をはねてやがるんで」',
      '若い衆「うちの若え者が文句をつけたら、袋叩きにされやした。今夜も因縁をつけに来ると言ってやがる。追っ払っちゃもらえやせんか」',
    ],
    confront: ['流れ者「おう、安倍川一家の屋敷はここか！ 渡しの縄張りは、今日からおれたちのもんだ！」', '{hero}「渡し賃をかすめる連中に、縄張りもへったくれもあるかい」'],
    enemies: ['bakuto', 'gorotsuki', 'gorotsuki'],
    thanks: ['流れ者「ち、ちくしょう……川向こうへ帰るぞ！」', '若い衆「これで渡しの衆も安心して舟を出せやす。親分も、きっとお喜びになりやす」'],
  },
  nagoya: {
    ask: [
      '若い衆「親分から、渡世人のお方に頼みてえことがあるそうで。熱田の市で、雲助どもが店に所場代をせびって回ってるんでさあ」',
      '若い衆「払わねえ店は荷をひっくり返される始末で……。奴らの頭が、今日ここへ話をつけに来るんで、立ち会っちゃもらえやせんか」',
    ],
    confront: ['雲助の頭「熱田一家の若造ども、話はついたか？ 市の所場代は、これからおれたちが取り立てる！」', '{hero}「市の衆から巻き上げる銭なんざ、一文だってねえよ」'],
    enemies: ['kumosuke', 'gorotsuki', 'kumosuke'],
    thanks: ['雲助の頭「お、覚えてやがれ……！」', '若い衆「熱田の市も、これで元どおりでさあ。親分にしっかり伝えておきやす」'],
  },
  hamamatsu: {
    ask: [
      '若い衆「親分からの頼みでござんす。天竜川の筏師たちが、川下りのたびに浪人どもに通り銭を取られてやしてね」',
      '若い衆「筏師は一家の古い馴染みで、放っちゃおけねえ。奴ら、今日は一家に脅しをかけに来るそうで……」',
    ],
    confront: ['浪人「天竜一家とやら、筏の通り銭に口を出すな。さもなくば、屋敷ごと叩き斬るぞ」', '{hero}「川で汗を流す衆から銭をむしる侍に、斬られる覚えはねえな」'],
    enemies: ['oihagiRonin', 'gorotsuki', 'gorotsuki'],
    thanks: ['浪人「く……拙者の負けだ。遠州からは手を引こう」', '若い衆「筏師たちも喜びやす。親分にも、ようく伝えておきやす」'],
  },
  kyo: {
    ask: [
      '若い衆「親分からの、たっての頼みどす。よそから来た一家が、祇園の賭場をうちから取り上げようと狙うてましてな」',
      '若い衆「今夜、助っ人を連れて殴り込むと言うてきよりました。どうか、一家の助っ人をお願いできまへんか」',
    ],
    confront: ['よその一家の代貸「鴨川一家の衆、祇園の賭場は今夜からうちのもんや。おとなしゅう明け渡しな！」', '{hero}「縄張りが欲しけりゃ、筋を通して頼みに来るもんだ」'],
    enemies: ['bakuto', 'bakuto', 'oihagiRonin'],
    thanks: ['よその一家の代貸「く……都はあきらめたるわ……！」', '若い衆「祇園の賭場は守られました。親分も、きっと胸をなでおろしてはります」'],
  },
  hikone: {
    ask: [
      '若い衆「親分からのお頼みでございます。湖の漁師の網が、夜のうちに切られる騒ぎが続いておりまして」',
      '若い衆「網を切っておるのは、魚の買いたたきを狙う荒くれどもで……。漁師をかばう一家に、今宵ねじ込みに来ると申しております」',
    ],
    confront: ['荒くれ「芹川一家、漁師の肩を持つんじゃねえ！ 湖の魚は、おれたちの言い値で買うんだ！」', '{hero}「網を切って値をたたくのは、商いじゃなくて追い剥ぎだ」'],
    enemies: ['gorotsuki', 'oihagiRonin', 'gorotsuki'],
    thanks: ['荒くれ「わ、わかった……もう網には手を出さねえ……」', '若い衆「漁師たちも、これで安心して湖へ出られます。親分にお伝えしておきます」'],
  },
  iga: {
    ask: [
      '若い衆「親分からの頼みだ。柘植一家の名を騙って、山道で旅人から金をせびる連中がおってな」',
      '若い衆「一家の顔に泥を塗られちゃ、黙っておれん。奴ら、偽者呼ばわりした一家に仕返しすると息巻いておる」',
    ],
    confront: ['偽の一家の者「柘植一家の名は、もうおれたちのもんだ！ 本物なんぞ、山に埋めてやる！」', '{hero}「人様の名で旅人を脅すたあ、渡世人の風上にも置けねえな」'],
    enemies: ['oihagiRonin', 'bakuto', 'bakuto'],
    thanks: ['偽の一家の者「ひ、ひいっ……もう名は騙らねえ……！」', '若い衆「これで一家の名も守られた。親分も、渡世人さんの義理堅さに感じ入っておられるぞ」'],
  },
  osaka: {
    ask: [
      '若い衆「親分からの頼みですわ。道頓堀の芝居小屋で、用心棒くずれが木戸銭をかすめ取りよりましてな」',
      '若い衆「小屋の座元はうちの古い馴染みや。あいつら、今日はここへ『手を引け』と言いに来よるそうで……」',
    ],
    confront: ['用心棒くずれ「道頓堀一家か。芝居小屋の木戸は、わしらが仕切る。手を引かんと、痛い目見るで」', '{hero}「芝居を楽しみに来た客の銭をかすめる奴に、引く手はねえよ」'],
    enemies: ['yojinbo', 'gorotsuki', 'gorotsuki'],
    thanks: ['用心棒くずれ「あかん……退散や……！」', '若い衆「これで小屋も幕を開けられますわ。親分にも、ようお伝えしときます」'],
  },
  hiroshima: {
    ask: [
      '若い衆「親分からの頼みじゃ。瀬戸内の海賊くずれが、宮島の参詣船を狙うて荒らしよるんよ」',
      '若い衆「一家で船を守ったら、逆恨みして屋敷へ乗り込んでくる言うとる。手を貸してもらえんじゃろうか」',
    ],
    confront: ['海賊「宮島一家、よくも邪魔してくれたのう！ 屋敷ごと沈めちゃるけえ！」', '{hero}「参詣の衆を襲う奴に、海の上も陸の上もねえ」'],
    enemies: ['kaizoku', 'kaizoku', 'kaizoku'],
    thanks: ['海賊「お、覚えとれ……！」', '若い衆「これで参詣船も安心じゃ。親分も、きっと喜んでくれんさる」'],
  },
  nagasaki: {
    ask: [
      '若い衆「親分からの頼みたい。抜け荷の連中が丸山の茶屋で暴れて、一家の止めにも耳を貸さんとよ」',
      '若い衆「そいつらが、今夜は一家を黙らせに来ると言いよる。助けてもらえんね」',
    ],
    confront: ['抜け荷の頭「思案橋一家、おれたちの商いに首を突っ込むな！ 丸山はおれたちの遊び場だ！」', '{hero}「お上の目を盗んで、町の衆にまで迷惑をかけるんじゃねえ」'],
    enemies: ['kaizoku', 'yojinbo', 'bakuto'],
    thanks: ['抜け荷の頭「くそっ……長崎は引き上げだ！」', '若い衆「丸山も静かになるばい。親分にも伝えとくけん」'],
  },
  kumamoto: {
    ask: [
      '若い衆「親分からの頼みたい。白川の堤の普請で、浪人どもが人足の手間賃を巻き上げよるとよ」',
      '若い衆「一家が人足をかばったら、今日ここへ斬り込んでくると言うとる。力ば貸してくれんね」',
    ],
    confront: ['浪人「白川一家、人足の肩を持つとは笑止。まとめて斬って捨ててくれる」', '{hero}「堤を築く衆の手間賃をくすねる刀なんざ、なまくらだ」'],
    enemies: ['oihagiRonin', 'yojinbo', 'oihagiRonin'],
    thanks: ['浪人「む、無念……肥後からは去る……」', '若い衆「人足たちも、これで普請に精が出るたい。親分にしっかり伝えとくけん」'],
  },
  kanazawa: {
    ask: [
      '若い衆「親分からのお頼みや。ひがしの茶屋街で、江戸から流れてきた旗本くずれが、芸妓の金箔の簪を取り上げてまわっとるがや」',
      '若い衆「一家で止めたら、今宵ここへ仕返しに来ると言うとる。助っ人をお願いできんけ」',
    ],
    confront: ['旗本くずれ「浅野川一家とやら、直参に楯突くとは無礼千万！ 成敗してくれる！」', '{hero}「芸妓の簪を取り上げる直参なんざ、聞いたことがねえな」'],
    enemies: ['hatamotoYakko', 'bakuto', 'bakuto'],
    thanks: ['旗本くずれ「お、おのれ……江戸へ帰る！」', '若い衆「茶屋街も、これで元の華やかさや。親分にもお伝えしとくまっし」'],
  },
  sendai: {
    ask: [
      '若い衆「親分からの頼みだ。よその国から来た一家が、広瀬川の河原の賭場を荒らしてっぺ」',
      '若い衆「一家で追い返したら、今夜は用心棒を連れて屋敷さ乗り込んでくるど。助けてけねえか」',
    ],
    confront: ['よその一家の者「広瀬川一家、みちのくの賭場はおれたちがいただく！ 覚悟しやがれ！」', '{hero}「賭場を荒らして縄張りを盗るのは、渡世の筋じゃねえ」'],
    enemies: ['bakuto', 'yojinbo', 'bakuto'],
    thanks: ['よその一家の者「く……国へ帰るべ……！」', '若い衆「河原の賭場も守れた。親分にも、よぐ伝えておぐ」'],
  },
  aizu: {
    ask: [
      '若い衆「親分からの頼みだ。峠で雪に足止めされた荷車を狙って、盗賊どもが火を付けて荷を奪っていくんだ」',
      '若い衆「一家が荷を守ったら、今度は屋敷に火を付けると脅してきやがった。手を貸してくんねえか」',
    ],
    confront: ['盗賊「猪苗代一家、峠の荷に手を出すな！ 言うことを聞かねえなら、屋敷ごと燃やしてやる！」', '{hero}「雪の峠で難儀する衆を襲う奴は、雪よりも冷てえな」'],
    enemies: ['hitsukeTozoku', 'oihagiRonin', 'hitsukeTozoku'],
    thanks: ['盗賊「ひ、ひい……峠からは手を引く……！」', '若い衆「これで荷も無事に峠を越えられる。親分にも、ちゃんと伝えておくべ」'],
  },
  edo: {
    ask: [
      '若い衆「親分からの頼みでさあ。浅草寺の門前の縁日で、旗本奴どもが露店をひっくり返して回ってやがる」',
      '若い衆「一家が止めに入ったら、今日ここへ仕返しに来ると抜かしやがった。力を貸しておくんなせえ」',
    ],
    confront: ['旗本奴「浅草一家だと？ 町人風情が、天下の旗本に指図するか！」', '{hero}「縁日の露店を荒らす旗本なんざ、天下の恥だ」'],
    enemies: ['hatamotoYakko', 'hatamotoYakko', 'yojinbo'],
    thanks: ['旗本奴「お、覚えておれ……！」', '若い衆「縁日の衆も、これでひと安心でさあ。親分にも、しっかりお伝えしやす」'],
  },
};

/** 親分の頼みのイベント。勝てば仁義ポイントを得てフラグを立てる。負けても全滅にはせず、また引き受けられる。 */
export function oyabunRequestEvent(town: string, def: OyabunRequestDef, areaLevel: number): EventDef {
  const id = oyabunRequestId(town);
  const accept: EventStep[] = [
    { type: 'say', lines: ['若い衆「ありがてえ！ ……と、噂をすりゃあ、来やがった！」', ...def.confront] },
    {
      type: 'battle',
      enemies: def.enemies,
      level: oyabunRequestLevel(areaLevel),
      ifLose: [{ type: 'say', lines: ['相手は、言いたいことだけ言って引き上げていった……', '若い衆「面目ねえ……。また奴らが来たら、頼みやすぜ」'] }, { type: 'end' }],
    },
    { type: 'say', lines: def.thanks },
    { type: 'addJingi', amount: oyabunRequestReward(areaLevel) },
    { type: 'say', lines: ['渡世人としての名が上がった。（仁義 {jingi}）'] },
    { type: 'setFlag', flag: id },
  ];
  return {
    id,
    steps: [
      { type: 'say', lines: def.ask },
      {
        type: 'choice',
        prompt: '親分の頼みを引き受けるか？',
        options: [
          { label: '引き受ける', steps: accept },
          { label: '断る', steps: [{ type: 'say', lines: ['若い衆「さいですかい……。気が向いたら、また声をかけておくんなせえ」'] }] },
        ],
      },
    ],
  };
}

/** 屋敷のある町（清水湊を除く）の、親分の頼みのイベント。 */
export const OYABUN_REQUEST_EVENTS: Record<string, EventDef> = Object.fromEntries(
  Object.entries(OYABUN_REQUESTS).map(([town, def]) => {
    const ev = oyabunRequestEvent(town, def, MAPS[town]?.areaLevel ?? 1);
    return [ev.id, ev] as const;
  }),
);

/** 屋敷の若い衆のメニューに出す、親分の頼み（その町にあって、まだ果たしていなければ）。 */
export function pendingOyabunRequest(town: string, flags: Record<string, boolean>): MenuRequest | null {
  const id = oyabunRequestId(town);
  if (!OYABUN[town] || !OYABUN_REQUEST_EVENTS[id] || flags[id]) return null;
  return { id, label: '親分の頼みを聞く' };
}
