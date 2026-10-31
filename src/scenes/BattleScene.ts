import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { MAPS, START_POSITION } from '../data/maps';
import {
  aliveOf,
  computeRewards,
  createBattle,
  partyAfterBattle,
  resolveTurn,
  type BattleEvent,
  type BattleState,
  type Command,
} from '../systems/battle';
import { reviveAfterDefeat } from '../systems/facilities';
import { gainExp } from '../systems/party';
import { playBgm } from '../systems/audio';
import { defaultRng } from '../systems/random';
import { getState, setState } from '../state';
import { Controls } from '../ui/input';
import { COLORS, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';
import { drawWindow, Menu, MessageWindow } from '../ui/widgets';

export interface BattleData {
  enemyIds: string[];
  level: number;
  canEscape?: boolean;
}

const EVENT_MS = 650;

export class BattleScene extends Phaser.Scene {
  private controls!: Controls;
  private battle!: BattleState;
  private enemySprites = new Map<string, Phaser.GameObjects.Image>();
  private partyTexts = new Map<string, Phaser.GameObjects.Text>();
  private log!: Phaser.GameObjects.Text;
  private message!: MessageWindow;
  private menu: Menu | null = null;
  private commands: Record<string, Command> = {};
  /** 演出中は入力を受け付けない。 */
  private busy = false;

  constructor() {
    super('Battle');
  }

  create(data: BattleData): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.enemySprites = new Map();
    this.partyTexts = new Map();
    this.menu = null;
    this.busy = false;
    const state = getState();
    this.battle = createBattle(state.party, state.gender, data.enemyIds, data.level, { canEscape: data.canEscape ?? true });

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

    drawWindow(this, 4, 128, GAME_WIDTH - 8, 84);
    this.battle.combatants
      .filter((c) => c.side === 'party')
      .forEach((c, i) => {
        this.partyTexts.set(c.key, this.add.text(240, 136 + i * 14, '', textStyle(10)));
      });
    this.log = this.add.text(12, 136, '', { ...textStyle(10), wordWrap: { width: 220, useAdvancedWrap: true }, lineSpacing: 2 });
    this.message = new MessageWindow(this, 4, 128, GAME_WIDTH - 8, 84);
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

  private refreshParty(): void {
    for (const c of this.battle.combatants.filter((x) => x.side === 'party')) {
      const t = this.partyTexts.get(c.key);
      const color = c.hp <= 0 ? COLORS.danger : c.hp < c.stats.maxHp / 4 ? COLORS.accent : COLORS.text;
      t?.setText(`${c.name}  ${c.hp}/${c.stats.maxHp}`).setColor(color);
    }
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
    this.setLog(`${actor.name}はどうする？`);
    this.openMenu(
      [{ label: 'たたかう' }, { label: 'ぼうぎょ' }, { label: 'にげる', enabled: this.battle.canEscape }],
      (i) => {
        if (i === 0) this.askTarget(index);
        else {
          this.commands[actor.key] = i === 1 ? { kind: 'guard' } : { kind: 'escape' };
          this.askCommand(index + 1);
        }
      },
      index > 0 ? () => this.askCommand(index - 1) : undefined,
    );
  }

  private askTarget(index: number): void {
    const actor = aliveOf(this.battle, 'party')[index];
    const targets = aliveOf(this.battle, 'enemy');
    if (!actor) return;
    this.openMenu(
      targets.map((t) => ({ label: t.name })),
      (i) => {
        const target = targets[i];
        if (!target) return;
        this.commands[actor.key] = { kind: 'attack', target: target.key };
        this.askCommand(index + 1);
      },
      () => this.askCommand(index),
    );
  }

  private openMenu(items: { label: string; enabled?: boolean }[], onSelect: (i: number) => void, onCancel?: () => void): void {
    this.menu?.destroy();
    // 演出中に押された入力で、勝手に選ばれないようにする
    this.controls.flush();
    const menu: Menu = new Menu(
      this,
      140,
      134,
      92,
      items,
      (i) => {
        menu.destroy();
        if (this.menu === menu) this.menu = null;
        onSelect(i);
      },
      onCancel
        ? () => {
            menu.destroy();
            if (this.menu === menu) this.menu = null;
            onCancel();
          }
        : undefined,
    );
    this.menu = menu;
  }

  private nameOf(key: string): string {
    return this.battle.combatants.find((c) => c.key === key)?.name ?? '';
  }

  private describe(e: BattleEvent): string {
    switch (e.type) {
      case 'attack':
        return `${this.nameOf(e.actor)}の攻撃！${e.critical ? '会心の一撃！' : ''}\n${this.nameOf(e.target)}に ${e.damage} のダメージ。`;
      case 'guard':
        return `${this.nameOf(e.actor)}は身を守っている。`;
      case 'defeated':
        return e.target.startsWith('e') ? `${this.nameOf(e.target)}を倒した！` : `${this.nameOf(e.target)}は倒れた……`;
      case 'escape':
        return e.success ? 'うまく逃げ切った。' : '逃げられない！';
    }
  }

  private runTurn(): void {
    const { state, events } = resolveTurn(this.battle, this.commands, defaultRng);
    // 演出のため、HP の表示はイベントごとに更新する
    const before = this.battle;
    this.battle = state;
    this.busy = true;
    const hp = new Map(before.combatants.map((c) => [c.key, c.hp]));
    const play = (i: number) => {
      const e = events[i];
      if (!e) {
        this.busy = false;
        this.refreshParty();
        this.afterTurn();
        return;
      }
      this.setLog(this.describe(e));
      if (e.type === 'attack') {
        hp.set(e.target, Math.max(0, (hp.get(e.target) ?? 0) - e.damage));
        const sprite = this.enemySprites.get(e.target);
        if (sprite) {
          this.tweens.add({ targets: sprite, alpha: 0.2, yoyo: true, duration: 80, repeat: 1 });
        } else {
          this.cameras.main.shake(120, 0.01);
          const c = this.battle.combatants.find((x) => x.key === e.target);
          const t = this.partyTexts.get(e.target);
          if (c && t) t.setText(`${c.name}  ${hp.get(e.target)}/${c.stats.maxHp}`);
        }
      }
      if (e.type === 'defeated') {
        const sprite = this.enemySprites.get(e.target);
        if (sprite) this.tweens.add({ targets: sprite, alpha: 0, duration: 300 });
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
        this.finish(() => setState({ ...getState(), party: partyAfterBattle(getState().party, this.battle) }));
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
    const state = getState();
    const rewards = computeRewards(this.battle);
    const party = partyAfterBattle(state.party, this.battle);
    const amounts = party.map((_, i) => rewards.exp[`p${i}`] ?? 0);
    const { party: leveled, levelUps } = gainExp(party, amounts);
    setState({ ...state, party: leveled, money: state.money + rewards.money });
    const exp = Math.max(0, ...amounts);
    this.controls.flush();
    const pages = [`敵をすべて倒した！\n経験値 ${exp} と ${rewards.money} 文を手に入れた。`];
    for (const up of levelUps) {
      pages.push(`${characterName(up.id, state.gender)}は Lv${up.to} に上がった！`);
    }
    this.log.setText('');
    this.message.show(pages, () => this.finish());
  }

  private defeat(): void {
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
      setState(reviveAfterDefeat(getState(), respawn));
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
    this.menu?.update(this.controls);
  }
}

