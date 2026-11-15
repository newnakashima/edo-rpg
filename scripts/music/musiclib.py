"""作曲用の小さな道具。core-theme・motiv を読み込み、曲を組み立てて MIDI に書き出す。

音楽理論の決まり（音階・和声・声部進行など）は一切持たない。
音の高さ・長さ・強さ・重なりは、書いたとおりにそのまま MIDI になる。

使い方は .claude/skills/music-composition/SKILL.md を参照。
"""

from __future__ import annotations

import copy
import json
import math
import re
from dataclasses import dataclass, field
from fractions import Fraction
from pathlib import Path

import mido

ROOT = Path(__file__).resolve().parents[2]
MUSIC_DIR = ROOT / "music"
THEME_DIR = MUSIC_DIR / "themes"
MIDI_DIR = MUSIC_DIR / "midi"
TICKS = 480  # 4 分音符 1 つ（= 1 拍）あたりの tick

NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
PITCH_RE = re.compile(r"^([A-Ga-g])([#b]*)(-?\d+)$")


def warn(msg: str) -> None:
    print(f"[注意] {msg}")


def pitch_of(text: str) -> int:
    """音名（C4 = 60、F#3、Bb5）か MIDI の番号（60）を MIDI の番号にする。"""
    if text.isdigit():
        return int(text)
    m = PITCH_RE.match(text)
    if not m:
        raise ValueError(f"音の高さを読めません: {text!r}（例: C4, F#3, Bb5, 60）")
    name, acc, octave = m.groups()
    n = NOTE_BASE[name.upper()] + acc.count("#") - acc.count("b") + (int(octave) + 1) * 12
    if not 0 <= n <= 127:
        raise ValueError(f"MIDI の範囲（0〜127）外の音です: {text}")
    return n


def beats_of(text: str) -> Fraction:
    return Fraction(text)


def meter_beats(meter: str) -> Fraction:
    """拍子から 1 小節の長さ（4 分音符 = 1）を求める。"""
    num, den = meter.split("/")
    return Fraction(int(num) * 4, int(den))


# ---------------------------------------------------------------------------
# 音とフレーズ
# ---------------------------------------------------------------------------


@dataclass
class Note:
    start: Fraction  # フレーズの頭からの位置（拍）
    dur: Fraction  # 長さ（拍）
    pitches: tuple[int, ...]  # 同時に鳴らす音。1 つなら単音
    vel: int = 90


