// フィールドのメニュー画面（取消ボタンで開く）。道具・技・装備・ステータス・並び替えと、所持金・次にすべきこと・仲間の顔（体力・気力）の表示。
// 仲間の能力値・装備はステータス画面（StatusScreen）で見る。
import Phaser from 'phaser';
import { characterName, isGuest } from '../data/characters';
import { faceKey } from '../data/faces';
import { nextObjective } from '../data/objectives';
import { portraitFor } from '../data/portraits';
import { EQUIP_SLOTS, EQUIPMENT, SLOT_NAMES, canEquip, type EquipSlot } from '../data/equipment';
import { ITEMS, itemCount, itemName, ownedEquipment, ownedItems } from '../data/items';
import { SKILLS } from '../data/skills';
import { changeEquipment, escapeInField, skillDescription, fieldSkills, isSmoke, itemUsableOn, smokeBlocked, statsWithEquipment, swapMembers, useItemInField, useSkillInField, wardInField, type EscapeResult, type FieldResult, type WardResult } from '../systems/fieldMenu';
import { memberStats } from '../systems/party';
import type { Stats } from '../systems/stats';
import { getState, setState } from '../state';
import type { Controls } from './input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, textStyle } from './theme';
import { itemIcon, MONEY_ICON, SKILL_ICON, slotIcon } from './icons';
import { StatusScreen } from './StatusScreen';
import { addIcon, drawWindow, maxMenuRows, Menu, MENU_ICON_SPACE, menuHeight, type MenuItem } from './widgets';

const MAIN_X = 8;
const MAIN_W = 80;
const SUB_X = 96;
const SUB_W = 180;
/** 右上の所持金と次にすべきことの窓。 */
const MONEY_X = 96;
const MONEY_Y = 8;
const MONEY_H = 46;
/** 下の仲間の顔の窓（顔の上に体力・気力）。 */
const PARTY_H = 82;
const PARTY_Y = GAME_HEIGHT - PARTY_H - 6;
/** 仲間 1 人の列の幅（5 人まで並ぶ）。 */
const PARTY_COL_W = 72;
/** 下の説明の窓（説明があるときだけ、仲間の顔の窓の下の方に重ねて出す）。 */
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
  noFire: '火の気がない。茶屋や旅籠、居酒屋、焚き火のそばで一服しよう。',
  noKiseru: 'キセルを付けていないと吸えない。',
};

/** 道しるべの札・抜け道を使えなかったときの説明。 */
const ESCAPE_FAIL_MESSAGES: Record<Exclude<EscapeResult, { ok: true }>['reason'], string> = {
  noItem: FAIL_MESSAGES.noItem,
  notField: FAIL_MESSAGES.notField,
  noMp: FAIL_MESSAGES.noMp,
  casterDown: FAIL_MESSAGES.casterDown,
  noEscape: FAIL_MESSAGES.notField,
};

