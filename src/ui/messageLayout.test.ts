import { describe, expect, it } from 'vitest';
import { FACE_MARGIN, messageTextLayout, TEXT_PADDING } from './messageLayout';

describe('メッセージウィンドウの文字の置き方', () => {
  it('顔がなければ、左右に同じ余白をとる（これまでと同じ）', () => {
    expect(messageTextLayout(368, undefined)).toEqual({ left: TEXT_PADDING, wrapWidth: 368 - TEXT_PADDING * 2 });
  });

  it('顔があれば、顔の右へずらし、その分だけ折り返し幅を狭める', () => {
    const { left, wrapWidth } = messageTextLayout(368, 48);
    expect(left).toBe(FACE_MARGIN + 48 + FACE_MARGIN);
    expect(left + wrapWidth + TEXT_PADDING).toBe(368);
  });
});
