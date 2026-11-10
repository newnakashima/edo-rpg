import Phaser from 'phaser';
import { ENCOUNTERS, enemyImageKey } from '../data/enemies';
import { canStep, closedGateAt, encounterAt, MAPS, npcLines, npcObjectFrame, npcVisible, respawnPoint, START_POSITION, tileAt, townAction, type EventTrigger, type MapDef, type NpcDef } from '../data/maps';
import { mapTileImages } from '../data/mapParts';
import { cameraScroll } from '../ui/cameraScroll';
import { pickGroup, stepOnRoad } from '../systems/encounter';
import {
  CHOHAN_BETS,
  chohanRollText,
  chohanWinnings,
  dangoPrice,
  drinkAtIzakaya,
  eatDango,
  gyoroPrice,
  izakayaPrice,
  moguriInnPrice,
  playChohan,
  stayAtMoguriInn,
  takeBath,
  teahouseChoices,
  visitGyoro,
  yuyaPrice,
  type ChohanCall,
  type PurchaseResult,
} from '../systems/facilities';
import { prayAtTemple, templePrice } from '../systems/shop';
import { SHOPS } from '../data/shops';
import type { Facing } from '../systems/gameState';
import { memberLevel } from '../systems/party';
import { defaultRng } from '../systems/random';
import { playBgm } from '../systems/audio';
import { browserStorage } from '../systems/save';
import { getState, holdEventWhileAway, setState, shouldRunEnterEvent, takePendingEvent } from '../state';
import { EVENTS } from '../data/events';
import { mapSigns, signKey } from '../data/signs';
import { townOf } from '../data/buildings';
import { moguriYadoById } from '../data/moguriYado';
import { facilityMenu, pendingBakutoIntro, pendingJingiRequest, type MenuRequest } from '../data/jingiRequests';
import { OYABUN, oyabunWelcome } from '../data/oyabun';
import { pendingOyabunGift } from '../data/oyabunGifts';
import { pendingOyabunRequest } from '../data/oyabunRequests';
import { oyabunStayCost, stayAtOyabun } from '../systems/jingi';
import { CHAR_DISPLAY_ORIGIN, heroSprite, idleFrame, objectDepth, objectDisplayOrigin, objectKey, oppositeFacing, personDepth, shouldStandStill, spriteKey, walkAnimKey, walkDepthRow, type CharacterSpriteId } from '../data/sprites';
import { EventRunner, pathFacings, pathTo, routeTo, type EventInput, type StageActor, type StageStep } from '../systems/eventScript';
import { fieldCancelLabel } from '../ui/cancelLabel';
import { Controls, setCancelLabel } from '../ui/input';
import { FieldMenu } from '../ui/FieldMenu';
import { TradeMenu, type TradeMode } from '../ui/TradeMenu';
import { SaveSlotMenu } from '../ui/SaveSlotMenu';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle, TILE } from '../ui/theme';
import { Menu, MessageWindow } from '../ui/widgets';
import { faceForPage, faceKey, pageText } from '../data/faces';

const DELTA: Record<Facing, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const MOVE_MS = 140;
/** 演出で人が歩く 1 歩の時間（ミリ秒）。プレイヤーの歩きより少しゆっくり見せる。 */
const STAGE_MOVE_MS = 220;
/** 演出で敵の画像を出すときの大きさ（戦闘の画像の半分。雑魚 64px は 32px、ボス 96px は 48px）。 */
const ENEMY_STAGE_SCALE = 0.5;
/** 演出で敵の画像をふくらませる時間（ミリ秒。actor の grow）。 */
const STAGE_GROW_MS = 1200;

/** 演出の敵の画像の大きさを変える。下端の中央を、置いたタイルの下端の中央に合わせたまま。 */
function setEnemyStageScale(image: Phaser.GameObjects.Image, scale: number): Phaser.GameObjects.Image {
  return image.setScale(scale).setDisplayOrigin(image.width / 2 - TILE / 2 / scale, image.height - TILE / scale);
}
/** 歩行のコマがある人（ほかの人は歩くときに小さく跳ねて見せる）。 */
const WALKING_SPRITES: ReadonlySet<CharacterSpriteId> = new Set(['hero_m', 'hero_f', 'kasumi', 'gendo', 'orin', 'tatsugoro']);

