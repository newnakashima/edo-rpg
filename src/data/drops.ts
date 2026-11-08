// 雑魚敵のドロップアイテム（docs/balance.md の「敵のドロップ」）。
// テストプレイで「ドロップで敵の個性を出す」「その敵を倒すことでしか手に入らない低確率のレアを持たせる」と言われたため、雑魚敵すべてに持たせた。
// 通常のドロップ（common）は店で買える道具・装備で、その敵らしいもの（毒の敵は毒消し、忍びは兵糧丸、海の敵は土地の名物）。
// レアのドロップ（rare）は、その敵だけが落とす道具・装備（items.ts・equipment.ts の「敵のレアドロップ」）。
// ボスは持たない（ボスの作り直しのタスクで決める）。

export interface EnemyDrop {
  /** 通常のドロップ（店で買える道具・装備品の ID）。 */
  common: string;
  /** レアのドロップ（その敵だけが落とす道具・装備品の ID）。 */
  rare: string;
  /** 通常のドロップの確率。省くと COMMON_DROP_RATE。 */
  commonRate?: number;
  /** レアのドロップの確率。省くと RARE_DROP_RATE。 */
  rareRate?: number;
}

/** 通常のドロップの確率（8 体に 1 体）。 */
export const COMMON_DROP_RATE = 1 / 8;
/** レアのドロップの確率（64 体に 1 体）。 */
export const RARE_DROP_RATE = 1 / 64;
/** 逃げる高報酬の敵（からくり鷹・金箔からくり）の確率。倒すこと自体がまれなので高くする。 */
const FLEER = { commonRate: 1 / 3, rareRate: 1 / 16 } as const;

export const ENEMY_DROPS: Record<string, EnemyDrop> = {
  // 清水湊・裏山
  onibi: { common: 'amazake', rare: 'onibiDama' },
  yamainu: { common: 'omusubi', rare: 'yamainuKiba' },
  ogaeru: { common: 'dokukeshi', rare: 'gamaNoAbura' },
  // 三匹目の鎌鼬が傷に薬を塗っていくという言い伝えから
  kamaitachi: { common: 'kizugusuri', rare: 'kamaitachiTsume' },
  mujina: { common: 'dango', rare: 'bakeHappa' },
  // 駿府
  karakuriNingyo: { common: 'hachigane', rare: 'shinchuHaguruma' },
  gorotsuki: { common: 'dango', rare: 'nagadosu' },
  bakeChochin: { common: 'chochin', rare: 'hyakumeRosoku' },
  inoshishi: { common: 'kizugusuri', rare: 'shishiNiku' },
  karakasa: { common: 'umeboshi', rare: 'yabureBangasa' },
  // 東海道・名古屋
  oihagiRonin: { common: 'kizugusuri', rare: 'roninSashiryo' },
  kawauso: { common: 'omusubi', rare: 'kawausoKegawa' },
  zenmaiInu: { common: 'kumanoi', rare: 'zenmaiKubiwa' },
  kumosuke: { common: 'waraji', rare: 'ikizue' },
  gomanohai: { common: 'inro', rare: 'nusutoZukin' },
  hitotsumeKozo: { common: 'hakka', rare: 'momijiDofu' },
  chahakobi: { common: 'amazake', rare: 'gyokuro' },
  kappa: { common: 'kizugusuri', rare: 'kappaHiyaku' },
  // 京
  akaoni: { common: 'hyorogan', rare: 'oniKanabo' },
  ittanmomen: { common: 'shimagappa', rare: 'momenHaori' },
  namagusaBozu: { common: 'mankintan', rare: 'hakaiJuzu' },
  karakuriGissha: { common: 'hachigane', rare: 'kanawa' },
  aooni: { common: 'hyorogan', rare: 'torakawaJinbaori' },
  wanyudo: { common: 'hangontan', rare: 'hinowaUdewa' },
  // 伊賀
  iganin: { common: 'hyorogan', rare: 'juji' },
  dokugumo: { common: 'dokukeshi', rare: 'kumoitoShozoku' },
  karakuriTaka: { common: 'tomegane', rare: 'takaBane', ...FLEER },
  karasuTengu: { common: 'kumanoi', rare: 'tenguUchiwa' },
  igaKunoichi: { common: 'hakka', rare: 'kunoichiKanzashi' },
  // 大坂
  yojinbo: { common: 'kitsukegusuri', rare: 'yojinboOdachi' },
  teppoAshigaru: { common: 'hangontan', rare: 'hazamaZutsu' },
  karakuriTawara: { common: 'awaokoshi', rare: 'shinmai' },
  bakeNezumi: { common: 'dokukeshi', rare: 'uchidenoKozuchi' },
  nekomata: { common: 'hakka', rare: 'nekomataSuzu' },
  bakuto: { common: 'omamori', rare: 'ikasamaSai' },
  // 西国街道・長崎・島原
  nanbanHei: { common: 'kintsuba', rare: 'nanbanKabuto' },
  umibozu: { common: 'kakimeshi', rare: 'umibozuDama' },
  boreiMusha: { common: 'hangontan', rare: 'kosenjoTachi' },
  gehoTsukai: { common: 'mankintan', rare: 'gehoMakimono' },
  heikegani: { common: 'kakimeshi', rare: 'kaniKoura' },
  isoonna: { common: 'hakka', rare: 'isoShinju' },
  ushioni: { common: 'kitsukegusuri', rare: 'ushioniTsuno' },
  kaizoku: { common: 'kasutera', rare: 'kaizokuTanzutsu' },
  gashadokuro: { common: 'kitsukegusuri', rare: 'kotsuShakujo' },
  onryo: { common: 'hangontan', rare: 'waraNingyo' },
  // 北前船・金沢
  funayurei: { common: 'kitsukegusuri', rare: 'sokonukeHishaku' },
  karakuriHanshi: { common: 'shibafune', rare: 'hanshiYoroi' },
  yukiOnna: { common: 'bocha', rare: 'hyokaKanzashi' },
  kagaShinobi: { common: 'hyorogan', rare: 'kagaNinjato' },
  yukiNyudo: { common: 'shibafune', rare: 'mannenYuki' },
  kinpakuNingyo: { common: 'kinpakuMamori', rare: 'kinpakuOgi', ...FLEER },
  // 奥州街道・江戸の町
  hitsukeTozoku: { common: 'kitsukegusuri', rare: 'kaginawa' },
  kasha: { common: 'hangontan', rare: 'gokaJuzu' },
  karakuriDoshin: { common: 'kumanoi', rare: 'doshinJutte' },
  hatamotoYakko: { common: 'sakuraMochi', rare: 'yakkoOdachi' },
  hinezumi: { common: 'hangontan', rare: 'hinezumiKawagoromo' },
  okuriOkami: { common: 'zundaMochi', rare: 'ookamiKiba' },
  // 江戸城
  karakuriOniwaban: { common: 'ninjin', rare: 'kusariFundo' },
  ookuBakeneko: { common: 'hakka', rare: 'ookuTekagami' },
  karakuriHatamoto: { common: 'sakuraMochi', rare: 'hatamotoNaginata' },
  karakuriKinju: { common: 'kitsukegusuri', rare: 'kinjuZutsu' },
};