@dataclass
class Phrase:
    """音の並び。core-theme・motiv・新しく書いた旋律・伴奏のどれもこれで表す。"""

    notes: list[Note] = field(default_factory=list)
    length: Fraction = Fraction(0)
    bar_starts: list[Fraction] = field(default_factory=list)  # 各小節の頭（記法で | を書いた位置）
    # 使った素材: [素材（theme:main / motif:main.a）, フレーズの中の開始の拍, 長さ, 素材の中の開始の拍, 伸び縮みの倍率]
    sources: list[list] = field(default_factory=list)

    # --- 加工（どれも新しい Phrase を返す） ---

    def copy(self) -> "Phrase":
        return copy.deepcopy(self)

    def transpose(self, semitones: int) -> "Phrase":
        p = self.copy()
        for n in p.notes:
            n.pitches = tuple(x + semitones for x in n.pitches)
        return p

    def octave(self, n: int) -> "Phrase":
        return self.transpose(12 * n)

    def stretch(self, factor) -> "Phrase":
        """長さを factor 倍にする（2 で倍の遅さ、1/2 で倍の速さ）。"""
        f = Fraction(factor)
        p = self.copy()
        for n in p.notes:
            n.start *= f
            n.dur *= f
        p.sources = [[name, a * f, ln * f, src, k * f] for name, a, ln, src, k in p.sources]
        p.length *= f
        p.bar_starts = [b * f for b in p.bar_starts]
        return p

    def velocity(self, value=None, scale=None) -> "Phrase":
        """強さを value にそろえるか、scale 倍にする。"""
        p = self.copy()
        for n in p.notes:
            v = value if value is not None else n.vel * (scale if scale is not None else 1)
            n.vel = max(1, min(127, int(round(v))))
        return p

    def slice(self, start, end) -> "Phrase":
        """拍の範囲 [start, end) を切り出す。範囲をまたぐ音は範囲内に切り詰める。"""
        s, e = Fraction(start), Fraction(end)
        p = Phrase(length=e - s)
        for name, a, ln, src, k in self.sources:
            lo, hi = max(a, s), min(a + ln, e)
            if lo < hi:
                p.sources.append([name, lo - s, hi - lo, src + (lo - a) / k, k])
        for n in self.notes:
            ns, ne = n.start, n.start + n.dur
            if ne <= s or ns >= e:
                continue
            a, b = max(ns, s), min(ne, e)
            p.notes.append(Note(a - s, b - a, n.pitches, n.vel))
        p.bar_starts = [b - s for b in self.bar_starts if s <= b < e]
        return p

    def bars(self, first: int, last: int | None = None) -> "Phrase":
        """小節 first〜last（1 始まり、両端を含む）を切り出す。"""
        last = first if last is None else last
        starts = self.bar_starts + [self.length]
        if not (1 <= first <= last <= len(self.bar_starts)):
            raise ValueError(f"小節の範囲 {first}-{last} は 1-{len(self.bar_starts)} の外です")
        p = self.slice(starts[first - 1], starts[last])
        return p

    def with_pitches(self, pitches) -> "Phrase":
        """リズムはそのままに、音の高さを順に置き換える（休符は数えない）。"""
        p = self.copy()
        items = [pitch_of(x) if isinstance(x, str) else x for x in pitches]
        if len(items) != len(p.notes):
            raise ValueError(f"音の数が合いません（フレーズ {len(p.notes)} 音、指定 {len(items)} 音）")
        for n, x in zip(p.notes, items):
            n.pitches = tuple(x) if isinstance(x, (tuple, list)) else (x,)
        return p

    def map(self, fn) -> "Phrase":
        """音ごとに fn(Note) -> Note | None を当てる（None で消す）。自由な加工用。"""
        p = self.copy()
        p.notes = [m for m in (fn(n) for n in p.notes) if m is not None]
        return p

    def repeat(self, times: int) -> "Phrase":
        out = Phrase()
        for _ in range(times):
            out = out + self
        return out

    def __add__(self, other: "Phrase") -> "Phrase":
        """つなげる。"""
        p = self.copy()
        for n in other.notes:
            p.notes.append(Note(n.start + self.length, n.dur, n.pitches, n.vel))
        p.bar_starts += [b + self.length for b in other.bar_starts]
        p.sources += [[name, a + self.length, *rest] for name, a, *rest in other.sources]
        p.length += other.length
        return p

    def __or__(self, other: "Phrase") -> "Phrase":
        """重ねる（同時に鳴らす）。"""
        p = self.copy()
        p.notes += copy.deepcopy(other.notes)
        p.notes.sort(key=lambda n: n.start)
        p.length = max(self.length, other.length)
        p.sources += copy.deepcopy(other.sources)
        return p

    def rest_after(self, beats) -> "Phrase":
        """後ろに休みを足す。"""
        p = self.copy()
        p.length += Fraction(beats)
        return p


def _label(name: str, src_from: Fraction, src_len: Fraction) -> str:
    """素材の中のどこを使ったかを、core-theme なら小節の範囲で書く（theme:main 3-4）。"""
    kind, _, mid = name.partition(":")
    if kind == "theme":
        t = load_themes().get(mid)
        if t is None:
            return name
        starts = t.melody.bar_starts
        first = max(i for i, b in enumerate(starts) if b <= src_from) + 1
        last = max(i for i, b in enumerate(starts) if b < src_from + src_len) + 1
        whole = src_from == 0 and src_len >= t.melody.length
        return name if whole else f"{name} {first}" if first == last else f"{name} {first}-{last}"
    if kind == "motif":
        t = load_themes().get(mid.split(".", 1)[0])
        full = motif(mid).length if t else src_len
        return name if src_from == 0 and src_len >= full else f"{name}（一部）"
    return name


