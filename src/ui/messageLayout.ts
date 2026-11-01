// メッセージウィンドウの文字の置き方（Phaser を使わない計算だけ。テストのため widgets.ts から分けた）。

/** 顔の左右の余白（ウィンドウの左端から顔まで、顔から文字まで）。窓の縁が 4 なので、縁の内側に 2 空ける。 */
export const FACE_MARGIN = 6;
/** 顔のないときの、ウィンドウの縁から文字までの余白（左右とも）。 */
export const TEXT_PADDING = 8;

/**
 * 文字の左端（ウィンドウの左端から）と折り返し幅。
 * 顔があれば顔の右へずらし、その分だけ折り返し幅を狭める。右の余白は顔の有無によらず同じ。
 */
export function messageTextLayout(windowWidth: number, faceWidth: number | undefined): { left: number; wrapWidth: number } {
  const left = faceWidth === undefined ? TEXT_PADDING : FACE_MARGIN + faceWidth + FACE_MARGIN;
  return { left, wrapWidth: windowWidth - left - TEXT_PADDING };
}
