// 仁義ポイントを得る町の頼まれごと（docs/balance.md の「仁義ポイント」）。
// 賭場のイカサマ客・居酒屋の酔っ払い・妓楼の用心棒を、湯屋・賭場・居酒屋・妓楼のある町ごとに 1 回ずつ引き受けられる。
// 施設の人のメニューに頼まれごとが出て（済むと消える）、選ぶとこのイベントを行う。勝つと仁義ポイントを得る。
// 町をぶらついている文無しの博徒を親分に紹介しても、仁義ポイントを得る（下の「博徒の紹介」）。
import type { EventDef, EventStep } from './eventTypes';
import { MAPS } from './maps';
import { buildingTown } from './buildings';
import { OYABUN, bakutoIntroduceEventId, bakutoIntroducedFlag, bakutoMeetEventId, bakutoSentFlag } from './oyabun';
import { TOWN_FACILITY_DOORS } from './townFacilities';
import { oyabunStayCost } from '../systems/jingi';

/** 頼まれごとのある施設。 */
export const JINGI_REQUEST_KINDS = ['tobaku', 'izakaya', 'gyoro'] as const;
export type JingiRequestKind = (typeof JINGI_REQUEST_KINDS)[number];

/** 施設のメニューに出す頼まれごとの名前。 */
export const JINGI_REQUEST_LABELS: Record<JingiRequestKind, string> = {
  tobaku: 'イカサマ客を懲らしめる',
  izakaya: '酔っ払いを鎮める',
  gyoro: '用心棒を務める',
};

export function jingiRequestId(town: string, kind: JingiRequestKind): string {
  return `jingi_${town}_${kind}`;
}

/**
 * 頼まれごとで得る仁義ポイント。その町の親分の屋敷の 2 泊分（序盤 2・中盤 4・終盤 6）。
 * 町ごとに 1 回ずつなので、得られる量には限りがある（足りなければもぐりの宿にお金で泊まる）。
 */
export function jingiRequestReward(areaLevel: number): number {
  return oyabunStayCost(areaLevel) * 2;
}

/** 頼まれごとの戦闘の敵のレベル（その町の敵レベルより 1 つ上。町の人を困らせるだけの腕っぷしがある）。 */
export function jingiRequestLevel(areaLevel: number): number {
  return areaLevel + 1;
}

/** 頼まれごとの戦闘の敵。序盤の町は 2 人、中盤から先は 3 人。終盤の妓楼は旗本奴が絡む。 */
export function jingiRequestEnemies(kind: JingiRequestKind, areaLevel: number): string[] {
  const tier = oyabunStayCost(areaLevel);
  switch (kind) {
    case 'tobaku':
      return tier === 1 ? ['bakuto', 'bakuto'] : ['bakuto', 'bakuto', 'gorotsuki'];
    case 'izakaya':
      return tier === 1 ? ['gorotsuki', 'gorotsuki'] : ['gorotsuki', 'gorotsuki', 'gorotsuki'];
    case 'gyoro':
      if (tier === 1) return ['oihagiRonin', 'gorotsuki'];
      return tier === 2 ? ['oihagiRonin', 'oihagiRonin', 'gorotsuki'] : ['hatamotoYakko', 'oihagiRonin', 'oihagiRonin'];
  }
}

interface RequestText {
  /** 頼まれる台詞。 */
  ask: string[];
  /** 引き受けたあと、相手が戸口から入ってきて主人公の隣まで来てからの台詞（戦闘の前）。 */
  confront: string[];
  /** 勝ったあと、相手が去る前の台詞（相手の捨て台詞）。 */
  flee: string[];
  /** 相手が去ったあとの台詞（仁義ポイントの知らせの前）。 */
  thanks: string[];
  /** 負けたとき、相手が去る前の台詞（頼まれごとはまた引き受けられる）。 */
  taunt: string[];
  /** 負けて、相手が去ったあとの台詞。 */
  lose: string[];
  /** 断ったとき。 */
  decline: string[];
}

