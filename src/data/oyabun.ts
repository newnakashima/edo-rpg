// 各町の親分の屋敷（テストプレイで「各町に親分とその屋敷を追加すべき」と指摘されたため足した）。
// 主人公の一行は渡世人なので、親分の屋敷に仁義ポイントを使って泊まり、体力と気力を全回復する（src/systems/jingi.ts）。
// 湯屋・賭場などと同じく、刀鍛冶かよろず屋のあるすべての町に 1 軒ずつ置く。屋敷の戸口の真下（屋内のある町では屋敷の中。
// src/data/buildings.ts）に一家の若い衆が立ち、看板（src/data/signs.ts の oyabun、「親」の字）を戸の隣の壁に掛ける。
import type { NpcDef } from './maps';

export interface OyabunDef {
  /** 屋敷の戸口（maps.ts の rows の D のマス）。若い衆はその真下に立つ（屋内のある町では、この戸口から入る屋敷の中に立つ）。 */
  door: { x: number; y: number };
  /**
   * 町をぶらついている文無しの博徒の立つマス（親分に紹介すると仁義ポイント。src/data/jingiRequests.ts の bakutoMeetEvent）。
   * 通りの中ほどで、上下左右と斜めの 8 マスがすべて通れる（人が道をふさがない）、戸口・ほかの人・出口から 3 マス以上離れた場所。
   */
  bakuto: { x: number; y: number };
  /** 一家の名（「辰五郎一家」など）。 */
  family: string;
  /** 泊めてもらったときの親分のひと言。 */
  welcome: string;
  /** このフラグが立ったら、welcome の代わりにこちらを出す（清水湊の辰五郎が殺されたあとなど）。 */
  welcomeAfter?: { flag: string; line: string };
}

export const OYABUN: Record<string, OyabunDef> = {
  shimizu: {
    door: { x: 38, y: 4 },
    bakuto: { x: 23, y: 5 },
    family: '辰五郎一家',
    welcome: '辰五郎「おう、遠慮はいらねえ。好きなだけ草鞋を脱いでいきな」',
    welcomeAfter: { flag: 'chapter3Cleared', line: '若い衆「親分の代わりに、あっしらがお世話いたしやす。ゆっくり休んでくだせえ」' },
  },
  sunpu: { door: { x: 39, y: 11 }, bakuto: { x: 26, y: 14 }, family: '安倍川一家', welcome: '安倍川の源蔵「駿府まで、よう来なすった。今夜はうちで休んでいきなせえ」' },
  nagoya: { door: { x: 28, y: 27 }, bakuto: { x: 22, y: 17 }, family: '熱田一家', welcome: '熱田の銀次「尾張の旅は長えでよ。ゆっくりしていきゃあ」' },
  kyo: { door: { x: 30, y: 9 }, bakuto: { x: 17, y: 12 }, family: '鴨川一家', welcome: '鴨川の文吉「都の夜は物騒どす。うちで休んでおいきやす」' },
  iga: { door: { x: 41, y: 8 }, bakuto: { x: 34, y: 17 }, family: '柘植一家', welcome: '柘植の伝八「山ん中の一家だが、飯と布団はたんとある。休んでいきな」' },
  osaka: { door: { x: 26, y: 32 }, bakuto: { x: 25, y: 15 }, family: '道頓堀一家', welcome: '道頓堀の万吉「よう来はった。浪花の一家の飯、たんと食うていきなはれ」' },
  hiroshima: { door: { x: 36, y: 10 }, bakuto: { x: 28, y: 18 }, family: '宮島一家', welcome: '宮島の松五郎「遠いところをよう来んさった。ゆっくりしていきんさい」' },
  nagasaki: { door: { x: 28, y: 12 }, bakuto: { x: 24, y: 24 }, family: '思案橋一家', welcome: '思案橋の清六「長崎まで、ようおいでたな。今夜はうちで休んでいかんね」' },
  kanazawa: { door: { x: 50, y: 27 }, bakuto: { x: 28, y: 27 }, family: '浅野川一家', welcome: '浅野川の与兵衛「雪の中をよう来られた。囲炉裏で温もっていかれまっし」' },
  sendai: { door: { x: 40, y: 32 }, bakuto: { x: 32, y: 24 }, family: '広瀬川一家', welcome: '広瀬川の熊蔵「みちのくまで、よぐ来たな。ゆっくり休んでげ」' },
  hamamatsu: { door: { x: 18, y: 31 }, bakuto: { x: 24, y: 21 }, family: '天竜一家', welcome: '天竜の兼松「遠州の空っ風は身にしみるら。うちで休んでいきな」' },
  hikone: { door: { x: 21, y: 36 }, bakuto: { x: 25, y: 24 }, family: '芹川一家', welcome: '芹川の佐平「湖を眺めながら、ゆっくりしていっておくれやす」' },
  kumamoto: { door: { x: 21, y: 37 }, bakuto: { x: 27, y: 28 }, family: '白川一家', welcome: '白川の勘助「肥後もんは情けに厚かとよ。遠慮せんで休んでいきなっせ」' },
  aizu: { door: { x: 9, y: 33 }, bakuto: { x: 15, y: 23 }, family: '猪苗代一家', welcome: '猪苗代の弥助「会津の冬は長え。囲炉裏のそばで休んでいがっせ」' },
  edo: { door: { x: 58, y: 37 }, bakuto: { x: 54, y: 25 }, family: '浅草一家', welcome: '浅草の喜三郎「お江戸へようこそ。今夜はうちの客人だ、遠慮はいらねえよ」' },
};