def parse(text: str, meter: str = "4/4", strict_bars: bool = False) -> Phrase:
    """記法を Phrase にする。

    - 音: `C5:1`（音名とオクターブ:長さ）。長さは 4 分音符 = 1。`1/2`、`2/3`、`1.5` も書ける
    - MIDI の番号でもよい: `72:1`
    - 休み: `r:1`
    - 同時に鳴らす: `C4+E4+G4:2`
    - 強さ: `C5:1@110`（1〜127、省略時は 90）
    - 次の同じ高さの音とつなげる: `C5:1~ C5:1/2`
    - 小節の区切り: `|`
    """
    bar_len = meter_beats(meter)
    p = Phrase()
    pos = Fraction(0)
    tie_open: Note | None = None
    bars = [b for b in text.split("|") if b.strip()]
    for i, bar in enumerate(bars):
        p.bar_starts.append(pos)
        bar_start = pos
        for tok in bar.split():
            m = re.match(r"^([^:]+):([\d./]+)(~?)(?:@(\d+))?$", tok)
            if not m:
                raise ValueError(f"記法を読めません: {tok!r}（例: C5:1, r:1/2, C4+E4:2@100）")
            spec, dur_s, tie, vel_s = m.groups()
            dur = beats_of(dur_s)
            if spec.lower() == "r":
                tie_open = None
                pos += dur
                continue
            pitches = tuple(pitch_of(x) for x in spec.split("+"))
            vel = int(vel_s) if vel_s else 90
            if tie_open is not None and tie_open.pitches == pitches and tie_open.start + tie_open.dur == pos:
                tie_open.dur += dur
                note = tie_open
            else:
                note = Note(pos, dur, pitches, vel)
                p.notes.append(note)
            tie_open = note if tie else None
            pos += dur
        got = pos - bar_start
        if got != bar_len and not (i in (0, len(bars) - 1) and got < bar_len):
            msg = f"{i + 1} 小節目の長さが {got} 拍です（{meter} の 1 小節は {bar_len} 拍）"
            if strict_bars:
                raise ValueError(msg)
            warn(msg)
    p.length = pos
    return p


# ---------------------------------------------------------------------------
# core-theme と motiv
# ---------------------------------------------------------------------------


@dataclass
class Theme:
    id: str
    title: str
    meter: str
    tempo: float | None
    about: list[str]
    melody: Phrase
    harmony: Phrase | None  # 参考の和音（曲では変えてよい）
    motifs: dict[str, dict]  # motiv の ID → {"bars": (a, b) | None, "notes": Phrase | None, "about": str}
    path: Path


def _read_theme(path: Path) -> Theme:
    meta: dict[str, str] = {}
    about: list[str] = []
    melody_lines: list[str] = []
    harmony_lines: list[str] = []
    motif_lines: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s or s.startswith("#"):  # 行頭の # は注釈（# は音名のシャープにも使うので、行の途中には書けない）
            continue
        if s.startswith("@about"):
            about.append(s[len("@about"):].strip())
        elif s.startswith("@motif"):
            motif_lines.append(s[len("@motif"):].strip())
        elif s.startswith("@"):
            k, _, v = s[1:].partition(" ")
            meta[k] = v.strip()
        elif s.startswith("melody"):
            melody_lines.append(s[len("melody"):])
        elif s.startswith("harmony"):
            harmony_lines.append(s[len("harmony"):])
        else:
            raise ValueError(f"{path.name}: 読めない行です: {raw!r}")
    tid = meta.get("id", path.stem)
    meter = meta.get("meter", "4/4")
    melody = parse(" ".join(melody_lines), meter)
    melody.sources = [[f"theme:{tid}", Fraction(0), melody.length, Fraction(0), Fraction(1)]]
    harmony = parse(" ".join(harmony_lines), meter) if harmony_lines else None
    motifs: dict[str, dict] = {}
    for ml in motif_lines:
        # 例: a bars=1-2 上へ伸びる呼びかけ
        #     b notes=| E5:1 G5:1 | 断片を書き直したもの
        mid, _, rest = ml.partition(" ")
        rest = rest.strip()
        entry: dict = {"bars": None, "notes": None, "about": ""}
        m = re.match(r"^bars=(\d+)(?:-(\d+))?\s*(.*)$", rest)
        if m:
            a, b, desc = m.groups()
            entry["bars"] = (int(a), int(b or a))
            entry["about"] = desc
        elif rest.startswith("notes="):
            body = rest[len("notes="):]
            # 記法の後ろに // で説明を書ける
            body, _, desc = body.partition("//")
            entry["notes"] = parse(body, meter)
            entry["about"] = desc.strip()
        else:
            raise ValueError(f"{path.name}: @motif は bars=1-2 か notes=| ... | で書きます: {ml!r}")
        motifs[f"{tid}.{mid}"] = entry
    return Theme(tid, meta.get("title", tid), meter, float(meta["tempo"]) if "tempo" in meta else None,
                 about, melody, harmony, motifs, path)


def load_themes() -> dict[str, Theme]:
    themes = {}
    for path in sorted(THEME_DIR.glob("*.txt")):
        t = _read_theme(path)
        themes[t.id] = t
    return themes


def theme(theme_id: str) -> Phrase:
    """core-theme の旋律を Phrase として取り出す。`.bars(1, 4)` で一部を使う。"""
    themes = load_themes()
    if theme_id not in themes:
        raise KeyError(f"core-theme {theme_id!r} がありません（music/themes/ を見る）")
    return themes[theme_id].melody.copy()