interface Overlay {
  update(c: Controls): void;
  destroy(): void;
  /** 取消で戻れるか（Menu の cancelable。書かないものは戻れる）。 */
  readonly cancelable?: boolean;
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
  /** NPC の表示（画像のない NPC の仮の人も含む）。showFlag が立つまでと、hideFlag が立ったら隠す。 */
  private npcObjects = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();
  /** 演出で出した人（イベントの間だけ。actor の ID ごと）。 */
  private stageSprites = new Map<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Image>();
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

    // 地形（部品の組み合わせ方は src/data/mapParts.ts）
    for (const img of mapTileImages(map, TILE)) this.add.image(img.x, img.y, img.key, img.frame).setOrigin(0);
    // ワールドマップでは町の名前を印の上に出す
    for (const town of map.towns ?? []) {
      this.add
        .text(town.x * TILE + TILE / 2, town.y * TILE - 1, town.name, { ...textStyle(8), stroke: '#000000', strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setDepth(5);
    }
    // 入口の目印（洞窟の口・石段・門）。地面のすぐ上に描き、人はその上を歩く
    for (const mark of map.marks ?? []) {
      const origin = objectDisplayOrigin(mark.object);
      this.add.image(mark.x * TILE, mark.y * TILE, objectKey(mark.object), 0).setDisplayOrigin(origin.x, origin.y).setDepth(1);
    }
    // 施設の看板（戸口の隣の壁に掛ける。src/data/signs.ts）。人より奥に描く
    for (const sign of mapSigns(map)) this.add.image(sign.x * TILE, sign.y * TILE, signKey(sign.kind)).setOrigin(0).setDepth(1);
    this.npcSprites = new Map();
    this.npcObjects = new Map();
    this.stageSprites = new Map();
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

    // 高さ 58: 縁 4 の内側 50 に 48 の顔が収まる
    this.message = new MessageWindow(this, 8, GAME_HEIGHT - 66, GAME_WIDTH - 16, 58, (page) => {
      const face = faceForPage(page);
      return { text: pageText(page), face: face && faceKey(face) };
    }, { glossary: true });
    this.showAreaName(map.name);

    // 戦闘や移動から戻ってきたら、途中のイベントの続きを行う。なければ、マップに入ったときのイベントを行う
    // 移動・全滅で別のマップに来たときは、途中のイベントが終わってから、このマップに入ったときのイベントを行う
    // warp で来たマップのイベントの続きで戦闘に入ったときも、戦闘から戻ってイベントが終わったら onEnter を行う（enterPending を引き継ぐ）
    const pending = takePendingEvent();
    this.enterPending = shouldRunEnterEvent(map.id, pending, data.fromMapId);
    if (pending) {
      this.runner = pending.runner;
      // 戦闘の前に演出で出した・動かした人を、その姿のまま置き直す（全滅で別のマップへ戻されたときは置かない）
      if (pending.fromMapId === map.id) for (const [id, actor] of pending.runner.stage) this.placeStageActor(id, actor);
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
        // 戦闘から戻ってきたフィールドが続きを行う。まだ行っていない onEnter があれば（warp の直後など）、戻ったあとに行う
        holdEventWhileAway(runner, fromMapId, this.enterPending);
        this.runner = null;
        this.moving = true;
        this.standStill();
        this.cameras.main.flash(250, 255, 255, 255);
        this.time.delayedCall(260, () =>
          this.scene.start('Battle', { enemyIds: request.enemies, level: request.level, canEscape: request.canEscape, loseOk: request.loseOk }),
        );
        return;
      case 'warp':
        holdEventWhileAway(runner, fromMapId, this.enterPending);
        this.runner = null;
        this.moving = true;
        this.standStill();
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({}));
        return;
      case 'ending':
        // 終章のからくり大権現を倒したあと。暗転してエンディングへ
        this.runner = null;
        this.moving = true;
        this.standStill();
        this.cameras.main.fadeOut(1200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Ending'));
        return;
      case 'stage':
        this.performStage(runner, request.step, () => this.advanceEvent());
        return;
      case 'done':
        this.runner = null;
        this.clearStage(runner);
        this.controls.flush();
        // イベントで立ったフラグで、姿を消す NPC（仲間になった人、どいた見張りなど）を隠す
        this.refreshNpcs();
        this.runEnterEvent();
        return;
    }
  }

  /** 演出の 1 手順を行い、終わったら done を呼ぶ。動かした人の姿は runner.stage に書く（戦闘から戻ったときに置き直すため）。 */
  private performStage(runner: EventRunner, step: StageStep, done: () => void): void {
    switch (step.type) {
      case 'actor': {
        const state = getState();
        const actor: StageActor = {
          sprite: step.sprite,
          enemy: step.enemy,
          ...(step.scale !== undefined ? { scale: step.scale } : {}),
          x: step.x ?? state.x,
          y: step.y ?? state.y,
          facing: step.facing ?? state.facing,
          visible: true,
        };
        runner.stage.set(step.id, actor);
        this.placeStageActor(step.id, actor);
        const obj = this.stageObject(step.id);
        if (step.grow && step.enemy && obj instanceof Phaser.GameObjects.Image) {
          // 半分の大きさから scale までふくらませる（戦闘から戻って置き直すときは、ふくらませずに scale のまま置く）
          const to = actor.scale ?? ENEMY_STAGE_SCALE;
          setEnemyStageScale(obj, ENEMY_STAGE_SCALE);
          this.tweens.addCounter({
            from: ENEMY_STAGE_SCALE,
            to,
            duration: STAGE_GROW_MS,
            ease: 'Sine.easeIn',
            onUpdate: (tween) => setEnemyStageScale(obj, tween.getValue() ?? to),
            onComplete: () => {
              setEnemyStageScale(obj, to);
              done();
            },
          });
          return;
        }
        if (step.x !== undefined) {
          done();
          return;
        }
        // 主人公の足元から、隣の空いたマスへ 1 歩出る
        const dir = this.freeSideOfHero(runner);
        if (dir) this.walkStage(runner, step.id, [dir], () => this.setStageFacing(runner, step.id, state.facing), done);
        else done();
        return;
      }
      case 'face': {
        const dir = step.dir ?? (step.toward !== undefined ? this.facingToward(runner, step.who, step.toward) : undefined);
        if (dir) this.setStageFacing(runner, step.who, dir);
        done();
        return;
      }
      case 'vanish': {
        const actor = this.stageActorOf(runner, step.who);
        if (actor) {
          runner.stage.set(step.who, { ...actor, visible: false });
          this.stageObject(step.who)?.setVisible(false);
        }
        done();
        return;
      }
      case 'wait':
        this.time.delayedCall(step.ms, done);
        return;
      case 'walk': {
        const target = typeof step.to === 'string' ? this.stagePosition(runner, step.to) : step.to;
        const from = this.stagePosition(runner, step.who);
        const dirs = target && from ? (step.route ? routeTo(from, target, (x, y) => this.openForRoute(runner, step.who, x, y)) : pathTo(from, target)) : pathFacings(step.path ?? '');
        // route の道は人のいないマスだけを通るので、行き先の人のマスに入れる goal はいらない
        const goal = step.route ? undefined : target;
        if (step.wait === false) {
          this.walkStage(runner, step.who, dirs, () => {}, () => {}, goal);
          done();
        } else this.walkStage(runner, step.who, dirs, () => {}, done, goal);
        return;
      }
    }
  }

  /** route の道が通れるマス（通れて、主人公・見えている NPC・歩く本人のほかの演出の人がいない）。 */
  private openForRoute(runner: EventRunner, who: string, x: number, y: number): boolean {
    const state = getState();
    if (!canStep(this.map, x, y) || (state.x === x && state.y === y)) return false;
    // 演出で動かした NPC は、マップに書いた位置ではなく演出の位置で見る
    const npc = this.npcAt(x, y);
    if (npc && !runner.stage.has(npc.id)) return false;
    return ![...runner.stage.entries()].some(([id, a]) => id !== who && a.visible && a.x === x && a.y === y);
  }

  /** 主人公の隣の空いたマスの向き（主人公の向きの横、後ろ、前の順）。人や物のいるマスと通れないマスは避ける。 */
  private freeSideOfHero(runner: EventRunner): Facing | undefined {
    const state = getState();
    const order: Facing[] =
      state.facing === 'up' || state.facing === 'down' ? ['left', 'right', oppositeFacing(state.facing), state.facing] : ['up', 'down', oppositeFacing(state.facing), state.facing];
    return order.find((d) => {
      const x = state.x + DELTA[d][0];
      const y = state.y + DELTA[d][1];
      return canStep(this.map, x, y) && !this.npcAt(x, y) && ![...runner.stage.values()].some((a) => a.visible && a.x === x && a.y === y);
    });
  }

  /** 演出で動かせる人の今の姿（主人公は除く）。まだ動かしていないマップの NPC は、マップに書いた位置から。 */
  private stageActorOf(runner: EventRunner, who: string): StageActor | undefined {
    const staged = runner.stage.get(who);
    if (staged) return staged;
    const npc = this.map.npcs.find((n) => n.id === who);
    if (!npc) return undefined;
    return { x: npc.x, y: npc.y, facing: npc.facing ?? 'down', visible: npcVisible(npc, getState().flags) };
  }

  private stageObject(who: string): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | undefined {
    if (who === 'hero') return this.player;
    return this.stageSprites.get(who) ?? this.npcObjects.get(who);
  }

  /** 人の位置（主人公は GameState、ほかは演出の姿）。 */
  private stagePosition(runner: EventRunner, who: string): { x: number; y: number } | undefined {
    if (who === 'hero') return getState();
    return this.stageActorOf(runner, who);
  }

  /** who が toward のほうを向く向き（同じ場所なら undefined）。上下と左右で離れているほうを優先する。 */
  private facingToward(runner: EventRunner, who: string, toward: string): Facing | undefined {
    const from = this.stagePosition(runner, who);
    const to = this.stagePosition(runner, toward);
    if (!from || !to) return undefined;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return undefined;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  private setStageFacing(runner: EventRunner, who: string, dir: Facing): void {
    if (who === 'hero') {
      setState({ ...getState(), facing: dir });
      this.player.setFrame(idleFrame(dir));
      return;
    }
    const actor = this.stageActorOf(runner, who);
    if (!actor) return;
    runner.stage.set(who, { ...actor, facing: dir });
    const obj = this.stageObject(who);
    if (obj instanceof Phaser.GameObjects.Sprite) obj.setFrame(idleFrame(dir));
  }

  /** 演出の人を置く（出す・置き直す）。actor で出した人は新しく作り、マップの NPC は位置と向きと表示を変える。 */
  private placeStageActor(id: string, actor: StageActor): void {
    let obj = this.stageObject(id);
    const key = actor.sprite ? spriteKey(actor.sprite) : actor.enemy ? enemyImageKey(actor.enemy) : undefined;
    // 同じ ID で姿を変えたら作り直す
    if (obj && key && obj !== this.player && this.stageSprites.has(id) && obj.texture.key !== key) {
      obj.destroy();
      this.stageSprites.delete(id);
      obj = undefined;
    }
    if (!obj && actor.sprite) {
      const created = this.add.sprite(0, 0, spriteKey(actor.sprite), idleFrame(actor.facing)).setDisplayOrigin(CHAR_DISPLAY_ORIGIN.x, CHAR_DISPLAY_ORIGIN.y);
      this.stageSprites.set(id, created);
      obj = created;
    } else if (!obj && actor.enemy) {
      // 敵の画像は半分の大きさ（scale があればその大きさ）で、下端の中央をタイルの下端の中央に合わせる
      const created = setEnemyStageScale(this.add.image(0, 0, enemyImageKey(actor.enemy)), actor.scale ?? ENEMY_STAGE_SCALE);
      this.stageSprites.set(id, created);
      obj = created;
    }
    if (!obj || obj === this.player) return;
    // 同じ ID・同じ敵の画像で大きさだけ変えたときも、その大きさにする
    if (actor.enemy && this.stageSprites.has(id) && !(obj instanceof Phaser.GameObjects.Sprite)) setEnemyStageScale(obj, actor.scale ?? ENEMY_STAGE_SCALE);
    obj.setPosition(actor.x * TILE, actor.y * TILE).setDepth(personDepth(actor.y)).setVisible(actor.visible);
    if (obj instanceof Phaser.GameObjects.Sprite) obj.setFrame(idleFrame(actor.facing));
  }

  /**
   * 1 歩ずつ歩かせる。通れないマスの手前で止まる（goal のマスは、人がいても入れる。仲間が主人公に戻るとき）。
   * 歩き終えたら（止まったときも）立ち姿にして beforeDone、done の順に呼ぶ。
   */
  private walkStage(runner: EventRunner, who: string, dirs: Facing[], beforeDone: () => void, done: () => void, goal?: { x: number; y: number }): void {
    const dir = dirs[0];
    const obj = this.stageObject(who);
    if (!dir || !obj) {
      if (obj instanceof Phaser.GameObjects.Sprite) {
        obj.stop();
        const facing = who === 'hero' ? getState().facing : this.stageActorOf(runner, who)?.facing;
        if (facing) obj.setFrame(idleFrame(facing));
      }
      beforeDone();
      done();
      return;
    }
    const from = this.stagePosition(runner, who);
    if (!from) {
      done();
      return;
    }
    const [dx, dy] = DELTA[dir];
    const nx = from.x + dx;
    const ny = from.y + dy;
    if (who === 'hero') setState({ ...getState(), facing: dir });
    else {
      const actor = this.stageActorOf(runner, who);
      if (actor) runner.stage.set(who, { ...actor, facing: dir });
    }
    const isGoal = goal !== undefined && goal.x === nx && goal.y === ny;
    if (!isGoal && !canStep(this.map, nx, ny)) {
      this.walkStage(runner, who, [], beforeDone, done);
      return;
    }
    const sprite = obj instanceof Phaser.GameObjects.Sprite ? obj : undefined;
    const spriteId = who === 'hero' ? this.playerSprite : this.stageSpriteId(runner, who);
    // 主人公が歩くあいだは、毎フレームの立ち姿に戻す処理（update）を止める
    if (who === 'hero') this.moving = true;
    if (sprite && spriteId && WALKING_SPRITES.has(spriteId)) sprite.play(walkAnimKey(spriteId, dir), true);
    else sprite?.setFrame(idleFrame(dir));
    obj.setDepth(personDepth(walkDepthRow(from.y, ny)));
    // 歩行のコマのない人は、歩くあいだ小さく跳ねる
    const hop = !spriteId || !WALKING_SPRITES.has(spriteId);
    if (hop) this.tweens.add({ targets: obj, displayOriginY: obj.displayOriginY + 2 / obj.scaleY, duration: STAGE_MOVE_MS / 2, yoyo: true });
    this.tweens.add({
      targets: obj,
      x: nx * TILE,
      y: ny * TILE,
      duration: STAGE_MOVE_MS,
      onComplete: () => {
        obj.setDepth(personDepth(ny));
        if (who === 'hero') {
          this.moving = false;
          setState({ ...getState(), x: nx, y: ny });
        }
        else {
          const actor = this.stageActorOf(runner, who);
          if (actor) runner.stage.set(who, { ...actor, x: nx, y: ny });
        }
        this.walkStage(runner, who, dirs.slice(1), beforeDone, done, goal);
      },
    });
  }

  /** 演出の人の画像（actor で出した人はその画像、マップの NPC は NPC の画像）。 */
  private stageSpriteId(runner: EventRunner, who: string): CharacterSpriteId | undefined {
    return runner.stage.get(who)?.sprite ?? this.map.npcs.find((n) => n.id === who)?.sprite;
  }

  /**
   * イベントが終わったら、演出で出した人を消し、演出で動かしたマップの NPC を元の位置と向きに戻す
   * （演出で触っていない NPC はそのまま。話しかけて振り向いた向きを変えない）。
   */
  private clearStage(runner: EventRunner): void {
    for (const sprite of this.stageSprites.values()) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.stageSprites.clear();
    for (const npc of this.map.npcs) {
      if (!runner.stage.has(npc.id)) continue;
      const obj = this.npcObjects.get(npc.id);
      if (!obj) continue;
      this.tweens.killTweensOf(obj);
      obj.setPosition(npc.x * TILE, npc.y * TILE);
      if (npc.sprite && obj instanceof Phaser.GameObjects.Sprite) obj.setDepth(personDepth(npc.y)).setFrame(idleFrame(npc.facing ?? 'down'));
    }
  }

  /**
   * 主人公が画面の中央に来るようにカメラを動かす（マップの端では止める）。
   * カメラの原点を左上にしているため、Phaser の startFollow は使わずに自前で計算する。
   */
  private followPlayer(): void {
    const mapW = (this.map.rows[0]?.length ?? 0) * TILE;
    const mapH = this.map.rows.length * TILE;
    const x = cameraScroll(this.player.x + TILE / 2, mapW, GAME_WIDTH);
    const y = cameraScroll(this.player.y + TILE / 2, mapH, GAME_HEIGHT);
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
    setCancelLabel(
      fieldCancelLabel({
        messageOpen: this.message.isOpen,
        pageHasTerms: this.message.hasTerms,
        tipsOpen: this.message.tipsOpen,
        overlay: this.overlays.length > 0,
        overlayCancels: this.overlays[this.overlays.length - 1]?.cancelable !== false,
        eventRunning: !!this.runner,
      }),
    );

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

  /** いない NPC（showFlag がまだ・hideFlag が立った）を隠し、開けた葛籠を開いた姿にする。 */
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
    if (!canStep(this.map, nx, ny) || this.npcAt(nx, ny)) {
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
    const table = encounter ? ENCOUNTERS[encounter] : undefined;
    // 敵の出ない場所（町の中など）では、エンカウントまでの歩数も魔除けの残りも変わらない
    const result = stepOnRoad(state, table !== undefined, defaultRng);
    setState({ ...state, stepsToEncounter: result.stepsToEncounter, wardSteps: result.wardSteps });
    if (!table) return;
    if (result.wardEnded) {
      this.message.show(['魔除けの効き目が切れた。']);
      return;
    }
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
    const lines = npcLines(npc, state.flags);
    this.message.show(lines, () => {
      if (npc.setsFlag) {
        const s = getState();
        setState({ ...s, flags: { ...s.flags, [npc.setsFlag]: true } });
      }
      // （町の旅籠〈action が inn〉は渡世人を泊めないので、ここでは何もしない。主人は台詞で親分の屋敷へ導くだけ）

      if (npc.action === 'moguriInn') {
        // もぐりの宿はワールドマップ（敵レベル 1 のマップ）にあるので、値段は宿ごとに決めた街道の敵レベルで決める
        const level = moguriYadoById(npc.id)?.areaLevel ?? this.map.areaLevel;
        this.openMoguriInn(level);
      }
      if (npc.action === 'oyabun') this.openOyabun();
      if (npc.action === 'teahouse') this.openTeahouse(npc.shop);
      if (npc.action === 'shop') this.openShop(npc.shop);
      if (npc.action === 'temple') this.openTemple();
      if (npc.action === 'hikyaku') this.openHikyaku();
      if (npc.action === 'yuya') {
        this.openPaidRest(`湯に浸かる（${yuyaPrice(this.map.areaLevel)} 文）`, (s) => takeBath(s, this.map.areaLevel), [
          '熱い湯に浸かって、体の疲れがほぐれた。体力が回復した。',
        ], ['番頭「湯銭が足りねえようで……」'], null);
      }
      if (npc.action === 'izakaya') {
        this.openPaidRest(`一杯やる（${izakayaPrice(this.map.areaLevel)} 文）`, (s) => drinkAtIzakaya(s, this.map.areaLevel), [
          '熱燗で、気分がすっきりした。気力が回復した。',
        ], ['亭主「お代が足りねえんじゃ、出せやせんぜ」'], pendingJingiRequest(this.townId, npc.action, getState().flags));
      }
      if (npc.action === 'gyoro') {
        this.openPaidRest(`座敷に上がる（${gyoroPrice(this.map.areaLevel)} 文）`, (s) => visitGyoro(s, this.map.areaLevel), [
          '三味線と唄でもてなされ、心も体も晴れ晴れとした。体力と気力が回復した。',
        ], ['女将「あら、お足りないようで。またのお越しを」'], pendingJingiRequest(this.townId, npc.action, getState().flags));
      }
      if (npc.action === 'tobaku') this.openTobaku(pendingJingiRequest(this.townId, npc.action, getState().flags));
    });
  }

  /** 今いる町の ID（建物の屋内なら、その建物のある町。施設の頼みや親分の屋敷を町ごとに引くのに使う）。 */
  private get townId(): string {
    return townOf(this.map.id);
  }

  private pushOverlay(o: Overlay): void {
    this.controls.flush();
    this.overlays.push(o);
  }

  private closeOverlay(o: Overlay): void {
    o.destroy();
    this.overlays = this.overlays.filter((x) => x !== o);
  }

  /**
   * 親分の屋敷。仁義ポイントを使って泊めてもらう（体力と気力を全回復）か、記録する。
   * まだ果たしていない親分の頼み（src/data/oyabunRequests.ts の pendingOyabunRequest）と、
   * 町の博徒を屋敷へ向かわせていれば引き合わせる項目（src/data/jingiRequests.ts の pendingBakutoIntro）、
   * 名が通っていれば親分の贈り物（src/data/oyabunGifts.ts の pendingOyabunGift）も出す。
   */
  private openOyabun(): void {
    const def = OYABUN[this.townId];
    if (!def) return;
    const cost = oyabunStayCost(this.map.areaLevel);
    const items = facilityMenu(
      [
        { label: `泊めてもらう（仁義 ${cost}）`, value: 'stay' as const },
        { label: '記録する', value: 'save' as const },
      ],
      [pendingOyabunRequest(this.townId, getState().flags), pendingBakutoIntro(this.townId, getState().flags), pendingOyabunGift(this.townId, getState())],
    );
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 170,
      40,
      160,
      items.labels.map((l) => ({ label: l })),
      (i) => {
        this.closeOverlay(menu);
        const pick = items.pick(i);
        if (pick.kind === 'request') {
          this.startEvent(pick.id);
          return;
        }
        if (pick.kind !== 'main') return;
        if (pick.value === 'stay') {
          const result = stayAtOyabun(getState(), this.map.areaLevel);
          if (!result.ok) {
            this.message.show(
              result.reason === 'full'
                ? ['若い衆「みなさん、まだまだお元気そうでござんすね。草鞋を脱ぐのは、疲れなすったときにしなせえ」']
                : [
                    `若い衆「すまねえが、仁義の足りねえお方をお泊めしちゃ、親分に叱られやす……」（仁義 ${getState().jingi}／${cost} 要る）`,
                    // ワールドマップのもぐりの宿（src/data/moguriYado.ts）へ導く
                    '若い衆「街道筋の脇道に、お上に届けの出てねえ宿があると聞きやす。代は高えが、そこなら誰でも泊めてくれやすぜ」',
                  ],
            );
            return;
          }
          setState(result.state);
          this.sleepThen([
            oyabunWelcome(def, getState().flags),
            `一宿一飯の世話になった。体力と気力が回復した。（仁義 −${result.cost}、残り ${result.state.jingi}）`,
            '若い衆「記録もつけていきなさるかい？」',
          ]);
        } else {
          this.openSave();
        }
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  /** 泊まったあと（もぐりの宿・親分の屋敷）。暗転して明け、lines を出してから記録の窓を開く。 */
  private sleepThen(lines: string[]): void {
    // 暗転している間は動けないようにする
    this.moving = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.moving = false;
      // 暗転中に押された決定でメッセージを読み飛ばさないようにする
      this.controls.flush();
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.message.show(lines, () => this.openSave());
    });
  }

  /** もぐりの宿。お金で泊まって全回復し、そのあと記録もできる。level は小屋の建つ街道の敵レベル（宿代を決める）。 */
  private openMoguriInn(level: number): void {
    const price = moguriInnPrice(level);
    const host = '亭主';
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      [{ label: `泊まる（${price} 文）` }, { label: '記録する' }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        if (i === 0) {
          const result = stayAtMoguriInn(getState(), level);
          if (!result.ok) {
            this.message.show([`${host}「お代が足りねえようで……」`]);
            return;
          }
          setState(result.state);
          this.sleepThen(['ぐっすり眠った。体力と気力が回復した。', `${host}「記録もつけていきなさるかい？」`]);
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

  /**
   * 代金を払って休む施設（湯屋・居酒屋・妓楼）。決めたら run で払って回復し、done を出す。
   * request（まだ果たしていない頼まれごと。src/data/jingiRequests.ts の pendingJingiRequest）があれば、メニューに頼まれごとを出す。
   */
  private openPaidRest(
    label: string,
    run: (s: ReturnType<typeof getState>) => PurchaseResult,
    done: string[],
    noMoney: string[],
    request: MenuRequest | null,
  ): void {
    const items = facilityMenu([{ label, value: 'rest' }], [request]);
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 170,
      40,
      160,
      items.labels.map((l) => ({ label: l })),
      (i) => {
        this.closeOverlay(menu);
        const pick = items.pick(i);
        if (pick.kind === 'request') {
          this.startEvent(pick.id);
          return;
        }
        if (pick.kind !== 'main') return;
        const result = run(getState());
        if (!result.ok) {
          this.message.show(noMoney);
          return;
        }
        setState(result.state);
        this.message.show(done);
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  /**
   * 賭場。張る額を選び、丁か半かを張る（さいころの目の和が偶数なら丁、奇数なら半）。
   * request（まだ果たしていないイカサマ客の頼まれごと）があれば、張る額の後ろに出す（張る銭がなくても引き受けられる）。
   */
  private openTobaku(request: MenuRequest | null): void {
    const bets = CHOHAN_BETS.filter((b) => b <= getState().money);
    if (bets.length === 0 && !request) {
      this.message.show([`中盆「${CHOHAN_BETS[0]} 文も持たねえで、賭場に来なさんな」`]);
      return;
    }
    const items = facilityMenu(
      bets.map((b) => ({ label: `${b} 文張る`, value: b })),
      [request],
    );
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 170,
      40,
      160,
      items.labels.map((l) => ({ label: l })),
      (i) => {
        this.closeOverlay(menu);
        const pick = items.pick(i);
        if (pick.kind === 'main') this.openChohanCall(pick.value);
        else if (pick.kind === 'request') this.startEvent(pick.id);
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  private openChohanCall(bet: number): void {
    const calls: ChohanCall[] = ['cho', 'han'];
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      [{ label: '丁（偶数）' }, { label: '半（奇数）' }, { label: 'やめる' }],
      (i) => {
        this.closeOverlay(menu);
        const call = calls[i];
        if (!call) return;
        const result = playChohan(getState(), bet, call, defaultRng);
        if (!result.ok) {
          this.message.show(['中盆「張るだけの銭がねえようだな」']);
          return;
        }
        setState(result.state);
        this.message.show([
          `${call === 'cho' ? '丁' : '半'}に ${bet} 文を張った。`,
          `壺振り「${chohanRollText(result.dice)}！」`,
          result.win ? `当たった！ 寺銭を引いて ${chohanWinnings(bet)} 文を得た。` : `外れた……。${bet} 文を失った。`,
        ]);
      },
      () => this.closeOverlay(menu),
    );
    this.pushOverlay(menu);
  }

  /** 茶屋。その場で団子を食べる（全員を少し回復）か、持ち帰りの飲み物・食べ物を買う（shopId の店）。 */
  private openTeahouse(shopId: string | undefined): void {
    const price = dangoPrice(this.map.areaLevel);
    const choices = teahouseChoices(shopId !== undefined);
    const labels = { eat: `団子を食べる（${price} 文）`, buy: '品を買う', cancel: 'やめる' };
    const menu: Menu = new Menu(
      this,
      GAME_WIDTH - 140,
      40,
      130,
      choices.map((c) => ({ label: labels[c] })),
      (i) => {
        this.closeOverlay(menu);
        const choice = choices[i];
        if (choice === 'buy') {
          this.openShop(shopId);
          return;
        }
        if (choice !== 'eat') return;
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
      // 道しるべの札・抜け道: 使ったことを出してから、入口の外へ移る
      (to, message) => this.message.show([message], () => this.moveTo(to.mapId, to.x, to.y)),
    );
    this.pushOverlay(menu);
  }
}
