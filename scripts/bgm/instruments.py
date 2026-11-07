"""BGM で使える楽器と打楽器の一覧。作曲の検査（song.py）と音の書き出し（render.py）の両方が使う。

音域は MIDI のノート番号（C4 = 60）。実際の楽器の音域をもとに、スーパーファミコンの音源で
不自然に聞こえない範囲に絞っている。
"""

# name: (GM のプログラム番号, 最低音, 最高音, 表示名, 説明)
INSTRUMENTS = {
    "shamisen": (106, 47, 88, "三味線", "撥で弾く。明るく歯切れがよく、すぐ減衰する。旋律・刻み向き"),
    "koto": (107, 50, 88, "箏", "爪で弾く。余韻が長い。分散和音・旋律向き"),
    "biwa": (105, 40, 76, "琵琶", "低めで唸りのある撥弦。重い場面の旋律・刻み"),
    "shakuhachi": (77, 60, 88, "尺八", "息の音が多い竹の笛。ゆっくりした旋律向き"),
    "shinobue": (73, 67, 96, "篠笛", "高く澄んだ横笛。祭りや明るい旋律向き"),
    "hichiriki": (68, 62, 81, "篳篥", "鼻にかかった強いリード。雅楽風の旋律"),
    "kokyu": (110, 55, 88, "胡弓", "弓で弾く。泣くような旋律向き"),
    "sho": (20, 64, 88, "笙", "柔らかく持続するリード。和音の持続向き"),
    "strings": (48, 40, 96, "弦合奏", "持続する弦。和音の下支え・対旋律"),
    "brass": (61, 46, 84, "金管", "ファンファーレ・重厚な場面"),
    "bell": (14, 60, 96, "鐘", "金属的な余韻。飾りの音・オルゴール風"),
    "bass": (33, 28, 55, "ベース", "指弾きの丸い低音。低音部専用"),
    "pickbass": (34, 28, 55, "ピックベース", "明るく硬い低音。戦闘の刻み向き"),
    "harp": (46, 36, 96, "ハープ", "明るく余韻の長い撥弦。分散和音・飾り"),
    "pizz": (45, 40, 84, "ピチカート", "弦をはじく短い音。刻み・軽い伴奏"),
    "timpani": (47, 41, 60, "ティンパニ", "音程のある太鼓。強拍・盛り上げ・ロール"),
    "choir": (52, 52, 81, "合唱", "「あー」の声。和音の持続・荘厳な場面"),
}

# 打楽器の記号: (GM ドラムのノート番号, 音の名前, 表示名)。大文字は強く、小文字は弱く叩く。
DRUM_TOKENS = {
    "O": (35, "odaiko", "大太鼓"),
    "M": (64, "okedo", "桶胴太鼓"),
    "T": (63, "shime", "締太鼓"),
    "K": (67, "kane", "鉦（チャンチキ）"),
    "H": (75, "hyoshigi", "拍子木"),
    "W": (77, "woodblock", "木魚・ウッドブロック"),
    "B": (36, "kick", "バスドラム"),
    "S": (38, "snare", "スネア"),
    "R": (37, "rim", "リムショット"),
    "X": (42, "hat", "ハイハット（閉）"),
    "Y": (46, "openhat", "ハイハット（開）"),
    "C": (49, "crash", "クラッシュシンバル"),
    "P": (51, "ride", "ライドシンバル"),
    "U": (48, "tom_hi", "タム（高）"),
    "N": (45, "tom_mid", "タム（中）"),
    "L": (41, "tom_low", "タム（低）"),
}
DRUM_STRONG_VELOCITY = 118
DRUM_WEAK_VELOCITY = 72

# GM ドラムのノート番号から音の名前へ（ほかの方法で作った MIDI も鳴らせるよう、近い音に寄せる）
GM_DRUM_SOUNDS = {
    35: "odaiko", 36: "kick", 37: "rim", 38: "snare", 39: "rim", 40: "snare",
    41: "tom_low", 43: "tom_low", 45: "tom_mid", 47: "tom_mid", 48: "tom_hi", 50: "tom_hi",
    42: "hat", 44: "hat", 46: "openhat", 49: "crash", 52: "crash", 55: "crash", 57: "crash", 51: "ride", 53: "ride", 59: "ride",
    56: "kane", 67: "kane", 68: "kane", 80: "kane", 81: "kane",
    60: "shime", 61: "shime", 62: "shime", 63: "shime", 64: "okedo", 65: "okedo", 66: "okedo",
    75: "hyoshigi", 76: "woodblock", 77: "woodblock",
}

# SNES の音源は同時に 8 音まで
MAX_VOICES = 8


def instrument_for_program(program: int) -> str:
    """GM のプログラム番号から、いちばん近い楽器を選ぶ（ほかの方法で作った MIDI 用）。"""
    for name, (gm, *_rest) in INSTRUMENTS.items():
        if gm == program:
            return name
    ranges = [
        (0, 7, "koto"), (8, 15, "bell"), (16, 23, "sho"), (24, 31, "koto"), (32, 39, "bass"),
        (40, 43, "kokyu"), (44, 51, "strings"), (52, 55, "sho"), (56, 63, "brass"), (64, 71, "hichiriki"),
        (72, 76, "shinobue"), (77, 79, "shakuhachi"), (80, 87, "hichiriki"), (88, 103, "strings"),
        (104, 105, "biwa"), (106, 106, "shamisen"), (107, 108, "koto"), (109, 111, "hichiriki"),
        (112, 119, "bell"), (120, 127, "strings"),
    ]
    for lo, hi, name in ranges:
        if lo <= program <= hi:
            return name
    return "strings"