def theme_harmony(theme_id: str) -> Phrase | None:
    """core-theme に書いた参考の和音。曲では使わなくても、変えてもよい。"""
    return load_themes()[theme_id].harmony


def motif(motif_id: str) -> Phrase:
    """motiv（`main.a` のように core-theme の ID.名前）を Phrase として取り出す。"""
    tid = motif_id.split(".", 1)[0]
    themes = load_themes()
    if tid not in themes or motif_id not in themes[tid].motifs:
        raise KeyError(f"motiv {motif_id!r} がありません（music/themes/{tid}.txt の @motif を見る）")
    t = themes[tid]
    entry = t.motifs[motif_id]
    if entry["bars"]:
        p = t.melody.bars(*entry["bars"])
    else:
        p = entry["notes"].copy()
    p.sources = [[f"motif:{motif_id}", Fraction(0), p.length, Fraction(0), Fraction(1)]]
    return p


# ---------------------------------------------------------------------------
# 曲
# ---------------------------------------------------------------------------

ROLES = ("main", "sub", "other")


@dataclass
class Track:
    name: str
    program: int  # General MIDI の音色番号（0 始まり）。instruments.md を参照
    role: str  # main（主旋律）/ sub（副旋律）/ other（伴奏・リズムなど）
    drum: bool = False
    volume: int = 100
    pan: int = 64
    reverb: int = 40
    chorus: int = 0
    events: list[tuple[Fraction, Note]] = field(default_factory=list)
    raw: list[tuple[Fraction, mido.Message]] = field(default_factory=list)
    uses: list[dict] = field(default_factory=list)
    cursor: Fraction = Fraction(0)

    def put(self, at, phrase: Phrase) -> Fraction:
        """拍 at から phrase を置き、置き終わりの拍を返す。"""
        at = Fraction(at)
        for n in phrase.notes:
            self.events.append((at + n.start, copy.deepcopy(n)))
        for name, a, ln, src, k in phrase.sources:
            label = _label(name, src, ln / k)
            if k != 1:
                label += f"（{k}倍の長さ）"
            self.uses.append({"source": label, "at": float(at + a), "length": float(ln)})
        end = at + phrase.length
        self.cursor = max(self.cursor, end)
        return end

    def add(self, phrase: Phrase) -> Fraction:
        """直前に置いたものの後ろにつなげる。"""
        return self.put(self.cursor, phrase)

    def rest(self, beats) -> Fraction:
        self.cursor += Fraction(beats)
        return self.cursor

    def message(self, at, msg: mido.Message) -> None:
        """任意の MIDI メッセージ（ピッチベンド、コントロールチェンジなど）を拍 at に置く。channel は書き出し時に入る。"""
        self.raw.append((Fraction(at), msg))


