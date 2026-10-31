// 装備品。武器・防具・装飾品の 3 つの枠に 1 つずつ付ける。
// 数値は序章〜第 4 章の分。以降の章の装備はシナリオの実装（フェーズ 4）で足す。
import type { CharacterId } from './characters';
import type { Stats } from '../systems/stats';

export type EquipSlot = 'weapon' | 'armor' | 'accessory';

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'armor', 'accessory'];

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: '装飾',
};

export interface EquipDef {
  id: string;
  name: string;
  slot: EquipSlot;
  /** 買値（文）。売値は半額。 */
  price: number;
  /** 能力値に足す値。 */
  bonus: Partial<Stats>;
  /** 付けられる人物。 */
  wearers: readonly CharacterId[];
  description: string;
}

const ALL: readonly CharacterId[] = ['hero', 'kasumi', 'gendo', 'orin'];

export const EQUIPMENT: Record<string, EquipDef> = {
  // 武器
  nagawakizashi: { id: 'nagawakizashi', name: '長脇差', slot: 'weapon', price: 40, bonus: { atk: 2 }, wearers: ['hero'], description: '渡世人の差す脇差' },
  dotanuki: { id: 'dotanuki', name: '胴田貫', slot: 'weapon', price: 260, bonus: { atk: 7 }, wearers: ['hero'], description: '肉厚で折れにくい刀' },
  magoroku: { id: 'magoroku', name: '関の孫六', slot: 'weapon', price: 520, bonus: { atk: 9 }, wearers: ['hero'], description: '美濃の関で鍛えた名刀' },
  kotetsu: { id: 'kotetsu', name: '虎徹', slot: 'weapon', price: 900, bonus: { atk: 12 }, wearers: ['hero'], description: '江戸に名高い名工の刀' },
  osafune: { id: 'osafune', name: '備前長船', slot: 'weapon', price: 1300, bonus: { atk: 15 }, wearers: ['hero'], description: '備前の刀工の手になる業物' },
  kunai: { id: 'kunai', name: '苦無', slot: 'weapon', price: 40, bonus: { atk: 2, spd: 1 }, wearers: ['kasumi'], description: '忍びの小刀' },
  ninjato: { id: 'ninjato', name: '忍者刀', slot: 'weapon', price: 240, bonus: { atk: 6, spd: 2 }, wearers: ['kasumi'], description: '反りのない短い刀' },
  kusarigama: { id: 'kusarigama', name: '鎖鎌', slot: 'weapon', price: 480, bonus: { atk: 8, spd: 2 }, wearers: ['kasumi'], description: '分銅の鎖で絡め取る鎌' },
  tekkokagi: { id: 'tekkokagi', name: '手甲鉤', slot: 'weapon', price: 860, bonus: { atk: 11, spd: 3 }, wearers: ['kasumi'], description: '手の甲に付ける鉄の爪' },
  shinobiKodachi: { id: 'shinobiKodachi', name: '忍び小太刀', slot: 'weapon', price: 1250, bonus: { atk: 14, spd: 3 }, wearers: ['kasumi'], description: '伊賀の鍛冶の打った小太刀' },
  kongozue: { id: 'kongozue', name: '金剛杖', slot: 'weapon', price: 60, bonus: { atk: 3, mag: 2 }, wearers: ['gendo'], description: '八角の樫の杖' },
  shakujo: { id: 'shakujo', name: '錫杖', slot: 'weapon', price: 300, bonus: { atk: 6, mag: 4 }, wearers: ['gendo'], description: '鳴らすと魔を祓う杖' },
  dokko: { id: 'dokko', name: '独鈷杵', slot: 'weapon', price: 820, bonus: { atk: 9, mag: 6 }, wearers: ['gendo'], description: '煩悩を打ち砕く法具' },
  tetsuShakujo: { id: 'tetsuShakujo', name: '鉄錫杖', slot: 'weapon', price: 1200, bonus: { atk: 11, mag: 9 }, wearers: ['gendo'], description: '修験者の鉄の錫杖' },
  hinawaju: { id: 'hinawaju', name: '火縄銃', slot: 'weapon', price: 60, bonus: { atk: 4 }, wearers: ['orin'], description: '使い込んだ火縄銃' },
  karakuriju: { id: 'karakuriju', name: 'からくり銃', slot: 'weapon', price: 380, bonus: { atk: 9 }, wearers: ['orin'], description: 'ゼンマイで弾を込める銃' },
  nanbanju: { id: 'nanbanju', name: '南蛮銃', slot: 'weapon', price: 1300, bonus: { atk: 15 }, wearers: ['orin'], description: '南蛮渡りの燧石の銃' },
  // 防具
  shimagappa: { id: 'shimagappa', name: '縞の合羽', slot: 'armor', price: 30, bonus: { def: 1 }, wearers: ALL, description: '旅の雨をしのぐ合羽' },
  kusarikatabira: { id: 'kusarikatabira', name: '鎖帷子', slot: 'armor', price: 200, bonus: { def: 5 }, wearers: ['hero', 'gendo', 'orin'], description: '着物の下に着込む鎖' },
  nanbando: { id: 'nanbando', name: '南蛮胴', slot: 'armor', price: 720, bonus: { def: 8 }, wearers: ['hero', 'gendo', 'orin'], description: '南蛮渡りの鉄の胴' },
  kusarishozoku: { id: 'kusarishozoku', name: '鎖忍び装束', slot: 'armor', price: 640, bonus: { def: 6, spd: 3 }, wearers: ['kasumi'], description: '鎖を編み込んだ装束' },
  toseiGusoku: { id: 'toseiGusoku', name: '当世具足', slot: 'armor', price: 1100, bonus: { def: 11 }, wearers: ['hero', 'gendo', 'orin'], description: '動きやすい鉄の具足' },
  igaShozoku: { id: 'igaShozoku', name: '伊賀装束', slot: 'armor', price: 1000, bonus: { def: 9, spd: 4 }, wearers: ['kasumi'], description: '伊賀の里の忍び装束' },
  shinobishozoku: { id: 'shinobishozoku', name: '忍び装束', slot: 'armor', price: 180, bonus: { def: 3, spd: 3 }, wearers: ['kasumi'], description: '闇に溶ける装束' },
  // 装飾
  sandogasa: { id: 'sandogasa', name: '三度笠', slot: 'accessory', price: 20, bonus: { def: 1, luck: 1 }, wearers: ALL, description: '旅人の笠' },
  omamori: { id: 'omamori', name: '御守り', slot: 'accessory', price: 50, bonus: { luck: 5 }, wearers: ALL, description: '寺社の御守り' },
  hachigane: { id: 'hachigane', name: '鉢金', slot: 'accessory', price: 160, bonus: { def: 3 }, wearers: ALL, description: '額を守る鉄の板' },
  inro: { id: 'inro', name: '印籠', slot: 'accessory', price: 150, bonus: { maxHp: 10 }, wearers: ALL, description: '薬を入れる小箱' },
};

