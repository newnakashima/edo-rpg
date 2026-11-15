// ゲームを動かして、効果音が実際に鳴っているかを確かめる（docs/audio.md の効果音の表）。
// 使い方（先に別の端末で npm run dev を起動しておく）:
//   node scripts/sfx/game_check.mjs [--url http://localhost:5173/]
// 確かめること:
//   - 書き出した効果音がすべて読み込めて、1 つずつ鳴らすと音が出る（Ogg Opus を音に伸ばせる）
//   - 最初の操作の前は鳴らさない
//   - 場面で鳴る: タイトルのカーソル・決定、フィールドのメニュー（カーソル・取消）、出口を通る（石段の se_stairs）、
//     歩いて出会う戦闘（出会い・斬る・敵を倒す・段が上がる）、イベント（野狐: 出会い・ボス戦・手順 se の se_karakuri）
// 鳴ったかは、再生処理（window.__se）が実際に鳴らし始めた音を記録し、効果音の出口の後ろに AudioWorklet をつないで測る
// （鳴らし始めてから 0.3 秒のうちに最大が -60 dBFS より大きくなれば鳴っている）。測るのは効果音の出口全体なので、
// 音そのものが無音でないかは「1 つずつ鳴らす」で（ほかの音を止めてから）確かめ、場面の検査では鳴らし始めたかを主に見る。
// 開発サーバーが 5173 番以外で起動したとき（5173 番が埋まっていたとき）は、表示された URL を --url で渡す。問題があれば終了コード 1。
import { createRequire } from 'node:module';
import process from 'node:process';

// Playwright はプロジェクトの依存に入れず、環境に入っているもの（require で見つかるもの）を使う
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const USAGE = '使い方: node scripts/sfx/game_check.mjs [--url http://localhost:5173/]';
/** 引数は --url <URL> か --url=<URL> だけを受け付ける（ほかの引数は、書き間違いで別のサーバーを調べないよう使い方を出して止める）。 */
function parseUrl(argv) {
  let value = 'http://localhost:5173/';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1] && !argv[i + 1].startsWith('--')) value = argv[++i];
    else if (argv[i].startsWith('--url=')) value = argv[i].slice('--url='.length);
    else return null;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}