const TEXT: Record<JingiRequestKind, RequestText> = {
  tobaku: {
    ask: [
      '中盆「……旦那方、ちょいと耳を貸しておくんなせえ。近ごろ、賽に細工をして荒稼ぎしていく客がいやしてね」',
      '中盆「ところが仲間を連れていて、うちの若い者じゃ手が出せねえ。そろそろ顔を出す頃合いなんで、懲らしめちゃもらえやせんか」',
    ],
    confront: [
      'イカサマ師「おう、今日も遊ばせてもらうぜ。……なんだ、てめえは」',
      '{hero}「懐の賽を見せてもらおうか。……やけに重いな。鉛でも仕込んであるのかい」',
      'イカサマ師「な、何しやがる！ 野郎ども、やっちまえ！」',
    ],
    flee: ['イカサマ師「ち、ちくしょう……覚えてやがれ！」'],
    thanks: ['中盆「おかげで賭場の顔が立ちやした。このご恩は、親分にもしっかり伝えておきやす」'],
    taunt: ['イカサマ師「へっ、口ほどにもねえ。今日の稼ぎは、いただいていくぜ」'],
    lose: ['中盆「面目ねえ……。また奴らが来たら、頼みやすぜ」'],
    decline: ['中盆「さいですかい……。気が向いたら、また声をかけておくんなせえ」'],
  },
  izakaya: {
    ask: [
      '亭主「お客さん、助けておくんなせえ。表で酔っ払いどもが暴れてやして、さっきもうちの暖簾を引きちぎっていきやがった……」',
      '亭主「また飲ませろと戻ってくるに決まってまさあ。お役人を呼ぶほどのことでもねえし、渡世人のお方なら、うまく鎮めてくださるかと」',
    ],
    confront: ['酔っ払い「おぅい、亭主ぅ！ 酒だ、酒もってこぉい！」', '{hero}「そのへんにしておけ。酒がまずくなる」', '酔っ払い「なんだとぉ？ 渡世人がでけえ口を……やる気かぁ！」'],
    flee: ['酔っ払い「う、うう……酔いがさめちまった……勘弁してくれ……」'],
    thanks: ['亭主「助かりやした！ この町の親分さんにも、ようく話しておきやす」'],
    taunt: ['酔っ払い「へへっ、弱えくせに……ひっく。河岸を変えるぞぉ」'],
    lose: ['亭主「お怪我はねえですかい。……勘定も払わずに行っちまいやがった。また暴れたら、頼みやす」'],
    decline: ['亭主「そうですかい……。どなたか、腕っぷしの強いお方はいねえもんかねえ」'],
  },
  gyoro: {
    ask: [
      '女将「今宵お座敷に上がる太夫に、しつこく付きまとうお侍がおりまして……。断っても、刀をちらつかせて凄むのでございます」',
      '女将「今夜ひと晩、座敷の外で用心棒を務めてはいただけませんか」',
    ],
    confront: [
      '酔った侍「太夫を出せ！ 拙者を袖にするとは何ごとか！」',
      '{hero}「太夫は今宵、お前さんの座敷には上がらねえよ。帰んな」',
      '酔った侍「渡世人ふぜいが……！ ものども、斬って捨てい！」',
    ],
    flee: ['酔った侍「お、覚えておれ……！」'],
    thanks: ['女将「おかげさまで、太夫も無事にお務めを果たせました。このご恩は忘れません」', '女将「土地の親分さんにも、よろしくお伝えしておきますよ」'],
    taunt: ['酔った侍「ふん、興がさめたわ。今宵はこれまでにしてやる」'],
    lose: ['女将「太夫は奥に隠しておりましたので、無事でございます。またお頼みしてもよろしいでしょうか」'],
    decline: ['女将「さようでございますか……。無理にとは申しません」'],
  },
};

/** 頼まれごと・親分の頼みの部屋（施設の人の立つ屋内マップ）と、相手が出入りする戸口（屋内の出口のマス）。 */
export interface RequestRoom {
  mapId: string;
  door: { x: number; y: number };
  /** 頼んだ施設の人（中盆・亭主・女将・若い衆）の NPC の ID。相手が去ったあと、主人公はこの人のほうを向く。 */
  keeper: string;
}

/** その町で、action（tobaku・izakaya・gyoro・oyabun）の人が立つ屋内マップと、その出口（ない町は undefined）。 */
export function requestRoom(town: string, action: string): RequestRoom | undefined {
  const map = Object.values(MAPS).find((m) => buildingTown(m.id) === town && m.npcs.some((n) => n.action === action));
  const exit = map?.exits[0];
  const keeper = map?.npcs.find((n) => n.action === action);
  return map && exit && keeper ? { mapId: map.id, door: { x: exit.x, y: exit.y }, keeper: keeper.id } : undefined;
}

