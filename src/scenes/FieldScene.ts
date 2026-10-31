import Phaser from 'phaser';
import { ENCOUNTERS } from '../data/enemies';
import { closedGateAt, encounterAt, MAPS, npcObjectFrame, npcVisible, respawnPoint, START_POSITION, tileAt, tileTextureKey, townAction, type EventTrigger, type MapDef, type NpcDef } from '../data/maps';
import { pickGroup, step } from '../systems/encounter';
import { dangoPrice, eatDango, innPrice, stayAtInn } from '../systems/facilities';
import { prayAtTemple, templePrice } from '../systems/shop';
import { SHOPS } from '../data/shops';
import type { Facing } from '../systems/gameState';
import { memberLevel } from '../systems/party';
import { defaultRng } from '../systems/random';
import { playBgm } from '../systems/audio';
import { browserStorage } from '../systems/save';
import { getState, setPendingEvent, setState, takePendingEvent } from '../state';
import { EVENTS } from '../data/events';
import { CHAR_DISPLAY_ORIGIN, heroSprite, idleFrame, objectDepth, objectDisplayOrigin, objectKey, oppositeFacing, personDepth, shouldStandStill, spriteKey, walkAnimKey, walkDepthRow, type CharacterSpriteId } from '../data/sprites';
import { EventRunner, type EventInput } from '../systems/eventScript';
import { Controls } from '../ui/input';
import { FieldMenu } from '../ui/FieldMenu';
import { TradeMenu, type TradeMode } from '../ui/TradeMenu';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle, TILE } from '../ui/theme';
import { Menu, MessageWindow } from '../ui/widgets';
import { faceForPage, faceKey } from '../data/faces';

const DELTA: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const MOVE_MS = 140;

interface Overlay {
  update(c: Controls): void;
  destroy(): void;
}

export class FieldScene extends Phaser.Scene {
  private controls!: Controls;
  private map!: MapDef;
  /** 主人公。位置は今いるタイルの左上（コマの表示の基準点で、足元をタイルに合わせる）。 */
  private player!: Phaser.GameObjects.Sprite;
  private playerSprite!: CharacterSpriteId;
  /**
   * 画像のある NPC（ID ごと）。話しかけたときに主人公のほうへ振り向かせる。
   * 振り向いたあとはそのまま（マップに入り直したり戦闘から戻ったりすると、最初の向きに戻る）。
   */
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  /** NPC の表示（画像のない NPC の仮の人も含む）。hideFlag が立ったら隠す。 */
  private npcObjects = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();
  private moving = false;
  /** 行っている途中のイベント。 */
  private runner: EventRunner | null = null;
  /** 画面上の地名の表示。 */
  private areaName: Phaser.GameObjects.GameObject[] = [];
  /** このマップに入ったときのイベントを、まだ行っていない。 */
  private enterPending = false;
  private message!: MessageWindow;
  /** メニューなど、開いている間は移動を止める UI（後に開いたものが上）。 */
  private overlays: Overlay[] = [];

  constructor() {
    super('Field');
  }

  /** fromMapId: 戦闘から戻ったとき、戦闘を始めたマップ（同じマップなら、マップに入ったときのイベントを行わない）。 */
  create(data: { fromMapId?: string } = {}): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.moving = false;
    this.overlays = [];
    this.runner = null;
    this.enterPending = false;
    this.areaName = [];
    const state = getState();
    const map = MAPS[state.mapId];
    if (!map) {
      // セーブデータのマップが見つからない場合は、最初の場所から始め直す
      setState({ ...state, ...START_POSITION });
      this.scene.restart({});
      return;
    }
    this.map = map;
    // 読み込んだ位置が通れない場所なら（マップの変更などで）、全滅時の戻り先か最初の場所に移す
    if (tileAt(map, state.x, state.y)?.blocked !== false) {
      const fallback = respawnPoint(map.id);
      setState({ ...state, ...fallback });
      this.scene.restart({});
      return;
    }
    playBgm(map.encounter || map.encounterZones ? 'bgm_road' : 'bgm_town');

