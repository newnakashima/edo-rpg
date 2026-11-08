// 町の店（よろず屋＝道具、刀鍛冶＝装備、茶屋＝飲み物・食べ物）。品ぞろえは町ごとに決める。
// 飲み物・食べ物（items.ts の kind が 'food' の品）はよろず屋に置かず、その町の茶屋（<町>Chaya）で売る。茶屋ではどの町でも団子・甘酒・酒を売り、その土地の名物（安倍川餅は駿府、ういろうは名古屋など）も置く。
// よろず屋は薬・札と、わらじ・提灯・キセルなどの旅の小物を売る。伊賀上野から先のよろず屋では、傷薬を置かず金創膏を置く。万金丹・毒消し・気付け薬・道しるべの札・魔除けの香はどの町のよろず屋でも買える。
// 広島の名物の牡蠣飯は牡蠣船で売る。辛子蓮根は熊本の茶屋と辛子蓮根の店、カステラは長崎の茶屋と出島の商館で売る（よろず屋・茶屋以外の店も食べ物を置いてよい）。

export interface ShopDef {
  id: string;
  name: string;
  /** 店の品（道具・装備品の ID）。 */
  goods: string[];
}

// 清水湊（序章）は主人公の一人旅なので、仲間の武器・防具は置かない。仲間の装備は加入する町（駿府など）の店に置く。
export const SHOPS: Record<string, ShopDef> = {
  shimizuYorozu: { id: 'shimizuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'mankintan', 'dokukeshi', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'waraji'] },
  shimizuChaya: { id: 'shimizuChaya', name: '茶屋', goods: ['omusubi', 'dango', 'amazake', 'sake', 'umeboshi'] },
  shimizuKaji: { id: 'shimizuKaji', name: '刀鍛冶', goods: ['nagawakizashi', 'shimagappa', 'sandogasa', 'omamori'] },
  // 駿府（第 1 章）。霞が加入する町なので、霞の装備も置く
  sunpuYorozu: { id: 'sunpuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'mankintan', 'dokukeshi', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'waraji', 'chochin'] },
  sunpuChaya: { id: 'sunpuChaya', name: '茶屋', goods: ['omusubi', 'dango', 'abekawamochi', 'amazake', 'sake', 'umeboshi'] },
  sunpuKaji: { id: 'sunpuKaji', name: '刀鍛冶', goods: ['dotanuki', 'ninjato', 'kusarikatabira', 'shinobishozoku', 'inro', 'omamori'] },
  // 名古屋（第 2 章）
  nagoyaYorozu: { id: 'nagoyaYorozu', name: 'よろず屋', goods: ['kizugusuri', 'kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'chochin'] },
  nagoyaChaya: { id: 'nagoyaChaya', name: '茶屋', goods: ['dango', 'uiro', 'amazake', 'sake'] },
  // 京（第 3 章）。玄道が加入する町なので、玄道の装備も置く
  kyoYorozu: { id: 'kyoYorozu', name: 'よろず屋', goods: ['kizugusuri', 'kintsuba', 'mankintan', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'kiseru'] },
  kyoChaya: { id: 'kyoChaya', name: '茶屋', goods: ['dango', 'yatsuhashi', 'amazake', 'sake', 'matcha'] },
  kyoKaji: { id: 'kyoKaji', name: '刀鍛冶', goods: ['kotetsu', 'tekkokagi', 'shakujo', 'dokko', 'nanbando', 'kusarishozoku', 'hachigane'] },
  // 伊賀上野（第 4 章）。お凛が加入した 4 人で来るので、4 人分の装備を置く
  igaYorozu: { id: 'igaYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo'] },
  igaChaya: { id: 'igaChaya', name: '茶屋', goods: ['dango', 'katayaki', 'amazake', 'sake', 'hyorogan'] },
  igaKaji: { id: 'igaKaji', name: '刀鍛冶', goods: ['osafune', 'shinobiKodachi', 'tetsuShakujo', 'nanbanju', 'toseiGusoku', 'igaShozoku', 'nanbando', 'hachigane'] },
  // 大坂（第 5 章）。霞は抜けているので、霞の装備は置かない（兵庫の装備は変えられない）
  osakaYorozu: { id: 'osakaYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo', 'kiseru'] },
  osakaChaya: { id: 'osakaChaya', name: '茶屋', goods: ['dango', 'awaokoshi', 'amazake', 'sake', 'hyorogan'] },
  osakaKaji: { id: 'osakaKaji', name: '刀鍛冶', goods: ['sukehiro', 'kongoShakujo', 'renpatsuju', 'nanbanGusoku', 'toseiGusoku', 'hachigane', 'inro'] },
  // 広島（第 6 章）。霞が戻る町なので、霞の装備も置く
  hiroshimaYorozu: { id: 'hiroshimaYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo'] },
  hiroshimaChaya: { id: 'hiroshimaChaya', name: '茶屋', goods: ['dango', 'amazake', 'sake', 'hyorogan', 'umeboshi'] },
  hiroshimaKaji: { id: 'hiroshimaKaji', name: '刀鍛冶', goods: ['sukehiro', 'kageKodachi', 'kongoShakujo', 'renpatsuju', 'nanbanGusoku', 'kageShozoku', 'hachigane', 'inro'] },
  hiroshimaKakibune: { id: 'hiroshimaKakibune', name: '牡蠣船', goods: ['kakimeshi', 'omusubi', 'amazake'] },
  // 長崎・出島（第 6 章）
  nagasakiYorozu: { id: 'nagasakiYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo'] },
  nagasakiChaya: { id: 'nagasakiChaya', name: '茶屋', goods: ['dango', 'kasutera', 'amazake', 'sake', 'konpeito', 'hyorogan'] },
  nagasakiKaji: { id: 'nagasakiKaji', name: '刀鍛冶', goods: ['tadayoshi', 'karakuriKagizume', 'rakanShakujo', 'orandaDo', 'kageShozoku', 'hachigane'] },
  dejimaShop: { id: 'dejimaShop', name: '商館', goods: ['gewehr', 'tomegane', 'kasutera'] },
  // 金沢（第 7 章）
  kanazawaYorozu: { id: 'kanazawaYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo'] },
  kanazawaChaya: { id: 'kanazawaChaya', name: '茶屋', goods: ['dango', 'shibafune', 'amazake', 'sake', 'bocha', 'hyorogan'] },
  kanazawaKaji: { id: 'kanazawaKaji', name: '刀鍛冶', goods: ['kanewaka', 'yukiKodachi', 'hakusanShakujo', 'kagaZutsu', 'kagaGusoku', 'yukiShozoku', 'hachigane'] },
  kanazawaKinpaku: { id: 'kanazawaKinpaku', name: '金箔屋', goods: ['kinpakuMamori', 'shibafune', 'bocha'] },
  // 仙台（第 8 章）
  sendaiYorozu: { id: 'sendaiYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo'] },
  sendaiChaya: { id: 'sendaiChaya', name: '茶屋', goods: ['dango', 'zundaMochi', 'amazake', 'sake', 'bocha', 'hyorogan'] },
  sendaiKaji: { id: 'sendaiKaji', name: '刀鍛冶', goods: ['kunikane', 'yukiKodachi', 'hakusanShakujo', 'kagaZutsu', 'yukinoshitaDo', 'yukiShozoku', 'hachigane'] },
  // 浜松（第 2 章の寄り道）。主人公と霞の 2 人で来るので、2 人分の装備を置く
  hamamatsuYorozu: { id: 'hamamatsuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'mankintan', 'dokukeshi', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'waraji', 'chochin'] },
  hamamatsuChaya: { id: 'hamamatsuChaya', name: '茶屋', goods: ['omusubi', 'dango', 'unagi', 'amazake', 'sake', 'umeboshi'] },
  hamamatsuKaji: { id: 'hamamatsuKaji', name: '刀鍛冶', goods: ['dotanuki', 'magoroku', 'ninjato', 'kusarigama', 'kusarikatabira', 'shinobishozoku', 'hachigane', 'inro'] },
  // 彦根（第 3 章の寄り道）。第 3 章の初め（主人公と霞の 2 人）から来られるので、京の品ぞろえに 2 人分の装備を置く
  hikoneYorozu: { id: 'hikoneYorozu', name: 'よろず屋', goods: ['kizugusuri', 'kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hangontan', 'kitsukegusuri', 'michishirube', 'mayokeKo', 'waraji', 'chochin'] },
  hikoneChaya: { id: 'hikoneChaya', name: '茶屋', goods: ['dango', 'itokiriMochi', 'amazake', 'sake'] },
  hikoneKaji: { id: 'hikoneKaji', name: '刀鍛冶', goods: ['kotetsu', 'tekkokagi', 'shakujo', 'nanbando', 'kusarishozoku', 'hachigane', 'inro'] },
  // 熊本（第 6 章の寄り道。島原の湊から渡し船で渡る）。長崎と同じ地域なので、長崎の品ぞろえに熊本の名物を足す
  kumamotoYorozu: { id: 'kumamotoYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo'] },
  kumamotoChaya: { id: 'kumamotoChaya', name: '茶屋', goods: ['dango', 'karashiRenkon', 'amazake', 'sake', 'konpeito', 'hyorogan'] },
  kumamotoKaji: { id: 'kumamotoKaji', name: '刀鍛冶', goods: ['tadayoshi', 'karakuriKagizume', 'rakanShakujo', 'orandaDo', 'kageShozoku', 'hachigane', 'inro'] },
  kumamotoRenkon: { id: 'kumamotoRenkon', name: '辛子蓮根の店', goods: ['karashiRenkon', 'omusubi', 'amazake'] },
  // 会津若松（第 8 章の寄り道）
  aizuYorozu: { id: 'aizuYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo', 'chochin'] },
  aizuChaya: { id: 'aizuChaya', name: '茶屋', goods: ['dango', 'mishirazuGaki', 'amazake', 'sake', 'bocha', 'hyorogan'] },
  aizuKaji: { id: 'aizuKaji', name: '刀鍛冶', goods: ['aizuKanesada', 'yukiKodachi', 'hakusanShakujo', 'kagaZutsu', 'yukinoshitaDo', 'yukiShozoku', 'hachigane', 'inro'] },
  // 江戸（第 8 章）
  edoYorozu: { id: 'edoYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin', 'michishirube', 'mayokeKo', 'kiseru'] },
  edoChaya: { id: 'edoChaya', name: '茶屋', goods: ['dango', 'sakuraMochi', 'amazake', 'sake', 'konpeito', 'hyorogan'] },
  edoKaji: { id: 'edoKaji', name: '刀鍛冶', goods: ['kiyomaro', 'hibanaKodachi', 'fudoShakujo', 'kunitomoZutsu', 'sashikoBanten', 'kuroShozoku', 'hachigane', 'inro'] },
  nagoyaKaji: { id: 'nagoyaKaji', name: '刀鍛冶', goods: ['magoroku', 'kusarigama', 'kusarikatabira', 'shinobishozoku', 'hachigane', 'inro'] },
};
