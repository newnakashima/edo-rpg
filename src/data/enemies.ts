// docs/balance.md の「敵とボスの一覧」。フェーズ 1 では序章の分だけ定義する。
import type { EnemyFactors } from '../systems/stats';
import type { Element } from './skills';

export interface EnemyAction {
  /** 技の ID（SKILLS）。'attack' は通常攻撃。 */
  skill: string;
  /** 選ばれる重み。 */
  weight: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** 仮画像の色（image がないときに使う）。 */
  color: number;
  /** 戦闘の画像 public/assets/enemies/<id>.png があるか（PixelLab で生成。記録は public/assets/README.md）。 */
  image?: boolean;
  factors: EnemyFactors;
  /** 弱点（1.5 倍）。 */
  weak?: Element[];
  /** 耐性（0.5 倍）。 */
  resist?: Element[];
  /** 行動の候補。省くと通常攻撃だけ。 */
  actions?: EnemyAction[];
  /** ボスの経験値とお金の倍率（docs/balance.md の「ボス」）。省くと 1（雑魚敵）。 */
  rewardScale?: number;
}

/** 敵の画像のテクスチャのキー。 */
export function enemyImageKey(id: string): string {
  return `enemy-${id}`;
}

export const ENEMIES: Record<string, EnemyDef> = {
  onibi: {
    id: 'onibi',
    name: '鬼火',
    color: 0x6fb7ff,
    image: true,
    factors: { hp: 0.7, atk: 0.9, def: 0.6, spd: 1.2 },
    weak: ['holy'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kitsunebi', weight: 1 },
    ],
  },
  yamainu: {
    id: 'yamainu',
    name: '山犬',
    color: 0x9b7653,
    image: true,
    factors: { hp: 1.0, atk: 1.0, def: 0.8, spd: 1.1 },
    actions: [
      { skill: 'attack', weight: 5 },
      { skill: 'toboe', weight: 1 },
    ],
  },
  ogaeru: {
    id: 'ogaeru',
    name: '大蛙',
    color: 0x5f8f3e,
    image: true,
    factors: { hp: 1.3, atk: 0.9, def: 1.0, spd: 0.7 },
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'dokueki', weight: 1 },
    ],
  },
  // ボス（rewardScale あり）。イベントの battle で出し、出現表には入れない
  /** 序章のボス。妖狐だが、実はからくりで操られていた。序章は一人旅なので化かし（混乱）は控えめにする。 */
  yako: {
    id: 'yako',
    name: '野狐',
    color: 0xe08a3a,
    image: true,
    factors: { hp: 3, atk: 0.65, def: 1.0, spd: 1.2 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 5 },
      { skill: 'kitsunebiUzu', weight: 3 },
      { skill: 'bakashi', weight: 1 },
    ],
    rewardScale: 3,
  },
};

export interface EnemyGroup {
  /** 敵の ID の並び。 */
  members: string[];
  /** 出現の重み。 */
  weight: number;
  /** パーティーの最高レベルがこれ未満のときは出さない。 */
  minPartyLevel?: number;
}

export interface EncounterTable {
  level: number;
  groups: EnemyGroup[];
}

/** 序章の敵の組。主人公 1 人なので 1〜2 体にし、2 体の組は鬼火＋鬼火・鬼火＋大蛙だけを Lv2 から出す。 */
const PROLOGUE: EncounterTable = {
  level: 1,
  groups: [
    { members: ['onibi'], weight: 3 },
    { members: ['yamainu'], weight: 3 },
    { members: ['ogaeru'], weight: 2 },
    { members: ['onibi', 'onibi'], weight: 1, minPartyLevel: 2 },
    { members: ['onibi', 'ogaeru'], weight: 1, minPartyLevel: 2 },
  ],
};

export const ENCOUNTERS: Record<string, EncounterTable> = {
  /** 清水湊の裏山。 */
  urayama: PROLOGUE,
  /** 駿河の街道（ワールドマップの清水湊のまわり）。裏山と同じ。 */
  suruga: PROLOGUE,
};