/** 頼まれごとの相手の演出の ID（i 番目の敵。0 が頭）。 */
export function rivalId(i: number): string {
  return `rival${i}`;
}

/**
 * 相手（戦う敵と同じ姿・同じ数）が戸口から入ってきて、主人公の隣まで歩く（屋内の形が町ごとに違うので、通れるマスをたどる route で）。
 * 一人ずつ入り、後の人は先に来た人を避けて主人公のそばに寄る。そろったら、相手と主人公が向き合う。
 */
function rivalsEnter(room: RequestRoom, enemies: readonly string[]): EventStep[] {
  return [
    ...enemies.flatMap((enemy, i): EventStep[] => [
      { type: 'actor', id: rivalId(i), enemy, x: room.door.x, y: room.door.y, facing: 'up' },
      { type: 'walk', who: rivalId(i), to: 'hero', route: true },
    ]),
    { type: 'face', who: 'hero', toward: rivalId(0) },
  ];
}

/** 相手が後から来た人から順に戸口へ歩いて去る（来た道を戻るので、先に来た人がふさがない）。去ったら、主人公は施設の人のほうを向く。 */
function rivalsLeave(room: RequestRoom, count: number): EventStep[] {
  return [
    ...Array.from({ length: count }, (_, k) => count - 1 - k).flatMap((i): EventStep[] => [
      { type: 'walk', who: rivalId(i), to: { ...room.door }, route: true },
      { type: 'vanish', who: rivalId(i) },
    ]),
    { type: 'face', who: 'hero', toward: room.keeper },
  ];
}

/**
 * 仁義ポイントを得る戦闘の手順（町の頼まれごと・親分の頼み〈src/data/oyabunRequests.ts〉で共通）。
 * 相手が戸口から入ってきて主人公の隣まで来て、confront のあと逃げられない戦闘をする。
 * 勝てば flee のあと相手が戸口から去り、thanks・仁義ポイント・知らせのあと flag を立てる。
 * 負けたら taunt のあと相手が去り、lose を出して終わる（全滅にはせず、フラグも立てないので、また引き受けられる）。
 * room（部屋）が分からなければ、相手を出さない（どの町にも屋内があるので、jingiRequests.test.ts が確かめる）。
 */
export function jingiBattleSteps(p: {
  room: RequestRoom | undefined;
  confront: string[];
  enemies: string[];
  level: number;
  flee: string[];
  thanks: string[];
  taunt: string[];
  lose: string[];
  reward: number;
  flag: string;
}): EventStep[] {
  const enter = p.room ? rivalsEnter(p.room, p.enemies) : [];
  const leave = p.room ? rivalsLeave(p.room, p.enemies.length) : [];
  return [
    ...enter,
    { type: 'say', lines: p.confront },
    {
      type: 'battle',
      enemies: p.enemies,
      level: p.level,
      ifLose: [{ type: 'say', lines: p.taunt }, ...leave, { type: 'say', lines: p.lose }, { type: 'end' }],
    },
    { type: 'say', lines: p.flee },
    ...leave,
    { type: 'say', lines: p.thanks },
    { type: 'addJingi', amount: p.reward },
    // 上限で丸められたときに増えた量を偽らないよう、数値は今の仁義ポイント（{jingi}）を出す
    { type: 'say', lines: ['渡世人としての名が上がった。（仁義 {jingi}）'] },
    { type: 'setFlag', flag: p.flag },
  ];
}

/** 町の頼まれごとのイベント。勝てば仁義ポイントを得てフラグを立てる。負けても全滅にはせず、また引き受けられる。 */
export function jingiRequestEvent(town: string, kind: JingiRequestKind, areaLevel: number): EventDef {
  const id = jingiRequestId(town, kind);
  const text = TEXT[kind];
  const accept = jingiBattleSteps({
    room: requestRoom(town, kind),
    confront: text.confront,
    enemies: jingiRequestEnemies(kind, areaLevel),
    level: jingiRequestLevel(areaLevel),
    flee: text.flee,
    thanks: text.thanks,
    taunt: text.taunt,
    lose: text.lose,
    reward: jingiRequestReward(areaLevel),
    // 果たしたら、イベントの ID と同じ名前のフラグを立てる（pendingJingiRequest が見る）
    flag: id,
  });
  return {
    id,
    steps: [
      { type: 'say', lines: text.ask },
      {
        type: 'choice',
        options: [
          { label: '引き受ける', steps: accept },
          { label: '断る', steps: [{ type: 'say', lines: text.decline }] },
        ],
      },
    ],
  };
}

