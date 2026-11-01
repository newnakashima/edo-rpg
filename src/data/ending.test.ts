import { describe, expect, it } from 'vitest';
import { ENDING_FIN, ENDING_ROLL } from './ending';

describe('エンディングの文', () => {
  it('先頭は題名で、最後は旅が続くことを伝え、「完」で結ぶ', () => {
    expect(ENDING_ROLL[0]).toBe('江戸からくり渡世録');
    expect(ENDING_ROLL[ENDING_ROLL.length - 1]).toContain('旅は続く');
    expect(ENDING_FIN).toContain('完');
  });

  it('仲間たちの行く末に、旅をともにした仲間と、終章で助けに来た人物がそろっている', () => {
    const text = ENDING_ROLL.join('\n');
    for (const name of ['霞', '玄道', 'お鈴', '榊兵庫', '金太', '小吉', '銀次']) expect(text, name).toContain(name);
  });
});
