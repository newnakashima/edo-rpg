import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { ITEMS, ownedItems } from '../data/items';
import { MAPS, START_POSITION } from '../data/maps';
import { ailmentMarks, isAilment, SKILLS, STATUS_NAMES, type StatusId } from '../data/skills';
import {
  aliveOf,
  availableItemCount,
  computeRewards,
  createBattle,
  isAlive,
  needsTarget,
  partyAfterBattle,
  resolveTurn,
  type BattleEvent,
  type BattleState,
  type Combatant,
  type Command,
} from '../systems/battle';
import { reviveAfterDefeat } from '../systems/facilities';
import { gainExp } from '../systems/party';
import { playBgm } from '../systems/audio';
import { defaultRng } from '../systems/random';
import { getState, reportBattleOutcome, setState } from '../state';
import { Controls } from '../ui/input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { drawWindow, Menu, menuHeight, MessageWindow, type MenuItem } from '../ui/widgets';

export interface BattleData {
  enemyIds: string[];
  level: number;
  canEscape?: boolean;
  /** 負けても全滅扱いにしない（イベントの負けてもよい戦闘）。HP 1 で起き上がり、フィールドに戻る。 */
  loseOk?: boolean;
}

const EVENT_MS = 650;


/** 戦闘の下の窓の位置。 */
const PANEL_Y = 128;
const PANEL_H = 84;
/** コマンドの窓の位置。技・道具・対象の窓は右側（味方の欄の上）に重ねる。 */
const COMMAND_X = 140;
const SUB_X = 232;
const SUB_W = GAME_WIDTH - SUB_X - 4;
/** メッセージの折り返し幅（メニューを開いている間は、メニューに隠れないように狭める）。 */
const LOG_WIDTH = 216;
const LOG_WIDTH_WITH_MENU = COMMAND_X - 16;

export class BattleScene extends Phaser.Scene {
  private controls!: Controls;
  private battle!: BattleState;
  private enemySprites = new Map<string, Phaser.GameObjects.Image>();
  private partyTexts = new Map<string, Phaser.GameObjects.Text>();
  private log!: Phaser.GameObjects.Text;
  private message!: MessageWindow;
  /** 開いているメニュー（後に開いたものが上）。一番上だけが入力を受ける。 */
  private menus: Menu[] = [];
  private commands: Record<string, Command> = {};
  /** 演出中は入力を受け付けない。 */
  private busy = false;
  private loseOk = false;

  constructor() {
    super('Battle');
  }

  create(data: BattleData): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.enemySprites = new Map();
    this.partyTexts = new Map();
    this.menus = [];
    this.busy = false;
    this.loseOk = data.loseOk ?? false;
    const state = getState();
    this.battle = createBattle(state.party, state.gender, data.enemyIds, data.level, {
      canEscape: data.canEscape ?? true,
      items: state.items,
    });

    playBgm('bgm_battle');
    this.cameras.main.setBackgroundColor('#20283a');
    const g = this.add.graphics();
    g.fillStyle(0x2f4a2e, 1);
    g.fillRect(0, 100, GAME_WIDTH, 40);

    const enemies = this.battle.combatants.filter((c) => c.side === 'enemy');
    const spacing = GAME_WIDTH / (enemies.length + 1);
    enemies.forEach((e, i) => {
      const def = e.enemyId ? ENEMIES[e.enemyId] : undefined;
      const x = spacing * (i + 1);
      const sprite = this.add.image(x, 82, 'enemy').setTint(def?.color ?? 0xffffff);
      this.add.text(x, 112, e.name, textStyle(9)).setOrigin(0.5);
      this.enemySprites.set(e.key, sprite);
    });

    drawWindow(this, 4, PANEL_Y, GAME_WIDTH - 8, PANEL_H);
    this.battle.combatants
      .filter((c) => c.side === 'party')
      .forEach((c, i) => {
        this.partyTexts.set(c.key, this.add.text(236, 137 + i * 16, '', textStyle(10)));
      });
    this.log = this.add.text(12, 136, '', { ...textStyle(10), wordWrap: { width: LOG_WIDTH, useAdvancedWrap: true }, lineSpacing: 2 });
    this.message = new MessageWindow(this, 4, PANEL_Y, GAME_WIDTH - 8, PANEL_H);
    this.refreshParty();

