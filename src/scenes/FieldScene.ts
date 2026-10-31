import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { ENCOUNTERS } from '../data/enemies';
import { MAPS, START_POSITION, tileAt, type MapDef, type NpcDef } from '../data/maps';
import { pickGroup, step } from '../systems/encounter';
import { dangoPrice, eatDango, innPrice, stayAtInn } from '../systems/facilities';
import type { Facing } from '../systems/gameState';
import { memberLevel, memberStats } from '../systems/party';
import { defaultRng } from '../systems/random';
import { browserStorage } from '../systems/save';
import { getState, setState } from '../state';
import { Controls } from '../ui/input';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle, TILE } from '../ui/theme';
import { drawWindow, Menu, MessageWindow } from '../ui/widgets';

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
    const state = getState();
    const map = MAPS[state.mapId];
    if (!map) {
      // セーブデータのマップが見つからない場合は、最初の場所から始め直す
      setState({ ...state, ...START_POSITION });
      this.scene.restart();
      return;
    }
    this.map = map;

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

    if (!state.flags.intro) {
      setState({ ...state, flags: { ...state.flags, intro: true } });
      const name = characterName('hero', state.gender);
      this.message.show([
        `雨の夜、駿河の清水湊。廻船問屋の荷の護衛を終えた渡世人・${name}は、この町の親分・辰五郎の一家に草鞋を脱いだ。`,
        '（十字キーで移動、決定で話す・調べる、取消でメニュー）',
      ]);
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
    if (this.moving) return;

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
    const useAfter = npc.after && state.flags[npc.after.flag];
    const lines = useAfter && npc.after ? npc.after.lines : npc.lines;
    this.message.show(lines, () => {
      if (npc.setsFlag) {
        const s = getState();
        setState({ ...s, flags: { ...s.flags, [npc.setsFlag]: true } });
      }
      if (npc.action === 'inn') this.openInn();
      if (npc.action === 'teahouse') this.openTeahouse();
    });
  }

  private pushOverlay(o: Overlay): void {
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
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
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
      (data) => {
        this.closeOverlay(slots);
        if (data) this.message.show(['記録しました。']);
      },
      getState(),
    );
    this.pushOverlay(slots);
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
    const status = this.createStatusWindow();
    const menu: Menu = new Menu(
      this,
      8,
      8,
      80,
      [{ label: 'とじる' }, { label: 'タイトルへ' }],
      (i) => {
        if (i === 0) close();
        else this.scene.start('Title');
      },
      () => close(),
    );
    const close = () => {
      this.closeOverlay(menu);
      status.destroy();
    };
    this.pushOverlay(menu);
  }

  private createStatusWindow(): Phaser.GameObjects.Container {
    const state = getState();
    const x = 96;
    const y = 8;
    const w = GAME_WIDTH - x - 8;
    const lineH = 14;
    const h = 24 + state.party.length * lineH * 2;
    const objs: Phaser.GameObjects.GameObject[] = [drawWindow(this, x, y, w, h)];
    objs.push(this.add.text(x + 8, y + 6, `所持金 ${state.money} 文`, textStyle(10, COLORS.accent)));
    state.party.forEach((m, i) => {
      const s = memberStats(m);
      const top = y + 22 + i * lineH * 2;
      objs.push(this.add.text(x + 8, top, `${characterName(m.id, state.gender)}  Lv${memberLevel(m)}  体力 ${m.hp}/${s.maxHp}  気力 ${m.mp}/${s.maxMp}`, textStyle(10)));
      objs.push(this.add.text(x + 8, top + lineH, `攻 ${s.atk}  防 ${s.def}  術 ${s.mag}  速 ${s.spd}  運 ${s.luck}`, textStyle(9, COLORS.dim)));
    });
    return this.add.container(0, 0, objs).setScrollFactor(0).setDepth(105);
  }
}