/** 博徒を親分の屋敷へ向かわせたら立つフラグ（博徒は通りから消える）。 */
export function bakutoSentFlag(town: string): string {
  return `bakuto_${town}_sent`;
}

/** 博徒を親分に引き合わせたら立つフラグ（仁義ポイントを得た）。 */
export function bakutoIntroducedFlag(town: string): string {
  return `bakuto_${town}_introduced`;
}

/** 博徒に話しかけたときのイベントの ID。 */
export function bakutoMeetEventId(town: string): string {
  return `bakuto_${town}_meet`;
}

/** 博徒を親分に引き合わせるイベントの ID（屋敷の若い衆のメニューから始まる）。 */
export function bakutoIntroduceEventId(town: string): string {
  return `bakuto_${town}_introduce`;
}

/** その町をぶらついている文無しの博徒（屋敷のない町では null）。屋敷へ向かわせると姿を消す。 */
export function bakutoNpc(town: string): NpcDef | null {
  const def = OYABUN[town];
  if (!def) return null;
  return {
    id: `${town}Bakuto`,
    name: '文無しの博徒',
    x: def.bakuto.x,
    y: def.bakuto.y,
    color: 0x5a4a3a,
    sprite: 'npc_ronin',
    event: bakutoMeetEventId(town),
    hideFlag: bakutoSentFlag(town),
  };
}

/** 泊めてもらったときの親分のひと言（フラグで変わる）。 */
export function oyabunWelcome(def: OyabunDef, flags: Record<string, boolean>): string {
  return def.welcomeAfter && flags[def.welcomeAfter.flag] ? def.welcomeAfter.line : def.welcome;
}

/** その町の親分の屋敷の若い衆（屋敷のない町では null）。at を省くと戸口の真下に立つ。屋敷の屋内（src/data/buildings.ts）では、屋内の立つ場所を at に渡す。 */
export function oyabunNpc(town: string, at?: { x: number; y: number }): NpcDef | null {
  const def = OYABUN[town];
  if (!def) return null;
  return {
    id: `${town}Oyabun`,
    name: `${def.family}の若い衆`,
    x: at?.x ?? def.door.x,
    y: at?.y ?? def.door.y + 1,
    color: 0x4a3a5a,
    sprite: 'npc_ninsoku',
    lines: [`若い衆「ここは${def.family}の屋敷でござんす。旅の渡世人さんなら、親分が一宿一飯の世話をいたしやす」`],
    action: 'oyabun',
  };
}
