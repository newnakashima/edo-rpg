import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { MAPS } from '../data/maps';
import type { GameState } from '../systems/gameState';
import { memberLevel } from '../systems/party';
import { listSlots, load, save, type KeyValueStorage, type SaveData, type SlotInfo } from '../systems/save';
import type { Controls } from './input';
import { Menu } from './widgets';

export function formatPlayTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function describe(info: SlotInfo): string {
  if (info.status === 'empty') return '―― 空き ――';
  if (info.status === 'broken') return '（読めないデータ）';
  const s = info.data.state;
  const hero = s.party[0];
  const name = hero ? `${characterName(hero.id, s.gender)} Lv${memberLevel(hero)}` : '';
  return `${name}  ${MAPS[s.mapId]?.name ?? s.mapId}  ${formatPlayTime(s.playTimeSec)}`;
}

export type SaveSlotResult =
  | { kind: 'cancel' }
  | { kind: 'loaded'; data: SaveData }
  | { kind: 'saved' }
  | { kind: 'failed' };

/**
 * セーブスロットを選ぶメニュー。
 * load: 読めるデータのスロットだけ選べる。選んだデータを onDone に渡す。
 * save: 選んだスロットに state を書き込む。読めないデータのスロットにも上書きできる（表示で区別する）。
 */
export class SaveSlotMenu {
  private readonly menu: Menu;

  constructor(
    scene: Phaser.Scene,
    storage: KeyValueStorage,
    mode: 'load' | 'save',
    onDone: (result: SaveSlotResult) => void,
    state?: GameState,
  ) {
    const slots = listSlots(storage);
    const items = slots.map((info, i) => ({
      label: `${i + 1}. ${describe(info)}`,
      enabled: mode === 'save' || info.status === 'ok',
    }));
    this.menu = new Menu(
      scene,
      24,
      40,
      336,
      items,
      (i) => {
        if (mode === 'save') {
          onDone(state && save(storage, i, state) ? { kind: 'saved' } : { kind: 'failed' });
          return;
        }
        const data = load(storage, i);
        onDone(data ? { kind: 'loaded', data } : { kind: 'failed' });
      },
      () => onDone({ kind: 'cancel' }),
    );
  }

  update(controls: Controls): void {
    this.menu.update(controls);
  }

  destroy(): void {
    this.menu.destroy();
  }
}
