// 店（買う・売る）と飛脚の預かり（預ける・引き出す）の画面。品を選ぶたびに 1 個ずつやり取りする。
import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { EQUIPMENT } from '../data/equipment';
import { ITEMS, itemCount, itemName } from '../data/items';
import { buy, buyPrice, deposit, sell, sellPrice, withdraw, type TradeResult } from '../systems/shop';
import { getState, setState } from '../state';
import type { Controls } from './input';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, textStyle } from './theme';
import { itemIcon, MONEY_ICON } from './icons';
import { addIcon, drawWindow, maxMenuRows, Menu, type MenuItem } from './widgets';

export type TradeMode = { kind: 'shop'; name: string; goods: string[] } | { kind: 'storage' };

const INFO_H = 42;
const INFO_Y = GAME_HEIGHT - INFO_H - 6;
/**
 * 品の一覧の左端と幅。右端（274）は右上の所持金の窓（276〜）に重ならない。左の買う・売るの窓（8〜92）には少し重ねる（文字には掛からない）。
 * 名前の左にアイコンを出すので、最長の「起き上がり小法師」（8 文字）と売る一覧の「700 文 ×99」が並んでも重ならない幅にする。
 */
const LIST_X = 80;
const LIST_W = 194;

const FAIL: Record<Exclude<TradeResult, { ok: true }>['reason'], string> = {
  money: 'お金が足りない。',
  full: 'これ以上は持てない。',
  none: 'もう持っていない。',
  unknown: '扱っていない品だ。',
};

/** 1 つの一覧の作り方（買う・売る・預ける・引き出す）。 */
interface ListSpec {
  title: string;
  ids: () => string[];
  note: (id: string) => string;
  act: (id: string) => TradeResult;
  done: (id: string) => string;
}

