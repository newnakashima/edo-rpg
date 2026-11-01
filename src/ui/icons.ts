// 道具・装備品・技・お金に付けるアイコンの選び方（画像は uiImages.ts の ICON_*）。
import type { CharacterId } from '../data/characters';
import { EQUIPMENT, type EquipSlot } from '../data/equipment';
import { ITEMS } from '../data/items';
import type { IconName } from './uiImages';

/** 武器のアイコンは、使う人の得物で決める（渡世人・与力は刀、くノ一は手裏剣、破戒僧は錫杖、鉄砲打ちは鉄砲）。 */
export const WEAPON_ICONS: Record<CharacterId, IconName> = {
  hero: 'katana',
  hyogo: 'katana',
  kasumi: 'shuriken',
  gendo: 'shakujo',
  orin: 'teppo',
};

/** 技・術のアイコン。 */
export const SKILL_ICON: IconName = 'makimono';
/** お金（文）のアイコン。 */
export const MONEY_ICON: IconName = 'zeni';

/** 装備の枠のアイコン（武器は付ける人の得物）。 */
export function slotIcon(slot: EquipSlot, wearer: CharacterId): IconName {
  if (slot === 'weapon') return WEAPON_ICONS[wearer];
  return slot === 'armor' ? 'armor' : 'omamori';
}

/** 道具・装備品のアイコン。道具は食べ物なら団子、薬なら薬包。装飾品はお守り。知らない ID は undefined。 */
export function itemIcon(id: string): IconName | undefined {
  const item = ITEMS[id];
  if (item) return item.kind === 'medicine' ? 'kusuri' : 'dango';
  const equip = EQUIPMENT[id];
  // 武器を付けられるのは 1 人だけ（icons.test.ts で確かめる）。付ける人のいない装備はアイコンなし（icons.test.ts で全装備にアイコンがあることを確かめる）
  const wearer = equip?.wearers[0];
  return equip && wearer ? slotIcon(equip.slot, wearer) : undefined;
}
