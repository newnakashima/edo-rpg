// 町の店（よろず屋＝道具、刀鍛冶＝装備）。品ぞろえは町ごとに決める。以降の町の店はフェーズ 4 で足す。

export interface ShopDef {
  id: string;
  name: string;
  /** 店の品（道具・装備品の ID）。 */
  goods: string[];
}

// 清水湊（序章）は主人公の一人旅なので、仲間の武器・防具は置かない。仲間の装備は加入する町（駿府など）の店に置く。
export const SHOPS: Record<string, ShopDef> = {
  shimizuYorozu: { id: 'shimizuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'dokukeshi', 'mankintan', 'kitsukegusuri'] },
  shimizuKaji: { id: 'shimizuKaji', name: '刀鍛冶', goods: ['nagawakizashi', 'shimagappa', 'sandogasa', 'omamori'] },
  // 駿府（第 1 章）。霞が加入する町なので、霞の装備も置く
  sunpuYorozu: { id: 'sunpuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'dokukeshi', 'hangontan', 'mankintan', 'kitsukegusuri'] },
  sunpuKaji: { id: 'sunpuKaji', name: '刀鍛冶', goods: ['dotanuki', 'ninjato', 'kusarikatabira', 'shinobishozoku', 'inro', 'omamori'] },
  // 名古屋（第 2 章）
  nagoyaYorozu: { id: 'nagoyaYorozu', name: 'よろず屋', goods: ['kizugusuri', 'kintsuba', 'dokukeshi', 'hangontan', 'mankintan', 'kitsukegusuri'] },
  // 京（第 3 章）。玄道が加入する町なので、玄道の装備も置く
  kyoYorozu: { id: 'kyoYorozu', name: 'よろず屋', goods: ['kizugusuri', 'kintsuba', 'dokukeshi', 'hangontan', 'mankintan', 'kitsukegusuri'] },
  kyoKaji: { id: 'kyoKaji', name: '刀鍛冶', goods: ['kotetsu', 'tekkokagi', 'shakujo', 'dokko', 'nanbando', 'kusarishozoku', 'hachigane'] },
  nagoyaKaji: { id: 'nagoyaKaji', name: '刀鍛冶', goods: ['magoroku', 'kusarigama', 'kusarikatabira', 'shinobishozoku', 'hachigane', 'inro'] },
};
