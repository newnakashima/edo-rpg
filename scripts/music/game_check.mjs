// ゲームを動かして、場面ごとに実際に鳴っている曲を確かめる（docs/audio.md の「場面への当てはめ」）。
// 使い方（先に別の端末で npm run dev を起動しておく）:
//   node scripts/music/game_check.mjs [--url http://localhost:5173/]
// 確かめること:
//   - タイトル: 最初の操作で鳴り始める
//   - すべてのマップ: マップの曲（まだない曲は代わりの曲）が鳴り、音が出ている。町の中の家どうしでは同じ曲を頭から鳴らし直さない
//   - 戦闘（通常・ボス・一騎打ち・最終ボス）: 戦闘の曲 → 勝利のジングル → フィールドの曲
//   - イベント（野狐）: ボス戦 → 勝利 → マップの曲 → 場面の曲（bgm_tension）→ イベントの後はマップの曲
//   - 一泊のジングルの後に、前の曲に戻る
// 音が出ているかは、再生処理の master の後ろに AnalyserNode をつないで測る（-60 dB より大きければ鳴っている）。
// 問題があれば終了コード 1。
import { createRequire } from 'node:module';
import process from 'node:process';

// Playwright はプロジェクトの依存に入れず、環境に入っているもの（require で見つかるもの）を使う
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:5173/';
const SILENT_DB = -60;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const problems = [];
const fail = async (message) => {
  console.error(message);
  await browser.close();
  process.exit(1);
};

await page.goto(`${url}?debug`).catch((e) => fail(`${url} を開けない（npm run dev の開発サーバーが起動しているかを確かめる）: ${e.message.split('\n')[0]}`));
await page.waitForFunction(() => window.__game, null, { timeout: 15000 }).catch(() => fail(`${url} に ?debug の公開がない（npm run dev の開発サーバーに向ける）`));
await page.waitForFunction(() => window.__game.scene.isActive('Title'), null, { timeout: 30000 }).catch(() => fail('タイトル画面が 30 秒たっても始まらない'));
const hasPlayer = await page.evaluate(() => !!window.__bgm);
if (!hasPlayer) await fail('再生処理（window.__bgm）がない。このブラウザでは AudioContext を作れなかった');

await page.evaluate(async () => {
  // 開発サーバーではゲームと同じモジュールが返る
  window.__audio = await import('/src/systems/audio.ts');
  window.__tracks = await import('/src/data/bgmTracks.ts');
  window.__party = await import('/src/systems/party.ts');
  const player = window.__bgm;
  const analyser = player.ctx.createAnalyser();
  analyser.fftSize = 2048;
  player.master.connect(analyser);
  const level = () => {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    return rms > 0 ? Math.round(20 * Math.log10(rms)) : -Infinity;
  };
  window.__snap = () => ({
    ...player.status(),
    requested: window.__audio.currentBgm(),
    resolved: window.__audio.playingBgm(),
    dB: level(),
    scenes: window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','),
  });
  /** 通れる最初のマス（FieldScene は通れない場所だと別のマップへ移すため）。 */
  window.__firstPassable = (mapId) => {
    const map = window.__MAPS[mapId];
    for (let y = 0; y < map.rows.length; y++) for (let x = 0; x < map.rows[y].length; x++) if (window.__TILES[map.rows[y][x]]?.blocked === false) return { x, y };
    throw new Error(`no passable cell: ${mapId}`);
  };
  /** 強い主人公だけの一行で、マップに立たせる（戦闘は決定を押し続ければ勝つ）。 */
  window.__enter = (mapId, at) => {
    const state = window.__newGame('male', { mapId, ...(at ?? window.__firstPassable(mapId)) });
    window.__setState({ ...state, party: [window.__party.createMember('hero', 60)] });
    const g = window.__game;
    for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
    g.scene.start('Field');
  };
});

const snap = () => page.evaluate(() => window.__snap());
const fmt = (s) =>
  `頼んだ曲=${String(s.requested).padEnd(16)} 鳴っている曲=${String(s.bgm).padEnd(14)} ジングル=${String(s.jingle).padEnd(12)} 位置=${s.position.toFixed(1).padStart(5)}s ${String(s.dB).padStart(4)} dB [${s.scenes}]`;
const check = (label, ok, s, why) => {
  console.log(`${ok ? 'ok' : 'NG'} ${label.padEnd(24)} ${fmt(s)}${ok ? '' : `  ← ${why}`}`);
  if (!ok) problems.push(`${label}: ${why}`);
};
/** 条件を満たすまで待つ（満たさなければ最後の様子を返す）。 */
async function waitSnap(cond, ms = 4000) {
  let s;
  for (let t = 0; t < ms; t += 100) {
    await page.waitForTimeout(100);
    s = await snap();
    if (cond(s)) break;
  }
  return s;
}
const sounding = (s) => s.bgm !== null && s.bgm === s.resolved && s.dB > SILENT_DB;

// タイトル: 操作の前は鳴らさず、最初の操作で鳴り始める
await page.mouse.click(480, 270);
const title = await waitSnap(sounding);
check('タイトル', title.bgm === 'bgm_title' && sounding(title), title, 'タイトル曲が鳴らない');