export class TradeMenu {
  private readonly menus: Menu[] = [];
  private readonly objs: Phaser.GameObjects.Container;
  private readonly info: Phaser.GameObjects.Text;
  private readonly money: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly controls: Controls,
    private readonly mode: TradeMode,
    private readonly onClose: () => void,
  ) {
    const bg = drawWindow(scene, 8, INFO_Y, GAME_WIDTH - 16, INFO_H);
    this.info = scene.add.text(16, INFO_Y + 4, '', { ...textStyle(10), wordWrap: { width: GAME_WIDTH - 32, useAdvancedWrap: true }, lineSpacing: 2 });
    const moneyBg = drawWindow(scene, GAME_WIDTH - 108, 8, 100, 22);
    this.money = scene.add.text(GAME_WIDTH - 16, 13, '', textStyle(10, COLORS.accent)).setOrigin(1, 0);
    // 窓の左に文銭のアイコン、右寄せで額（窓の高さ 22 の縦の中央）
    const moneyIcon = addIcon(scene, GAME_WIDTH - 102, 19, MONEY_ICON);
    this.objs = scene.add.container(0, 0, [bg, this.info, moneyBg, moneyIcon, this.money]).setScrollFactor(0).setDepth(120);
    this.refreshMoney();
    this.openTop();
    this.setInfo(mode.kind === 'shop' ? `${mode.name}: 何をお求めで？` : '飛脚: 荷物を預かりやすぜ。');
  }

  private refreshMoney(): void {
    this.money.setText(`${getState().money} 文`);
  }

  private setInfo(text: string): void {
    this.info.setText(text);
  }

  private push(items: MenuItem[], x: number, width: number, onSelect: (i: number) => void, onMove?: (i: number) => void, onCancel?: () => void): void {
    this.controls.flush();
    this.menus[this.menus.length - 1]?.setActive(false);
    // 一覧が長いときは、説明の窓に重ならない行数だけ見せてずらす
    const maxRows = maxMenuRows(8, INFO_Y - 2);
    this.menus.push(new Menu(this.scene, x, 8, width, items, onSelect, onCancel ?? (() => this.pop()), onMove, maxRows));
  }

  private pop(): void {
    this.menus.pop()?.destroy();
    this.controls.flush();
    const top = this.menus[this.menus.length - 1];
    if (!top) {
      this.close();
      return;
    }
    top.setActive(true);
    this.setInfo('');
    top.refresh();
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private openTop(): void {
    const specs = this.mode.kind === 'shop' ? [this.buySpec(this.mode.goods), this.sellSpec()] : [this.depositSpec(), this.withdrawSpec()];
    this.push(
      [...specs.map((s) => ({ label: s.title })), { label: 'やめる' }],
      8,
      84,
      (i) => {
        const spec = specs[i];
        if (spec) this.openList(spec);
        else this.close();
      },
      undefined,
      () => this.close(),
    );
  }

  /** 品の一覧を開く。選ぶたびに 1 個やり取りし、一覧を開き直す。 */
  private openList(spec: ListSpec, cursor = 0): void {
    const ids = spec.ids();
    if (ids.length === 0) {
      this.setInfo('扱える品がない。');
      return;
    }
    this.push(
      ids.map((id) => ({ label: itemName(id), note: spec.note(id), icon: itemIcon(id) })),
      LIST_X,
      LIST_W,
      (i) => {
        const id = ids[i];
        if (!id) return;
        const r = spec.act(id);
        if (!r.ok) {
          this.setInfo(FAIL[r.reason]);
          return;
        }
        setState(r.state);
        this.refreshMoney();
        // 個数や値段が変わるので開き直す（同じ品にカーソルを置く）
        this.menus.pop()?.destroy();
        this.menus[this.menus.length - 1]?.setActive(true);
        this.openList(spec, i);
        this.setInfo(spec.done(id));
      },
      (i) => {
        const id = ids[i];
        if (id) this.setInfo(this.describe(id));
      },
    );
    this.menus[this.menus.length - 1]?.select(cursor);
  }

  /** 品の説明と、持っている数（預かりの画面では預けている数も）。 */
  private describe(id: string): string {
    const state = getState();
    const counts = `持っている数: ${itemCount(state.items, id)}${this.mode.kind === 'storage' ? `  預けている数: ${itemCount(state.storage, id)}` : ''}`;
    const item = ITEMS[id];
    if (item) return `${item.description}${item.field ? '' : '（戦闘中だけ使える）'}\n${counts}`;
    const equip = EQUIPMENT[id];
    if (!equip) return '';
    const who = state.party
      .filter((m) => equip.wearers.includes(m.id))
      .map((m) => characterName(m.id, state.gender))
      .join('・');
    const bonus = Object.entries(equip.bonus)
      .map(([k, v]) => `${STAT_LABELS[k] ?? k}+${v}`)
      .join(' ');
    return `${equip.description}（${bonus}）\n付けられる仲間: ${who || 'なし'}  ${counts}`;
  }

  private buySpec(goods: string[]): ListSpec {
    return {
      title: '買う',
      ids: () => goods,
      note: (id) => `${buyPrice(id)} 文`,
      act: (id) => buy(getState(), id),
      done: (id) => `${itemName(id)}を買った。（持っている数: ${itemCount(getState().items, id)}）`,
    };
  }

  private sellSpec(): ListSpec {
    return {
      title: '売る',
      ids: () => Object.keys(getState().items).filter((id) => itemCount(getState().items, id) > 0),
      note: (id) => `${sellPrice(id)} 文 ×${itemCount(getState().items, id)}`,
      act: (id) => sell(getState(), id),
      done: (id) => `${itemName(id)}を ${sellPrice(id)} 文で売った。`,
    };
  }

  private depositSpec(): ListSpec {
    return {
      title: '預ける',
      ids: () => Object.keys(getState().items).filter((id) => itemCount(getState().items, id) > 0),
      note: (id) => `×${itemCount(getState().items, id)}`,
      act: (id) => deposit(getState(), id),
      done: (id) => `${itemName(id)}を預けた。（預かり: ${itemCount(getState().storage, id)}）`,
    };
  }

  private withdrawSpec(): ListSpec {
    return {
      title: '引き出す',
      ids: () => Object.keys(getState().storage).filter((id) => itemCount(getState().storage, id) > 0),
      note: (id) => `×${itemCount(getState().storage, id)}`,
      act: (id) => withdraw(getState(), id),
      done: (id) => `${itemName(id)}を引き出した。（持っている数: ${itemCount(getState().items, id)}）`,
    };
  }

  update(controls: Controls): void {
    this.menus[this.menus.length - 1]?.update(controls);
  }

  destroy(): void {
    for (const m of this.menus) m.destroy();
    this.menus.length = 0;
    this.objs.destroy();
  }
}

const STAT_LABELS: Record<string, string> = {
  maxHp: '体',
  maxMp: '気',
  atk: '攻',
  def: '防',
  mag: '術',
  spd: '速',
  luck: '運',
};
