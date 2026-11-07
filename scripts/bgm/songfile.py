"""曲の設計図（.song ファイル）を読み、曲全体の音の並びに展開する。書式は
.claude/skills/bgm-composition/format.md を参照。
"""
import re
from dataclasses import dataclass, field
from fractions import Fraction
from pathlib import Path

from instruments import DRUM_STRONG_VELOCITY, DRUM_TOKENS, DRUM_WEAK_VELOCITY, INSTRUMENTS
from theory import Chord, Key, parse_chord, parse_key, parse_pitch, set_spelling


class SongError(Exception):
    pass


PATTERNS = {
    "arp:up8": "8 分音符で下から上へ分散和音",
    "arp:up16": "16 分音符で下から上へ分散和音",
    "arp:updown8": "8 分音符で上がって下がる分散和音",
    "arp:updown16": "16 分音符で上がって下がる分散和音",
    "arp:alberti8": "8 分音符で 低・高・中・高 の分散和音",
    "arp:alberti16": "16 分音符で 低・高・中・高 の分散和音",
    "arp:up4": "4 分音符で下から上へ分散和音",
    "block:hold": "コードの間ずっと和音をのばす",
    "block:half": "2 拍ごとに和音を鳴らす",
    "block:beat": "1 拍ごとに和音を鳴らす",
    "block:off8": "裏拍（8 分の裏）で和音を刻む",
    "bass:root": "コードの間、最低音をのばす",
    "bass:root4": "1 拍ごとに最低音",
    "bass:root8": "8 分音符で最低音を刻む",
    "bass:root-fifth": "拍ごとに最低音と 5 度を交互に",
    "bass:octave8": "8 分音符で最低音とその 1 オクターブ上を交互に",
    "bass:drive8": "8 分音符で最低音を刻み、1 オクターブ上と 5 度を混ぜて走る（戦闘向き）",
    "bass:gallop": "拍ごとに 8 分 + 16 分 + 16 分（タッ・タタ）で刻む（戦闘・行進向き）",
    "block:stab": "3 + 3 + 2 の 8 分（1 拍目・2 拍目の裏・4 拍目）で短く和音を打つ（戦闘向き）",
    "block:push8": "8 分音符で短く和音を刻み続ける（勢いを出す）",
}

NOTE_RE = re.compile(r"^(?P<p>[A-G](?:##|bb|#|b)?-?\d|r)(?::(?P<d>[0-9]+(?:[./][0-9]+)?))?(?P<flags>[~!>]*)$")


@dataclass
class PartDef:
    name: str
    instrument: str
    kind: str  # "notes" | "drums" | パターン名
    vol: int = 100
    pan: int = 0
    oct: int | None = None
    vel: int = 96
    gate: float | None = None
    role: str = ""  # "melody" | "counter" | "bass" | "harmony" | "drums"
    voices: int = 0  # 和音のパターンで使う音の数の上限（上の音から残す。0 は制限なし）
    follow: str = ""  # なぞるパート（重ねて厚くする）
    shift: str = ""  # なぞるときのずらし方（-12 などの半音の数、-3d / +6d などの調の中の度数）


@dataclass
class Tok:
    pitch: int | None  # None は休符
    dur: Fraction
    tie: bool = False
    intended: bool = False  # ! 付き: 意図した不協和音
    accent: bool = False
    text: str = ""


@dataclass
class Section:
    name: str
    chords: list = field(default_factory=list)  # 小節ごとの [(Chord | None, 長さ)]
    parts: dict = field(default_factory=dict)  # パート名 → 小節ごとの [Tok] / "off" / ("pattern", 名前) / ("drums", 小節ごとの [[(音名, 強さ)]])
    line: int = 0


@dataclass
class Event:
    part: str
    start: Fraction  # 曲の頭からの四分音符の数
    dur: Fraction
    pitch: int  # 打楽器では GM ドラムのノート番号
    vel: int
    intended: bool = False
    generated: bool = False  # パターンから作った音
    gate: float = 1.0  # 音を実際に鳴らす長さの割合（MIDI に書くときだけ使う）
    where: str = ""  # 「A 3小節 2拍目」