    const names = enemies.map((e) => e.name).join('、');
    this.setLog(`${names}が現れた！`);
    this.busy = true;
    this.time.delayedCall(EVENT_MS, () => {
      this.busy = false;
      this.startCommandInput();
    });
  }

  private setLog(text: string): void {
    this.log.setText(text);
  }

  private partyLine(c: Combatant, hp: number, mp: number, status: Iterable<StatusId>): string {
    const marks = ailmentMarks(status);
    return `${c.name}${marks ? `[${marks}]` : ''} 体${hp} 気${mp}`;
  }

  private refreshParty(): void {
    for (const c of this.battle.combatants.filter((x) => x.side === 'party')) {
      this.setPartyText(c, c.hp, c.mp, Object.keys(c.status) as StatusId[]);
    }
  }

  private setPartyText(c: Combatant, hp: number, mp: number, status: Iterable<StatusId>): void {
    const t = this.partyTexts.get(c.key);
    const color = hp <= 0 ? COLORS.danger : hp < c.stats.maxHp / 4 ? COLORS.accent : COLORS.text;
    t?.setText(this.partyLine(c, hp, mp, status)).setColor(color);
  }

  /** 生きている味方に順にコマンドを選ばせる。 */
  private startCommandInput(): void {
    this.commands = {};
    this.askCommand(0);
  }

  private askCommand(index: number): void {
    const members = aliveOf(this.battle, 'party');
    const actor = members[index];
    if (!actor) {
      this.runTurn();
      return;
    }
    // 戻ってきたときは、その味方のコマンドを選び直す
    for (const m of members.slice(index)) delete this.commands[m.key];
    this.setLog(`${actor.name}はどうする？`);
    const hasItems = ownedItems(this.battle.items).some((id) => availableItemCount(this.battle, id, this.commands) > 0);
    this.openMenu(
      [
        { label: 'たたかう' },
        { label: '技', enabled: actor.skills.length > 0 },
        { label: '道具', enabled: hasItems },
        { label: 'ぼうぎょ' },
        { label: 'にげる', enabled: this.battle.canEscape },
      ],
      COMMAND_X,
      92,
      (i) => {
        if (i === 0) this.askEnemyTarget(index, (target) => ({ kind: 'attack', target }));
        else if (i === 1) this.askSkill(index);
        else if (i === 2) this.askItem(index);
        else {
          this.commands[actor.key] = i === 3 ? { kind: 'guard' } : { kind: 'escape' };
          this.closeAllMenus();
          this.askCommand(index + 1);
        }
      },
      index > 0
        ? () => {
            this.closeAllMenus();
            this.askCommand(index - 1);
          }
        : undefined,
    );
  }

  private askSkill(index: number): void {
    const actor = aliveOf(this.battle, 'party')[index];
    if (!actor) return;
    const skills = actor.skills.map((id) => SKILLS[id]).filter((s) => s !== undefined);
    this.openMenu(
      skills.map((s) => ({ label: s.name, note: String(s.mp), enabled: actor.mp >= s.mp })),
      SUB_X,
      SUB_W,
      (i) => {
        const skill = skills[i];
        if (!skill) return;
        const make = (target?: string): Command => ({ kind: 'skill', skill: skill.id, target });
        const kind = needsTarget(skill);
        if (kind === 'enemy') this.askEnemyTarget(index, make);
        else if (kind === 'ally') this.askAllyTarget(index, false, make);
        else this.decide(index, make());
      },
      () => this.closeTopMenu(() => this.setLog(`${actor.name}はどうする？`)),
      (i) => {
        const s = skills[i];
        if (s) this.setLog(`${s.name}（気力 ${s.mp}）\n${s.description}`);
      },
    );
  }

  private askItem(index: number): void {
    const actor = aliveOf(this.battle, 'party')[index];
    if (!actor) return;
    const ids = ownedItems(this.battle.items);
    this.openMenu(
      ids.map((id) => {
        const n = availableItemCount(this.battle, id, this.commands);
        return { label: ITEMS[id]?.name ?? id, note: `×${n}`, enabled: n > 0 };
      }),
      SUB_X,
      SUB_W,
      (i) => {
        const id = ids[i];
        const item = id ? ITEMS[id] : undefined;
        if (!id || !item) return;
        this.askAllyTarget(index, item.effect.kind === 'revive', (target) => ({ kind: 'item', item: id, target: target ?? actor.key }));
      },
      () => this.closeTopMenu(() => this.setLog(`${actor.name}はどうする？`)),
      (i) => {
        const item = ids[i] ? ITEMS[ids[i]] : undefined;
        if (item) this.setLog(`${item.name}\n${item.description}`);
      },
    );
  }

  private askEnemyTarget(index: number, make: (target: string) => Command): void {
    const targets = aliveOf(this.battle, 'enemy');
    this.openMenu(
      targets.map((t) => ({ label: t.name })),
      SUB_X,
      SUB_W,
      (i) => {
        const target = targets[i];
        if (target) this.decide(index, make(target.key));
      },
      () => this.closeTopMenu(),
    );
  }

  /** 味方を選ぶ。includeFallen なら戦闘不能の味方も選べる（気付け薬）、そうでなければ選べない。 */
  private askAllyTarget(index: number, includeFallen: boolean, make: (target?: string) => Command): void {
    const members = this.battle.combatants.filter((c) => c.side === 'party');
    this.openMenu(
      members.map((m) => ({
        label: m.name,
        note: `${m.hp}/${m.stats.maxHp}`,
        enabled: includeFallen ? !isAlive(m) : isAlive(m),
      })),
      SUB_X,
      SUB_W,
      (i) => {
        const target = members[i];
        if (target) this.decide(index, make(target.key));
      },
      () => this.closeTopMenu(),
    );
  }

  private decide(index: number, command: Command): void {
    const actor = aliveOf(this.battle, 'party')[index];
    if (!actor) return;
    this.commands[actor.key] = command;
    this.closeAllMenus();
    this.askCommand(index + 1);
  }

  private openMenu(
    items: MenuItem[],
    x: number,
    width: number,
    onSelect: (i: number) => void,
    onCancel?: () => void,
    onMove?: (i: number) => void,
  ): void {
    // 演出中に押された入力で、勝手に選ばれないようにする
    this.controls.flush();
    // 下の窓からはみ出すときは上にずらす
    const y = Math.min(PANEL_Y + 2 + (this.menus.length > 1 ? 6 : 0), GAME_HEIGHT - 2 - menuHeight(items.length));
    this.log.setWordWrapWidth(LOG_WIDTH_WITH_MENU, true);
    // 下に重なるメニューは、クリックも含めて操作できないようにする
    this.menus[this.menus.length - 1]?.setActive(false);
    const menu = new Menu(this, x, y, width, items, onSelect, onCancel, onMove);
    this.menus.push(menu);
  }

  private closeTopMenu(after?: () => void): void {
    this.menus.pop()?.destroy();
    this.menus[this.menus.length - 1]?.setActive(true);
    this.controls.flush();
    after?.();
  }

  private closeAllMenus(): void {
    for (const m of this.menus) m.destroy();
    this.menus = [];
    this.log.setWordWrapWidth(LOG_WIDTH, true);
  }

  private nameOf(key: string): string {
    return this.battle.combatants.find((c) => c.key === key)?.name ?? '';
  }

  private describe(e: BattleEvent): string {
    switch (e.type) {
      case 'attack':
        return `${this.nameOf(e.actor)}の攻撃！${e.critical ? '会心の一撃！' : ''}\n${this.nameOf(e.target)}に ${e.damage} のダメージ。`;
      case 'skill':
        return `${this.nameOf(e.actor)}の${SKILLS[e.skill]?.name ?? ''}！`;
      case 'item':
        return `${this.nameOf(e.actor)}は${ITEMS[e.item]?.name ?? ''}を使った。`;
      case 'damage': {
        const note = e.critical ? '会心の一撃！' : e.weak ? '効果は抜群だ！' : e.resisted ? 'あまり効いていない。' : '';
        return `${note}${note ? '\n' : ''}${this.nameOf(e.target)}に ${e.damage} のダメージ。`;
      }
      case 'miss':
        return `${this.nameOf(e.target)}には当たらなかった。`;
      case 'heal':
        return `${this.nameOf(e.target)}の体力が ${e.amount} 回復した。`;
      case 'healMp':
        return `${this.nameOf(e.target)}の気力が ${e.amount} 回復した。`;
      case 'revive':
        return `${this.nameOf(e.target)}は息を吹き返した！`;
      case 'status':
        return this.statusText(e.target, e.status);
      case 'statusFailed':
        return `${this.nameOf(e.target)}には効かなかった。`;
      case 'cure':
        return `${this.nameOf(e.target)}の体が軽くなった。`;
      case 'noEffect':
        return 'しかし、何も起こらなかった。';
      case 'itemUnused':
        return `${this.nameOf(e.actor)}は${ITEMS[e.item]?.name ?? ''}を${this.nameOf(e.target)}に使おうとしたが、効き目がなさそうなのでやめた。`;
      case 'noMp':
        return `${this.nameOf(e.actor)}は${SKILLS[e.skill]?.name ?? '技'}を使おうとしたが、気力が足りない！`;
      case 'noItem':
        return `${this.nameOf(e.actor)}は${ITEMS[e.item]?.name ?? '道具'}を探したが、もう残っていない！`;
      case 'cannotAct':
        return e.reason === 'sleep'
          ? `${this.nameOf(e.actor)}は眠っている。`
          : e.reason === 'paralysis'
            ? `${this.nameOf(e.actor)}は痺れて動けない！`
            : `${this.nameOf(e.actor)}は影を縫われて動けない！`;
      case 'confused':
        return `${this.nameOf(e.actor)}は混乱している！`;
      case 'statusEnd':
        return this.statusEndText(e.target, e.status);
      case 'poison':
        return `${this.nameOf(e.target)}は毒で ${e.damage} のダメージ。`;
      case 'taunt':
        return `${this.nameOf(e.actor)}は${this.nameOf(e.target)}に仁義を切った！\n${this.nameOf(e.target)}は${this.nameOf(e.actor)}をにらみつけている。`;
      case 'cover':
        return `${this.nameOf(e.actor)}は${this.nameOf(e.target)}の前に立ちはだかった。`;
      case 'covered':
        return `${this.nameOf(e.actor)}が${this.nameOf(e.target)}をかばった！`;
      case 'guard':
        return `${this.nameOf(e.actor)}は身を守っている。`;
      case 'defeated':
        return e.target.startsWith('e') ? `${this.nameOf(e.target)}を倒した！` : `${this.nameOf(e.target)}は倒れた……`;
      case 'escape':
        return e.success ? 'うまく逃げ切った。' : '逃げられない！';
    }
  }

  private statusText(target: string, status: StatusId): string {
    const name = this.nameOf(target);
    switch (status) {
      case 'poison':
        return `${name}は毒に侵された！`;
      case 'paralysis':
        return `${name}は痺れて動けなくなった！`;
      case 'sleep':
        return `${name}は眠ってしまった！`;
      case 'confusion':
        return `${name}は混乱した！`;
      case 'bind':
        return `${name}の影を縫いとめた！`;
      case 'atkUp':
        return `${name}の攻撃が上がった！`;
      case 'atkDown':
        return `${name}の攻撃が下がった！`;
      case 'accDown':
        return `${name}は煙に巻かれた！`;
      case 'evade':
        return `${name}の姿がいくつにも分かれた！`;
      case 'critUp':
        return `${name}は心を研ぎ澄ませた！`;
    }
  }

  private statusEndText(target: string, status: StatusId): string {
    const name = this.nameOf(target);
    if (status === 'sleep') return `${name}は目を覚ました。`;
    if (isAilment(status)) return `${name}の${STATUS_NAMES[status]}が治った。`;
    return `${name}の${STATUS_NAMES[status]}の効果が切れた。`;
  }

  private runTurn(): void {
    const { state, events } = resolveTurn(this.battle, this.commands, defaultRng);
    // 演出のため、HP・気力・状態異常の表示はイベントごとに更新する
    const before = this.battle;
    this.battle = state;
    this.busy = true;
    const hp = new Map(before.combatants.map((c) => [c.key, c.hp]));
    const mp = new Map(before.combatants.map((c) => [c.key, c.mp]));
    const status = new Map(before.combatants.map((c) => [c.key, new Set(Object.keys(c.status) as StatusId[])]));
    const update = (key: string, delta: number) => {
      const c = this.battle.combatants.find((x) => x.key === key);
      if (!c) return;
      hp.set(key, Math.max(0, Math.min(c.stats.maxHp, (hp.get(key) ?? 0) + delta)));
      if (c.side === 'party') this.setPartyText(c, hp.get(key) ?? 0, mp.get(key) ?? 0, status.get(key) ?? []);
    };
    const setStatus = (key: string, change: (s: Set<StatusId>) => void) => {
      const s = status.get(key);
      if (s) change(s);
      update(key, 0);
    };
    const play = (i: number) => {
      const e = events[i];
      if (!e) {
        this.busy = false;
        this.refreshParty();
        this.afterTurn();
        return;
      }
      this.setLog(this.describe(e));
      switch (e.type) {
        case 'attack':
        case 'damage':
        case 'poison': {
          update(e.target, -e.damage);
          const sprite = this.enemySprites.get(e.target);
          if (sprite) this.tweens.add({ targets: sprite, alpha: 0.2, yoyo: true, duration: 80, repeat: 1 });
          else this.cameras.main.shake(120, 0.01);
          break;
        }
        case 'heal':
          update(e.target, e.amount);
          break;
        case 'revive':
          hp.set(e.target, 0);
          update(e.target, e.hp);
          break;
        case 'skill': {
          const cost = SKILLS[e.skill]?.mp ?? 0;
          mp.set(e.actor, (mp.get(e.actor) ?? 0) - cost);
          update(e.actor, 0);
          break;
        }
        case 'healMp':
          mp.set(e.target, (mp.get(e.target) ?? 0) + e.amount);
          update(e.target, 0);
          break;
        case 'status':
          setStatus(e.target, (s) => s.add(e.status));
          break;
        case 'statusEnd':
          setStatus(e.target, (s) => s.delete(e.status));
          break;
        case 'cure':
          setStatus(e.target, (s) => {
            for (const id of e.ailments) s.delete(id);
          });
          break;
        case 'cannotAct':
          if (e.reason === 'bind') setStatus(e.actor, (s) => s.delete('bind'));
          break;
        case 'defeated': {
          setStatus(e.target, (s) => s.clear());
          const sprite = this.enemySprites.get(e.target);
          if (sprite) this.tweens.add({ targets: sprite, alpha: 0, duration: 300 });
          break;
        }
        default:
          break;
      }
      this.time.delayedCall(EVENT_MS, () => play(i + 1));
    };
    play(0);
  }

  private afterTurn(): void {
    switch (this.battle.outcome) {
      case 'ongoing':
        this.startCommandInput();
        return;
      case 'escaped':
        reportBattleOutcome('escaped');
        this.finish(() => {
          const s = getState();
          setState({ ...s, party: partyAfterBattle(s.party, this.battle), items: this.battle.items });
        });
        return;
      case 'victory':
        this.victory();
        return;
      case 'defeat':
        this.defeat();
        return;
    }
  }

  private victory(): void {
    reportBattleOutcome('victory');
    const state = getState();
    const rewards = computeRewards(this.battle);
    const party = partyAfterBattle(state.party, this.battle);
    const amounts = party.map((_, i) => rewards.exp[`p${i}`] ?? 0);
    const { party: leveled, levelUps } = gainExp(party, amounts);
    setState({ ...state, party: leveled, money: state.money + rewards.money, items: this.battle.items });
    const exp = Math.max(0, ...amounts);
    this.controls.flush();
    const pages = [`敵をすべて倒した！\n経験値 ${exp} と ${rewards.money} 文を手に入れた。`];
    for (const up of levelUps) {
      const name = characterName(up.id, state.gender);
      const learned = up.learned.map((id) => `「${SKILLS[id]?.name ?? id}」を覚えた！`).join('\n');
      pages.push(`${name}は Lv${up.to} に上がった！${learned ? `\n${learned}` : ''}`);
    }
    this.log.setText('');
    this.message.show(pages, () => this.finish());
  }

  private defeat(): void {
    reportBattleOutcome('defeat');
    if (this.loseOk) {
      this.log.setText('');
      this.controls.flush();
      this.message.show(['一行は力尽きた……'], () => {
        const s = getState();
        const party = partyAfterBattle(s.party, this.battle).map((m) => ({ ...m, hp: Math.max(1, m.hp) }));
        setState({ ...s, party, items: this.battle.items });
        this.finish();
      });
      return;
    }
    const state = getState();
    const map = MAPS[state.mapId];
    // 全滅したら、その地域の町の旅籠の前に戻る（序章では清水湊）
    const respawnMap = map?.respawn ? map : MAPS[START_POSITION.mapId];
    const respawn = respawnMap?.respawn
      ? { mapId: respawnMap.id, ...respawnMap.respawn }
      : START_POSITION;
    this.log.setText('');
    this.controls.flush();
    this.message.show(['一行は力尽きた……', '気がつくと、旅籠の布団の上だった。所持金が半分になっている。'], () => {
      setState(reviveAfterDefeat({ ...getState(), items: this.battle.items }, respawn));
      this.finish();
    });
  }

  private finish(before?: () => void): void {
    before?.();
    this.busy = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Field'));
  }

  update(): void {
    if (this.message.isOpen) {
      this.message.update(this.controls);
      return;
    }
    if (this.busy) return;
    this.menus[this.menus.length - 1]?.update(this.controls);
  }
}
