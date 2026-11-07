"""音名・コード・音階の解釈。"""
import re
from dataclasses import dataclass

NOTE_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
# 表示に使う音名。調に合わせて set_spelling で # 系か b 系に切り替える（中身を入れ替えるので、import した側にも効く）
PC_NAMES = list(SHARP_NAMES)

PITCH_RE = re.compile(r"^([A-G])(##|bb|#|b)?(-?\d)$")


def parse_pitch(text: str) -> int:
    """'F#5' のような音名を MIDI のノート番号にする（C4 = 60）。"""
    m = PITCH_RE.match(text)
    if not m:
        raise ValueError(f"音名として読めない: {text}（例: C4, F#5, Bb3。音名は大文字、オクターブの数字が必要）")
    letter, acc, octave = m.groups()
    pc = NOTE_PC[letter] + {"": 0, None: 0, "#": 1, "##": 2, "b": -1, "bb": -2}[acc]
    return (int(octave) + 1) * 12 + pc


def pitch_name(midi: int) -> str:
    return f"{PC_NAMES[midi % 12]}{midi // 12 - 1}"


def parse_pc(text: str) -> int:
    m = re.match(r"^([A-G])(##|bb|#|b)?$", text)
    if not m:
        raise ValueError(f"音名として読めない: {text}")
    letter, acc = m.groups()
    return (NOTE_PC[letter] + {"": 0, None: 0, "#": 1, "##": 2, "b": -1, "bb": -2}[acc]) % 12


# ---- コード ----

# 品質の表記 → 根音からの音程（半音）。長い表記から順に照合する。
CHORD_QUALITIES = {
    "": (0, 4, 7), "maj": (0, 4, 7), "M": (0, 4, 7),
    "m": (0, 3, 7), "min": (0, 3, 7), "-": (0, 3, 7),
    "dim": (0, 3, 6), "o": (0, 3, 6),
    "aug": (0, 4, 8), "+": (0, 4, 8),
    "sus4": (0, 5, 7), "sus": (0, 5, 7), "sus2": (0, 2, 7),
    "5": (0, 7),
    "6": (0, 4, 7, 9), "m6": (0, 3, 7, 9), "69": (0, 4, 7, 9, 2), "m69": (0, 3, 7, 9, 2),
    "7": (0, 4, 7, 10), "maj7": (0, 4, 7, 11), "M7": (0, 4, 7, 11), "^7": (0, 4, 7, 11),
    "m7": (0, 3, 7, 10), "min7": (0, 3, 7, 10), "-7": (0, 3, 7, 10),
    "mM7": (0, 3, 7, 11), "mmaj7": (0, 3, 7, 11), "m(maj7)": (0, 3, 7, 11),
    "m7b5": (0, 3, 6, 10), "ø": (0, 3, 6, 10), "ø7": (0, 3, 6, 10),
    "dim7": (0, 3, 6, 9), "o7": (0, 3, 6, 9),
    "7sus4": (0, 5, 7, 10), "7sus": (0, 5, 7, 10), "7sus2": (0, 2, 7, 10),
    "aug7": (0, 4, 8, 10), "7#5": (0, 4, 8, 10), "+7": (0, 4, 8, 10), "7b5": (0, 4, 6, 10),
    "add9": (0, 4, 7, 2), "madd9": (0, 3, 7, 2), "add2": (0, 2, 4, 7), "add4": (0, 4, 5, 7),
    "9": (0, 4, 7, 10, 2), "maj9": (0, 4, 7, 11, 2), "M9": (0, 4, 7, 11, 2), "m9": (0, 3, 7, 10, 2),
    "7b9": (0, 4, 7, 10, 1), "7#9": (0, 4, 7, 10, 3), "7b13": (0, 4, 7, 10, 8), "7#11": (0, 4, 7, 10, 6),
    "11": (0, 4, 7, 10, 2, 5), "m11": (0, 3, 7, 10, 2, 5), "13": (0, 4, 7, 10, 2, 9),
    "maj7#11": (0, 4, 7, 11, 6), "m7add11": (0, 3, 7, 10, 5),
}

CHORD_RE = re.compile(r"^([A-G](?:#|b)?)(.*?)(?:/([A-G](?:#|b)?))?$")


