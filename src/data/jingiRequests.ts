// 仁義ポイントを得る町の頼まれごと（docs/balance.md の「仁義ポイント」）。
// 賭場のイカサマ客・居酒屋の酔っ払い・妓楼の用心棒を、湯屋・賭場・居酒屋・妓楼のある町ごとに 1 回ずつ引き受けられる。
// 施設の人のメニューに頼まれごとが出て（済むと消える）、選ぶとこのイベントを行う。勝つと仁義ポイントを得る。
import type { EventDef, EventStep } from './eventTypes';
import { MAPS } from './maps';
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
  /** 引き受けて相手に向き合う台詞（戦闘の前）。 */
  confront: string[];
  /** 勝ったあとの台詞（仁義ポイントの知らせの前）。 */
  thanks: string[];
  /** 負けたとき（相手は引き上げ、頼まれごとはまた引き受けられる）。 */
  lose: string[];
  /** 断ったとき。 */
  decline: string[];
}

const TEXT: Record<JingiRequestKind, RequestText> = {
  tobaku: {
    ask: [
      '中盆「……旦那方、ちょいと耳を貸しておくんなせえ。奥の盆茣蓙の客、どうも賽に細工をしてやがる」',
      '中盆「ところが仲間を連れていて、うちの若い者じゃ手が出せねえ。懲らしめちゃもらえやせんか」',
    ],
    confront: ['{hero}「おい、その賽を見せてもらおうか。……やけに重いな。鉛でも仕込んであるのかい」', 'イカサマ師「な、何しやがる！ 野郎ども、やっちまえ！」'],
    thanks: ['イカサマ師「ち、ちくしょう……覚えてやがれ！」', '中盆「おかげで賭場の顔が立ちやした。このご恩は、親分にもしっかり伝えておきやす」'],
    lose: ['イカサマ師たちは、勝ち逃げを決め込んで出ていった……', '中盆「面目ねえ……。また奴らが来たら、頼みやすぜ」'],
    decline: ['中盆「さいですかい……。気が向いたら、また声をかけておくんなせえ」'],
  },
  izakaya: {
    ask: [
      '亭主「お客さん、助けておくんなせえ。奥で酔っ払いどもが暴れてやして、皿は割るわ、ほかのお客は殴るわで……」',
      '亭主「お役人を呼ぶほどのことでもねえし、渡世人のお方なら、うまく鎮めてくださるかと」',
    ],
    confront: ['{hero}「そのへんにしておけ。酒がまずくなる」', '酔っ払い「なんだとぉ？ 渡世人がでけえ口を……やる気かぁ！」'],
    thanks: ['酔っ払い「う、うう……酔いがさめちまった……勘弁してくれ……」', '亭主「助かりやした！ この町の親分さんにも、ようく話しておきやす」'],
    lose: ['酔っ払いどもは、勘定も払わずに千鳥足で出ていった……', '亭主「お怪我はねえですかい。また暴れたら、頼みやす」'],
    decline: ['亭主「そうですかい……。どなたか、腕っぷしの強いお方はいねえもんかねえ」'],
  },
  gyoro: {
    ask: [
      '女将「今宵お座敷に上がる太夫に、しつこく付きまとうお侍がおりまして……。断っても、刀をちらつかせて凄むのでございます」',
      '女将「今夜ひと晩、座敷の外で用心棒を務めてはいただけませんか」',
    ],
    confront: [
      '夜が更けたころ、廊下に荒い足音が響いた。',
      '酔った侍「太夫を出せ！ 拙者を袖にするとは何ごとか！」',
      '{hero}「太夫は今宵、お前さんの座敷には上がらねえよ。帰んな」',
      '酔った侍「渡世人ふぜいが……！ ものども、斬って捨てい！」',
    ],
    thanks: ['酔った侍「お、覚えておれ……！」', '太夫「おかげさまで、無事にお務めを果たせました。このご恩は忘れません」', '女将「土地の親分さんにも、よろしくお伝えしておきますよ」'],
    lose: ['侍たちは暴れるだけ暴れて、引き上げていった……', '女将「太夫は奥に隠しておりましたので、無事でございます。またお頼みしてもよろしいでしょうか」'],
    decline: ['女将「さようでございますか……。無理にとは申しません」'],
  },
};

/** 町の頼まれごとのイベント。勝てば仁義ポイントを得てフラグを立てる。負けても全滅にはせず、また引き受けられる。 */
export function jingiRequestEvent(town: string, kind: JingiRequestKind, areaLevel: number): EventDef {
  const id = jingiRequestId(town, kind);
  const text = TEXT[kind];
  const reward = jingiRequestReward(areaLevel);
  const accept: EventStep[] = [
    { type: 'say', lines: text.confront },
    {
      type: 'battle',
      enemies: jingiRequestEnemies(kind, areaLevel),
      level: jingiRequestLevel(areaLevel),
      ifLose: [{ type: 'say', lines: text.lose }, { type: 'end' }],
    },
    { type: 'say', lines: text.thanks },
    { type: 'addJingi', amount: reward },
    // 上限で丸められたときに増えた量を偽らないよう、数値は今の仁義ポイント（{jingi}）を出す
    { type: 'say', lines: ['渡世人としての名が上がった。（仁義 {jingi}）'] },
    // 果たしたら、イベントの ID と同じ名前のフラグを立てる（pendingJingiRequest が見る）
    { type: 'setFlag', flag: id },
  ];
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

/** まだ果たしていない頼まれごと（施設のメニューに出す）。 */
export interface PendingJingiRequest {
  /** イベントの ID（果たしたら立つフラグと同じ）。 */
  id: string;
  kind: JingiRequestKind;
  /** メニューの項目の名前。 */
  label: string;
}

/** その施設で、まだ果たしていない頼まれごと（ない・済んだら null）。 */
export function pendingJingiRequest(town: string, action: string | undefined, flags: Record<string, boolean>): PendingJingiRequest | null {
  const kind = JINGI_REQUEST_KINDS.find((k) => k === action);
  if (!kind) return null;
  const id = jingiRequestId(town, kind);
  if (!JINGI_REQUEST_EVENTS[id] || flags[id]) return null;
  return { id, kind, label: JINGI_REQUEST_LABELS[kind] };
}

/** 施設のメニューで選んだもの（施設の本来の品・頼まれごと・やめる）。 */
export type FacilityPick<T> = { kind: 'main'; value: T } | { kind: 'request'; id: string } | { kind: 'cancel' };

/**
 * 施設のメニュー（main の項目、頼まれごと〈request があれば〉、やめる の順）の項目の名前と、選んだ番号から選んだものを返す関数。
 * 画面（FieldScene の賭場・居酒屋・妓楼）はこれでメニューを作り、番号の対応を自分で数えない。
 */
export function facilityMenu<T>(
  main: readonly { label: string; value: T }[],
  request: PendingJingiRequest | null,
): { labels: string[]; pick: (index: number) => FacilityPick<T> } {
  const labels = [...main.map((m) => m.label), ...(request ? [request.label] : []), 'やめる'];
  return {
    labels,
    pick: (index) => {
      const m = main[index];
      if (m) return { kind: 'main', value: m.value };
      if (request && index === main.length) return { kind: 'request', id: request.id };
      return { kind: 'cancel' };
    },
  };
}