export type Equipped = Partial<Record<EquipSlot, string>>;

/** 加入したときに付けている装備。 */
export const STARTING_EQUIPMENT: Record<CharacterId, Equipped> = {
  hero: { weapon: 'nagawakizashi', armor: 'shimagappa', accessory: 'sandogasa' },
  kasumi: { weapon: 'kunai', armor: 'shimagappa' },
  gendo: { weapon: 'kongozue', armor: 'shimagappa' },
  // 第 4 章で、辰五郎の形見のからくり鉄砲を持って加入する
  orin: { weapon: 'karakuriju', armor: 'kusarikatabira' },
};

export function canEquip(id: CharacterId, equipId: string): boolean {
  return EQUIPMENT[equipId]?.wearers.includes(id) ?? false;
}

/** 装備の能力値の合計。 */
export function equipmentBonus(equipped: Equipped): Stats {
  const total: Stats = { maxHp: 0, maxMp: 0, atk: 0, def: 0, mag: 0, spd: 0, luck: 0 };
  for (const slot of EQUIP_SLOTS) {
    const id = equipped[slot];
    const bonus = id ? EQUIPMENT[id]?.bonus : undefined;
    if (!bonus) continue;
    for (const k of Object.keys(total) as (keyof Stats)[]) total[k] += bonus[k] ?? 0;
  }
  return total;
}