@dataclass(frozen=True)
class Chord:
    symbol: str
    root: int  # 根音の音名（0〜11）
    intervals: tuple  # 根音からの音程（0〜11）
    bass: int  # 最低音にする音名（転回形・分数コードなら根音と違う）

    @property
    def pcs(self) -> set:
        return {(self.root + i) % 12 for i in self.intervals} | {self.bass}

    @property
    def is_minor(self) -> bool:
        return 3 in self.intervals and 4 not in self.intervals

    @property
    def is_dominant(self) -> bool:
        return 4 in self.intervals and 10 in self.intervals

    @property
    def is_sus(self) -> bool:
        return 3 not in self.intervals and 4 not in self.intervals

    def fifth(self) -> int:
        for i in (7, 6, 8):
            if i in self.intervals:
                return i
        return 7

    def core(self) -> list:
        """伴奏の和音に使う音（根音からの音程）。5 音以上なら 5 度を省いて 4 音にする。"""
        ivs = sorted(set(self.intervals))
        if len(ivs) > 4 and 7 in ivs:
            ivs.remove(7)
        if len(ivs) > 4:
            priority = [0, 4, 3, 10, 11, 6, 8, 9, 2, 5, 1]
            ivs = sorted(ivs, key=priority.index)[:4]
        return sorted(ivs)


def parse_chord(symbol: str) -> Chord:
    m = CHORD_RE.match(symbol)
    if not m:
        raise ValueError(f"コードとして読めない: {symbol}（例: C, Am, G7, Fmaj7, Dm7b5, Esus4, C/E）")
    root_s, qual, bass_s = m.groups()
    qual = qual.replace("(", "").replace(")", "") if qual not in CHORD_QUALITIES else qual
    if qual not in CHORD_QUALITIES:
        raise ValueError(f"コードの種類が読めない: {symbol}（使える種類: {' '.join(q or '(長三和音)' for q in CHORD_QUALITIES)}）")
    root = parse_pc(root_s)
    bass = parse_pc(bass_s) if bass_s else root
    return Chord(symbol, root, tuple(CHORD_QUALITIES[qual]), bass)


# ---- 調と音階 ----

# 旋法 → (音階の音程, 親の七音音階の音程, 説明)。
# 親の七音音階は、コードの度数（I, IV, V…）を読むときと、調にない音かを判断するときに使う。
MAJOR = (0, 2, 4, 5, 7, 9, 11)
MINOR = (0, 2, 3, 5, 7, 8, 10)
MODES = {
    "major": (MAJOR, MAJOR, "長調"),
    "minor": (MINOR, MINOR, "短調（和声的・旋律的短音階の 6・7 度の上げ下げも調の音とみなす）"),
    "dorian": ((0, 2, 3, 5, 7, 9, 10), (0, 2, 3, 5, 7, 9, 10), "ドリア"),
    "phrygian": ((0, 1, 3, 5, 7, 8, 10), (0, 1, 3, 5, 7, 8, 10), "フリギア"),
    "lydian": ((0, 2, 4, 6, 7, 9, 11), (0, 2, 4, 6, 7, 9, 11), "リディア"),
    "mixolydian": ((0, 2, 4, 5, 7, 9, 10), (0, 2, 4, 5, 7, 9, 10), "ミクソリディア"),
    # 日本の五音音階。主音を「核音」として読む
    "miyakobushi": ((0, 1, 5, 7, 8), (0, 1, 3, 5, 7, 8, 10), "都節音階（陰旋法）。例: E F A B C。親はフリギア"),
    "minyo": ((0, 3, 5, 7, 10), MINOR, "民謡音階。例: A C D E G。親は自然短音階"),
    "ritsu": ((0, 2, 5, 7, 9), (0, 2, 4, 5, 7, 9, 10), "律音階。例: D E G A B。親はミクソリディア"),
    "yo": ((0, 2, 5, 7, 9), (0, 2, 4, 5, 7, 9, 10), "陽音階（律音階と同じ音）"),
    "ryukyu": ((0, 4, 5, 7, 11), MAJOR, "琉球音階。例: C E F G B。親は長音階"),
}


@dataclass(frozen=True)
class Key:
    tonic: int
    mode: str

    @property
    def scale(self) -> set:
        return {(self.tonic + i) % 12 for i in MODES[self.mode][0]}

    @property
    def parent(self) -> tuple:
        return tuple((self.tonic + i) % 12 for i in MODES[self.mode][1])

    @property
    def diatonic(self) -> set:
        """調の音とみなす音。短調系では導音（長 7 度）と長 6 度も含める。"""
        pcs = set(self.parent)
        rel = {(p - self.tonic) % 12 for p in pcs}
        if rel >= {3, 8, 10} and self.mode in ("minor", "minyo"):
            pcs |= {(self.tonic + 11) % 12, (self.tonic + 9) % 12}
        if self.mode == "miyakobushi":
            pcs |= {(self.tonic + 4) % 12}  # 都節の和声では主音上の長三和音（ピカルディ風の終止）がよく出る
        return pcs

    def describe(self) -> str:
        return f"{PC_NAMES[self.tonic]} {self.mode}（{MODES[self.mode][2]}）"


