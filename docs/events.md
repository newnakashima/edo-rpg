# イベントスクリプト

シナリオの会話・分岐・戦闘などは、コードを書かずにデータ（`src/data/events.ts`）として足します。
形は `src/data/eventTypes.ts`、実行は `src/systems/eventScript.ts`（画面に依存しない）、画面への組み込みは `src/scenes/FieldScene.ts` です。

## イベントを始めるきっかけ

| きっかけ | 書く場所 |
| --- | --- |
| 人や物に話しかける | `maps.ts` の NPC に `event: 'イベントの ID'` |
| マップに入る | マップに `onEnter: { event, unless }` |
| 決まった場所に乗る | マップに `triggers: [{ x, y, event, unless }]` |

`unless` に書いたフラグが立っていれば、そのイベントは始めません（一度きりのイベントに使う）。

## 手順

| type | 内容 |
| --- | --- |
| `say` | 台詞（1 要素が 1 ページ）。`{hero}` は主人公の名前。`linesF` があれば女主人公のときはそちら |
| `setFlag` | フラグを立てる（`value: false` で下ろす） |
| `if` | フラグが立っていれば `then`、なければ `else` |
| `choice` | 選択肢。選んだ `steps` を行い、そのあと続きに戻る |
| `giveItem` / `giveMoney` | 道具・装備品、お金を渡す |
| `join` | 仲間に加える（パーティーの平均レベル、加入時の装備） |
| `heal` | 全員を全回復する |
| `battle` | 戦闘。勝つか逃げれば続きへ。`ifLose` があれば負けても全滅にせず（HP 1）、`ifLose` を行う。なければ通常の全滅でイベントは終わる |
| `warp` | 場所を移す（移った先で続きを行う） |
| `end` | ここで終える |

## 例

```ts
myEvent: {
  id: 'myEvent',
  steps: [
    { type: 'if', flag: 'done', then: [{ type: 'say', lines: ['もう用はない'] }], else: [
      { type: 'say', lines: ['{hero}、頼みがある'] },
      { type: 'choice', prompt: '引き受けるか？', options: [
        { label: 'はい', steps: [{ type: 'battle', enemies: ['yamainu'], level: 2 }, { type: 'setFlag', flag: 'done' }] },
        { label: 'いいえ', steps: [{ type: 'end' }] },
      ] },
    ] },
  ],
},
```

戦闘や `warp` でフィールドを離れる間、途中のイベントは `state.ts` が預かり、戻ってきたフィールドが続きを行います。途中のイベントはセーブしません（記録は旅籠・飛脚でだけ行うため、イベントの途中で記録されることはない）。
