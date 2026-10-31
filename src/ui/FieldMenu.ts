// フィールドのメニュー画面（取消ボタンで開く）。道具・技・装備と、仲間の強さの表示。
import Phaser from 'phaser';
import { characterName, isGuest } from '../data/characters';
import { EQUIP_SLOTS, EQUIPMENT, SLOT_NAMES, canEquip, type EquipSlot } from '../data/equipment';
import { ITEMS, itemCount, itemName, ownedEquipment, ownedItems } from '../data/items';
import { SKILLS } from '../data/skills';
import { changeEquipment, expLine, fieldSkills, itemUsableOn, statsWithEquipment, useItemInField, useSkillInField, type FieldResult } from '../systems/fieldMenu';
import { memberLevel, memberStats } from '../systems/party';
import type { Stats } from '../systems/stats';
import { getState, setState } from '../state';
import type { Controls } from './input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, textStyle } from './theme';
import { drawWindow, maxMenuRows, Menu, menuHeight, type MenuItem } from './widgets';

const MAIN_X = 8;
const MAIN_W = 80;
const SUB_X = 96;
const SUB_W = 180;
const STATUS_X = 96;
/** 下の説明の窓。 */
const INFO_H = 30;
const INFO_Y = GAME_HEIGHT - INFO_H - 6;

const FAIL_MESSAGES: Record<Exclude<FieldResult, { ok: true }>['reason'], string> = {
  noItem: 'もう持っていない。',
  notField: 'ここでは使えない。',
  noEffect: '使っても効き目がなさそうだ。',
  noMp: '気力が足りない。',
  casterDown: '倒れていて使えない。',
  cannotEquip: '付けられない。',
  full: '外した装備を持ちきれない。',
  guest: 'この人の装備は変えられない。',
};