const url = parseUrl(args);
if (!url) {
  console.error(USAGE);
  process.exit(1);
}
url.searchParams.set('debug', '');
/** 開発サーバーを取り違えたときの手がかり（5173 番が埋まっていると、vite は別の番号で起動する）。 */
const WRONG_SERVER = `${url.origin} が、このリポジトリの npm run dev か（起動時に表示された URL を --url で渡しているか）を確かめる`;
const SILENT_DB = -60;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
// 普通のブラウザと同じく、最初の操作の前は AudioContext を動かせないようにする
// （Playwright の Chromium は --autoplay-policy を付けても、操作なしに動かせてしまう）
await page.addInitScript(() => {
  let activated = false;
  for (const e of ['pointerdown', 'mousedown', 'keydown', 'touchend']) {
    window.addEventListener(e, (ev) => { if (ev.isTrusted) activated = true; }, true);
  }
  const Base = window.AudioContext;
  window.AudioContext = class extends Base {
    constructor(...a) {
      super(...a);
      void super.suspend();
    }
    resume() {
      return activated ? super.resume() : Promise.resolve();
    }
  };
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const problems = [];
const fail = async (message) => {
  console.error(message);
  await browser.close();
  process.exit(1);
};

await page.goto(url.href).catch((e) => fail(`${url.origin} を開けない（npm run dev の開発サーバーが起動しているかを確かめる）: ${e.message.split('\n')[0]}`));
await page.waitForFunction(() => window.__game, null, { timeout: 15000 }).catch(() => fail(`${url.origin} に ?debug の公開がない。${WRONG_SERVER}`));
await page.waitForFunction(() => window.__game.scene.isActive('Title'), null, { timeout: 30000 }).catch(() => fail('タイトル画面が 30 秒たっても始まらない'));
if (!(await page.evaluate(() => !!window.__se))) await fail(`再生処理（window.__se）がない。このブラウザでは AudioContext を作れなかったか、${WRONG_SERVER}`);
console.log(`開いた URL: ${url.href}`);

await page.evaluate(async () => {
  // 開発サーバーではゲームと同じモジュールが返る
  window.__audio = await import('/src/systems/audio.ts');
  window.__seTracks = await import('/src/data/seTracks.ts');
  window.__party = await import('/src/systems/party.ts');
  window.__stats = await import('/src/systems/stats.ts');
  const se = window.__se;
  const ctx = se.ctx;
  // 大きさは音の処理の側（AudioWorklet）で 128 サンプルごとの最大を測って送る（画面の側で測ると、重い場面で測るのが遅れて短い音を取りこぼす）
  const worklet = `registerProcessor('se-meter', class extends AudioWorkletProcessor {
    process(inputs) {
      let peak = 0;
      for (const ch of inputs[0] ?? []) for (const v of ch) peak = Math.max(peak, Math.abs(v));
      if (peak > 0) this.port.postMessage([currentTime, peak]);
      return true;
    }
  });`;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([worklet], { type: 'text/javascript' })));
  const meter = new AudioWorkletNode(ctx, 'se-meter');
  se.out.connect(meter);
  /** 音が出ていたところ（時刻と、そこまでの 128 サンプルの最大）。 */
  const levels = [];
  meter.port.onmessage = (e) => levels.push(e.data);
  /** 鳴らし始めた効果音（id と時刻）。 */
  const heard = [];
  const start = se.start.bind(se);
  se.start = (id, buffer) => {
    const last = se.voices.at(-1);
    start(id, buffer);
    // 同じ音を続けて頼まれて鳴らさなかったときは数えない
    if (se.voices.at(-1) === last) return;
    heard.push({ id, at: ctx.currentTime });
    started++;
  };
  /** 鳴らし始めた効果音の数（測り終えるのを待たずに数える。AudioContext が止まっていて時刻が進まないときも数えられる）。 */
  let started = 0;
  window.__startedCount = () => started;
  /** これまでに測った大きさを捨てる（1 つずつ鳴らすときに、前の音の残りを数えないため）。 */
  window.__clearLevels = () => levels.splice(0);
  /** 鳴らし始めた音の記録を、測り終えていないものも含めて捨てる。 */
  window.__clearHeard = () => {
    heard.splice(0);
    levels.splice(0);
  };
  /** 鳴らし始めてから測り終えた（0.3 秒たった）効果音を取り出し、その間の最大の大きさ（dB）を付ける。 */
  window.__takeHeard = () => {
    const done = [];
    while (heard.length && heard[0].at + 0.3 < ctx.currentTime) {
      const h = heard.shift();
      let peak = 0;
      for (const [t, p] of levels) if (t >= h.at && t <= h.at + 0.3) peak = Math.max(peak, p);
      done.push({ id: h.id, dB: peak > 0 ? Math.round(20 * Math.log10(peak)) : -Infinity });
    }
    const keepFrom = heard.length ? heard[0].at : ctx.currentTime - 0.5;
    while (levels.length && levels[0][0] < keepFrom) levels.shift();
    return done;
  };
  /** 通れる最初のマス（FieldScene は通れない場所だと別のマップへ移すため）。 */
  window.__firstPassable = (mapId) => {
    const map = window.__MAPS[mapId];
    for (let y = 0; y < map.rows.length; y++) for (let x = 0; x < map.rows[y].length; x++) if (window.__TILES[map.rows[y][x]]?.blocked === false) return { x, y };
    throw new Error(`no passable cell: ${mapId}`);
  };
  /** 強い主人公だけの一行で、マップに立たせる（戦闘は決定を押し続ければ勝つ）。nearLevelUp なら、あと 1 の経験で段が上がるようにする。 */
  window.__enter = (mapId, at, nearLevelUp = false) => {
    const state = window.__newGame('male', { mapId, ...(at ?? window.__firstPassable(mapId)) });
    const hero = window.__party.createMember('hero', 60);
    if (nearLevelUp) hero.exp = window.__stats.totalExpForLevel(61) - 1;
    window.__setState({ ...state, party: [hero] });
    const g = window.__game;
    for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
    g.scene.start('Field');
  };
});

