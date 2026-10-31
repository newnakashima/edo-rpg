import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { ENEMIES } from './enemies';
import type { EventStep } from './eventTypes';
import { EVENTS } from './events';
import { isKnownItem } from './items';
import { MAPS, tileAt } from './maps';

/** イベントの手順を、分岐の中まで含めてすべてたどる。 */
function* walk(steps: readonly EventStep[]): Generator<EventStep> {
  for (const step of steps) {
    yield step;
    if (step.type === 'if') {
      yield* walk(step.then);
      if (step.else) yield* walk(step.else);
    } else if (step.type === 'choice') {
      for (const o of step.options) yield* walk(o.steps);
    } else if (step.type === 'battle' && step.ifLose) {
      yield* walk(step.ifLose);
    } else if (step.type === 'giveItem' && step.ifFull) {
      yield* walk(step.ifFull);
    }
  }
}

describe('イベントのデータ', () => {
  for (const [key, def] of Object.entries(EVENTS)) {
    it(`${key}: 参照する道具・敵・仲間・移動先が正しい`, () => {
      expect(def.id).toBe(key);
      for (const step of walk(def.steps)) {
        switch (step.type) {
          case 'giveItem':
            expect(isKnownItem(step.item), step.item).toBe(true);
            expect(step.count ?? 1).toBeGreaterThan(0);
            break;
          case 'battle':
            expect(step.enemies.length).toBeGreaterThan(0);
            for (const id of step.enemies) expect(ENEMIES[id], id).toBeDefined();
            break;
          case 'join':
            expect(CHARACTERS[step.member], step.member).toBeDefined();
            break;
          case 'warp': {
            const map = MAPS[step.mapId];
            expect(map, step.mapId).toBeDefined();
            if (map) expect(tileAt(map, step.x, step.y)?.blocked).toBe(false);
            break;
          }
          case 'choice':
            expect(step.options.length).toBeGreaterThan(0);
            break;
          case 'say':
            expect(step.lines.length).toBeGreaterThan(0);
            break;
          default:
            break;
        }
      }
    });
  }
});