export class FieldMenu {
  private readonly menus: Menu[] = [];
  private status: Phaser.GameObjects.Container | null = null;
  private readonly infoText: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: Controls,
    private readonly onClose: () => void,
    private readonly onTitle: () => void,
  ) {
    const bg = drawWindow(scene, 8, INFO_Y, GAME_WIDTH - 16, INFO_H);
    this.infoText = scene.add.text(16, INFO_Y + 4, '', { ...textStyle(10), wordWrap: { width: GAME_WIDTH - 32, useAdvancedWrap: true } });
    this.info = scene.add.container(0, 0, [bg, this.infoText]).setScrollFactor(0).setDepth(120);
    this.refreshStatus();
    this.openMain();
  }

  private setInfo(text: string): void {
    this.infoText.setText(text);
  }

  private push(items: MenuItem[], x: number, y: number, width: number, onSelect: (i: number) => void, onMove?: (i: number) => void, onCancel?: () => void): Menu {
    this.controls.flush();
    // 長い一覧は、説明の窓に重ならない行数だけ見せてずらす
    const maxRows = maxMenuRows(4, INFO_Y - 2);
    const top = Math.min(y, INFO_Y - 2 - menuHeight(Math.min(items.length, maxRows)));
    // 下に重なるメニューは、クリックも含めて操作できないようにする
    this.menus[this.menus.length - 1]?.setActive(false);
    const menu = new Menu(this.scene, x, Math.max(4, top), width, items, onSelect, onCancel ?? (() => this.pop()), onMove, maxRows);
    this.menus.push(menu);
    return menu;
  }

  private pop(): void {
    this.popTo(this.menus.length - 1);
    if (this.menus.length === 0) this.close();
  }

  /** メニューが depth 枚になるまで閉じ、一番上のメニューを操作できるようにして説明を出し直す。 */
  private popTo(depth: number): void {
    while (this.menus.length > Math.max(0, depth)) this.menus.pop()?.destroy();
    this.controls.flush();
    const top = this.menus[this.menus.length - 1];
    if (!top) return;
    top.setActive(true);
    this.setInfo('');
    top.refresh();
  }

  /** 一番下（メインのメニュー）まで戻す。 */
  private popToMain(): void {
    this.popTo(1);
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private openMain(): void {
    this.push(
      [{ label: '道具' }, { label: '技' }, { label: '装備' }, { label: 'とじる' }, { label: 'タイトルへ' }],
      MAIN_X,
      8,
      MAIN_W,
      (i) => {
        if (i === 0) this.openItems();
        else if (i === 1) this.chooseMember('誰の技を使う？', (m) => this.openSkills(m));
        else if (i === 2) this.chooseMember('誰の装備を変える？', (m) => this.openEquipSlots(m));
        else if (i === 3) this.close();
        else {
          this.destroy();
          this.onTitle();
        }
      },
      undefined,
      () => this.close(),
    );
  }

  /** 仲間を選ぶ。 */
  private chooseMember(prompt: string, onChoose: (index: number) => void, isEnabled: (index: number) => boolean = () => true): void {
    const state = getState();
    this.setInfo(prompt);
    this.push(
      state.party.map((m, i) => {
        const s = memberStats(m);
        return { label: characterName(m.id, state.gender), note: `体${m.hp}/${s.maxHp} 気${m.mp}`, enabled: isEnabled(i) };
      }),
      // 下に重なる窓のカーソルと紛れないよう、開いている窓の数だけずらす
      SUB_X + 20 + this.menus.length * 12,
      20 + this.menus.length * 12,
      SUB_W,
      (i) => onChoose(i),
      // 上のメニューから戻ってきたときにも案内を出し直す
      () => this.setInfo(prompt),
    );
  }

  private openItems(): void {
    const state = getState();
    const ids = ownedItems(state.items);
    if (ids.length === 0) {
      this.setInfo('道具を持っていない。');
      return;
    }
    this.push(
      ids.map((id) => ({ label: ITEMS[id]?.name ?? id, note: `×${itemCount(state.items, id)}`, enabled: ITEMS[id]?.field ?? false })),
      SUB_X,
      8,
      SUB_W,
      (i) => {
        const id = ids[i];
        if (!id) return;
        this.chooseMember(
          `${ITEMS[id]?.name ?? ''}を誰に使う？`,
          (target) => {
            const result = useItemInField(getState(), id, target);
            // 個数が変わるので、道具の一覧から開き直す（結果の表示は、開き直したときの説明より後に出す）
            const message = this.apply(result, `${ITEMS[id]?.name ?? ''}を使った。`);
            this.popToMain();
            this.openItems();
            this.setInfo(message);
          },
          (target) => {
            const m = getState().party[target];
            return m !== undefined && itemUsableOn(id, m);
          },
        );
      },
      (i) => {
        const item = ids[i] ? ITEMS[ids[i]] : undefined;
        if (item) this.setInfo(`${item.description}${item.field ? '' : '（戦闘中だけ使える）'}`);
      },
    );
  }

  private openSkills(caster: number): void {
    const state = getState();
    const member = state.party[caster];
    if (!member) return;
    const ids = fieldSkills(member);
    if (ids.length === 0) {
      this.setInfo('ここで使える技を覚えていない。');
      return;
    }
    this.push(
      ids.map((id) => ({ label: SKILLS[id]?.name ?? id, note: String(SKILLS[id]?.mp ?? 0), enabled: member.mp >= (SKILLS[id]?.mp ?? 0) })),
      SUB_X,
      8,
      SUB_W,
      (i) => {
        const skill = ids[i] ? SKILLS[ids[i]] : undefined;
        if (!skill) return;
        const done = (r: FieldResult) => {
          const message = this.apply(r, `${skill.name}を使った。`);
          this.popToMain();
          this.openSkills(caster);
          this.setInfo(message);
        };
        if (skill.target === 'allAllies') done(useSkillInField(getState(), caster, skill.id));
        else
          this.chooseMember(
            `${skill.name}を誰に使う？`,
            (target) => done(useSkillInField(getState(), caster, skill.id, target)),
            (target) => (getState().party[target]?.hp ?? 0) > 0,
          );
      },
      (i) => {
        const skill = ids[i] ? SKILLS[ids[i]] : undefined;
        if (skill) this.setInfo(`${skill.description}（気力 ${skill.mp}）`);
      },
    );
  }

  private openEquipSlots(index: number): void {
    const state = getState();
    const member = state.party[index];
    if (!member) return;
    if (isGuest(member.id)) {
      this.setInfo(FAIL_MESSAGES.guest);
      return;
    }
    this.push(
      EQUIP_SLOTS.map((slot) => {
        const id = member.equip[slot];
        return { label: SLOT_NAMES[slot], note: id ? itemName(id) : '――' };
      }),
      SUB_X,
      8,
      SUB_W,
      (i) => {
        const slot = EQUIP_SLOTS[i];
        if (slot) this.openEquipChoices(index, slot);
      },
      () => this.setInfo(this.statsLine(memberStats(member))),
    );
  }

  private openEquipChoices(index: number, slot: EquipSlot): void {
    const state = getState();
    const member = state.party[index];
    if (!member) return;
    const choices: (string | null)[] = [
      ...ownedEquipment(state.items).filter((id) => EQUIPMENT[id]?.slot === slot && canEquip(member.id, id)),
      null,
    ];
    const before = memberStats(member);
    const depth = this.menus.length;
    this.push(
      choices.map((id) => (id === null ? { label: 'はずす', enabled: member.equip[slot] !== undefined } : { label: itemName(id), note: `×${itemCount(state.items, id)}` })),
      SUB_X + 20,
      20,
      SUB_W,
      (i) => {
        const id = choices[i];
        if (id === undefined) return;
        const r = changeEquipment(getState(), index, slot, id);
        if (!r.ok) {
          this.setInfo(FAIL_MESSAGES[r.reason]);
          return;
        }
        setState(r.state);
        this.refreshStatus();
        // 装備の枠の一覧を新しい内容で開き直す（枠の一覧の下まで閉じる）
        this.popTo(depth - 1);
        this.openEquipSlots(index);
      },
      (i) => {
        const id = choices[i];
        if (id === undefined) return;
        const after = statsWithEquipment(member, slot, id);
        this.setInfo(`${id ? (EQUIPMENT[id]?.description ?? '') : '装備をはずす'}\n${this.compareLine(before, after)}`);
      },
    );
  }

  private statsLine(s: Stats, withHp = true, sep = '  '): string {
    return [`攻 ${s.atk}`, `防 ${s.def}`, `術 ${s.mag}`, `速 ${s.spd}`, `運 ${s.luck}`, ...(withHp ? [`体 ${s.maxHp}`] : [])].join(sep);
  }

  private compareLine(before: Stats, after: Stats): string {
    const keys: [keyof Stats, string][] = [
      ['atk', '攻'],
      ['def', '防'],
      ['mag', '術'],
      ['spd', '速'],
      ['luck', '運'],
      ['maxHp', '体'],
    ];
    return keys
      .map(([k, label]) => {
        const d = after[k] - before[k];
        return `${label} ${after[k]}${d === 0 ? '' : d > 0 ? `(+${d})` : `(${d})`}`;
      })
      .join('  ');
  }

  /** 結果を反映し、表示するメッセージを返す。 */
  private apply(r: FieldResult, success: string): string {
    if (!r.ok) return FAIL_MESSAGES[r.reason];
    setState(r.state);
    const state = getState();
    const lines = r.changes
      .filter((c) => c.hp > 0 || c.mp > 0)
      .map((c) => {
        const m = state.party[c.index];
        const name = m ? characterName(m.id, state.gender) : '';
        return c.hp > 0 ? `${name}の体力が ${c.hp} 回復した。` : `${name}の気力が ${c.mp} 回復した。`;
      });
    this.refreshStatus();
    return `${success}${lines.join('')}`;
  }

  /** 右側の仲間の強さの窓を作り直す。 */
  private refreshStatus(): void {
    this.status?.destroy();
    const state = getState();
    const x = STATUS_X;
    const y = 8;
    const w = GAME_WIDTH - x - 8;
    const lineH = 12;
    const h = Math.min(INFO_Y - 12, 22 + state.party.length * lineH * 3);
    const objs: Phaser.GameObjects.GameObject[] = [drawWindow(this.scene, x, y, w, h)];
    objs.push(this.scene.add.text(x + 8, y + 6, `所持金 ${state.money} 文`, textStyle(10, COLORS.accent)));
    state.party.forEach((m, i) => {
      const s = memberStats(m);
      const top = y + 20 + i * lineH * 3;
      const name = characterName(m.id, state.gender);
      objs.push(this.scene.add.text(x + 8, top, `${name}  Lv${memberLevel(m)}  体力 ${m.hp}/${s.maxHp}  気力 ${m.mp}/${s.maxMp}`, textStyle(10)));
      // 窓の高さに余裕がないので、経験値は能力値と同じ行の右端に寄せる。数値が大きく重なるときは間を詰める。
      const statsText = this.scene.add.text(x + 8, top + lineH, this.statsLine(s, false), textStyle(9, COLORS.dim));
      const expText = this.scene.add.text(x + w - 8, top + lineH, expLine(m), textStyle(9, COLORS.dim)).setOrigin(1, 0);
      if (statsText.width + 6 > w - 16 - expText.width) {
        statsText.setText(this.statsLine(s, false, ' '));
        expText.setText(expLine(m, ' '));
      }
      objs.push(statsText, expText);
      const equips = EQUIP_SLOTS.map((slot) => {
        const id = m.equip[slot];
        return id ? itemName(id) : '――';
      }).join(' / ');
      objs.push(this.scene.add.text(x + 8, top + lineH * 2, equips, textStyle(9, COLORS.dim)));
    });
    this.status = this.scene.add.container(0, 0, objs).setScrollFactor(0).setDepth(105);
  }

  update(controls: Controls): void {
    this.menus[this.menus.length - 1]?.update(controls);
  }

  destroy(): void {
    for (const m of this.menus) m.destroy();
    this.menus.length = 0;
    this.status?.destroy();
    this.status = null;
    this.info.destroy();
  }
}