    for (let y = 0; y < map.rows.length; y++) {
      for (let x = 0; x < (map.rows[y]?.length ?? 0); x++) {
        const tile = tileAt(map, x, y);
        if (tile) this.add.image(x * TILE, y * TILE, tileTextureKey(map.tileset, tile.kind)).setOrigin(0);
      }
    }
    // ワールドマップでは町の名前を印の上に出す
    for (const town of map.towns ?? []) {
      this.add
        .text(town.x * TILE + TILE / 2, town.y * TILE - 1, town.name, { ...textStyle(8), stroke: '#000000', strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setDepth(5);
    }
    this.npcSprites = new Map();
    this.npcObjects = new Map();
    for (const npc of map.npcs) {
      if (npc.sprite) {
        const sprite = this.add
          .sprite(npc.x * TILE, npc.y * TILE, spriteKey(npc.sprite), idleFrame(npc.facing ?? 'down'))
          .setDisplayOrigin(CHAR_DISPLAY_ORIGIN.x, CHAR_DISPLAY_ORIGIN.y)
          .setDepth(personDepth(npc.y));
        this.npcSprites.set(npc.id, sprite);
        this.npcObjects.set(npc.id, sprite);
      } else if (npc.object) {
        // 葛籠などの物。開いたかどうかは refreshNpcs でコマを切り替える。大きな物は上にはみ出すので、重なり順は objectDepth
        const origin = objectDisplayOrigin(npc.object);
        const image = this.add.image(npc.x * TILE, npc.y * TILE, objectKey(npc.object), 0).setDisplayOrigin(origin.x, origin.y).setDepth(objectDepth(npc.y));
        this.npcObjects.set(npc.id, image);
      } else {
        this.npcObjects.set(npc.id, this.add.image(npc.x * TILE, npc.y * TILE, 'person').setOrigin(0).setTint(npc.color));
      }
    }
    this.refreshNpcs();
    this.playerSprite = heroSprite(state.gender);
    this.player = this.add
      .sprite(state.x * TILE, state.y * TILE, spriteKey(this.playerSprite), idleFrame(state.facing))
      .setDisplayOrigin(CHAR_DISPLAY_ORIGIN.x, CHAR_DISPLAY_ORIGIN.y)
      .setDepth(personDepth(state.y));

    this.followPlayer();

    this.message = new MessageWindow(this, 8, GAME_HEIGHT - 62, GAME_WIDTH - 16, 54, (page) => {
      const face = faceForPage(page);
      return face && faceKey(face);
    });
    this.showAreaName(map.name);

    // 戦闘や移動から戻ってきたら、途中のイベントの続きを行う。なければ、マップに入ったときのイベントを行う
    // 移動・全滅で別のマップに来たときは、途中のイベントが終わってから、このマップに入ったときのイベントを行う
    const pending = takePendingEvent();
    const cameFrom = pending?.fromMapId ?? data.fromMapId;
    this.enterPending = cameFrom !== map.id;
    if (pending) {
      this.runner = pending.runner;
      this.advanceEvent(pending.resume);
    } else {
      this.runEnterEvent();
    }
  }

  /** マップに入ったときのイベントを、まだ行っていなければ行う。 */
  private runEnterEvent(): void {
    if (!this.enterPending || this.runner || this.moving) return;
    this.enterPending = false;
    if (this.map.onEnter) this.startTrigger(this.map.onEnter);
  }

  private startTrigger(trigger: EventTrigger): boolean {
    if (trigger.unless && getState().flags[trigger.unless]) return false;
    return this.startEvent(trigger.event);
  }

  private startEvent(id: string): boolean {
    const def = EVENTS[id];
    if (!def) return false;
    this.runner = new EventRunner(def.steps);
    this.advanceEvent();
    return true;
  }

  /** イベントを次に画面に頼むことが出るまで進め、それを行う。 */
  private advanceEvent(input?: EventInput): void {
    const runner = this.runner;
    if (!runner) return;
    const fromMapId = getState().mapId;
    const { state, request } = runner.next(getState(), input);
    setState(state);
    switch (request.kind) {
      case 'say':
        this.message.show(request.pages, () => this.advanceEvent());
        return;
      case 'choice': {
        const open = () => {
          const menu: Menu = new Menu(this, GAME_WIDTH - 150, 40, 140, request.labels.map((label) => ({ label })), (i) => {
            this.closeOverlay(menu);
            this.advanceEvent({ kind: 'choice', index: i });
          });
          this.pushOverlay(menu);
        };
        if (request.prompt) this.message.show([request.prompt], open);
        else open();
        return;
      }
      case 'battle':
        // 戦闘から戻ってきたフィールドが続きを行う
        // 既知の制限（見送り）: warp の直後に battle が続くと、このとき fromMapId が移動先のマップになり、
        // 戦闘から戻ったときに移動先の onEnter が行われない。今の warp（金太の大凧、第 7 章の北前船・殿様の救出など）は、どれも直後に battle が続かないので見送る（warp の直後に battle を置かないこと。events.test.ts で確かめている）。
        // 本来は PendingEvent に enterPending を持たせ、ここで this.enterPending を引き継ぎ、create で復元する（フェーズ 4 で直す）。
        setPendingEvent({ runner, fromMapId });
        this.runner = null;
        this.moving = true;
        this.standStill();
        this.cameras.main.flash(250, 255, 255, 255);
        this.time.delayedCall(260, () =>
          this.scene.start('Battle', { enemyIds: request.enemies, level: request.level, canEscape: request.canEscape, loseOk: request.loseOk }),
        );
        return;
      case 'warp':
        setPendingEvent({ runner, fromMapId });
        this.runner = null;
        this.moving = true;
        this.standStill();
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({}));
        return;
      case 'done':
        this.runner = null;
        this.controls.flush();
        // イベントで立ったフラグで、姿を消す NPC（仲間になった人、どいた見張りなど）を隠す
        this.refreshNpcs();
        this.runEnterEvent();
        return;
    }
  }