@dataclass
class ChordSpan:
    start: Fraction
    end: Fraction
    chord: Chord | None
    where: str
    section: str


@dataclass
class Song:
    path: Path
    title: str = ""
    id: str = ""
    tempo: float = 120.0
    meter: tuple = (4, 4)
    key: Key | None = None
    intro: list = field(default_factory=list)
    form: list = field(default_factory=list)
    loop: bool = True
    echo: tuple = (112, 0.35, 0.22)
    parts: dict = field(default_factory=dict)
    sections: dict = field(default_factory=dict)
    # 展開した結果
    events: list = field(default_factory=list)
    chords: list = field(default_factory=list)
    bars: list = field(default_factory=list)  # [(開始, 区間名, 区間内の小節番号)]
    loop_start: Fraction = Fraction(0)
    length: Fraction = Fraction(0)
    section_spans: list = field(default_factory=list)  # [(区間名, 開始, 終わり)]

    @property
    def bar_len(self) -> Fraction:
        return Fraction(self.meter[0] * 4, self.meter[1])

    @property
    def compound(self) -> bool:
        return self.meter[1] == 8 and self.meter[0] % 3 == 0 and self.meter[0] > 3

    @property
    def beat_len(self) -> Fraction:
        return Fraction(3, 2) if self.compound else (Fraction(1) if self.meter[1] == 4 else Fraction(1, 2))

    @property
    def strong_beats(self) -> list:
        n, d = self.meter
        if self.compound:
            return [Fraction(3, 2) * i for i in range(n // 3) if i % 2 == 0] or [Fraction(0)]
        if (n, d) == (4, 4):
            return [Fraction(0), Fraction(2)]
        return [Fraction(0)]

    def where(self, t: Fraction) -> str:
        bar = None
        for b in self.bars:
            if b[0] <= t:
                bar = b
            else:
                break
        if bar is None:
            return "?"
        beat = (t - bar[0]) / (self.beat_len if self.compound else Fraction(4, self.meter[1])) + 1
        beat_s = str(int(beat)) if beat.denominator == 1 else f"{float(beat):.3g}"
        return f"{bar[1]} {bar[2]}小節 {beat_s}拍目"


def parse_dur(text: str, line: int) -> Fraction:
    try:
        return Fraction(text)
    except (ValueError, ZeroDivisionError):
        raise SongError(f"{line} 行目: 長さが読めない: {text}（四分音符 = 1。例: 1, 2, 1/2, 3/2, 0.5, 1/3）")


def parse_note_bar(text: str, line: int, prev_dur: Fraction) -> tuple:
    toks = []
    for raw in text.split():
        m = NOTE_RE.match(raw)
        if not m:
            raise SongError(f"{line} 行目: 音として読めない: {raw}（例: C5:1, F#4:1/2~, r:2, Bb4!）")
        dur = parse_dur(m.group("d"), line) if m.group("d") else prev_dur
        if dur <= 0:
            raise SongError(f"{line} 行目: 長さは 0 より大きくする: {raw}")
        prev_dur = dur
        p = m.group("p")
        flags = m.group("flags")
        try:
            pitch = None if p == "r" else parse_pitch(p)
        except ValueError as e:
            raise SongError(f"{line} 行目: {e}")
        toks.append(Tok(pitch, dur, "~" in flags, "!" in flags, ">" in flags, raw))
    return toks, prev_dur


def parse_chord_bar(text: str, line: int, bar_len: Fraction) -> list:
    items = []
    for raw in text.split():
        sym, _, d = raw.partition(":")
        dur = parse_dur(d, line) if d else None
        if sym in ("N.C.", "NC", "-"):
            chord = None
        else:
            try:
                chord = parse_chord(sym)
            except ValueError as e:
                raise SongError(f"{line} 行目: {e}")
        items.append([chord, dur])
    if not items:
        raise SongError(f"{line} 行目: コードのない小節がある（無音なら N.C. と書く）")
    fixed = sum((d for _, d in items if d is not None), Fraction(0))
    free = [it for it in items if it[1] is None]
    if free:
        rest = bar_len - fixed
        if rest <= 0:
            raise SongError(f"{line} 行目: コードの長さの合計が小節の長さ（{bar_len}）を超える: {text.strip()}")
        for it in free:
            it[1] = rest / len(free)
    total = sum(d for _, d in items)
    if total != bar_len:
        raise SongError(f"{line} 行目: コードの長さの合計 {total} が小節の長さ {bar_len} と合わない: {text.strip()}")
    return [tuple(it) for it in items]


def parse_drum_bar(text: str, line: int) -> list:
    steps = []
    for raw in text.split():
        if raw == ".":
            steps.append([])
            continue
        hits = []
        for c in raw.split("+"):
            if len(c) != 1 or c.upper() not in DRUM_TOKENS:
                raise SongError(f"{line} 行目: 打楽器の記号が読めない: {raw}（使える記号: {' '.join(DRUM_TOKENS)}、休みは . 、同時は O+K）")
            hits.append((c.upper(), DRUM_STRONG_VELOCITY if c.isupper() else DRUM_WEAK_VELOCITY))
        steps.append(hits)
    if not steps:
        raise SongError(f"{line} 行目: 空の小節がある（休みは . を並べる）")
    return steps


def split_bars(text: str, line: int) -> list:
    text = text.strip()
    if not text.startswith("|") or not text.endswith("|"):
        raise SongError(f"{line} 行目: 小節は | で始めて | で終える: {text}")
    return [b for b in text[1:-1].split("|")]


def parse_song(path: Path) -> Song:
    song = Song(path=path)
    lines = path.read_text(encoding="utf-8").splitlines()
    mode = "header"
    current = None
    pending_lines = {}  # (区間名, パート名) → [(行番号, 本文)]
    for no, raw in enumerate(lines, 1):
        # 音名の # を消さないよう、コメントは行頭の # か「空白 + # + 空白」から後とする
        text = re.split(r"\s#\s|\s#$", raw, maxsplit=1)[0].rstrip() if not raw.lstrip().startswith("#") else ""
        if not text.strip():
            continue
        m = re.match(r"^\[(.+)\]$", text.strip())
        if m:
            head = m.group(1).strip()
            if head == "parts":
                mode = "parts"
            elif head.startswith("section "):
                name = head[len("section "):].strip()
                if name in song.sections:
                    raise SongError(f"{no} 行目: 区間 {name} が 2 回定義されている")
                current = Section(name=name, line=no)
                song.sections[name] = current
                mode = "section"
            else:
                raise SongError(f"{no} 行目: 見出しは [parts] か [section 名前]: {text}")
            continue
        if mode == "header":
            key_, eq, val = text.partition("=")
            if not eq:
                raise SongError(f"{no} 行目: 先頭の設定は「名前 = 値」で書く: {text}")
            key_, val = key_.strip(), val.strip()
            try:
                if key_ == "title":
                    song.title = val
                elif key_ == "id":
                    song.id = val
                elif key_ == "tempo":
                    song.tempo = float(val)
                elif key_ == "meter":
                    n, d = val.split("/")
                    song.meter = (int(n), int(d))
                elif key_ == "key":
                    song.key = parse_key(val)
                    set_spelling(song.key)
                elif key_ == "intro":
                    song.intro = val.split()
                elif key_ == "form":
                    song.form = val.split()
                elif key_ == "loop":
                    song.loop = val.lower() in ("yes", "true", "1", "on")
                elif key_ == "echo":
                    a, b, c = val.split()
                    song.echo = (int(a), float(b), float(c))
                else:
                    raise SongError(f"{no} 行目: 知らない設定: {key_}")
            except (ValueError, IndexError) as e:
                if isinstance(e, SongError):
                    raise
                raise SongError(f"{no} 行目: 値が読めない: {text}（{e}）")
        elif mode == "parts":
            cols = text.split()
            if len(cols) < 3:
                raise SongError(f"{no} 行目: パートは「名前 楽器 種類 [オプション]」で書く: {text}")
            name, inst, kind = cols[:3]
            if inst != "drums" and inst not in INSTRUMENTS:
                raise SongError(f"{no} 行目: 楽器が読めない: {inst}（使える楽器: {' '.join(INSTRUMENTS)} drums）")
            if kind not in ("notes", "drums") and kind not in PATTERNS:
                raise SongError(f"{no} 行目: 種類が読めない: {kind}（notes, drums, または {' '.join(PATTERNS)}）")
            if (inst == "drums") != (kind == "drums"):
                raise SongError(f"{no} 行目: 楽器 drums と種類 drums は組にして使う")
            pd = PartDef(name, inst, kind)
            for opt in cols[3:]:
                k, eq, v = opt.partition("=")
                if not eq:
                    raise SongError(f"{no} 行目: オプションは 名前=値: {opt}")
                try:
                    if k in ("vol", "pan", "oct", "vel", "voices"):
                        setattr(pd, k, int(v))
                    elif k == "follow":
                        pd.follow = v
                    elif k == "shift":
                        if not re.match(r"^[+-]?\d+$|^[+-]\d+d$", v):
                            raise SongError(f"{no} 行目: shift は -12 のような半音の数か、-3d・+6d のような度数: {v}")
                        pd.shift = v
                    elif k == "gate":
                        pd.gate = float(v)
                    elif k == "role":
                        if v not in ("melody", "counter", "bass", "harmony"):
                            raise SongError(f"{no} 行目: role は melody, counter, bass, harmony のどれか: {v}")
                        pd.role = v
                    else:
                        raise SongError(f"{no} 行目: 知らないオプション: {k}")
                except ValueError:
                    raise SongError(f"{no} 行目: オプションの値が読めない: {opt}")
            if not pd.role:
                if kind == "drums":
                    pd.role = "drums"
                elif kind.startswith("bass:"):
                    pd.role = "bass"
                elif kind != "notes":
                    pd.role = "harmony"
                elif inst == "bass":
                    pd.role = "bass"
                elif not any(p.role == "melody" for p in song.parts.values()):
                    pd.role = "melody"
                else:
                    pd.role = "counter"
            if name in song.parts:
                raise SongError(f"{no} 行目: パート {name} が 2 回定義されている")
            if name == "chords":
                raise SongError(f"{no} 行目: chords はコード用の名前なので、パートの名前に使えない")
            song.parts[name] = pd
        else:
            cols = text.strip().split(None, 1)
            pname = cols[0]
            body = cols[1] if len(cols) > 1 else ""
            if pname != "chords" and pname not in song.parts:
                raise SongError(f"{no} 行目: [parts] にないパート: {pname}")
            pending_lines.setdefault((current.name, pname), []).append((no, body))

    for pd in song.parts.values():
        if pd.follow:
            if pd.follow not in song.parts or song.parts[pd.follow].kind != "notes" or song.parts[pd.follow].follow:
                raise SongError(f"パート {pd.name} の follow={pd.follow} は、[parts] にある notes のパート（follow でないもの）にする")
            if pd.kind != "notes":
                raise SongError(f"パート {pd.name}: follow を使うパートの種類は notes にする")
            if not pd.shift:
                pd.shift = "0"
    if song.key is None:
        raise SongError("key（調）がない")
    if not song.form:
        raise SongError("form（区間の順）がない")
    for name in song.intro + song.form:
        if name not in song.sections:
            raise SongError(f"intro / form にある区間 {name} が定義されていない")

    # 区間ごとに中身を読む
    bar_len = song.bar_len
    for sec in song.sections.values():
        chord_lines = pending_lines.get((sec.name, "chords"))
        if not chord_lines:
            raise SongError(f"区間 {sec.name}: chords の行がない（コードがない区間は | N.C. | と書く）")
        if chord_lines[0][1].strip().startswith("="):
            pass
        else:
            for no, body in chord_lines:
                for bar in split_bars(body, no):
                    sec.chords.append(parse_chord_bar(bar, no, bar_len))
    for sec in song.sections.values():
        chord_lines = pending_lines[(sec.name, "chords")]
        if chord_lines[0][1].strip().startswith("="):
            src = chord_lines[0][1].strip()[1:].strip()
            if src not in song.sections or not song.sections[src].chords:
                raise SongError(f"{chord_lines[0][0]} 行目: コピー元の区間 {src} がない（コピー元はコピーで書けない）")
            sec.chords = list(song.sections[src].chords)
    for sec in song.sections.values():
        nbars = len(sec.chords)
        for pname, pd in song.parts.items():
            plines = pending_lines.get((sec.name, pname))
            if not plines:
                if pd.follow:
                    sec.parts[pname] = ("follow",)
                else:
                    sec.parts[pname] = "off" if pd.kind in ("notes", "drums") else ("pattern", pd.kind)
                continue
            first = plines[0][1].strip()
            if first == "off":
                sec.parts[pname] = "off"
                continue
            if first.startswith("@"):
                pat = first[1:].strip()
                if pat not in PATTERNS:
                    raise SongError(f"{plines[0][0]} 行目: パターンが読めない: {pat}")
                sec.parts[pname] = ("pattern", pat)
                continue
            if first.startswith("="):
                sec.parts[pname] = ("copy", first[1:].strip(), plines[0][0])
                continue
            bars = []
            prev_dur = Fraction(1)
            for no, body in plines:
                for bar in split_bars(body, no):
                    if pd.kind == "drums":
                        bars.append(parse_drum_bar(bar, no))
                    else:
                        toks, prev_dur = parse_note_bar(bar, no, prev_dur)
                        total = sum((t.dur for t in toks), Fraction(0))
                        if total != bar_len:
                            raise SongError(
                                f"{no} 行目: 区間 {sec.name} の {pname} の {len(bars) + 1} 小節目の長さの合計が {total}（小節の長さは {bar_len}）: |{bar}|")
                        bars.append(toks)
            if len(bars) != nbars:
                raise SongError(
                    f"区間 {sec.name} の {pname} は {len(bars)} 小節あるが、chords は {nbars} 小節（同じにする）")
            sec.parts[pname] = ("drums", bars) if pd.kind == "drums" else bars
    for sec in song.sections.values():
        for pname, val in list(sec.parts.items()):
            if isinstance(val, tuple) and val[0] == "copy":
                src = val[1]
                if src not in song.sections:
                    raise SongError(f"{val[2]} 行目: コピー元の区間 {src} がない")
                sv = song.sections[src].parts.get(pname)
                if isinstance(sv, tuple) and sv[0] == "copy":
                    raise SongError(f"{val[2]} 行目: コピー元 {src} の {pname} もコピーになっている（元の区間を指す）")
                if isinstance(sv, list):
                    nb = len(sv)
                elif isinstance(sv, tuple) and sv[0] == "drums":
                    nb = len(sv[1])
                else:
                    nb = len(sec.chords)
                if nb != len(sec.chords):
                    raise SongError(f"{val[2]} 行目: コピー元 {src} と小節の数が違う")
                sec.parts[pname] = sv

    expand(song)
    return song


# ---- 展開 ----

def voicing_candidates(chord: Chord, center: int) -> list:
    ivs = chord.core()
    pcs = [(chord.root + i) % 12 for i in ivs]
    cands = []
    for inv in range(len(pcs)):
        order = pcs[inv:] + pcs[:inv]
        for base_oct in range(center // 12 - 2, center // 12 + 2):
            notes = []
            cur = base_oct * 12 + order[0]
            notes.append(cur)
            for pc in order[1:]:
                n = notes[-1] + ((pc - notes[-1]) % 12 or 12)
                notes.append(n)
            if center - 7 <= notes[0] <= center + 7:
                cands.append(notes)
    return cands


def choose_voicing(chord: Chord, center: int, prev: list | None, low: int = 0, high: int = 127, top_extra: int = 0) -> list:
    """和音の並べ方を選ぶ。前の和音から動きが少なく、楽器の音域に収まるもの。top_extra は分散和音で最低音の
    1 オクターブ上も使う場合に 12。"""
    cands = voicing_candidates(chord, center)
    fit = [v for v in cands if v[0] >= low and max(v[-1], v[0] + top_extra) <= high]
    cands = fit or cands

    def cost(v):
        mean = sum(v) / len(v)
        c = abs(mean - (center + 4)) * 0.6
        if prev:
            c += sum(min(abs(n - p) for p in prev) for n in v) * 1.0
        return c

    return min(cands, key=cost)


def choose_bass(pc: int, center: int, prev: int | None, low: int, high: int) -> int:
    cands = [pc + 12 * k for k in range(0, 11) if low <= pc + 12 * k <= high]
    target = prev if prev is not None else center
    window = [c for c in cands if center - 6 <= c <= center + 12] or cands
    return min(window, key=lambda c: (abs(c - target), c))


def pattern_events(song: Song, pd: PartDef, pattern: str, spans: list, out: list, state: dict) -> None:
    low, high = INSTRUMENTS[pd.instrument][1:3]
    if pd.role == "bass" or pattern.startswith("bass:"):
        center = 12 * ((pd.oct if pd.oct is not None else 2) + 1)
    else:
        center = 12 * ((pd.oct if pd.oct is not None else 4) + 1)
    step_of = {"8": Fraction(1, 2), "16": Fraction(1, 4), "4": Fraction(1)}
    for span in spans:
        if span.chord is None:
            state.pop("prev_voicing", None)
            continue
        chord = span.chord
        bar_start = max(b[0] for b in song.bars if b[0] <= span.start)

        def grid(step, force_start=True):
            # 小節の頭からの格子に合わせた、この span の中の (時刻, 長さ)。コードの変わり目には必ず 1 音置く
            offset = span.start - bar_start
            t = bar_start + -(-offset // step) * step
            pts = [span.start] if force_start and t > span.start else []
            while t < span.end:
                pts.append(t)
                t += step
            return [(p, (pts[i + 1] if i + 1 < len(pts) else span.end) - p) for i, p in enumerate(pts)]

        def rhythm(offsets):
            # 小節の中の決まった位置（四分音符 = 1）で打つ。コードの変わり目には必ず 1 音置く
            pts = []
            b0 = bar_start
            while b0 < span.end:
                for off in offsets:
                    t = b0 + off
                    if span.start <= t < span.end and off < song.bar_len:
                        pts.append(t)
                b0 += song.bar_len
            if not pts or pts[0] > span.start:
                pts.insert(0, span.start)
            return [(p, (pts[i + 1] if i + 1 < len(pts) else span.end) - p) for i, p in enumerate(pts)]

        if pattern.startswith("bass:"):
            bass = choose_bass(chord.bass, center, state.get("prev_bass"), low, high)
            state["prev_bass"] = bass
            fifth_pc = (chord.root + chord.fifth()) % 12
            fifth = min([fifth_pc + 12 * k for k in range(11) if low <= fifth_pc + 12 * k <= high],
                        key=lambda c: (abs(c - bass), c))
            kind = pattern.split(":")[1]
            if kind == "root":
                out.append((span.start, span.end - span.start, bass, 0))
            elif kind in ("root4", "root8", "octave8", "root-fifth"):
                step = Fraction(1, 2) if kind in ("root8", "octave8") else song.beat_len
                for i, (t, du) in enumerate(grid(step)):
                    if kind == "octave8":
                        p = bass if i % 2 == 0 else (bass + 12 if bass + 12 <= high else bass)
                    elif kind == "root-fifth":
                        p = bass if i % 2 == 0 else fifth
                    else:
                        p = bass
                    out.append((t, du, p, 0))
            elif kind in ("drive8", "gallop"):
                octave = bass + 12 if bass + 12 <= high else bass
                if kind == "drive8":
                    seq = {"R": bass, "O": octave, "F": fifth}
                    order = "RRORRFOR"
                    for t, du in grid(Fraction(1, 2)):
                        i = int((t - bar_start) / Fraction(1, 2)) % len(order)
                        out.append((t, du, seq[order[i]], 0))
                else:
                    offs = []
                    for b in range(int(song.bar_len)):
                        offs += [(b, "R"), (b + Fraction(1, 2), "R"), (b + Fraction(3, 4), "O")]
                    which = dict(offs)
                    for t, du in rhythm([o for o, _ in offs]):
                        w = which.get(t - bar_start - ((t - bar_start) // song.bar_len) * song.bar_len, "R")
                        out.append((t, du, octave if w == "O" else bass, 0))
            continue
        top_extra = 12 if pattern.startswith("arp:") and len(chord.core()) == 3 else 0
        voicing = choose_voicing(chord, center, state.get("prev_voicing"), low, high, top_extra)
        voicing = [n for n in voicing if low <= n <= high] or voicing
        state["prev_voicing"] = voicing
        if pd.voices and pattern.startswith("block:"):
            voicing = voicing[-pd.voices:]
        family, kind = pattern.split(":")
        if family == "block":
            if kind == "hold":
                for n in voicing:
                    out.append((span.start, span.end - span.start, n, 0))
            elif kind == "stab":
                for t, du in rhythm([Fraction(0), Fraction(3, 2), Fraction(3)]):
                    for n in voicing:
                        out.append((t, du, n, 0))
            elif kind == "push8":
                for t, du in grid(Fraction(1, 2)):
                    for n in voicing:
                        out.append((t, du, n, 0))
            else:
                step = {"half": Fraction(2), "beat": song.beat_len, "off8": Fraction(1, 2)}[kind]
                for t, du in grid(step, force_start=kind != "off8"):
                    if kind == "off8" and ((t - bar_start) / Fraction(1, 2)) % 2 == 0:
                        continue
                    for n in voicing:
                        out.append((t, du, n, 0))
            continue
        digits = re.sub(r"[^0-9]", "", kind)
        step = step_of[digits]
        up = voicing + ([voicing[0] + 12] if len(voicing) == 3 else [])
        if kind.startswith("updown"):
            seq = up + up[-2:0:-1]
        elif kind.startswith("alberti"):
            seq = [voicing[0], voicing[-1], voicing[1] if len(voicing) > 2 else voicing[-1], voicing[-1]]
        else:
            seq = up
        for t, du in grid(step):
            idx = int((t - bar_start) / step) % len(seq)
            out.append((t, du, seq[idx], 0))


def shift_pitch(song: Song, pitch: int, shift: str, chord: Chord | None, low: int, high: int) -> int:
    """なぞるパートの音の高さ。度数（-3d など）は調の音階の中でずらし、コードに合わない音になるときは
    すぐ隣のコードトーンに寄せる。楽器の音域に入るようオクターブを折り返す。"""
    from theory import classify
    m = re.match(r"^([+-])(\d+)d$", shift)
    if not m:
        p = pitch + int(shift)
    else:
        sign = 1 if m.group(1) == "+" else -1
        steps = int(m.group(2)) - 1
        parent = sorted(song.key.parent)
        pc = pitch % 12
        if pc in parent:
            target = parent[(parent.index(pc) + sign * steps) % len(parent)]
            k = next(k for k in range(1, 13) if (pc + sign * k) % 12 == target)
            p = pitch + sign * k
        else:
            p = pitch + sign * round(steps * 1.75)
        if chord is not None and classify(p % 12, chord, song.key).kind in ("AV", "CHR"):
            for d in (1, -1, 2, -2):
                q = p + d
                if q % 12 in chord.pcs and (q - pitch) * sign > 0:
                    p = q
                    break
    while p > high:
        p -= 12
    while p < low:
        p += 12
    return p


def expand(song: Song) -> None:
    order = song.intro + song.form
    t = Fraction(0)
    bar_len = song.bar_len
    for i, name in enumerate(order):
        if i == len(song.intro):
            song.loop_start = t
        sec = song.sections[name]
        start = t
        for b, bar in enumerate(sec.chords):
            song.bars.append((t, name, b + 1))
            for chord, dur in bar:
                song.chords.append(ChordSpan(t, t + dur, chord, "", name))
                t += dur
        song.section_spans.append((name, start, t))
    song.length = t
    for cs in song.chords:
        cs.where = song.where(cs.start)
    # 同じコードが続くところはまとめる（パターンの刻みが途切れないように）
    merged = []
    for cs in song.chords:
        if merged and merged[-1].chord == cs.chord and merged[-1].section == cs.section and merged[-1].end == cs.start \
                and cs.chord is not None and merged[-1].chord.symbol == cs.chord.symbol:
            merged[-1] = ChordSpan(merged[-1].start, cs.end, cs.chord, merged[-1].where, cs.section)
        else:
            merged.append(cs)
    song.chords = merged

    ordered = [n for n, p in song.parts.items() if not p.follow] + [n for n, p in song.parts.items() if p.follow]
    for pname in ordered:
        pd = song.parts[pname]
        state = {}
        pending_tie = None
        for name, s_start, s_end in song.section_spans:
            sec = song.sections[name]
            val = sec.parts[pname]
            if val == "off":
                continue
            if isinstance(val, tuple) and val[0] == "follow":
                low, high = INSTRUMENTS[pd.instrument][1:3]
                for src in [e for e in song.events if e.part == pd.follow and s_start <= e.start < s_end]:
                    cs = next((c for c in song.chords if c.start <= src.start < c.end), None)
                    p = shift_pitch(song, src.pitch, pd.shift, cs.chord if cs else None, low, high)
                    song.events.append(Event(pname, src.start, src.dur, p, pd.vel, src.intended,
                                             gate=pd.gate if pd.gate is not None else src.gate, where=src.where))
                continue
            if isinstance(val, tuple) and val[0] == "pattern":
                spans = [c for c in song.chords if s_start <= c.start < s_end]
                notes = []
                pattern_events(song, pd, val[1], spans, notes, state)
                if pd.gate is not None:
                    gate = pd.gate
                elif val[1].endswith(("hold", ":root")):
                    gate = 1.0
                elif val[1] in ("block:stab", "block:push8"):
                    gate = 0.45
                else:
                    gate = 0.9
                for (st, du, p, _) in notes:
                    song.events.append(Event(pname, st, du, p, pd.vel, generated=True, gate=gate, where=song.where(st)))
                continue
            if isinstance(val, tuple) and val[0] == "drums":
                for b, steps in enumerate(val[1]):
                    bstart = s_start + b * bar_len
                    step = bar_len / len(steps)
                    for k, hits in enumerate(steps):
                        st = bstart + k * step
                        for (tok, vel) in hits:
                            song.events.append(Event(pname, st, min(step, Fraction(1, 2)), DRUM_TOKENS[tok][0],
                                                     int(vel * pd.vel / 96), where=song.where(st)))
                continue
            tt = s_start
            for bar in val:
                for tok in bar:
                    if tok.pitch is None:
                        if pending_tie is not None:
                            raise SongError(f"{pname} {song.where(tt)}: ~（タイ）の次が休符になっている")
                        tt += tok.dur
                        continue
                    if pending_tie is not None:
                        if pending_tie.pitch != tok.pitch:
                            raise SongError(f"{pname} {song.where(tt)}: ~（タイ）の次の音 {tok.text} が前の音と違う高さ")
                        pending_tie.dur += tok.dur
                        pending_tie.intended = pending_tie.intended or tok.intended
                        ev = pending_tie
                    else:
                        vel = min(127, pd.vel + (20 if tok.accent else 0))
                        ev = Event(pname, tt, tok.dur, tok.pitch, vel, tok.intended, where=song.where(tt))
                        song.events.append(ev)
                    pending_tie = ev if tok.tie else None
                    tt += tok.dur
        if pending_tie is not None:
            raise SongError(f"{pname}: 曲の最後の音に ~（タイ）が付いている")
        if pd.kind == "notes" and pd.gate is not None:
            for ev in song.events:
                if ev.part == pname:
                    ev.gate = pd.gate
    song.events.sort(key=lambda e: (e.start, e.part, e.pitch))