export class FieldMenu {
  private readonly menus: Menu[] = [];
  private status: Phaser.GameObjects.Container | null = null;
  /** 開いているステータス画面（開いている間はメニューの操作をこちらに渡す）。 */
  private statusScreen: StatusScreen | null = null;
  private readonly infoText: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: Controls,
    private readonly onClose: () => void,
    private readonly onTitle: () => void,
    /** 道しるべの札・抜け道で入口の外へ戻る（メニューを閉じたあとに呼ぶ。message はフィールドに出す文）。 */
    private readonly onEscape: (to: { mapId: string; x: number; y: number }, message: string) => void,
  ) {
    const bg = drawWindow(scene, 8, INFO_Y, GAME_WIDTH - 16, INFO_H);
    this.infoText = scene.add.text(16, INFO_Y + 4, '', { ...textStyle(10), wordWrap: { width: GAME_WIDTH - 32, useAdvancedWrap: true } });
    this.info = scene.add.container(0, 0, [bg, this.infoText]).setScrollFactor(0).setDepth(120).setVisible(false);
    this.refreshStatus();
    this.openMain();
  }

  private setInfo(text: string): void {
    this.infoText.setText(text);
    this.info.setVisible(text !== '');
  }

  private push(items: MenuItem[], x: number, y: number, width: number, onSelect: (i: number) => void, onMove?: (i: number) => void, onCancel?: () => void): Menu {
    this.controls.flush();
    // 長い一覧は、下の仲間の顔の窓（体力・気力）に重ならない行数だけ見せてずらす
    const maxRows = maxMenuRows(4, PARTY_Y - 2);
    const top = Math.min(y, PARTY_Y - 2 - menuHeight(Math.min(items.length, maxRows)));
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
      [{ label: '道具' }, { label: '技' }, { label: '装備' }, { label: 'ステータス' }, { label: '並び替え' }, { label: 'とじる' }, { label: 'タイトルへ' }],
      MAIN_X,
      8,
      MAIN_W,
      (i) => {
        if (i === 0) this.openItems();
        else if (i === 1) this.chooseMember('誰の技を使う？', (m) => this.openSkills(m));
        else if (i === 2) this.chooseMember('誰の装備を変える？', (m) => this.openEquipSlots(m));
        else if (i === 3) this.openStatusScreen();
        else if (i === 4) this.openReorder();
        else if (i === 5) this.close();
        else {
          this.destroy();
          this.onTitle();
        }
      },
      undefined,
      () => this.close(),
    );
  }

  /** ステータス画面を開く（先頭の仲間から。左右で替える）。 */
  private openStatusScreen(): void {
    this.controls.flush();
    this.menus[this.menus.length - 1]?.setActive(false);
    // 下の窓との隙間から、裏の所持金・仲間の顔の窓が透けて見えないように隠す
    this.status?.setVisible(false);
    this.statusScreen = new StatusScreen(this.scene, INFO_Y - 12, 0, (text) => this.setInfo(text), () => {
      this.statusScreen?.destroy();
      this.statusScreen = null;
      this.status?.setVisible(true);
      this.popTo(this.menus.length);
    });
  }

  /**
   * 並び替え: 動かす仲間と、入れ替える相手を選んで入れ替える。入れ替えたら、続けて並び替えられるように
   * 最初の一覧から開き直し、動かした先にカーソルを置く。
   */
  private openReorder(cursor = 0): void {
    const state = getState();
    if (state.party.length < 2) {
      this.setInfo('並び替える仲間がいない。');
      return;
    }
    this.chooseMember('誰を動かす？', (a) => {
      const nameAt = (i: number) => characterName(getState().party[i]?.id ?? 'hero', getState().gender);
      const name = nameAt(a);
      const second = this.chooseMember(`${name}と入れ替える相手は？`, (b) => {
        const message = `${name}と${nameAt(b)}を入れ替えた。`;
        setState(swapMembers(getState(), a, b));
        this.refreshStatus();
        this.popToMain();
        this.openReorder(b);
        // 結果に続けて、最初の一覧の案内も出す
        this.setInfo(`${message}誰を動かす？`);
      }, (b) => b !== a);
      // 選んだ仲間（選べない）の次の行から始める
      second.select((a + 1) % getState().party.length);
    }).select(cursor);
  }

  /** 仲間を選ぶ。 */
  private chooseMember(prompt: string, onChoose: (index: number) => void, isEnabled: (index: number) => boolean = () => true): Menu {
    const state = getState();
    this.setInfo(prompt);
    return this.push(
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
      ids.map((id) => ({ label: ITEMS[id]?.name ?? id, note: `×${itemCount(state.items, id)}`, enabled: ITEMS[id]?.field ?? false, icon: itemIcon(id) })),
      SUB_X,
      8,
      SUB_W,
      (i) => {
        const id = ids[i];
        if (!id) return;
        if (ITEMS[id]?.effect.kind === 'escape') {
          this.escape(escapeInField(getState(), { item: id }), `${ITEMS[id]?.name ?? ''}を使った。`);
          return;
        }
        if (ITEMS[id]?.effect.kind === 'ward') {
          const message = this.ward(wardInField(getState(), { item: id }), `${ITEMS[id]?.name ?? ''}を焚いた。`);
          // 個数が変わるので、道具の一覧から開き直す
          this.popToMain();
          this.openItems();
          this.setInfo(message);
          return;
        }
        const smoke = isSmoke(id);
        // 煙草の葉: 火のそばでないか、キセルを付けた人がいなければ、誰に使うかを聞く前に断る
        const blocked = smoke ? smokeBlocked(getState(), getState().party) : null;
        if (blocked) return this.setInfo(FAIL_MESSAGES[blocked]);
        this.chooseMember(
          `${ITEMS[id]?.name ?? ''}を誰に使う？`,
          (target) => {
            const result = useItemInField(getState(), id, target);
            // 個数が変わるので、道具の一覧から開き直す（結果の表示は、開き直したときの説明より後に出す）
            const message = this.apply(result, smoke ? 'キセルで一服した。' : `${ITEMS[id]?.name ?? ''}を使った。`);
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
      ids.map((id) => ({ label: SKILLS[id]?.name ?? id, note: String(SKILLS[id]?.mp ?? 0), enabled: member.mp >= (SKILLS[id]?.mp ?? 0), icon: SKILL_ICON })),
      SUB_X,
      8,
      SUB_W,
      (i) => {
        const skill = ids[i] ? SKILLS[ids[i]] : undefined;
        if (!skill) return;
        if (skill.effect.kind === 'escape') {
          const name = characterName(member.id, getState().gender);
          this.escape(escapeInField(getState(), { caster, skill: skill.id }), `${name}は${skill.name}を使った。`);
          return;
        }
        if (skill.effect.kind === 'ward') {
          const name = characterName(member.id, getState().gender);
          const message = this.ward(wardInField(getState(), { caster, skill: skill.id }), `${name}は${skill.name}を唱えた。`);
          this.popToMain();
          this.openSkills(caster);
          this.setInfo(message);
          return;
        }
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
        if (skill) this.setInfo(skillDescription(skill));
      },
    );
  }

  /** 魔除けの香・結界の真言の結果。使えたら状態を進め、説明の窓に出す文を返す。 */
  private ward(result: WardResult, used: string): string {
    if (!result.ok) return FAIL_MESSAGES[result.reason];
    setState(result.state);
    return `${used}${result.steps} 歩のあいだ、敵が寄ってこない。`;
  }

  /** 道しるべの札・抜け道の結果。使えたらメニューを閉じて入口の外へ移り、使えなければ説明の窓に理由を出す。 */
  private escape(result: EscapeResult, message: string): void {
    if (!result.ok) {
      this.setInfo(ESCAPE_FAIL_MESSAGES[result.reason]);
      return;
    }
    setState(result.state);
    this.close();
    this.onEscape(result.to, message);
  }

  private openEquipSlots(index: number): void {
    const state = getState();
    const member = state.party[index];
    if (!member) return;
    // ゲストは装備の枠を開かずに断る。画面にはテストがないが、開いても changeEquipment が 'guest' で断る（fieldMenu.test.ts で確かめる）
    if (isGuest(member.id)) {
      this.setInfo(FAIL_MESSAGES.guest);
      return;
    }
    this.push(
      EQUIP_SLOTS.map((slot) => {
        const id = member.equip[slot];
        return { label: SLOT_NAMES[slot], note: id ? itemName(id) : '――', icon: slotIcon(slot, member.id) };
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
      choices.map((id) => (id === null ? { label: 'はずす', enabled: member.equip[slot] !== undefined } : { label: itemName(id), note: `×${itemCount(state.items, id)}`, icon: itemIcon(id) })),
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

  private statsLine(s: Stats): string {
    return [`攻 ${s.atk}`, `防 ${s.def}`, `術 ${s.mag}`, `速 ${s.spd}`, `運 ${s.luck}`, `体 ${s.maxHp}`].join('  ');
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

  /** 所持金と次にすべきことの窓、仲間の顔の窓を作り直す。 */
  private refreshStatus(): void {
    this.status?.destroy();
    const state = getState();
    const objs: Phaser.GameObjects.GameObject[] = [];
    // 右上: 所持金と、本筋で次にすべきこと
    const mw = GAME_WIDTH - MONEY_X - 8;
    objs.push(drawWindow(this.scene, MONEY_X, MONEY_Y, mw, MONEY_H));
    objs.push(addIcon(this.scene, MONEY_X + 8, MONEY_Y + 12, MONEY_ICON));
    objs.push(this.scene.add.text(MONEY_X + 8 + MENU_ICON_SPACE, MONEY_Y + 6, `所持金 ${state.money} 文`, textStyle(10, COLORS.accent)));
    objs.push(
      this.scene.add.text(MONEY_X + 8, MONEY_Y + 20, `次：${nextObjective(state.flags)}`, {
        ...textStyle(9),
        wordWrap: { width: mw - 16, useAdvancedWrap: true },
      }),
    );
    // 下: 仲間の顔。顔の上に体力・気力
    const pw = GAME_WIDTH - 16;
    objs.push(drawWindow(this.scene, 8, PARTY_Y, pw, PARTY_H));
    const left = 8 + Math.floor((pw - PARTY_COL_W * state.party.length) / 2);
    state.party.forEach((m, i) => {
      const s = memberStats(m);
      const cx = left + i * PARTY_COL_W + PARTY_COL_W / 2;
      const down = m.hp <= 0;
      const hpColor = down ? COLORS.danger : m.hp <= s.maxHp / 4 ? COLORS.accent : COLORS.text;
      objs.push(this.scene.add.text(cx, PARTY_Y + 6, `体 ${m.hp}/${s.maxHp}`, textStyle(9, hpColor)).setOrigin(0.5, 0));
      objs.push(this.scene.add.text(cx, PARTY_Y + 17, `気 ${m.mp}/${s.maxMp}`, textStyle(9)).setOrigin(0.5, 0));
      const face = this.scene.add.image(cx, PARTY_Y + 29, faceKey(portraitFor(m.id, state.gender))).setOrigin(0.5, 0);
      // 倒れた仲間は顔を暗くする
      if (down) face.setTint(0x555555);
      objs.push(face);
    });
    this.status = this.scene.add.container(0, 0, objs).setScrollFactor(0).setDepth(105);
  }

  update(controls: Controls): void {
    if (this.statusScreen) {
      this.statusScreen.update(controls);
      return;
    }
    this.menus[this.menus.length - 1]?.update(controls);
  }

  destroy(): void {
    this.statusScreen?.destroy();
    this.statusScreen = null;
    for (const m of this.menus) m.destroy();
    this.menus.length = 0;
    this.status?.destroy();
    this.status = null;
    this.info.destroy();
  }
}
