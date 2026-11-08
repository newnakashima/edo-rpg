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

/**
 * ファイルを選ぶ画面を開き、選ばれたファイルの中身を onText に渡す。読めなければ onError。
 * 選ぶ画面を閉じただけ（取消）のときは何も呼ばない（呼び出し側は元のメニューを開いたままにしておく）。
 * ブラウザは利用者の操作の直後でないと選ぶ画面を開かないので、決定ボタン・タップを受けたその場で呼ぶ。
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
    file.text().then(onText, onError);
  });
  input.addEventListener('cancel', cleanup);
  document.body.appendChild(input);
  try {
    input.click();
  } catch {
    cleanup();
    onError();
  }
}