def set_spelling(key: "Key") -> None:
    """調号が b 系の調なら b、そうでなければ # で音名を表示する。"""
    # 長調に直したときの主音（短調系は短 3 度上、旋法はそれぞれの位置から）
    offset = {"major": 0, "lydian": 7, "mixolydian": 5, "ritsu": 5, "yo": 5, "ryukyu": 0, "minor": 3, "minyo": 3,
              "dorian": 10, "phrygian": 8, "miyakobushi": 8}[key.mode]
    major_tonic = (key.tonic + offset) % 12
    flats = major_tonic in (5, 10, 3, 8, 1, 6)
    PC_NAMES[:] = FLAT_NAMES if flats else SHARP_NAMES


def parse_key(text: str) -> Key:
    parts = text.split()
    if len(parts) != 2:
        raise ValueError(f"key は「主音 旋法」で書く（例: D major, A minor, E miyakobushi）: {text}")
    tonic = parse_pc(parts[0])
    mode = parts[1].lower()
    aliases = {"maj": "major", "min": "minor", "aeolian": "minor", "ionian": "major", "in": "miyakobushi",
               "miyako": "miyakobushi", "min'yo": "minyo"}
    mode = aliases.get(mode, mode)
    if mode not in MODES:
        raise ValueError(f"旋法が読めない: {parts[1]}（使える旋法: {' '.join(MODES)}）")
    return Key(tonic, mode)


ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]


def roman(chord: Chord, key: Key) -> str:
    """コードを調の度数で表す（例: V7, ii, bVII, V/V の判定は analyze 側で行う）。"""
    parent = key.parent
    rel = (chord.root - key.tonic) % 12
    parent_rel = [(p - key.tonic) % 12 for p in parent]
    if rel in parent_rel:
        degree = parent_rel.index(rel)
        prefix = ""
    else:
        # 親音階の音より半音高いか低いかで b / # を付ける。短調の導音・長 6 度のように調の音とみなす音は # で表す
        raised = chord.root in key.diatonic and (rel - 1) % 12 in parent_rel
        if (rel + 1) % 12 in parent_rel and not raised:
            degree, prefix = parent_rel.index((rel + 1) % 12), "b"
        else:
            degree, prefix = parent_rel.index((rel - 1) % 12), "#"
    numeral = ROMAN[degree]
    if chord.is_minor or 6 in chord.intervals and 3 in chord.intervals:
        numeral = numeral.lower()
    qual = chord.symbol[len(re.match(r"^[A-G](?:#|b)?", chord.symbol).group(0)):]
    qual = qual.split("/")[0]
    if chord.is_minor and qual.startswith("m") and not qual.startswith("maj"):
        qual = qual[1:]
    inv = ""
    if chord.bass != chord.root:
        inv = "/" + PC_NAMES[chord.bass]
    return f"{prefix}{numeral}{qual}{inv}"


def is_diatonic_chord(chord: Chord, key: Key) -> bool:
    return chord.pcs <= key.diatonic


@dataclass
class NoteClass:
    kind: str  # "CT"（コードトーン）, "TN"（使えるテンション）, "AV"（アボイド・非和声音）, "CHR"（調にない非和声音）
    label: str  # 例: "3度", "9th", "4th(アボイド)"


INTERVAL_NAMES = {0: "根音", 1: "b9", 2: "9", 3: "#9/m3", 4: "3度", 5: "11/4度", 6: "#11/b5", 7: "5度",
                  8: "b13/#5", 9: "13/6度", 10: "b7", 11: "M7"}


def classify(pc: int, chord: Chord, key: Key) -> NoteClass:
    """コードに対する音の役割を判定する。"""
    x = (pc - chord.root) % 12
    if pc in chord.pcs:
        return NoteClass("CT", INTERVAL_NAMES[x])
    in_key = pc in key.diatonic
    ivs = set(chord.intervals)
    avoid = (x - 1) % 12 in ivs  # コードトーンの半音上
    if chord.is_dominant and x in (1, 3, 8) and in_key:
        avoid = False  # 属七の b9・#9・b13 は調の音なら使える
    if chord.is_sus and x in (3, 4):
        avoid = True  # sus コードに 3 度を重ねるとぶつかる
    if chord.is_dominant and x == 11:
        avoid = True
    has_seventh = 10 in ivs or 11 in ivs
    if x == 6 and not has_seventh:
        avoid = True  # 三和音に #11（根音と三全音）を重ねると濁る
    if x == 11 and chord.is_minor:
        avoid = True  # 短三和音に長 7 度（mM7 の響き）は旋律では浮く
    if not in_key:
        return NoteClass("CHR", f"{INTERVAL_NAMES[x]}(調にない音)")
    if avoid:
        return NoteClass("AV", f"{INTERVAL_NAMES[x]}(アボイド)")
    return NoteClass("TN", INTERVAL_NAMES[x])