class Song:
    def __init__(self, id: str, tempo: float, meter: str = "4/4", loop: bool = True,
                 title: str = "", about: str = ""):
        self.id = id
        self.title = title or id
        self.about = about
        self.meter = meter
        self.bar_len = meter_beats(meter)
        self.loop = loop
        self.loop_start: Fraction = Fraction(0)
        self.tempos: list[tuple[Fraction, float]] = [(Fraction(0), float(tempo))]
        self.tracks: list[Track] = []
        self._end: Fraction | None = None

    def track(self, name: str, program: int = 0, role: str = "other", drum: bool = False, **kw) -> Track:
        if role not in ROLES:
            raise ValueError(f"role は {ROLES} のどれかです: {role!r}")
        t = Track(name, program, role, drum, **kw)
        self.tracks.append(t)
        return t

    def bar(self, n: float) -> Fraction:
        """n 小節目（1 始まり）の頭の拍。"""
        return (Fraction(n) - 1) * self.bar_len

    def tempo_at(self, at, bpm: float) -> None:
        self.tempos.append((Fraction(at), float(bpm)))
        self.tempos.sort(key=lambda x: x[0])

    def end(self, at) -> None:
        """曲の終わり（ループするならループの継ぎ目）の拍を決める。省略すると最後の音を含む小節の終わり。"""
        self._end = Fraction(at)

    def loop_from(self, at) -> None:
        """前奏の後からループさせるときの、ループの頭の拍。"""
        self.loop_start = Fraction(at)

    def length(self) -> Fraction:
        if self._end is not None:
            return self._end
        last = max((at + n.dur for t in self.tracks for at, n in t.events), default=Fraction(0))
        return Fraction(math.ceil(last / self.bar_len)) * self.bar_len

    def seconds(self, beat) -> float:
        beat = Fraction(beat)
        sec, prev_b, prev_bpm = 0.0, Fraction(0), self.tempos[0][1]
        for b, bpm in self.tempos:
            if b >= beat:
                break
            sec += float(b - prev_b) * 60 / prev_bpm
            prev_b, prev_bpm = b, bpm
        return sec + float(beat - prev_b) * 60 / prev_bpm

    def _check(self) -> None:
        for t in self.tracks:
            if t.role == "other":
                for u in t.uses:
                    if u["source"].startswith(("theme:", "motif:")):
                        warn(f"トラック「{t.name}」は role=other ですが {u['source']} を使っています。"
                             " core-theme と motiv は主旋律（main）か副旋律（sub）で使います")
        end = self.length()
        for t in self.tracks:
            for at, n in t.events:
                if self.loop and at + n.dur > end:
                    warn(f"トラック「{t.name}」の音が曲の終わり（{end} 拍）をはみ出しています。ループの継ぎ目で切れます")
                    break

    def write(self, path: Path | None = None) -> Path:
        """MIDI と、素材の使い方などを記録した JSON を書き出す。"""
        self._check()
        MIDI_DIR.mkdir(parents=True, exist_ok=True)
        path = path or MIDI_DIR / f"{self.id}.mid"
        mid = mido.MidiFile(type=1, ticks_per_beat=TICKS, charset="utf-8")
        tick = lambda b: int(round(Fraction(b) * TICKS))  # noqa: E731

        conductor = mido.MidiTrack()
        conductor.append(mido.MetaMessage("track_name", name=self.title, time=0))
        num, den = (int(x) for x in self.meter.split("/"))
        timeline = [(0, mido.MetaMessage("time_signature", numerator=num, denominator=den))]
        timeline += [(tick(b), mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm))) for b, bpm in self.tempos]
        timeline.append((tick(self.length()), mido.MetaMessage("end_of_track")))
        _flush(conductor, timeline)
        mid.tracks.append(conductor)

        channels = [c for c in range(16) if c != 9]
        for t in self.tracks:
            if t.drum:
                ch = 9
            else:
                if not channels:
                    raise ValueError("旋律のトラックは 15 本までです")
                ch = channels.pop(0)
            tr = mido.MidiTrack()
            tr.append(mido.MetaMessage("track_name", name=t.name, time=0))
            ev: list[tuple[int, int, mido.Message]] = []  # (tick, 並び順, メッセージ)
            if not t.drum:
                ev.append((0, 0, mido.Message("program_change", channel=ch, program=t.program)))
            for cc, val in ((7, t.volume), (10, t.pan), (91, t.reverb), (93, t.chorus)):
                ev.append((0, 0, mido.Message("control_change", channel=ch, control=cc, value=val)))
            for at, n in t.events:
                for p in n.pitches:
                    if not 0 <= p <= 127:
                        raise ValueError(f"トラック「{t.name}」に MIDI の範囲外の音があります: {p}")
                    ev.append((tick(at), 2, mido.Message("note_on", channel=ch, note=p, velocity=n.vel)))
                    ev.append((tick(at + n.dur), 1, mido.Message("note_off", channel=ch, note=p, velocity=0)))
            for at, msg in t.raw:
                ev.append((tick(at), 0, msg.copy(channel=ch)))
            ev.sort(key=lambda x: (x[0], x[1]))
            _flush(tr, [(a, m) for a, _, m in ev])
            mid.tracks.append(tr)
        mid.save(path)

        meta = {
            "id": self.id,
            "title": self.title,
            "about": self.about,
            "meter": self.meter,
            "tempos": [[float(b), bpm] for b, bpm in self.tempos],
            "loop": self.loop,
            "loop_start_seconds": self.seconds(self.loop_start),
            "length_seconds": self.seconds(self.length()),
            "length_beats": float(self.length()),
            "tracks": [
                {"name": t.name, "program": t.program, "role": t.role, "drum": t.drum, "uses": t.uses}
                for t in self.tracks
            ],
        }
        path.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path


def _flush(track: mido.MidiTrack, timeline) -> None:
    now = 0
    for at, msg in sorted(timeline, key=lambda x: x[0]):  # 同じ tick の中の順番は保つ
        track.append(msg.copy(time=at - now))
        now = at


__all__ = [
    "Note", "Phrase", "Song", "Track", "parse", "pitch_of", "theme", "theme_harmony", "motif",
    "load_themes", "mido", "Fraction",
]
