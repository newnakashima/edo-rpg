// 町の店（よろず屋＝道具、刀鍛冶＝装備）。品ぞろえは町ごとに決める。以降の町の店はフェーズ 4 で足す。

export interface ShopDef {
  id: string;
  name: string;
  /** 店の品（道具・装備品の ID）。 */
  goods: string[];
}

export const SHOPS: Record<string, ShopDef> = {
  shimizuYorozu: { id: 'shimizuYorozu', name: 'よろず屋', goods: ['kizugusuri', 'dokukeshi', 'mankintan', 'kitsukegusuri'] },
  shimizuKaji: { id: 'shimizuKaji', name: '刀鍛冶', goods: ['nagawakizashi', 'shimagappa', 'sandogasa', 'omamori'] },
};