/** 湯屋・賭場・居酒屋・妓楼のある町の、すべての頼まれごとのイベント。 */
export const JINGI_REQUEST_EVENTS: Record<string, EventDef> = Object.fromEntries(
  Object.keys(TOWN_FACILITY_DOORS).flatMap((town) => {
    const level = MAPS[town]?.areaLevel ?? 1;
    return JINGI_REQUEST_KINDS.map((kind) => {
      const def = jingiRequestEvent(town, kind, level);
      return [def.id, def] as const;
    });
  }),
);

/** 施設のメニューに出す、イベントで行う項目（頼まれごと・博徒の紹介）。 */
export interface MenuRequest {
  /** 選んだら行うイベントの ID。 */
  id: string;
  /** メニューの項目の名前。 */
  label: string;
}

/** まだ果たしていない頼まれごと（施設のメニューに出す）。id はイベントの ID で、果たしたら立つフラグと同じ。 */
export interface PendingJingiRequest extends MenuRequest {
  kind: JingiRequestKind;
}

/** その施設で、まだ果たしていない頼まれごと（ない・済んだら null）。 */
export function pendingJingiRequest(town: string, action: string | undefined, flags: Record<string, boolean>): PendingJingiRequest | null {
  const kind = JINGI_REQUEST_KINDS.find((k) => k === action);
  if (!kind) return null;
  const id = jingiRequestId(town, kind);
  if (!JINGI_REQUEST_EVENTS[id] || flags[id]) return null;
  return { id, kind, label: JINGI_REQUEST_LABELS[kind] };
}

// ---- 博徒の紹介 ----
// 親分の屋敷のある 15 町には、賭場で負けて一文なしになった博徒が通りをぶらついている（src/data/oyabun.ts の bakutoNpc）。
// 話しかけて「一家に紹介する」を選ぶと、博徒は先に屋敷へ向かって通りから消える。屋敷の若い衆のメニューに「博徒を引き合わせる」が出て、
// 選ぶと仁義ポイントを得る。町ごとに 1 回。

/** 博徒の紹介で得る仁義ポイント。その町の親分の屋敷の 1 泊分（序盤 1・中盤 2・終盤 3。戦わずに済む分、頼まれごとの半分）。 */
export function bakutoIntroReward(areaLevel: number): number {
  return oyabunStayCost(areaLevel);
}

/**
 * 博徒が身の上を話す台詞（町ごとに順に使い回す。{family} は一家の名）。
 * 清水湊では辰五郎が殺されたあとも使うので、引き合わせる場面と同じく、親分が生きているとは言わない（一家に頼む）。
 */
const BAKUTO_ASK: string[][] = [
  [
    '博徒「……へへ、渡世人の方とお見受けしやす。あっしも旅の博徒でござんすが、賭場で身ぐるみはがれちまって、一文なしで……」',
    '博徒「この町の{family}に、口をきいてもらえやせんか。草鞋を脱がせてもらえりゃ、この恩は一生忘れやせん」',
  ],
  [
    '博徒「腹が減って、目が回りそうで……。仁義を切ろうにも、手土産ひとつありゃしねえ」',
    '博徒「渡世人の口ききがありゃあ、{family}も門を開けてくれるはずなんで。どうか、お頼み申しやす」',
  ],
  [
    '博徒「ちくしょう、あの壺振り、イカサマに決まってらあ……。おかげで宿代もありゃしねえ」',
    '博徒「旦那方、{family}に、あっしを引き合わせちゃもらえやせんか。一宿一飯の恩は、きっと返しやす」',
  ],
];