  /**
   * 主人公が画面の中央に来るようにカメラを動かす（マップの端では止める）。
   * カメラの原点を左上にしているため、Phaser の startFollow は使わずに自前で計算する。
   */
  private followPlayer(): void {
    const mapW = (this.map.rows[0]?.length ?? 0) * TILE;
    const mapH = this.map.rows.length * TILE;
    const clamp = (v: number, max: number) => Math.max(0, Math.min(v, Math.max(0, max)));
    const x = clamp(this.player.x + TILE / 2 - GAME_WIDTH / 2, mapW - GAME_WIDTH);
    const y = clamp(this.player.y + TILE / 2 - GAME_HEIGHT / 2, mapH - GAME_HEIGHT);
    this.cameras.main.setScroll(Math.round(x), Math.round(y));
  }

  private showAreaName(name: string): void {
    // 前の表示が残っていたら消してから出す（重ならないように）
    for (const o of this.areaName) {
      this.tweens.killTweensOf(o);
      o.destroy();
    }
    const label = this.add.text(GAME_WIDTH / 2, 14, name, textStyle(11, COLORS.text)).setOrigin(0.5).setScrollFactor(0).setDepth(90);
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, 14, label.width + 16, 16, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(89);
    this.areaName = [label, bg];
    this.tweens.add({
      targets: [label, bg],
      alpha: 0,
      delay: 1500,
      duration: 600,
      onComplete: () => {
        [label, bg].forEach((o) => o.destroy());
        this.areaName = this.areaName.filter((o) => o !== label && o !== bg);
      },
    });
  }

  update(_time: number, delta: number): void {
    if (!this.map) return;
    const state = getState();
    state.playTimeSec += delta / 1000;
    this.followPlayer();

    if (this.message.isOpen) {
      if (shouldStandStill({ moving: this.moving, busy: true, held: false })) this.standStill();
      this.message.update(this.controls);
      return;
    }
    const top = this.overlays[this.overlays.length - 1];
    if (shouldStandStill({ moving: this.moving, busy: !!top || !!this.runner, held: this.controls.heldDirection() !== null })) this.standStill();
    if (top) {
      top.update(this.controls);
      return;
    }
    // イベントの途中（画面の切り替え待ちなど）は動けない
    if (this.moving || this.runner) return;

    if (this.controls.okPressed()) {
      this.interact();
      return;
    }
    if (this.controls.cancelPressed()) {
      this.openMenu();
      return;
    }
    const dir = this.controls.heldDirection();
    if (dir) this.tryMove(dir);
  }

  /** 歩行アニメーションを止め、今の向きの立ち姿にする。 */
  private standStill(): void {
    const frame = idleFrame(getState().facing);
    if (!this.player.anims.isPlaying && String(this.player.frame.name) === String(frame)) return;
    this.player.stop();
    this.player.setFrame(frame);
  }

