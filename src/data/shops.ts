// 町の店（よろず屋＝道具、刀鍛冶＝装備）。品ぞろえは町ごとに決める。以降の町の店はフェーズ 4 で足す。
// よろず屋には、その土地の名物（安倍川餅は駿府、ういろうは名古屋など。items.ts）と、わらじ・提灯・キセルなどの旅の小物も置く。
// 伊賀上野から先のよろず屋では、傷薬の代わりに土地の食べ物と金創膏を置く。万金丹・毒消し・気付け薬はどの町のよろず屋でも買える。

export interface ShopDef {
  id: string;
  name: string;
  /** 店の品（道具・装備品の ID）。 */
  goods: string[];
}

// 清水湊（序章）は主人公の一人旅なので、仲間の武器・防具は置かない。仲間の装備は加入する町（駿府など）の店に置く。
export const SHOPS: Record<string, ShopDef> = {
  shimizuYorozu: { id: 'shimizuYorozu', name: 'よろず屋', goods: ['omusubi', 'kizugusuri', 'dango', 'amazake', 'mankintan', 'dokukeshi', 'umeboshi', 'kitsukegusuri', 'waraji'] },
  shimizuKaji: { id: 'shimizuKaji', name: '刀鍛冶', goods: ['nagawakizashi', 'shimagappa', 'sandogasa', 'omamori'] },
  // 駿府（第 1 章）。霞が加入する町なので、霞の装備も置く
  sunpuYorozu: { id: 'sunpuYorozu', name: 'よろず屋', goods: ['omusubi', 'kizugusuri', 'abekawamochi', 'amazake', 'mankintan', 'dokukeshi', 'umeboshi', 'hangontan', 'kitsukegusuri', 'waraji', 'chochin'] },
  sunpuKaji: { id: 'sunpuKaji', name: '刀鍛冶', goods: ['dotanuki', 'ninjato', 'kusarikatabira', 'shinobishozoku', 'inro', 'omamori'] },
  // 名古屋（第 2 章）
  nagoyaYorozu: { id: 'nagoyaYorozu', name: 'よろず屋', goods: ['kizugusuri', 'uiro', 'kintsuba', 'mankintan', 'dokukeshi', 'kumanoi', 'hangontan', 'kitsukegusuri', 'chochin'] },
  // 京（第 3 章）。玄道が加入する町なので、玄道の装備も置く
  kyoYorozu: { id: 'kyoYorozu', name: 'よろず屋', goods: ['kizugusuri', 'yatsuhashi', 'kintsuba', 'mankintan', 'matcha', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'kiseru'] },
  kyoKaji: { id: 'kyoKaji', name: '刀鍛冶', goods: ['kotetsu', 'tekkokagi', 'shakujo', 'dokko', 'nanbando', 'kusarishozoku', 'hachigane'] },
  // 伊賀上野（第 4 章）。お凛が加入した 4 人で来るので、4 人分の装備を置く
  igaYorozu: { id: 'igaYorozu', name: 'よろず屋', goods: ['katayaki', 'kintsuba', 'mankintan', 'hyorogan', 'dokukeshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri'] },
  igaKaji: { id: 'igaKaji', name: '刀鍛冶', goods: ['osafune', 'shinobiKodachi', 'tetsuShakujo', 'nanbanju', 'toseiGusoku', 'igaShozoku', 'nanbando', 'hachigane'] },
  // 大坂（第 5 章）。霞は抜けているので、霞の装備は置かない（兵庫の装備は変えられない）
  osakaYorozu: { id: 'osakaYorozu', name: 'よろず屋', goods: ['awaokoshi', 'kintsuba', 'mankintan', 'hyorogan', 'dokukeshi', 'hangontan', 'kitsukegusuri', 'ninjin', 'kiseru'] },
  osakaKaji: { id: 'osakaKaji', name: '刀鍛冶', goods: ['sukehiro', 'kongoShakujo', 'renpatsuju', 'nanbanGusoku', 'toseiGusoku', 'hachigane', 'inro'] },
  // 広島（第 6 章）。霞が戻る町なので、霞の装備も置く
  hiroshimaYorozu: { id: 'hiroshimaYorozu', name: 'よろず屋', goods: ['kintsuba', 'mankintan', 'hyorogan', 'dokukeshi', 'umeboshi', 'kumanoi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin'] },
  hiroshimaKaji: { id: 'hiroshimaKaji', name: '刀鍛冶', goods: ['sukehiro', 'kageKodachi', 'kongoShakujo', 'renpatsuju', 'nanbanGusoku', 'kageShozoku', 'hachigane', 'inro'] },
  hiroshimaKakibune: { id: 'hiroshimaKakibune', name: '牡蠣船', goods: ['kakimeshi', 'omusubi', 'amazake'] },
  // 長崎・出島（第 6 章）
  nagasakiYorozu: { id: 'nagasakiYorozu', name: 'よろず屋', goods: ['kintsuba', 'kasutera', 'mankintan', 'konpeito', 'hyorogan', 'dokukeshi', 'hakka', 'hangontan', 'kitsukegusuri', 'ninjin'] },
  nagasakiKaji: { id: 'nagasakiKaji', name: '刀鍛冶', goods: ['tadayoshi', 'karakuriKagizume', 'rakanShakujo', 'orandaDo', 'kageShozoku', 'hachigane'] },
  dejimaShop: { id: 'dejimaShop', name: '商館', goods: ['gewehr', 'tomegane', 'kasutera'] },
  nagoyaKaji: { id: 'nagoyaKaji', name: '刀鍛冶', goods: ['magoroku', 'kusarigama', 'kusarikatabira', 'shinobishozoku', 'hachigane', 'inro'] },
};
