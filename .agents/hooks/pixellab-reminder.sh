#!/bin/sh
# PixelLab で生成・編集するツールを呼ぶ前に、pixellab-generation スキルの手順を思い出させる。
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"PixelLab で生成・編集するときは pixellab-generation スキル（.claude/skills/pixellab-generation/SKILL.md）の手順に従う。生成の前に要件をチェック項目として書き出したか確かめる。生成後は画像を実際に見て項目ごとに ○ か × を付け、1 つでも × があれば作り直す（最大 5 回）。1 回の生成で満足して使わない。"}}
JSON