// マップ: 入ったときのイベントで場面の曲に替わったマップは、その曲が鳴っていればよい
const maps = await page.evaluate(() => Object.keys(window.__MAPS));
const available = await page.evaluate(() => window.__tracks.availableBgmIds());
for (const mapId of maps) {
  const map = await page.evaluate((mapId) => {
    const m = window.__MAPS[mapId];
    window.__enter(mapId);
    return { bgm: m.bgm, expected: window.__audio.resolveBgm(m.bgm, new Set(window.__tracks.availableBgmIds()), m.bgmFallback) };
  }, mapId);
  const s = await waitSnap((s) => (s.resolved === null ? true : sounding(s)));
  const byEvent = s.requested !== map.bgm;
  const want = byEvent ? s.resolved : map.expected;
  const ok = s.resolved === want && (want === null || sounding(s));
  check(`${mapId}${byEvent ? '（イベント）' : ''}`, ok, s, `${want} が鳴るはず`);
}

// 戦闘: 戦闘の曲 → 勝利のジングル → フィールドの曲
const roadMap = maps.find((id) => id === 'world') ?? maps[0];
await page.evaluate((id) => window.__enter(id), roadMap);
const field = await waitSnap(sounding);
const fieldBgm = field.bgm;
const BATTLES = [
  { label: '通常の戦闘', data: { enemyIds: ['onibi'], level: 1 }, bgm: 'bgm_battle' },
  { label: 'ボス戦', data: { enemyIds: ['yako'], level: 4, bgm: 'bgm_boss' }, bgm: 'bgm_boss' },
  { label: '一騎打ち', data: { enemyIds: ['oboro'], level: 15, bgm: 'bgm_duel' }, bgm: 'bgm_duel' },
  { label: '最終ボス', data: { enemyIds: ['karakuriDaigongen'], level: 32, bgm: 'bgm_last_boss' }, bgm: 'bgm_last_boss' },
];
for (const b of BATTLES) {
  await page.evaluate((data) => window.__game.scene.getScene('Field').scene.start('Battle', data), b.data);
  const want = available.includes(b.bgm) ? b.bgm : await page.evaluate((id) => window.__audio.resolveBgm(id, new Set(window.__tracks.availableBgmIds())), b.bgm);
  // 最終ボスの曲は静かに始まるので、少し長めに待つ
  const s = await waitSnap((s) => s.scenes === 'Battle' && sounding(s), 6000);
  check(b.label, s.bgm === want && sounding(s), s, `${want} が鳴るはず`);
  let jingle = null;
  for (let i = 0; i < 150 && !jingle; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const j = await snap();
    if (j.jingle) jingle = j;
  }
  if (jingle) check(`  勝利`, jingle.jingle === 'bgm_victory', jingle, '勝利のジングルが鳴らない');
  else problems.push(`${b.label}: 勝てなかった、または勝利のジングルが鳴らない`);
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    if ((await snap()).scenes === 'Field') break;
  }
  const back = await waitSnap(sounding);
  check('  フィールドに戻る', back.scenes === 'Field' && back.bgm === fieldBgm && sounding(back), back, `${fieldBgm} に戻るはず`);
}

// 一泊のジングル: 鳴り終えたら前の曲に戻る
await page.evaluate(() => window.__audio.playJingle('bgm_inn'));
const inn = await waitSnap((s) => s.jingle !== null);
check('一泊', inn.jingle === 'bgm_inn', inn, '一泊のジングルが鳴らない');
const afterInn = await waitSnap((s) => !s.jingle && sounding(s), 15000);
check('  一泊の後', afterInn.bgm === fieldBgm && sounding(afterInn), afterInn, `${fieldBgm} に戻るはず`);

// イベント（狐火の洞の野狐）: 決定をゆっくり押して進め、曲の移り変わりを記録する
await page.evaluate(() => window.__enter('kitsunebiCave', { x: 24, y: 7 }));
await waitSnap(sounding);
await page.evaluate(() => window.__game.scene.getScene('Field').startEvent('yako'));
const seen = [];
for (let i = 0; i < 1200; i++) {
  if (i % 4 === 0) await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const s = await snap();
  const key = s.jingle ?? s.bgm;
  if (key && seen.at(-1) !== key) seen.push(key);
  const done = await page.evaluate(() => window.__getState().flags.yakoDefeated && !window.__game.scene.getScene('Field')?.runner);
  if (s.scenes === 'Field' && done) break;
}
const after = await waitSnap(sounding);
const wantFlow = ['bgm_dungeon', 'bgm_boss', 'bgm_victory', 'bgm_dungeon', 'bgm_tension', 'bgm_dungeon'];
const flowOk = JSON.stringify(seen) === JSON.stringify(wantFlow) && after.bgm === 'bgm_dungeon';
check('イベント（野狐）', flowOk, after, `曲の移り変わりが ${seen.join(' → ')}（${wantFlow.join(' → ')} のはず）`);
if (flowOk) console.log(`   ${seen.join(' → ')}`);

await browser.close();
if (errors.length) problems.push(...errors.map((e) => `ページのエラー: ${e}`));
console.log(problems.length ? `\n問題 ${problems.length} 件:\n${problems.map((p) => `- ${p}`).join('\n')}` : '\n問題なし');
process.exit(problems.length ? 1 : 0);
