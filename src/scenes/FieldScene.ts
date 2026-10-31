import Phaser from 'phaser';
import { ENCOUNTERS } from '../data/enemies';
import { MAPS, START_POSITION, tileAt, type EventTrigger, type MapDef, type NpcDef } from '../data/maps';
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
import { EventRunner, type EventInput } from '../systems/eventScript';
import { Controls } from '../ui/input';
import { FieldMenu } from '../ui/FieldMenu';
import { TradeMenu, type TradeMode } from '../ui/TradeMenu';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle, TILE } from '../ui/theme';
import { Menu, MessageWindow } from '../ui/widgets';

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
  private player!: Phaser.GameObjects.Image;
  private moving = false;
  /** 行っている途中のイベント。 */
  private runner: EventRunner | null = null;
  private message!: MessageWindow;
  /** メニューなど、開いている間は移動を止める UI（後に開いたものが上）。 */
  private overlays: Overlay[] = [];

  constructor() {
    super('Field');
  }

  create(): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.moving = false;
    this.overlays = [];
    this.runner = null;
    const state = getState();
    const map = MAPS[state.mapId];
    if (!map) {
      // セーブデータのマップが見つからない場合は、最初の場所から始め直す
      setState({ ...state, ...START_POSITION });
      this.scene.restart();
      return;
    }
    this.map = map;
    // 読み込んだ位置が通れない場所なら（マップの変更などで）、全滅時の戻り先か最初の場所に移す
    if (tileAt(map, state.x, state.y)?.blocked !== false) {
      const fallback = map.respawn ? { mapId: map.id, ...map.respawn } : START_POSITION;
      setState({ ...state, ...fallback });
      this.scene.restart();
      return;
    }
    playBgm(map.encounter ? 'bgm_road' : 'bgm_town');

    for (let y = 0; y < map.rows.length; y++) {
      for (let x = 0; x < (map.rows[y]?.length ?? 0); x++) {
        const tile = tileAt(map, x, y);
        if (tile) this.add.image(x * TILE, y * TILE, `tile-${tile.kind}`).setOrigin(0);
      }
    }
    for (const npc of map.npcs) {
      this.add.image(npc.x * TILE, npc.y * TILE, 'person').setOrigin(0).setTint(npc.color);
    }
    this.player = this.add.image(state.x * TILE, state.y * TILE, `hero-${state.gender}`).setOrigin(0).setDepth(10);

    this.followPlayer();

    this.message = new MessageWindow(this, 8, GAME_HEIGHT - 62, GAME_WIDTH - 16, 54);
    this.showAreaName(map.name);

    // 戦闘や移動から戻ってきたら、途中のイベントの続きを行う。なければ、マップに入ったときのイベントを行う
    const pending = takePendingEvent();
    if (pending) {
      this.runner = pending.runner;
      this.advanceEvent(pending.resume);
    } else if (map.onEnter) {
      this.startTrigger(map.onEnter);
    }
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
        setPendingEvent({ runner });
        this.runner = null;
        this.moving = true;
        this.cameras.main.flash(250, 255, 255, 255);
        this.time.delayedCall(260, () =>
          this.scene.start('Battle', { enemyIds: request.enemies, level: request.level, canEscape: request.canEscape, loseOk: request.loseOk }),
        );
        return;
      case 'warp':
        setPendingEvent({ runner });
        this.runner = null;
        this.moving = true;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
        return;
      case 'done':
        this.runner = null;
        this.controls.flush();
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
    const label = this.add.text(GAME_WIDTH / 2, 14, name, textStyle(11, COLORS.text)).setOrigin(0.5).setScrollFactor(0).setDepth(90);
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, 14, label.width + 16, 16, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(89);
    this.tweens.add({ targets: [label, bg], alpha: 0, delay: 1500, duration: 600, onComplete: () => [label, bg].forEach((o) => o.destroy()) });
  }

  update(_time: number, delta: number): void {
    if (!this.map) return;
    const state = getState();
    state.playTimeSec += delta / 1000;
    this.followPlayer();

    if (this.message.isOpen) {
      this.message.update(this.controls);
      return;
    }
    const top = this.overlays[this.overlays.length - 1];
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

  private npcAt(x: number, y: number): NpcDef | undefined {
    return this.map.npcs.find((n) => n.x === x && n.y === y);
  }

  private tryMove(dir: Facing): void {
    const state = getState();
    const [dx, dy] = DELTA[dir];
    const nx = state.x + dx;
    const ny = state.y + dy;
    setState({ ...state, facing: dir });
    const tile = tileAt(this.map, nx, ny);
    if (!tile || tile.blocked || this.npcAt(nx, ny)) return;

    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: nx * TILE,
      y: ny * TILE,
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false;
        setState({ ...getState(), x: nx, y: ny });
        this.afterStep();
      },
    });
  }

  private afterStep(): void {
    const state = getState();
    const exit = this.map.exits.find((e) => e.x === state.x && e.y === state.y);
    if (exit) {
      setState({ ...state, mapId: exit.to, x: exit.toX, y: exit.toY });
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
      this.moving = true;
      return;
    }
    const trigger = this.map.triggers?.find((t) => t.x === state.x && t.y === state.y);
    if (trigger && this.startTrigger(trigger)) return;
    if (!this.map.encounter) return;
    const table = ENCOUNTERS[this.map.encounter];
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
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => this.scene.start('Battle', { enemyIds: group, level: table.level }));
  }

  private interact(): void {
    const state = getState();
    const [dx, dy] = DELTA[state.facing];
    const npc = this.npcAt(state.x + dx, state.y + dy);
    if (!npc) return;
    if (npc.event) {
      this.startEvent(npc.event);
      return;
    }
    const useAfter = npc.after && state.flags[npc.after.flag];
    const lines = useAfter && npc.after ? npc.after.lines : npc.lines;
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
