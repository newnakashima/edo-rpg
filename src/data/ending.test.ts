import { describe, expect, it } from 'vitest';
import * as ending from './ending';

describe('エンディングの文字', () => {
  it('「終劇」だけを出し、エンドロールの行は持たない', () => {
    expect(ending.ENDING_FIN).toBe('終劇');
    expect(Object.keys(ending)).toEqual(['ENDING_FIN']);
  });
});
