// docs/balance.md の「敵とボスの一覧」。章を実装するごとに、その地域の敵を足す（今は序章〜第 8 章）。
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
  // 駿府（第 1 章）
  karakuriNingyo: {
    id: 'karakuriNingyo',
    name: 'からくり人形',
    color: 0xb08a5a,
    image: true,
    factors: { hp: 1.0, atk: 1.0, def: 1.3, spd: 0.8 },
    weak: ['mech', 'thunder'],
  },
  gorotsuki: {
    id: 'gorotsuki',
    name: 'ごろつき',
    color: 0x7a6a5a,
    image: true,
    factors: { hp: 1.0, atk: 1.1, def: 0.9, spd: 1.0 },
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'aikuchi', weight: 1 },
      { skill: 'odoshi', weight: 1 },
    ],
  },
  bakeChochin: {
    id: 'bakeChochin',
    name: '化け提灯',
    color: 0xe0b040,
    image: true,
    factors: { hp: 0.8, atk: 1.0, def: 0.7, spd: 1.1 },
    weak: ['holy', 'fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'aobi', weight: 1 },
    ],
  },
  // 東海道・名古屋（第 2 章）
  oihagiRonin: {
    id: 'oihagiRonin',
    name: '追い剥ぎ浪人',
    color: 0x6a5a7a,
    image: true,
    factors: { hp: 1.1, atk: 1.2, def: 1.0, spd: 1.0 },
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'kesagiri', weight: 1 },
    ],
  },
  kawauso: {
    id: 'kawauso',
    name: '川獺',
    color: 0x8a6a4a,
    image: true,
    factors: { hp: 0.9, atk: 1.0, def: 0.9, spd: 1.2 },
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'bakashi', weight: 1 },
    ],
  },
  zenmaiInu: {
    id: 'zenmaiInu',
    name: 'ゼンマイ犬',
    color: 0x9a8a5a,
    image: true,
    factors: { hp: 1.0, atk: 1.1, def: 1.2, spd: 1.1 },
    weak: ['mech'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kamitsuki', weight: 1 },
    ],
  },
  kumosuke: {
    id: 'kumosuke',
    name: '雲助',
    color: 0x7a5a4a,
    image: true,
    factors: { hp: 1.2, atk: 1.1, def: 1.0, spd: 0.8 },
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'ikizue', weight: 1 },
      { skill: 'odoshi', weight: 1 },
    ],
  },
  // 京（第 3 章）
  akaoni: {
    id: 'akaoni',
    name: '赤鬼',
    color: 0xc04030,
    image: true,
    factors: { hp: 1.4, atk: 1.3, def: 1.0, spd: 0.8 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'kanabo', weight: 1 },
    ],
  },
  ittanmomen: {
    id: 'ittanmomen',
    name: '一反木綿',
    color: 0xe0e0d0,
    image: true,
    factors: { hp: 0.8, atk: 1.0, def: 0.7, spd: 1.3 },
    weak: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'makitsuki', weight: 1 },
    ],
  },
  namagusaBozu: {
    id: 'namagusaBozu',
    name: '生臭坊主',
    color: 0x8a6a5a,
    image: true,
    factors: { hp: 1.0, atk: 0.9, def: 1.0, spd: 0.9 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'jaho', weight: 2 },
    ],
  },
  karakuriGissha: {
    id: 'karakuriGissha',
    name: 'からくり牛車',
    color: 0x6a4a3a,
    image: true,
    factors: { hp: 1.3, atk: 1.1, def: 1.4, spd: 0.7 },
    weak: ['mech'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'totsugeki', weight: 1 },
    ],
  },
  // 伊賀（第 4 章）
  iganin: {
    id: 'iganin',
    name: '伊賀者',
    color: 0x3a3a4a,
    image: true,
    factors: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.4 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'igaShuriken', weight: 2 },
    ],
  },
  dokugumo: {
    id: 'dokugumo',
    name: '毒蜘蛛',
    color: 0x5a3a6a,
    image: true,
    factors: { hp: 0.9, atk: 1.0, def: 0.9, spd: 1.1 },
    weak: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'dokueki', weight: 1 },
      { skill: 'kumoNoIto', weight: 1 },
    ],
  },
  karakuriTaka: {
    id: 'karakuriTaka',
    name: 'からくり鷹',
    color: 0x8a7a5a,
    image: true,
    factors: { hp: 0.8, atk: 1.1, def: 1.0, spd: 1.4 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kyukoka', weight: 1 },
    ],
  },
  // 大坂（第 5 章）
  yojinbo: {
    id: 'yojinbo',
    name: '米問屋の用心棒',
    color: 0x5a4a3a,
    image: true,
    factors: { hp: 1.2, atk: 1.2, def: 1.1, spd: 0.9 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kesagiri', weight: 1 },
    ],
  },
  teppoAshigaru: {
    id: 'teppoAshigaru',
    name: '鉄砲足軽',
    color: 0x4a5a6a,
    image: true,
    factors: { hp: 1.0, atk: 1.3, def: 1.0, spd: 0.9 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'teppo', weight: 1 },
    ],
  },
  karakuriTawara: {
    id: 'karakuriTawara',
    name: 'からくり俵',
    color: 0xc0a060,
    image: true,
    factors: { hp: 1.3, atk: 1.0, def: 1.4, spd: 0.7 },
    weak: ['mech', 'fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'tawaraGoroshi', weight: 1 },
    ],
  },
  bakeNezumi: {
    id: 'bakeNezumi',
    name: '化け鼠',
    color: 0x7a6a6a,
    image: true,
    factors: { hp: 0.8, atk: 1.0, def: 0.8, spd: 1.3 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kamitsuki', weight: 1 },
      { skill: 'dokueki', weight: 1 },
    ],
  },
  // 西国街道・長崎・島原（第 6 章）
  nanbanHei: {
    id: 'nanbanHei',
    name: '南蛮からくり兵',
    color: 0x8a8a9a,
    image: true,
    factors: { hp: 1.2, atk: 1.2, def: 1.4, spd: 0.9 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'nanbanKen', weight: 1 },
    ],
  },
  umibozu: {
    id: 'umibozu',
    name: '海坊主',
    color: 0x2a3a4a,
    image: true,
    factors: { hp: 1.4, atk: 1.2, def: 1.0, spd: 0.8 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'onami', weight: 1 },
    ],
  },
  boreiMusha: {
    id: 'boreiMusha',
    name: '亡霊武者',
    color: 0x6a7a8a,
    image: true,
    factors: { hp: 1.1, atk: 1.3, def: 1.1, spd: 1.0 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'monoTachi', weight: 1 },
    ],
  },
  gehoTsukai: {
    id: 'gehoTsukai',
    name: '外法使い',
    color: 0x4a2a5a,
    image: true,
    factors: { hp: 0.9, atk: 1.0, def: 0.8, spd: 1.1 },
    actions: [
      { skill: 'attack', weight: 2 },
      { skill: 'gehoHomura', weight: 2 },
      { skill: 'madowashi', weight: 1 },
    ],
  },
  // 瀬戸内の浜に出る。docs/balance.md の表にない、西国街道の雑魚敵（テストプレイで雑魚敵の種類が少ないと言われたため足した）
  heikegani: {
    id: 'heikegani',
    name: '平家蟹',
    color: 0x9a4a3a,
    image: true,
    factors: { hp: 1.1, atk: 1.1, def: 1.4, spd: 0.8 },
    weak: ['thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'hasami', weight: 1 },
      { skill: 'awa', weight: 1 },
    ],
  },
  // テストプレイのフィードバック（雑魚敵が少ない）で足した敵。序章〜京に 2 体ずつ
  /** 序章。つむじ風に乗って鎌で切りつけるイタチ。 */
  kamaitachi: {
    id: 'kamaitachi',
    name: '鎌鼬',
    color: 0xb0703a,
    image: true,
    factors: { hp: 0.7, atk: 1.0, def: 0.7, spd: 1.4 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kamakaze', weight: 1 },
    ],
  },
  /** 序章。人を化かす狢。 */
  mujina: {
    id: 'mujina',
    name: '狢',
    color: 0x8a7a6a,
    image: true,
    factors: { hp: 1.1, atk: 0.8, def: 1.0, spd: 0.9 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 4 },
      { skill: 'bakashi', weight: 1 },
    ],
  },
  /** 駿府のまわりの山の猪。 */
  inoshishi: {
    id: 'inoshishi',
    name: '猪',
    color: 0x6a4a3a,
    image: true,
    factors: { hp: 1.2, atk: 1.2, def: 0.9, spd: 0.8 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'totsugeki', weight: 1 },
    ],
  },
  /** 駿府。古い唐傘の付喪神。 */
  karakasa: {
    id: 'karakasa',
    name: '傘お化け',
    color: 0xc04a3a,
    image: true,
    factors: { hp: 0.8, atk: 1.0, def: 0.8, spd: 1.2 },
    weak: ['holy', 'fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'odoshi', weight: 1 },
    ],
  },
  /** 東海道。旅人のふりをして旅人を狙う盗人。 */
  gomanohai: {
    id: 'gomanohai',
    name: '護摩の灰',
    color: 0x8a8a7a,
    image: true,
    factors: { hp: 0.9, atk: 1.1, def: 0.9, spd: 1.3 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'aikuchi', weight: 1 },
    ],
  },
  /** 東海道。夜道に出る一つ目の小坊主。 */
  hitotsumeKozo: {
    id: 'hitotsumeKozo',
    name: '一つ目小僧',
    color: 0x6a7a9a,
    image: true,
    factors: { hp: 0.8, atk: 0.9, def: 0.8, spd: 1.1 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'bakashi', weight: 1 },
    ],
  },
  /** 名古屋。鷲尾の配下が改造した茶運びのからくり人形。 */
  chahakobi: {
    id: 'chahakobi',
    name: '茶運び人形',
    color: 0xa0503a,
    image: true,
    factors: { hp: 1.0, atk: 1.0, def: 1.3, spd: 0.9 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'atsuiCha', weight: 1 },
    ],
  },
  /** 名古屋の堀川に棲む河童。 */
  kappa: {
    id: 'kappa',
    name: '河童',
    color: 0x5a9a4a,
    image: true,
    factors: { hp: 1.1, atk: 1.1, def: 1.0, spd: 1.0 },
    weak: ['thunder'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kappaZumo', weight: 1 },
    ],
  },
  /** 京。赤鬼の相方の青鬼。 */
  aooni: {
    id: 'aooni',
    name: '青鬼',
    color: 0x4a6ab0,
    image: true,
    factors: { hp: 1.3, atk: 1.2, def: 1.1, spd: 0.9 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kanabo', weight: 1 },
    ],
  },
  /** 京の夜の都大路を走る、燃える車輪の妖怪。 */
  wanyudo: {
    id: 'wanyudo',
    name: '輪入道',
    color: 0xd06a2a,
    image: true,
    factors: { hp: 1.1, atk: 1.2, def: 1.0, spd: 1.1 },
    weak: ['holy'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'hinowa', weight: 1 },
    ],
  },
  // 伊賀〜原城に足した敵（テストプレイのフィードバック）
  /** 伊賀の山に棲む烏天狗。 */
  karasuTengu: {
    id: 'karasuTengu',
    name: '烏天狗',
    color: 0x2a2a3a,
    image: true,
    factors: { hp: 1.0, atk: 1.2, def: 1.0, spd: 1.3 },
    weak: ['thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kyukoka', weight: 1 },
    ],
  },
  /** 伊賀者の里のくノ一。 */
  igaKunoichi: {
    id: 'igaKunoichi',
    name: '伊賀のくノ一',
    color: 0x6a3a7a,
    image: true,
    factors: { hp: 0.9, atk: 1.1, def: 0.9, spd: 1.4 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'igaShuriken', weight: 1 },
    ],
  },
  /** 大坂の蔵に棲みついた猫又。 */
  nekomata: {
    id: 'nekomata',
    name: '猫又',
    color: 0x3a3a4a,
    image: true,
    factors: { hp: 1.0, atk: 1.2, def: 0.9, spd: 1.3 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kaibyoBi', weight: 1 },
    ],
  },
  /** 大坂の賭場の博徒。 */
  bakuto: {
    id: 'bakuto',
    name: '博徒',
    color: 0x8a5a4a,
    image: true,
    factors: { hp: 1.1, atk: 1.2, def: 1.0, spd: 1.0 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'saikoro', weight: 1 },
    ],
  },
  /** 西国街道の磯に出る磯女。長い髪で巻きつく。 */
  isoonna: {
    id: 'isoonna',
    name: '磯女',
    color: 0xb0c0d0,
    image: true,
    factors: { hp: 1.0, atk: 1.1, def: 0.9, spd: 1.1 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'makitsuki', weight: 1 },
    ],
  },
  /** 瀬戸内の浜に出る牛鬼。 */
  ushioni: {
    id: 'ushioni',
    name: '牛鬼',
    color: 0x2a2a2a,
    image: true,
    factors: { hp: 1.4, atk: 1.3, def: 1.1, spd: 0.9 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'dokueki', weight: 1 },
    ],
  },
  /** 長崎の沖の海賊。 */
  kaizoku: {
    id: 'kaizoku',
    name: '海賊',
    color: 0x8a6a4a,
    image: true,
    factors: { hp: 1.1, atk: 1.2, def: 1.0, spd: 1.1 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kesagiri', weight: 1 },
    ],
  },
  /** 原城跡で討ち死にした者の骨が集まった大骸骨。 */
  gashadokuro: {
    id: 'gashadokuro',
    name: 'がしゃどくろ',
    color: 0xd0c0e0,
    image: true,
    factors: { hp: 1.5, atk: 1.3, def: 1.2, spd: 0.7 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'nigiritsubushi', weight: 1 },
    ],
  },
  /** 原城跡をさまよう怨霊。 */
  onryo: {
    id: 'onryo',
    name: '怨霊',
    color: 0xe0e0e0,
    image: true,
    factors: { hp: 0.9, atk: 1.1, def: 0.8, spd: 1.2 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 2 },
      { skill: 'urami', weight: 1 },
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
  /** 第 1 章のボス。からくり兵の指揮機。からくり人形（Lv4）を 2 体まで呼ぶ。 */
  tetsubin: {
    id: 'tetsubin',
    name: 'からくり大将 鉄瓶',
    color: 0x5a6070,
    image: true,
    factors: { hp: 5, atk: 0.7, def: 1.2, spd: 0.8 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'tekken', weight: 2 },
      { skill: 'joki', weight: 2 },
      { skill: 'karakuriYobi', weight: 1 },
    ],
    rewardScale: 5,
  },
  /** 第 2 章のボス。名古屋城の金の鱗で動く巨大な鯱。金の鱗で守りを固める。 */
  kinshachi: {
    id: 'kinshachi',
    name: '金鯱からくり',
    color: 0xd0a030,
    image: true,
    factors: { hp: 5, atk: 0.95, def: 1.2, spd: 0.9 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'obire', weight: 2 },
      { skill: 'kinUroko', weight: 1 },
    ],
    rewardScale: 5,
  },
  /** 第 3 章のボス。夜叉丸が鬼の巣で呼び出した大鬼。酒の息で眠らせ、怒りで攻撃を上げる。 */
  shuten: {
    id: 'shuten',
    name: '酒呑の大鬼',
    color: 0xa02020,
    image: true,
    factors: { hp: 9, atk: 1.25, def: 1.1, spd: 0.8 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kanabo', weight: 2 },
      { skill: 'sakeNoIki', weight: 1 },
      { skill: 'ikari', weight: 1 },
    ],
    rewardScale: 6,
  },
  /** 第 4 章の中ボス。伊賀者の里の上忍で、霞のかつての師。手裏剣の雨と空蝉（回避↑）。 */
  oboro: {
    id: 'oboro',
    name: '上忍 朧',
    color: 0x6a6a6a,
    image: true,
    factors: { hp: 10, atk: 1.25, def: 1.0, spd: 1.5 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'shurikenAme', weight: 2 },
      { skill: 'utsusemi', weight: 1 },
    ],
    rewardScale: 3,
  },
  /** 第 4 章のボス。辰五郎の仇。からくりの義手で二連撃・防御無視の一撃、毒の仕込み針。 */
  gonroku: {
    id: 'gonroku',
    name: '蛇骨の権六',
    color: 0x4a5a3a,
    image: true,
    factors: { hp: 13, atk: 1.3, def: 1.0, spd: 1.4 },
    weak: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'nirengeki', weight: 2 },
      { skill: 'shikomibari', weight: 1 },
      { skill: 'gishu', weight: 1 },
    ],
    rewardScale: 6,
  },
  /** 第 5 章のボス。米蔵の地下のからくり工場の守り神。俵落とし（全体）と米ぬかの煙（命中↓）。 */
  hyakuhyo: {
    id: 'hyakuhyo',
    name: '百俵からくり',
    color: 0xb09050,
    image: true,
    factors: { hp: 14, atk: 1.2, def: 1.4, spd: 0.7 },
    weak: ['mech', 'fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'tawaraOtoshi', weight: 2 },
      { skill: 'komenuka', weight: 1 },
    ],
    rewardScale: 6,
  },
  /** 第 6 章のボス。原城跡の地下の研究所を守る。装填（構え）の次のターンに大筒（全体・大）を撃つ。 */
  nanbanOzutsu: {
    id: 'nanbanOzutsu',
    name: '南蛮大筒からくり',
    color: 0x6a6a7a,
    image: true,
    factors: { hp: 12, atk: 1.1, def: 1.3, spd: 0.8 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'soten', weight: 2 },
      { skill: 'budodan', weight: 1 },
    ],
    rewardScale: 6,
  },
  // 北前船・金沢（第 7 章）。船幽霊は北前船の甲板に出る
  funayurei: {
    id: 'funayurei',
    name: '船幽霊',
    color: 0x8aa0b0,
    image: true,
    factors: { hp: 1.0, atk: 1.1, def: 0.9, spd: 1.1 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'hishaku', weight: 1 },
    ],
  },
  karakuriHanshi: {
    id: 'karakuriHanshi',
    name: 'からくり藩士',
    color: 0x5a5a7a,
    image: true,
    factors: { hp: 1.2, atk: 1.3, def: 1.3, spd: 1.0 },
    weak: ['mech'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'yariTsuki', weight: 1 },
    ],
  },
  yukiOnna: {
    id: 'yukiOnna',
    name: '雪女',
    color: 0xd0e0f0,
    image: true,
    factors: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.2 },
    weak: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'fubuki', weight: 1 },
      { skill: 'kogoe', weight: 1 },
    ],
  },
  kagaShinobi: {
    id: 'kagaShinobi',
    name: '加賀の忍び',
    color: 0x3a3a4a,
    image: true,
    factors: { hp: 0.9, atk: 1.2, def: 0.9, spd: 1.4 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'nirengeki', weight: 1 },
    ],
  },
  /** 表にない追加（どの出現表も 5 種類以上にするため）。雪の夜に現れる大入道。 */
  yukiNyudo: {
    id: 'yukiNyudo',
    name: '雪入道',
    color: 0xe0e8f0,
    image: true,
    factors: { hp: 1.5, atk: 1.2, def: 1.0, spd: 0.7 },
    weak: ['fire', 'holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'nadare', weight: 1 },
    ],
  },
  /** 表にない追加。金沢の金箔を貼ったからくり人形。 */
  kinpakuNingyo: {
    id: 'kinpakuNingyo',
    name: '金箔からくり',
    color: 0xd0b040,
    image: true,
    factors: { hp: 1.0, atk: 1.0, def: 1.4, spd: 1.1 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kinpakuMai', weight: 1 },
    ],
  },
  /** 第 7 章の中ボス。加賀の殿様に化けていたからくりの影武者。からくり藩士を呼び、影の太刀で斬る。 */
  kagemusha: {
    id: 'kagemusha',
    name: 'からくり影武者',
    color: 0x7a5a8a,
    image: true,
    factors: { hp: 9, atk: 1.2, def: 1.3, spd: 1.0 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kageTachi', weight: 2 },
      { skill: 'goji', weight: 1 },
    ],
    rewardScale: 3,
  },
  /** 第 7 章のボス。鷲尾の配下の妖術師。妖術（全体・火）、呪い（全体・攻撃↓）、分身（回避↑）。 */
  yashamaru: {
    id: 'yashamaru',
    name: '夜叉丸',
    color: 0x3a2a3a,
    image: true,
    factors: { hp: 11, atk: 1.1, def: 1.0, spd: 1.3 },
    weak: ['holy'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'yojutsu', weight: 2 },
      { skill: 'noroi', weight: 1 },
      { skill: 'yashaBunshin', weight: 1 },
    ],
    rewardScale: 6,
  },
  // 奥州街道・江戸の町（第 8 章）。docs/balance.md の「江戸の町」。火付け盗賊・旗本奴は江戸の町なかだけに出る
  hitsukeTozoku: {
    id: 'hitsukeTozoku',
    name: '火付け盗賊',
    color: 0x6a3a2a,
    image: true,
    factors: { hp: 1.0, atk: 1.3, def: 1.0, spd: 1.2 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'taimatsu', weight: 1 },
    ],
  },
  kasha: {
    id: 'kasha',
    name: '火車',
    color: 0xc0502a,
    image: true,
    factors: { hp: 1.2, atk: 1.3, def: 1.1, spd: 1.1 },
    weak: ['holy'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'jigokuBi', weight: 1 },
    ],
  },
  karakuriDoshin: {
    id: 'karakuriDoshin',
    name: 'からくり同心',
    color: 0x4a4a5a,
    image: true,
    factors: { hp: 1.2, atk: 1.2, def: 1.4, spd: 1.0 },
    weak: ['mech', 'thunder'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'jutte', weight: 1 },
    ],
  },
  hatamotoYakko: {
    id: 'hatamotoYakko',
    name: '旗本奴',
    color: 0x7a3a6a,
    image: true,
    factors: { hp: 1.2, atk: 1.4, def: 1.1, spd: 1.0 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kenkaZappo', weight: 1 },
      { skill: 'odoshi', weight: 1 },
    ],
  },
  /** 表にない追加（どの出現表も 5 種類以上にするため）。大火の町に出る、火の中に棲む鼠。 */
  hinezumi: {
    id: 'hinezumi',
    name: '火鼠',
    color: 0xd06030,
    image: true,
    factors: { hp: 0.8, atk: 1.1, def: 0.8, spd: 1.4 },
    weak: ['holy'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'hinoko', weight: 1 },
    ],
  },
  /** 表にない追加。奥州街道の夜道で旅人のあとをつける狼。 */
  okuriOkami: {
    id: 'okuriOkami',
    name: '送り狼',
    color: 0x6a6a7a,
    image: true,
    factors: { hp: 1.1, atk: 1.3, def: 0.9, spd: 1.3 },
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'okuriKiba', weight: 1 },
      { skill: 'toboe', weight: 1 },
    ],
  },
  /** 第 8 章のボス。鷲尾が江戸の町に火を放つために作った、炎の車輪のからくり。火炎車（全体・火）と亡者の手（麻痺）。 */
  kashaKarakuri: {
    id: 'kashaKarakuri',
    name: '火車からくり',
    color: 0xa03020,
    image: true,
    factors: { hp: 13, atk: 1.05, def: 1.2, spd: 1.1 },
    weak: ['holy', 'mech'],
    resist: ['fire'],
    actions: [
      { skill: 'attack', weight: 3 },
      { skill: 'kaenGuruma', weight: 2 },
      { skill: 'mojaNoTe', weight: 1 },
    ],
    rewardScale: 6,
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

/** 序章の敵の組。主人公 1 人なので 1〜2 体にし、2 体の組（鬼火＋鬼火・鬼火＋大蛙・鎌鼬＋鬼火）は Lv2 から出す。 */
const PROLOGUE: EncounterTable = {
  level: 1,
  groups: [
    { members: ['onibi'], weight: 3 },
    { members: ['yamainu'], weight: 3 },
    { members: ['ogaeru'], weight: 2 },
    { members: ['onibi', 'onibi'], weight: 1, minPartyLevel: 2 },
    { members: ['onibi', 'ogaeru'], weight: 1, minPartyLevel: 2 },
    { members: ['kamaitachi'], weight: 2 },
    { members: ['mujina'], weight: 2 },
    { members: ['kamaitachi', 'onibi'], weight: 1, minPartyLevel: 2 },
  ],
};

/** 駿府の敵の組（3 体の組は主人公と霞の 2 人から。霞の加入前の一人旅では pickGroup が 2 体までに絞る）。 */
const SUNPU: EncounterTable = {
  level: 4,
  groups: [
    { members: ['karakuriNingyo'], weight: 2 },
    { members: ['gorotsuki', 'gorotsuki'], weight: 2 },
    { members: ['bakeChochin', 'bakeChochin'], weight: 2 },
    { members: ['karakuriNingyo', 'gorotsuki'], weight: 2 },
    { members: ['karakuriNingyo', 'bakeChochin', 'bakeChochin'], weight: 1 },
    { members: ['gorotsuki', 'gorotsuki', 'bakeChochin'], weight: 1 },
    { members: ['inoshishi'], weight: 2 },
    { members: ['karakasa', 'karakasa'], weight: 2 },
    // 猪＋ごろつきは一人旅には重い（主人公 Lv3 で勝率 6%）ので、化け提灯を足した 3 体の組にして霞が加わってから出す
    { members: ['inoshishi', 'gorotsuki', 'bakeChochin'], weight: 1 },
    { members: ['karakasa', 'bakeChochin', 'bakeChochin'], weight: 1 },
  ],
};

/** 東海道（大井川の西の街道）の敵の組。 */
const TOKAIDO: EncounterTable = {
  level: 7,
  groups: [
    { members: ['oihagiRonin'], weight: 2 },
    { members: ['kawauso', 'kawauso'], weight: 2 },
    { members: ['kumosuke'], weight: 2 },
    { members: ['oihagiRonin', 'kumosuke'], weight: 2 },
    { members: ['kawauso', 'kawauso', 'kawauso'], weight: 1 },
    { members: ['kumosuke', 'kawauso', 'kawauso'], weight: 1 },
    { members: ['gomanohai', 'gomanohai'], weight: 2 },
    { members: ['hitotsumeKozo', 'kawauso'], weight: 2 },
    { members: ['gomanohai', 'oihagiRonin'], weight: 1 },
    { members: ['hitotsumeKozo', 'hitotsumeKozo', 'hitotsumeKozo'], weight: 1 },
  ],
};

/** 名古屋の堀川の荷蔵と天守の敵の組。鷲尾の配下の浪人と、からくりのゼンマイ犬。 */
const NAGOYA: EncounterTable = {
  level: 7,
  groups: [
    { members: ['zenmaiInu'], weight: 2 },
    { members: ['zenmaiInu', 'zenmaiInu'], weight: 2 },
    { members: ['oihagiRonin', 'zenmaiInu'], weight: 2 },
    { members: ['oihagiRonin', 'oihagiRonin'], weight: 1 },
    { members: ['zenmaiInu', 'zenmaiInu', 'zenmaiInu'], weight: 1 },
    { members: ['kumosuke', 'zenmaiInu', 'zenmaiInu'], weight: 1 },
    { members: ['chahakobi', 'chahakobi'], weight: 2 },
    { members: ['kappa'], weight: 2 },
    { members: ['kappa', 'zenmaiInu'], weight: 1 },
    { members: ['chahakobi', 'zenmaiInu', 'zenmaiInu'], weight: 1 },
  ],
};

/** 京のまわりの街道・羅生門跡・鬼の巣の敵の組（4 体の組は玄道が加わった 3 人から）。 */
const KYOTO: EncounterTable = {
  level: 10,
  groups: [
    { members: ['akaoni'], weight: 2 },
    { members: ['ittanmomen', 'ittanmomen'], weight: 2 },
    { members: ['namagusaBozu', 'akaoni'], weight: 2 },
    { members: ['karakuriGissha', 'namagusaBozu'], weight: 2 },
    { members: ['ittanmomen', 'ittanmomen', 'ittanmomen'], weight: 1 },
    { members: ['akaoni', 'ittanmomen', 'ittanmomen'], weight: 1 },
    { members: ['akaoni', 'namagusaBozu', 'ittanmomen', 'ittanmomen'], weight: 1 },
    { members: ['aooni'], weight: 2 },
    { members: ['wanyudo', 'wanyudo'], weight: 2 },
    { members: ['aooni', 'akaoni'], weight: 1 },
    { members: ['wanyudo', 'ittanmomen', 'ittanmomen'], weight: 1 },
    { members: ['aooni', 'wanyudo', 'namagusaBozu', 'ittanmomen'], weight: 1 },
  ],
};

/** 伊賀のまわりの街道と伊賀者の里の敵の組（お凛が加わった 4 人で来る）。 */
const IGA: EncounterTable = {
  level: 13,
  groups: [
    { members: ['iganin', 'iganin'], weight: 2 },
    { members: ['dokugumo', 'dokugumo', 'iganin'], weight: 2 },
    { members: ['karakuriTaka', 'karakuriTaka'], weight: 2 },
    { members: ['iganin', 'karakuriTaka', 'dokugumo'], weight: 2 },
    { members: ['iganin', 'iganin', 'iganin'], weight: 1 },
    { members: ['iganin', 'iganin', 'karakuriTaka', 'dokugumo'], weight: 1 },
    { members: ['karasuTengu', 'karasuTengu'], weight: 2 },
    { members: ['igaKunoichi', 'iganin'], weight: 2 },
    { members: ['karasuTengu', 'igaKunoichi', 'dokugumo'], weight: 1 },
    { members: ['igaKunoichi', 'igaKunoichi', 'iganin', 'karakuriTaka'], weight: 1 },
  ],
};

/** 大坂のまわりの街道と米蔵の地下の敵の組（霞の代わりに兵庫が加わった 4 人で来る）。 */
const OSAKA: EncounterTable = {
  level: 16,
  groups: [
    { members: ['yojinbo', 'yojinbo'], weight: 2 },
    { members: ['bakeNezumi', 'bakeNezumi', 'bakeNezumi'], weight: 2 },
    { members: ['teppoAshigaru', 'yojinbo'], weight: 2 },
    { members: ['karakuriTawara', 'bakeNezumi', 'bakeNezumi'], weight: 2 },
    { members: ['karakuriTawara', 'teppoAshigaru', 'yojinbo'], weight: 1 },
    { members: ['yojinbo', 'teppoAshigaru', 'teppoAshigaru', 'bakeNezumi'], weight: 1 },
    { members: ['nekomata', 'nekomata'], weight: 2 },
    { members: ['bakuto', 'yojinbo'], weight: 2 },
    { members: ['bakuto', 'bakuto', 'bakeNezumi'], weight: 1 },
    { members: ['nekomata', 'bakeNezumi', 'bakeNezumi', 'bakuto'], weight: 1 },
  ],
};

/** 西国街道（大坂の西〜広島〜長崎）の敵の組（霞が戻る前の 3 人でも通るので、4 体の組は控えめにする）。 */
const SAIGOKU: EncounterTable = {
  level: 19,
  groups: [
    { members: ['heikegani', 'heikegani'], weight: 2 },
    { members: ['umibozu'], weight: 2 },
    { members: ['gehoTsukai', 'heikegani'], weight: 2 },
    { members: ['umibozu', 'heikegani', 'heikegani'], weight: 1 },
    { members: ['gehoTsukai', 'gehoTsukai', 'umibozu'], weight: 1 },
    { members: ['isoonna', 'isoonna'], weight: 2 },
    { members: ['ushioni'], weight: 2 },
    { members: ['ushioni', 'heikegani'], weight: 1 },
    { members: ['isoonna', 'umibozu', 'heikegani'], weight: 1 },
  ],
};

/** 長崎の南蛮寺跡と、長崎のまわりの街道の敵の組。 */
const NAGASAKI: EncounterTable = {
  level: 19,
  groups: [
    { members: ['nanbanHei'], weight: 2 },
    { members: ['gehoTsukai', 'gehoTsukai'], weight: 2 },
    { members: ['nanbanHei', 'gehoTsukai'], weight: 2 },
    { members: ['umibozu', 'heikegani', 'gehoTsukai'], weight: 2 },
    { members: ['nanbanHei', 'nanbanHei', 'gehoTsukai'], weight: 1 },
    { members: ['gehoTsukai', 'gehoTsukai', 'heikegani', 'heikegani'], weight: 1 },
    { members: ['kaizoku', 'kaizoku'], weight: 2 },
    { members: ['kaizoku', 'nanbanHei'], weight: 1 },
    { members: ['kaizoku', 'kaizoku', 'gehoTsukai', 'umibozu'], weight: 1 },
  ],
};

/** 島原の原城跡と地下の研究所の敵の組。乱で討ち死にした武者の亡霊と、研究所のからくり兵。 */
const HARAJO: EncounterTable = {
  level: 19,
  groups: [
    { members: ['boreiMusha', 'boreiMusha'], weight: 2 },
    { members: ['nanbanHei', 'boreiMusha'], weight: 2 },
    { members: ['gehoTsukai', 'boreiMusha', 'boreiMusha'], weight: 2 },
    { members: ['nanbanHei', 'nanbanHei'], weight: 1 },
    { members: ['boreiMusha', 'boreiMusha', 'boreiMusha'], weight: 1 },
    { members: ['nanbanHei', 'gehoTsukai', 'boreiMusha', 'boreiMusha'], weight: 1 },
    { members: ['gashadokuro'], weight: 2 },
    { members: ['onryo', 'onryo'], weight: 2 },
    { members: ['gashadokuro', 'boreiMusha'], weight: 1 },
    { members: ['onryo', 'onryo', 'boreiMusha', 'gehoTsukai'], weight: 1 },
  ],
};

/** 北前船の甲板の敵の組（長崎から金沢への船旅）。日本海の妖怪と海賊。 */
const KITAMAE: EncounterTable = {
  level: 22,
  groups: [
    { members: ['funayurei', 'funayurei'], weight: 2 },
    { members: ['umibozu', 'funayurei'], weight: 2 },
    { members: ['isoonna', 'funayurei', 'funayurei'], weight: 2 },
    { members: ['kaizoku', 'kaizoku', 'funayurei'], weight: 1 },
    { members: ['heikegani', 'heikegani', 'umibozu'], weight: 1 },
    { members: ['funayurei', 'funayurei', 'funayurei', 'isoonna'], weight: 1 },
  ],
};

/** 金沢の兼六園の敵の組。雪の庭に出る妖怪と、家老の配下のからくり藩士・加賀の忍び。 */
const KENROKUEN: EncounterTable = {
  level: 22,
  groups: [
    { members: ['yukiOnna', 'yukiOnna'], weight: 2 },
    { members: ['karakuriHanshi', 'kagaShinobi'], weight: 2 },
    { members: ['yukiNyudo'], weight: 2 },
    { members: ['kagaShinobi', 'kagaShinobi', 'yukiOnna'], weight: 2 },
    { members: ['kinpakuNingyo', 'kinpakuNingyo'], weight: 1 },
    { members: ['yukiNyudo', 'yukiOnna', 'yukiOnna'], weight: 1 },
    { members: ['karakuriHanshi', 'kagaShinobi', 'kagaShinobi', 'yukiOnna'], weight: 1 },
  ],
};

/** 金沢城の地下のからくり蔵の敵の組。蔵で作られたからくりと、魂を抜かれた者の怨霊。 */
const KARAKURI_GURA: EncounterTable = {
  level: 22,
  groups: [
    { members: ['karakuriHanshi', 'karakuriHanshi'], weight: 2 },
    { members: ['kinpakuNingyo', 'karakuriHanshi'], weight: 2 },
    { members: ['kagaShinobi', 'kagaShinobi', 'kinpakuNingyo'], weight: 2 },
    { members: ['onryo', 'onryo', 'karakuriHanshi'], weight: 2 },
    { members: ['boreiMusha', 'kinpakuNingyo'], weight: 1 },
    { members: ['karakuriHanshi', 'kinpakuNingyo', 'kinpakuNingyo', 'kagaShinobi'], weight: 1 },
  ],
};

/** 北国街道・奥州街道（金沢〜仙台〜江戸）の敵の組。江戸の町の敵のうち、町なかに出る火付け盗賊・旗本奴の代わりに、雪女・加賀の忍びと送り狼が出る。 */
const OSHU: EncounterTable = {
  level: 25,
  groups: [
    { members: ['okuriOkami', 'okuriOkami'], weight: 2 },
    { members: ['kasha', 'yukiOnna'], weight: 2 },
    { members: ['karakuriDoshin', 'kagaShinobi'], weight: 2 },
    { members: ['yukiOnna', 'yukiOnna', 'okuriOkami'], weight: 2 },
    { members: ['kasha', 'kagaShinobi', 'kagaShinobi'], weight: 1 },
    { members: ['karakuriDoshin', 'okuriOkami', 'okuriOkami', 'yukiOnna'], weight: 1 },
  ],
};

/** 江戸の大火の町の敵の組。鷲尾の放った火付け盗賊とからくり同心、火に寄ってくる火車・火鼠、どさくさに暴れる旗本奴。 */
const EDO: EncounterTable = {
  level: 25,
  groups: [
    { members: ['hitsukeTozoku', 'hitsukeTozoku'], weight: 2 },
    { members: ['kasha', 'hinezumi'], weight: 2 },
    { members: ['karakuriDoshin', 'hitsukeTozoku'], weight: 2 },
    { members: ['hatamotoYakko', 'hatamotoYakko'], weight: 2 },
    { members: ['hinezumi', 'hinezumi', 'hinezumi'], weight: 1 },
    { members: ['kasha', 'karakuriDoshin', 'hitsukeTozoku'], weight: 1 },
    { members: ['hatamotoYakko', 'hitsukeTozoku', 'hinezumi', 'hinezumi'], weight: 1 },
  ],
};

export const ENCOUNTERS: Record<string, EncounterTable> = {
  /** 清水湊の裏山。 */
  urayama: PROLOGUE,
  /** 駿河の街道（ワールドマップの清水湊のまわり）。裏山と同じ。 */
  suruga: PROLOGUE,
  /** 駿府のまわりの街道と、からくり屋敷。 */
  sunpu: SUNPU,
  /** 大井川の西の東海道（名古屋・京・伊賀のまわり）。京・伊賀の地域の敵は、その章で範囲を足す。 */
  tokaido: TOKAIDO,
  /** 名古屋の堀川の荷蔵と天守。 */
  nagoya: NAGOYA,
  /** 京のまわりの街道と、羅生門跡・鬼の巣。 */
  kyoto: KYOTO,
  /** 伊賀のまわりの街道と、伊賀者の里。 */
  iga: IGA,
  /** 大坂のまわりの街道と、米蔵の地下。 */
  osaka: OSAKA,
  /** 西国街道（大坂の西〜広島のまわり）。 */
  saigoku: SAIGOKU,
  /** 長崎のまわりの街道と、南蛮寺跡。 */
  nagasaki: NAGASAKI,
  /** 島原の原城跡と、地下の研究所。 */
  harajo: HARAJO,
  /** 北前船の甲板（長崎から金沢へ）。 */
  kitamae: KITAMAE,
  /** 金沢の兼六園。 */
  kenrokuen: KENROKUEN,
  /** 金沢城の地下のからくり蔵。 */
  karakuriGura: KARAKURI_GURA,
  /** 北国街道・奥州街道（ワールドマップの金沢の東〜仙台〜江戸、箱根の関所の東）。 */
  oshu: OSHU,
  /** 江戸の大火の町。 */
  edo: EDO,
};
