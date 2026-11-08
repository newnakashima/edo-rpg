// セーブデータのファイルの書き出し・読み込み（ブラウザの DOM を使う部分）。中身の形は systems/save.ts の exportText・importText。

/** 文字列をファイルとしてダウンロードさせる。できなければ false。 */
export function downloadText(fileName: string, text: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // すぐに消すとダウンロードが始まらないブラウザがあるので、少し待ってから消す
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

/** 読み込むファイルの大きさの上限（記録は数十 KB。取り違えた大きなファイルで固まらないようにする）。 */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** 利用者の操作の直後か（ブラウザはその間しかファイルを選ぶ画面を開かない）。調べられないブラウザでは true とみなす。 */
function hasUserActivation(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  return ua ? ua.isActive : true;
}

/**
 * ファイルを選ぶ画面を開き、選ばれたファイルの中身を onText に渡す。読めない・大きすぎるときは onError。
 * 選ぶ画面を閉じただけ（取消）のときは何も呼ばない（呼び出し側は元のメニューを開いたままにしておく）。
 *
 * 決定はキー・ボタンを押した瞬間に溜め、次のフレームの update で取り出すので、ここはイベントの外で呼ばれる。
 * キーボード・マウスはそれでも操作の直後として扱われるが、タッチは指を離すまで操作の直後にならない。
 * その場合は、次に指を離したとき（pointerup・touchend）に開く。
 */
export function pickTextFile(onText: (text: string) => void, onError: () => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  const cleanup = () => input.remove();
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    cleanup();
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      onError();
      return;
    }
    file.text().then(onText).catch(onError);
  });
  input.addEventListener('cancel', cleanup);
  document.body.appendChild(input);
  const open = () => {
    try {
      input.click();
    } catch {
      cleanup();
      onError();
    }
  };
  if (hasUserActivation()) {
    open();
    return;
  }
  const events = ['pointerup', 'touchend'] as const;
  const onRelease = () => {
    for (const type of events) window.removeEventListener(type, onRelease, true);
    open();
  };
  for (const type of events) window.addEventListener(type, onRelease, true);
}
