// 非合法な旅籠（もぐりの宿）。テストプレイで「仁義ポイントがゼロになったら、高額の非合法な旅籠に泊まる。町中にはなく、ワールドマップに点在」と
// 指摘されたため足した。街道沿いの小屋（物の画像 moguriYado。scripts/draw_moguri_yado.py で描いた）に話しかけると、お金で泊まれる。
// 値段は町の旅籠の 4 倍（src/systems/facilities.ts の moguriInnPrice）で、親分の屋敷（仁義ポイント）に泊まれないときの、高くつく逃げ道にあたる。
import type { NpcDef } from './maps';

export interface MoguriYadoDef {
  id: string;
  /** ワールドマップの小屋のマス。街道から 1 マスだけ延ばした脇道の先（ワールドマップは街道しか歩けないので、脇道に建てて街道から話しかける）。 */
  x: number;
  y: number;
  /** 値段を決める敵レベル（小屋の建つ街道の雑魚敵のレベル。docs/balance.md の「地域ごとの敵レベル」）。 */
  areaLevel: number;
  /** どの街道の宿か（コメントとテストの見出し用）。 */
  place: string;
  /** 話しかけたときの亭主のひと言。 */
  line: string;
}

/** 街道ごとに 1 軒。西から順ではなく、旅の順（駿河 → 東海道 → 京 → 西国街道 → 九州 → 北国街道 → 奥州街道）に並べる。 */
export const MOGURI_YADO: readonly MoguriYadoDef[] = [
  { id: 'moguriSuruga', x: 113, y: 29, areaLevel: 1, place: '駿河（駿府と清水湊の間）', line: '亭主「……お上に届けの出てねえ宿だ。代は高えが、渡世人でも黙って泊めてやるぜ」' },
  { id: 'moguriTokaido', x: 95, y: 26, areaLevel: 7, place: '東海道（名古屋の東）', line: '亭主「親分衆に顔の利かねえお人かい。うちは宿帳も付けねえ。そのぶん、代はいただくよ」' },
  { id: 'moguriKyo', x: 66, y: 31, areaLevel: 10, place: '京と大坂の間', line: '亭主「お役人の目の届かん宿どす。泊まるんなら、先にお代をいただきますえ」' },
  { id: 'moguriSaigoku', x: 50, y: 31, areaLevel: 19, place: '西国街道（大坂と広島の間）', line: '亭主「訳ありの客ばかりじゃけえ、詮索はせん。代だけ置いていきんさい」' },
  { id: 'moguriKyushu', x: 11, y: 49, areaLevel: 19, place: '九州（長崎と島原の間）', line: '亭主「抜け荷の船乗りも泊まる宿たい。口の堅か客なら、誰でんよかよ」' },
  { id: 'moguriHokkoku', x: 106, y: 11, areaLevel: 25, place: '北国街道（金沢と仙台の間）', line: '亭主「雪の街道で野宿は死ぬぞ。高えが、屋根と囲炉裏はある」' },
  { id: 'moguriOshu', x: 137, y: 22, areaLevel: 25, place: '奥州街道（仙台と江戸の間）', line: '亭主「関所を避けて来なすったかい。うちは何も聞かねえ。代だけは、きっちりもらうよ」' },
];

/** ワールドマップに置く小屋（話しかけると亭主が出てくる。看板は掛けない）。 */
export function moguriYadoNpc(def: MoguriYadoDef): NpcDef {
  return {
    id: def.id,
    name: 'もぐりの宿',
    x: def.x,
    y: def.y,
    color: 0x6e4e32,
    object: 'moguriYado',
    lines: [def.line],
    action: 'moguriInn',
    sign: false,
  };
}

/** 小屋の ID からその宿の決まり（値段のレベルなど）を引く。 */
export function moguriYadoById(id: string): MoguriYadoDef | undefined {
  return MOGURI_YADO.find((d) => d.id === id);
}
