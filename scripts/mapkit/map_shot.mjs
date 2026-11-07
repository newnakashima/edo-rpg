// マップ全体を、ゲームと同じ描き方（src/data/mapParts.ts）で 1 枚の PNG に撮る。
// 使い方（先に別の端末で npm run dev を起動しておく）:
//   node scripts/mapkit/map_shot.mjs <マップID> <出力.png> [--url http://localhost:5173/] [--people]
// 等倍（1 マス 16 px）で撮る。確かめるときは Pillow の NEAREST で 2〜4 倍に拡大した切り抜きも見る。
// 既定では人物・物・文字を隠して地形だけを撮る（--people で人物と物も撮る）。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import process from 'node:process';

// Playwright はプロジェクトの依存に入れず、環境に入っているもの（require で見つかるもの）を使う
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const [mapId, out] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--url'));
if (!mapId || !out) {
  console.error('usage: node scripts/mapkit/map_shot.mjs <mapId> <out.png> [--url URL] [--people]');
  process.exit(1);
}
const url = opt('--url', 'http://localhost:5173/');
if (!url || url.startsWith('--')) {
  console.error('--url の後に開発サーバーの URL を書く');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, deviceScaleFactor: 1 });
const opened = await page.goto(`${url}?debug`).then(() => true, () => false);
// __game・__MAPS などは開発サーバー（npm run dev）で ?debug を付けたときだけ公開される
const ready = opened && await page
  .waitForFunction(() => window.__MAPS && window.__game?.scene?.isActive('Title'), null, { timeout: 30000 })
  .then(() => true, () => false);
if (!ready) {
  console.error(`${url} でゲームの ?debug の公開が見つからない（npm run dev の開発サーバーに向けているか、起動しているかを確かめる）`);
  await browser.close();
  process.exit(1);
}
const size = await page.evaluate(({ mapId, people }) => {
  const map = window.__MAPS[mapId];
  if (!map) throw new Error(`no map: ${mapId}`);
  // 通れる最初のマスに立たせる（FieldScene は通れない場所だと別のマップへ移すため）
  let start;
  outer: for (let y = 0; y < map.rows.length; y++) for (let x = 0; x < map.rows[y].length; x++) if (window.__TILES[map.rows[y][x]]?.blocked === false) { start = { x, y }; break outer; }
  if (!start) throw new Error(`no passable cell: ${mapId}`);
  window.__setState(window.__newGame('male', { mapId, ...start }));
  const g = window.__game;
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
  g.scene.start('Field');
  window.__shotPeople = people;
  return { w: Math.max(...map.rows.map((r) => r.length)) * 16, h: map.rows.length * 16 };
}, { mapId, people: flag('--people') });
await page.waitForFunction(() => window.__game.scene.isActive('Field'), null, { timeout: 30000 });
await page.waitForTimeout(500);
// update を止める（FieldScene.update が毎フレーム主人公に合わせてカメラを動かし、setScroll を上書きするため）。止めても描画は続く
await page.evaluate(() => window.__game.scene.pause('Field'));

// 画面（1152 × 648）より大きいマップは、スクロールして撮ったものをつなぐ
const shots = [];
for (let sy = 0; sy < size.h; sy += 648) {
  for (let sx = 0; sx < size.w; sx += 1152) {
    await page.evaluate(({ sx, sy }) => {
      const scene = window.__game.scene.getScene('Field');
      const cam = scene.cameras.main;
      cam.setZoom(1).setScroll(sx, sy);
      for (const obj of scene.children.list) {
        const isTerrain = obj.type === 'Image' && obj.depth === 0 && obj.texture && /^(tile|parts)-/.test(obj.texture.key);
        if (!isTerrain && !window.__shotPeople) obj.setVisible(false);
        if (window.__shotPeople && (obj.type === 'Text' || obj.scrollFactorX === 0)) obj.setVisible(false);
      }
      return { x: cam.scrollX, y: cam.scrollY };
    }, { sx, sy }).then((scroll) => {
      if (scroll.x !== sx || scroll.y !== sy) throw new Error(`camera did not move to ${sx},${sy} (${scroll.x},${scroll.y})`);
    });
    await page.waitForTimeout(150);
    const buf = await page.locator('canvas').screenshot();
    shots.push({ sx, sy, buf });
  }
}
await browser.close();

// つなぐのは Python（Pillow）に任せる（依存を増やさないため）
const dir = mkdtempSync(join(tmpdir(), 'mapshot-'));
const list = shots.map((s, i) => {
  const f = join(dir, `${i}.png`);
  writeFileSync(f, s.buf);
  return `${f}:${s.sx}:${s.sy}`;
});
execFileSync('python3', ['-c', `
import sys
from PIL import Image
w, h, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
img = Image.new('RGBA', (w, h))
for item in sys.argv[4:]:
    f, sx, sy = item.rsplit(':', 2)
    shot = Image.open(f).convert('RGBA')
    shot = shot.resize((1152, 648), Image.NEAREST) if shot.size != (1152, 648) else shot
    img.paste(shot.crop((0, 0, min(1152, w - int(sx)), min(648, h - int(sy)))), (int(sx), int(sy)))
img.save(out)
`, String(size.w), String(size.h), out, ...list]);
console.log(`${out} (${size.w} x ${size.h})`);
