import { describe, expect, it } from 'vitest';
import audioDoc from '../../docs/audio.md?raw';
import { SE_IDS } from '../systems/audio';
import { availableSeIds, seUrl } from './seTracks';

const name = (path: string, ext: string) => path.replace(/^.*\//, '').replace(ext, '');

describe('書き出した効果音', () => {
  it('public の音のファイルは、どれも一覧の ID で、一覧のとおりに読める', () => {
    const files = Object.keys(import.meta.glob('../../public/assets/audio/se/*.ogg', { query: '?url' })).map((p) => name(p, '.ogg'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(SE_IDS, f).toContain(f);
    expect(availableSeIds().map(seUrl).sort()).toEqual(files.map((f) => `assets/audio/se/${f}.ogg`).sort());
  });

  it('音のファイルには、それを作ったスクリプト（sfx/sounds/<ID>.py）がある', () => {
    const scripts = new Set(Object.keys(import.meta.glob('../../sfx/sounds/*.py', { query: '?raw' })).map((p) => name(p, '.py')));
    for (const id of availableSeIds()) expect(scripts.has(id), id).toBe(true);
  });

  it('一覧の ID は docs/audio.md の「効果音（SE）」の表と同じ順', () => {
    const section = audioDoc.slice(audioDoc.indexOf('## 効果音（SE）'));
    const ids = [...section.matchAll(/^\| (se_[a-z_]+) \|/gm)].map((m) => m[1]);
    expect([...SE_IDS]).toEqual(ids);
  });
});