/** 前回からいままでに鳴らし始めた効果音を取り出す。 */
const take = () => page.evaluate(() => window.__takeHeard());
/** 鳴らし始めた音を測り終えるのを待ってから取り出す。 */
const settle = async () => {
  await page.waitForTimeout(400);
  return take();
};
const fmt = (list) => list.map((h) => `${h.id}(${h.dB} dB)`).join(' ') || '（なし）';
/** want の効果音がすべて、音を出して鳴ったかを確かめる。 */
const expect = (label, heard, want) => {
  const missing = want.filter((id) => !heard.some((h) => h.id === id));
  const silent = heard.filter((h) => !(h.dB > SILENT_DB)).map((h) => h.id);
  const ok = missing.length === 0 && silent.length === 0;
  console.log(`${ok ? 'ok' : 'NG'} ${label.padEnd(20)} ${fmt(heard)}`);
  if (missing.length) problems.push(`${label}: ${missing.join('・')} が鳴らない`);
  if (silent.length) problems.push(`${label}: ${silent.join('・')} を鳴らしたが音が出ていない`);
};
const press = async (key, n = 1, wait = 150) => {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
  }
};
const scenes = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
/** マップに立たせて、フィールドが始まるのを待つ。 */
const enter = async (mapId, at, nearLevelUp = false) => {
  await page.evaluate(([mapId, at, near]) => window.__enter(mapId, at ?? undefined, near), [mapId, at ?? null, nearLevelUp]);
  await page.waitForFunction(() => window.__game.scene.isActive('Field'), null, { timeout: 10000 }).catch(() => fail(`${mapId} のフィールドが始まらない`));
  await page.waitForTimeout(800);
  await take();
};

// 読み込み: 書き出した効果音がすべて音に伸ばせる
const available = await page.evaluate(() => window.__seTracks.availableSeIds());
if (available.length === 0) await fail('書き出した効果音が 1 つもない（public/assets/audio/se/*.ogg）');
await page.waitForFunction((n) => window.__se.status().loaded.length >= n, available.length, { timeout: 15000 }).catch(() => {});
const loaded = await page.evaluate(() => window.__se.status().loaded);
const notLoaded = available.filter((id) => !loaded.includes(id));
console.log(`${notLoaded.length ? 'NG' : 'ok'} 読み込み             ${loaded.length}/${available.length}`);
if (notLoaded.length) problems.push(`読み込めない効果音: ${notLoaded.join('・')}`);

// 最初の操作の前は鳴らさない（AudioContext が動いていない）
const beforeInput = await page.evaluate(async () => {
  const state = window.__se.ctx.state;
  const before = window.__startedCount();
  window.__audio.playSe('se_ok');
  await new Promise((r) => setTimeout(r, 200));
  return { state, started: window.__startedCount() - before, voices: window.__se.voices.length };
});
const quietBefore = beforeInput.state !== 'running' && beforeInput.started === 0 && beforeInput.voices === 0;
console.log(`${quietBefore ? 'ok' : 'NG'} 操作の前              AudioContext=${beforeInput.state} 鳴らし始めた音=${beforeInput.started}`);
if (beforeInput.state === 'running') problems.push('最初の操作の前から AudioContext が動いている（操作の前の検査ができない）');
else if (!quietBefore) problems.push('最初の操作の前に効果音を鳴らし始めた');

// 最初の操作で AudioContext が動き出す
await page.mouse.click(480, 270);
await page.waitForFunction(() => window.__se.ctx.state === 'running', null, { timeout: 5000 }).catch(() => fail('最初の操作の後も AudioContext が動かない'));
// 操作で鳴らし始めた音（測り終えていないものも）を捨て、1 つずつ鳴らす音だけを測る
await page.waitForTimeout(400);
await page.evaluate(() => window.__clearHeard());

// 1 つずつ鳴らす: どの効果音も音が出る
const each = [];
for (const id of available) {
  // 前の音（鐘などの長い音）の残りを測らないよう、鳴っている音を止めてから鳴らす
  await page.evaluate(async (id) => {
    for (const v of window.__se.voices) v.source.stop();
    for (let t = 0; t < 2000 && window.__se.voices.length; t += 10) await new Promise((r) => setTimeout(r, 10));
    await new Promise((r) => setTimeout(r, 60));
    window.__clearLevels();
    window.__audio.playSe(id);
  }, id);
  const h = await settle();
  const rec = h.find((x) => x.id === id);
  each.push({ id, dB: rec ? rec.dB : null });
}
const quiet = each.filter((e) => !(e.dB > SILENT_DB));
console.log(`${quiet.length ? 'NG' : 'ok'} 1 つずつ鳴らす        ${each.length - quiet.length}/${each.length} が音を出した（最小 ${Math.min(...each.map((e) => e.dB ?? -Infinity))} dB、最大 ${Math.max(...each.map((e) => e.dB ?? -Infinity))} dB）`);
if (quiet.length) problems.push(`鳴らしても音が出ない効果音: ${quiet.map((e) => `${e.id}(${e.dB})`).join('・')}`);
// 鳴り終わるのを待つ
await page.waitForTimeout(2500);
await take();