  private npcAt(x: number, y: number): NpcDef | undefined {
    const flags = getState().flags;
    return this.map.npcs.find((n) => n.x === x && n.y === y && npcVisible(n, flags));
  }

  /** hideFlag の立った NPC を隠し、開けた葛籠を開いた姿にする。 */
  private refreshNpcs(): void {
    const flags = getState().flags;
    for (const npc of this.map.npcs) {
      const obj = this.npcObjects.get(npc.id);
      obj?.setVisible(npcVisible(npc, flags));
      if (npc.object) obj?.setFrame(npcObjectFrame(npc, flags));
    }
  }

  private tryMove(dir: Facing): void {
    const state = getState();
    const [dx, dy] = DELTA[dir];
    const nx = state.x + dx;
    const ny = state.y + dy;
    setState({ ...state, facing: dir });
    const tile = tileAt(this.map, nx, ny);
    if (!tile || tile.blocked || this.npcAt(nx, ny)) {
      this.standStill();
      return;
    }
    const gate = closedGateAt(this.map, nx, ny, getState().flags);
    if (gate) {
      this.standStill();
      // 関所を開けるイベントがあればそれを行う（大井川の川越し）
      if (!gate.event || !this.startEvent(gate.event)) this.message.show(gate.lines);
      return;
    }

    this.moving = true;
    this.player.play(walkAnimKey(this.playerSprite, dir), true);
    this.player.setDepth(personDepth(walkDepthRow(state.y, ny)));
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: ny * TILE,
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false;
        this.player.setDepth(personDepth(ny));
        setState({ ...getState(), x: nx, y: ny });
        this.afterStep();
      },
    });
  }

  private afterStep(): void {
    const state = getState();
    const exit = this.map.exits.find((e) => e.x === state.x && e.y === state.y);
    if (exit) {
      this.moveTo(exit.to, exit.toX, exit.toY);
      return;
    }
    // 町の印に乗ったら名前を出す（入るのは決定ボタン）
    const onTown = townAction(this.map, state.x, state.y, 'step', state.flags);
    if (onTown?.kind === 'label') this.showAreaName(onTown.text);
    const trigger = this.map.triggers?.find((t) => t.x === state.x && t.y === state.y);
    if (trigger && this.startTrigger(trigger)) return;
    const encounter = encounterAt(this.map, state.x, state.y, state.flags);
    if (!encounter) return;
    const table = ENCOUNTERS[encounter];
    if (!table) return;
    const result = step(state.stepsToEncounter, defaultRng);
    setState({ ...state, stepsToEncounter: result.stepsLeft });
    if (!result.encounter) return;
    const group = pickGroup(
      table,
      { size: state.party.length, maxLevel: Math.max(...state.party.map(memberLevel)) },
      defaultRng,
    );
    if (!group) return;
    this.moving = true;
    this.standStill();
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => this.scene.start('Battle', { enemyIds: group, level: table.level }));
  }

  /** 別のマップ（または同じマップの別の場所）へ移る。 */
  private moveTo(mapId: string, x: number, y: number): void {
    setState({ ...getState(), mapId, x, y });
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({}));
    this.moving = true;
    this.standStill();
  }

  private interact(): void {
    // ワールドマップの町の印の上なら、その町へ入る（まだ訪れられない町は案内を出す）
    const state = getState();
    const town = townAction(this.map, state.x, state.y, 'ok', state.flags);
    if (town?.kind === 'enter') {
      this.moveTo(town.to.mapId, town.to.x, town.to.y);
      return;
    }
    if (town?.kind === 'info') {
      this.message.show(town.lines);
      return;
    }
    const [dx, dy] = DELTA[state.facing];
    const npc = this.npcAt(state.x + dx, state.y + dy);
    if (!npc) return;
    this.npcSprites.get(npc.id)?.setFrame(idleFrame(oppositeFacing(state.facing)));
    if (npc.event) {
      this.startEvent(npc.event);
      return;
    }
    const useAfter = npc.after && state.flags[npc.after.flag];
    const lines = useAfter && npc.after ? npc.after.lines : (npc.lines ?? []);
    this.message.show(lines, () => {
      if (npc.setsFlag) {
        const s = getState();
        setState({ ...s, flags: { ...s.flags, [npc.setsFlag]: true } });
      }
      if (npc.action === 'inn') this.openInn();
      if (npc.action === 'teahouse') this.openTeahouse();
      if (npc.action === 'shop') this.openShop(npc.shop);
      if (npc.action === 'temple') this.openTemple();
      if (npc.action === 'hikyaku') this.openHikyaku();
    });
  }

  private pushOverlay(o: Overlay): void {
    this.controls.flush();
    this.overlays.push(o);
  }

  private closeOverlay(o: Overlay): void {
    o.destroy();
    this.overlays = this.overlays.filter((x) => x !== o);
  }

  private openInn(): void {
    const price = innPrice(this.map.areaLevel);
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      [{ label: `泊まる（${price} 文）` }, { label: '記録する' }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        if (i === 0) {
          const result = stayAtInn(getState(), this.map.areaLevel);
          if (!result.ok) {
            this.message.show(['旅籠の主人「お代が足りねえようで……」']);
            return;
          }
          setState(result.state);
          // 暗転している間は動けないようにする
          this.moving = true;
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.moving = false;
            // 暗転中に押された決定でメッセージを読み飛ばさないようにする
            this.controls.flush();
            this.cameras.main.fadeIn(400, 0, 0, 0);
            this.message.show(['ぐっすり眠った。体力と気力が回復した。', '旅籠の主人「記録もつけていきなさるかい？」'], () => this.openSave());
          });
        } else if (i === 1) {
          this.openSave();
        }
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  private openSave(): void {
    const storage = browserStorage();
    if (!storage) {
      this.message.show(['この環境では記録できません（ブラウザの保存領域が使えません）。']);
      return;
    }
    const slots: SaveSlotMenu = new SaveSlotMenu(
      this,
      storage,
      'save',
      (result) => {
        this.closeOverlay(slots);
        if (result.kind === 'saved') this.message.show(['記録しました。']);
        if (result.kind === 'failed') this.message.show(['記録できませんでした（ブラウザの保存領域が一杯か、使えません）。']);
      },
      getState(),
    );
    this.pushOverlay(slots);
  }

  private openTrade(mode: TradeMode): void {
    const menu: TradeMenu = new TradeMenu(this, this.controls, mode, () => {
      this.overlays = this.overlays.filter((x) => x !== menu);
      this.controls.flush();
    });
    this.pushOverlay(menu);
  }

  private openShop(shopId: string | undefined): void {
    const shop = shopId ? SHOPS[shopId] : undefined;
    if (!shop) return;
    this.openTrade({ kind: 'shop', name: shop.name, goods: shop.goods });
  }

  private openTemple(): void {
    const state = getState();
    const fallen = state.party.filter((m) => m.hp <= 0).length;
    if (fallen === 0) {
      this.message.show(['住職「皆、息災のようじゃな。道中の無事を祈っておるぞ」']);
      return;
    }
    const price = templePrice(this.map.areaLevel);
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 170,
      40,
      160,
      [{ label: `お祓いを受ける（1 人 ${price} 文）` }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        if (i !== 0) return;
        const result = prayAtTemple(getState(), this.map.areaLevel);
        if (!result.ok) {
          this.message.show(['住職「お布施が足りぬようじゃな……」']);
          return;
        }
        setState(result.state);
        const rest = fallen - result.revived;
        this.message.show([
          '住職が経を唱えると、倒れていた仲間が息を吹き返した。',
          ...(rest > 0 ? [`住職「残りの ${rest} 人は、お布施が足りぬゆえ、またの折に」`] : []),
        ]);
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  private openHikyaku(): void {
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      [{ label: '記録する' }, { label: '荷物を預ける' }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        if (i === 0) this.openSave();
        else if (i === 1) this.openTrade({ kind: 'storage' });
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  private openTeahouse(): void {
    const price = dangoPrice(this.map.areaLevel);
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      [{ label: `団子を食べる（${price} 文）` }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        if (i !== 0) return;
        const result = eatDango(getState(), this.map.areaLevel);
        if (!result.ok) {
          this.message.show(['茶屋の娘「あら、お代が……」']);
          return;
        }
        setState(result.state);
        this.message.show(['甘い団子で、少し元気が出た。']);
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  private openMenu(): void {
    const menu: FieldMenu = new FieldMenu(
      this,
      this.controls,
      () => {
        this.overlays = this.overlays.filter((x) => x !== menu);
        this.controls.flush();
      },
      () => this.scene.start('Title'),
    );
    this.pushOverlay(menu);
  }
}