/** 文無しの博徒に話しかけたときのイベント。紹介すると決めると、博徒は先に屋敷へ向かう（sent のフラグで通りから消える）。 */
export function bakutoMeetEvent(town: string, variant: number): EventDef {
  const family = OYABUN[town]?.family ?? '';
  const ask = BAKUTO_ASK[variant % BAKUTO_ASK.length]!.map((l) => l.replace('{family}', family));
  return {
    id: bakutoMeetEventId(town),
    steps: [
      { type: 'say', lines: ask },
      {
        type: 'choice',
        options: [
          {
            label: '一家に紹介する',
            steps: [
              {
                type: 'say',
                lines: [`{hero}「わかった。${family}の屋敷の前で待ってな。あとから行って、口をきいてやる」`, '博徒「ありがてえ！ 恩に着やす！」'],
                linesF: [`{hero}「わかったよ。${family}の屋敷の前で待っておいで。あとから行って、口をきいてあげる」`, '博徒「ありがてえ！ 恩に着やす、姐さん！」'],
              },
              { type: 'setFlag', flag: bakutoSentFlag(town) },
            ],
          },
          { label: 'やめておく', steps: [{ type: 'say', lines: ['博徒「さいですかい……。ああ、腹が減った……」'] }] },
        ],
      },
    ],
  };
}

/**
 * 屋敷の若い衆に博徒を引き合わせるイベント。仁義ポイントを得る。
 * 博徒は屋敷の中に入っているので、話すのは若い衆だけ（画面にいない人に喋らせない）。
 * 清水湊では辰五郎が殺されたあとも使うので、親分が生きているとは言わない。
 */
export function bakutoIntroduceEvent(town: string, areaLevel: number): EventDef {
  return {
    id: bakutoIntroduceEventId(town),
    steps: [
      {
        type: 'say',
        lines: [
          '若い衆「ああ、さっき門の前に来た博徒のことですかい。話は聞きやした」',
          '若い衆「渡世人のお方の口ききとあっちゃ、無下にはできやせん。一家で面倒を見させてもらいやす」',
          '若い衆「義理堅えお方だと、一家のみんなにも伝えておきやす」',
        ],
      },
      { type: 'addJingi', amount: bakutoIntroReward(areaLevel) },
      { type: 'say', lines: ['渡世人としての名が上がった。（仁義 {jingi}）'] },
      { type: 'setFlag', flag: bakutoIntroducedFlag(town) },
    ],
  };
}

/** 親分の屋敷のある町の、博徒の紹介のイベント（話しかける・引き合わせる）。 */
export const BAKUTO_INTRO_EVENTS: Record<string, EventDef> = Object.fromEntries(
  Object.keys(OYABUN).flatMap((town, i) => {
    const meet = bakutoMeetEvent(town, i);
    const introduce = bakutoIntroduceEvent(town, MAPS[town]?.areaLevel ?? 1);
    return [
      [meet.id, meet],
      [introduce.id, introduce],
    ] as const;
  }),
);

/** 屋敷の若い衆のメニューに出す、博徒の紹介（屋敷へ向かわせて、まだ引き合わせていなければ）。 */
export function pendingBakutoIntro(town: string, flags: Record<string, boolean>): MenuRequest | null {
  if (!OYABUN[town] || !flags[bakutoSentFlag(town)] || flags[bakutoIntroducedFlag(town)]) return null;
  return { id: bakutoIntroduceEventId(town), label: '博徒を引き合わせる' };
}

/** 施設のメニューで選んだもの（施設の本来の品・頼まれごと・やめる）。 */
export type FacilityPick<T> = { kind: 'main'; value: T } | { kind: 'request'; id: string } | { kind: 'cancel' };

/**
 * 施設のメニュー（main の項目、頼まれごと・博徒の紹介・親分の頼み〈requests のうち null でないもの〉、やめる の順）の項目の名前と、
 * 選んだ番号から選んだものを返す関数。
 * 画面（FieldScene の賭場・居酒屋・妓楼・親分の屋敷）はこれでメニューを作り、番号の対応を自分で数えない。
 */
export function facilityMenu<T>(
  main: readonly { label: string; value: T }[],
  requests: readonly (MenuRequest | null)[],
): { labels: string[]; pick: (index: number) => FacilityPick<T> } {
  const shown = requests.filter((r): r is MenuRequest => r !== null);
  const labels = [...main.map((m) => m.label), ...shown.map((r) => r.label), 'やめる'];
  return {
    labels,
    pick: (index) => {
      const m = main[index];
      if (m) return { kind: 'main', value: m.value };
      const r = shown[index - main.length];
      if (r) return { kind: 'request', id: r.id };
      return { kind: 'cancel' };
    },
  };
}