// タイトル: カーソル・決定
await press('ArrowDown');
await press('ArrowUp');
expect('タイトルのカーソル', await settle(), ['se_cursor']);
await press('Space', 1, 600);
expect('タイトルの決定', await settle(), ['se_ok']);

// フィールドのメニュー: 取消で開き、カーソルを動かし、取消で閉じる
await enter('world');
await press('Escape', 1, 400);
await press('ArrowDown');
await press('Escape', 1, 400);
expect('フィールドのメニュー', await settle(), ['se_cursor', 'se_cancel']);

// 出口を通る: 裏山の上の、狐火の洞の口（出口の se が se_stairs）へ 1 歩進む
await enter('urayama', { x: 32, y: 1 });
await page.keyboard.down('ArrowUp');
await page.waitForFunction(() => window.__getState().mapId === 'kitsunebiCave', null, { timeout: 5000 }).catch(() => {});
await page.keyboard.up('ArrowUp');
if ((await page.evaluate(() => window.__getState().mapId)) !== 'kitsunebiCave') problems.push('出口を通る: 裏山から狐火の洞へ移れない');
expect('出口を通る', await settle(), ['se_stairs']);

// 歩いて出会う戦闘: 出会い → 斬る → 敵を倒す → 段が上がる（次の 1 歩で出会い、段が上がる手前の主人公で戦う）
await enter('kitsunebiCave', { x: 24, y: 7 }, true);
await page.evaluate(() => {
  window.__setState({ ...window.__getState(), stepsToEncounter: 1, wardSteps: 0 });
  window.__game.scene.getScene('Field').afterStep();
});
await page.waitForFunction(() => window.__game.scene.isActive('Battle'), null, { timeout: 5000 }).catch(() => problems.push('歩いて出会う戦闘: 出会いが起きない'));
const battle = [];
for (let i = 0; i < 200; i++) {
  await press('Space', 1, 200);
  battle.push(...(await take()));
  if ((await scenes()) === 'Field' && i > 3) break;
}
if ((await scenes()) !== 'Field') problems.push('歩いて出会う戦闘: 戦闘が終わってフィールドに戻らない');
battle.push(...(await settle()));
// 主人公だけの一行なので、通常攻撃は刀の se_slash
expect('歩いて出会う戦闘', battle, ['se_encounter', 'se_slash', 'se_enemy_down', 'se_levelup']);

// イベント（狐火の洞の野狐）: イベントの戦闘と、戦闘の後の手順 se（se_karakuri）
await enter('kitsunebiCave', { x: 24, y: 7 });
if (!(await page.evaluate(() => window.__game.scene.getScene('Field').startEvent('yako')))) await fail('野狐のイベントが始まらない');
const event = [];
let eventDone = false;
for (let i = 0; i < 400; i++) {
  await press('Space', 1, 250);
  event.push(...(await take()));
  const done = await page.evaluate(() => window.__getState().flags.yakoDefeated && !window.__game.scene.getScene('Field')?.runner);
  if (done && (await scenes()) === 'Field') {
    eventDone = true;
    break;
  }
}
if (!eventDone) problems.push('イベント（野狐）: イベントが終わらない');
event.push(...(await settle()));
expect('イベント（野狐）', event, ['se_encounter', 'se_message', 'se_enemy_down', 'se_karakuri']);

await browser.close();
if (errors.length) problems.push(...errors.map((e) => `ページのエラー: ${e}`));
console.log(problems.length ? `\n問題 ${problems.length} 件:\n${problems.map((p) => `- ${p}`).join('\n')}` : '\n問題なし');
process.exit(problems.length ? 1 : 0);
