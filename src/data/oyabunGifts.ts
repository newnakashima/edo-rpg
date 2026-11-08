// 名が通ったときの親分の贈り物（docs/balance.md の「仁義ポイント」）。
// 仁義ポイントが JINGI_RENOWN（90）以上になると「名が通る」。そのあいだに親分の屋敷を訪ねると、若い衆のメニューに
// 「親分の贈り物を受け取る」が出て、その町ならではのレアな装飾品（src/data/equipment.ts。店に置かず、売れない）を 1 つもらえる。町ごとに 1 回。
// ポイントは使わない。もらったあとにポイントが 90 を割っても、品はそのまま。
// 親分は屋敷の奥にいて画面に出ないので、話すのは若い衆だけにする。
import type { EventDef, EventStep } from './eventTypes';
import { itemName } from './items';
import type { MenuRequest } from './jingiRequests';
import { OYABUN } from './oyabun';
import { JINGI_RENOWN } from '../systems/jingi';

/** 屋敷のある町ごとの、名が通ったときにもらう品（equipment.ts の ID）。 */
export const OYABUN_GIFTS: Record<string, string> = {
  shimizu: 'daimonFuda',
  sunpu: 'sakinBukuro',
  nagoya: 'atsutaKozuka',
  hamamatsu: 'ikadaTekko',
  kyo: 'yuzenMamori',
  hikone: 'benzaitenMamori',
  iga: 'tsugeMino',
  osaka: 'naniwaSoroban',
  hiroshima: 'miyajimaShakushi',
  nagasaki: 'kaichuDokei',
  kumamoto: 'higonokami',
  kanazawa: 'yuzenObi',
  sendai: 'kawaraIshi',
  aizu: 'akabeko',
  edo: 'kazariMatoi',
};

/** 親分の贈り物のイベントの ID（受け取ったら、この名前のフラグが立つ）。 */
export function oyabunGiftId(town: string): string {
  return `oyabun_${town}_gift`;
}

/**
 * 親分の贈り物のイベント。持ちきれなければ渡さず（フラグも立てない）、身軽になってからまた受け取れる。
 * 清水湊は辰五郎が殺されたあと（welcomeAfter のフラグ）も使うので、そのときは「親分から」ではなく「一家から」渡す。
 */
export function oyabunGiftEvent(town: string): EventDef {
  const def = OYABUN[town]!;
  const item = OYABUN_GIFTS[town]!;
  const id = oyabunGiftId(town);
  const fromOyabun: EventStep = {
    type: 'say',
    lines: [`若い衆「親分が、これほどのお方を手ぶらで旅立たせちゃ${def.family}の名折れだと、これを預けなすったんで。受け取っておくんなせえ」`],
  };
  const fromFamily: EventStep = {
    type: 'say',
    lines: [`若い衆「これほどのお方を手ぶらで旅立たせちゃ、${def.family}の名折れでござんす。一家から、これを受け取っておくんなせえ」`],
  };
  return {
    id,
    steps: [
      {
        type: 'say',
        lines: ['若い衆「あんたさんの名は、街道筋のどこの一家でも知らねえ者はおりやせん。義理堅え渡世人さんがいなさると、もっぱらの噂でさあ」'],
      },
      def.welcomeAfter ? { type: 'if', flag: def.welcomeAfter.flag, then: [fromFamily], else: [fromOyabun] } : fromOyabun,
      {
        type: 'giveItem',
        item,
        ifFull: [{ type: 'say', lines: ['若い衆「おっと、お荷物がいっぱいのようで。身軽になったら、また寄っておくんなせえ」'] }, { type: 'end' }],
      },
      { type: 'say', lines: [`${itemName(item)}を受け取った。`] },
      { type: 'setFlag', flag: id },
    ],
  };
}

/** 屋敷のある町の、親分の贈り物のイベント。 */
export const OYABUN_GIFT_EVENTS: Record<string, EventDef> = Object.fromEntries(
  Object.keys(OYABUN_GIFTS).map((town) => {
    const ev = oyabunGiftEvent(town);
    return [ev.id, ev] as const;
  }),
);

/** 屋敷の若い衆のメニューに出す、親分の贈り物（名が通っていて、まだ受け取っていなければ）。 */
export function pendingOyabunGift(town: string, state: { flags: Record<string, boolean>; jingi: number }): MenuRequest | null {
  const id = oyabunGiftId(town);
  if (!OYABUN[town] || !OYABUN_GIFT_EVENTS[id] || state.flags[id] || state.jingi < JINGI_RENOWN) return null;
  return { id, label: '親分の贈り物を受け取る' };
}
