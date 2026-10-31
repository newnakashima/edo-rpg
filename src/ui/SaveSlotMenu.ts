import Phaser from 'phaser';
import { characterName } from '../data/characters';
import { MAPS } from '../data/maps';
import type { GameState } from '../systems/gameState';
import { memberLevel } from '../systems/party';
import { listSlots, load, save, type KeyValueStorage, type SaveData } from '../systems/save';
import type { Controls } from './input';
import { Menu } from './widgets';

export function formatPlayTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function describe(data: SaveData | null): string {
  if (!data) return '―― 空き ――';
  const s = data.state;
  const hero = s.party[0];
  const name = hero ? `${characterName(hero.id, s.gender)} Lv${memberLevel(hero)}` : '';
  return `${name}  ${MAPS[s.mapId]?.name ?? s.mapId}  ${formatPlayTime(s.playTimeSec)}`;
}

/**
 * セーブスロットを選ぶメニュー。
 * load: 空きでないスロットを選ぶと、そのデータを onDone に渡す。
 * save: 選んだスロットに state を書き込み、書き込んだデータを onDone に渡す。
 * 取消は onDone(null)。
 */
export class SaveSlotMenu {
  private readonly menu: Menu;

  constructor(
    scene: Phaser.Scene,
    storage: KeyValueStorage,
    mode: 'load' | 'save',
    onDone: (data: SaveData | null) => void,
    state?: GameState,
  ) {
    const slots = listSlots(storage);
    const items = slots.map((data, i) => ({
      label: `${i + 1}. ${describe(data)}`,
      enabled: mode === 'save' || data !== null,
    }));
    this.menu = new Menu(
      scene,
      24,
      40,
      336,
      items,
      (i) => {
        if (mode === 'save' && state) save(storage, i, state);
        onDone(load(storage, i));
      },
      () => onDone(null),
    );
  }

  update(controls: Controls): void {
    this.menu.update(controls);
  }

  destroy(): void {
    this.menu.destroy();
  }
}
