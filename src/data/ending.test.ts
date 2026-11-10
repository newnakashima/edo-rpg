import { describe, expect, it } from 'vitest';
import { ENDING_FIN } from './ending';

describe('エンディングの文字', () => {
  it('黒い画面に「終劇」とだけ出す', () => {
    expect(ENDING_FIN).toBe('終劇');
  });
});
