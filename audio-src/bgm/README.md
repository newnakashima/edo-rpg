# BGM の設計図と MIDI

曲ごとに、設計図（`<ID>.song`）と、そこから書き出した MIDI（`<ID>.mid`）を置きます。ID は [docs/audio.md](../../docs/audio.md) の表の ID です。
ゲームが読む `.opus` は `public/assets/bgm/` に書き出します。

- 作曲の手順と書式: [bgm-composition スキル](../../.claude/skills/bgm-composition/SKILL.md)
- `.opus` への書き出し: [bgm-render スキル](../../.claude/skills/bgm-render/SKILL.md)
