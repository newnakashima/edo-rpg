"""曲の設計図を音楽理論の面から検査する。

エラー: コードと旋律のぶつかり、小節の長さの違い、音域の外、同時発音数の超過など。直さないと MIDI にしない。
警告: 跳躍の扱い、連続 5 度・8 度、ループのつなぎ目、終止など。理由があれば残してよい。
"""
from dataclasses import dataclass
from fractions import Fraction

from instruments import INSTRUMENTS, MAX_VOICES
from songfile import Event, Song
from theory import PC_NAMES, classify, is_diatonic_chord, pitch_name, roman


@dataclass
class Issue:
    level: str  # "error" | "warn" | "info"
    where: str
    part: str
    message: str

    def format(self) -> str:
        head = {"error": "エラー", "warn": "警告", "info": "情報"}[self.level]
        part = f" [{self.part}]" if self.part else ""
        return f"{head}: {self.where}{part} {self.message}"


class Checker:
    def __init__(self, song: Song):
        self.song = song
        self.issues: list[Issue] = []
        self._seen = set()
        self.stats = {}

    def add(self, level, where, part, message):
        key = (level, where, part, message)
        if key in self._seen:
            return
        self._seen.add(key)
        self.issues.append(Issue(level, where, part, message))

    # ---- 便利関数 ----

    def chord_at(self, t: Fraction):
        for cs in self.song.chords:
            if cs.start <= t < cs.end:
                return cs
        return None

    def spans_over(self, start: Fraction, end: Fraction) -> list:
        return [cs for cs in self.song.chords if cs.start < end and cs.end > start]

    def is_strong(self, t: Fraction) -> bool:
        bar = max((b[0] for b in self.song.bars if b[0] <= t), default=Fraction(0))
        return (t - bar) in self.song.strong_beats

    def line(self, part: str) -> list:
        return [e for e in self.song.events if e.part == part]

    # ---- 検査 ----

    def run(self) -> list:
        song = self.song
        self.check_ranges()
        self.check_polyphony()
        self.check_progression()
        for pname, pd in song.parts.items():
            if pd.kind == "notes":
                self.check_melodic_line(pname)
                if not pd.follow:  # なぞるパートの跳躍は旋律の跳躍をなぞったものなので見ない（ぶつかりは見る）
                    self.check_contour(pname)
        self.check_bass()
        self.check_outer_voices()
        self.check_part_clashes()
        self.check_phrase_ends()
        self.check_accompaniment_above_melody()
        self.check_rhythm_variety()
        self.check_scale_flavor()
        self.check_texture()
        order = {"error": 0, "warn": 1, "info": 2}
        self.issues.sort(key=lambda i: order[i.level])
        return self.issues

    def check_ranges(self):
        for pname, pd in self.song.parts.items():
            if pd.kind == "drums":
                continue
            _gm, low, high, label, _ = INSTRUMENTS[pd.instrument]
            bad = [e for e in self.line(pname) if not low <= e.pitch <= high]
            if bad:
                e = bad[0]
                self.add("error", e.where, pname,
                         f"{label}の音域（{pitch_name(low)}〜{pitch_name(high)}）の外の音 {pitch_name(e.pitch)} がある"
                         f"（ほか {len(bad) - 1} 個）。オクターブを変えるか、oct= を変える")

    def check_polyphony(self):
        total = 0
        detail = []
        for pname, pd in self.song.parts.items():
            evs = self.line(pname)
            mx = 0
            if pd.kind == "drums":
                by_t = {}
                for e in evs:
                    by_t.setdefault(e.start, set()).add(e.pitch)
                mx = max((len(v) for v in by_t.values()), default=0)
            else:
                points = sorted({e.start for e in evs})
                for t in points:
                    n = sum(1 for e in evs if e.start <= t < e.start + e.dur)
                    mx = max(mx, n)
            total += mx
            detail.append(f"{pname} {mx}")
        self.stats["voices"] = total
        msg = f"同時に使う音の数は {total}（{', '.join(detail)}）"
        if total > MAX_VOICES:
            self.add("error", "曲全体", "", msg + f"。スーパーファミコンの音源は {MAX_VOICES} 音までなので、パートを減らすか和音の音を減らす")
        else:
            self.add("info", "曲全体", "", msg + f" / 上限 {MAX_VOICES}")

    def check_progression(self):
        song, key = self.song, self.song.key
        chords = [cs for cs in song.chords]
        for i, cs in enumerate(chords):
            if cs.chord is None or is_diatonic_chord(cs.chord, key):
                continue
            nxt = chords[(i + 1) % len(chords)].chord if (i + 1 < len(chords) or song.loop) else None
            c = cs.chord
            rel = (c.root - key.tonic) % 12
            name = roman(c, key)
            if nxt is not None and (4 in c.intervals) and (nxt.root - c.root) % 12 == 5:
                self.add("info", cs.where, "", f"{c.symbol}（{name}）は次の {nxt.symbol} への副属和音（V/x）として読める")
            elif nxt is not None and c.intervals[:3] == (0, 3, 6) and (nxt.root - c.root) % 12 == 1:
                self.add("info", cs.where, "", f"{c.symbol}（{name}）は次の {nxt.symbol} への導和音（vii°/x）として読める")
            elif key.mode in ("major", "ritsu", "yo", "ryukyu", "lydian", "mixolydian") and (
                    (rel == 5 and c.is_minor) or rel in (8, 10, 3) or (rel == 2 and c.intervals[:3] == (0, 3, 6))):
                self.add("info", cs.where, "", f"{c.symbol}（{name}）は同主短調からの借用和音として読める")
            elif key.mode in ("minor", "minyo", "dorian", "phrygian", "miyakobushi") and rel in (0, 5, 7) and not c.is_minor:
                self.add("info", cs.where, "", f"{c.symbol}（{name}）は同主長調・和声的短音階の和音として読める")
            elif rel == 1 and not c.is_minor:
                self.add("info", cs.where, "", f"{c.symbol}（{name}）はナポリの和音（bII）として読める")
            else:
                outside = sorted({PC_NAMES[p] for p in c.pcs - key.diatonic})
                self.add("warn", cs.where, "",
                         f"{c.symbol}（{name}）は調にない音 {' '.join(outside)} を含み、副属和音・借用和音としても読めない。"
                         "意図した転調・色づけでなければ、調の中のコードに変える")
        # 区間の終わりの和音と、ループのつなぎ目
        tonic_like = {0}
        for name, s_start, s_end in song.section_spans:
            last = [cs for cs in chords if s_start <= cs.start < s_end and cs.chord is not None]
            if not last:
                continue
            c = last[-1].chord
            rel = (c.root - key.tonic) % 12
            if rel not in tonic_like | {7, 5, 10, 2, 11, 8} and not (rel == 9 and key.mode == "major"):
                self.add("warn", last[-1].where, "",
                         f"区間 {name} が {c.symbol}（{roman(c, key)}）で終わる。区間の終わりは主和音・属和音（V）・下属和音（IV）など、"
                         "次の区間へのつながりが分かるコードにする")
        firsts = [cs for cs in chords if cs.start >= song.loop_start and cs.chord is not None]
        lasts = [cs for cs in chords if cs.chord is not None]
        if song.loop and firsts and lasts:
            a, b = lasts[-1].chord, firsts[0].chord
            ra, rb = (a.root - key.tonic) % 12, (b.root - key.tonic) % 12
            good = (rb == 0 and ra in (7, 5, 10, 11, 2, 8, 1)) or (rb == 0 and ra == 0 and len(lasts) > 1) or \
                   (b.root - a.root) % 12 == 5 or (rb != 0 and (b.root - a.root) % 12 in (1, 2, 10, 11))
            if not good:
                self.add("warn", lasts[-1].where, "",
                         f"ループの最後の {a.symbol}（{roman(a, key)}）から最初の {b.symbol}（{roman(b, key)}）へのつながりが弱い。"
                         "最後の小節を属和音（V・V7・Vsus4）や IV、bVII にして頭へ戻す")
        if not song.loop and lasts:
            c = lasts[-1].chord
            if (c.root - key.tonic) % 12 != 0:
                self.add("warn", lasts[-1].where, "", f"ループしない曲が主和音以外（{c.symbol}）で終わる")

    def note_segments(self, e: Event) -> list:
        """音をコードの変わり目で区切る。[(開始, 長さ, ChordSpan)]"""
        out = []
        for cs in self.spans_over(e.start, e.start + e.dur):
            st = max(cs.start, e.start)
            en = min(cs.end, e.start + e.dur)
            out.append((st, en - st, cs))
        return out

    def check_melodic_line(self, pname: str):
        song, key = self.song, self.song.key
        evs = self.line(pname)
        if not evs:
            return
        long_thr = song.beat_len
        counts = {"CT": 0, "TN": 0, "AV": 0, "CHR": 0}
        strong_total = strong_ct = 0
        role = song.parts[pname].role
        for i, e in enumerate(evs):
            prev = evs[i - 1] if i > 0 else (evs[-1] if song.loop and evs[-1].start >= song.loop_start else None)
            nxt = evs[i + 1] if i + 1 < len(evs) else (
                next((x for x in evs if x.start >= song.loop_start), None) if song.loop else None)
            # 休符を挟む場合はつながりとみなさない
            if prev is not None and i > 0 and prev.start + prev.dur < e.start - Fraction(1, 4):
                prev = None
            if nxt is not None and i + 1 < len(evs) and e.start + e.dur < nxt.start - Fraction(1, 4):
                nxt = None
            segs = self.note_segments(e)
            for k, (st, du, cs) in enumerate(segs):
                if cs.chord is None:
                    continue
                cls = classify(e.pitch % 12, cs.chord, key)
                counts[cls.kind] += 1
                onset = k == 0
                accented = (onset and (self.is_strong(st) or e.dur > long_thr)) or st == cs.start or du > long_thr
                if accented:
                    strong_total += 1
                    strong_ct += cls.kind == "CT"
                if cls.kind in ("CT", "TN"):
                    continue
                if e.intended:
                    self.add("info", song.where(st), pname,
                             f"{pitch_name(e.pitch)} は {cs.chord.symbol} に対して {cls.label}。! が付いているので意図した不協和音として通す")
                    continue
                # 次に鳴る音（この音がコードの変わり目をまたぐなら、同じ高さの続き）
                if k + 1 < len(segs):
                    n_pitch = e.pitch
                    n_cs = segs[k + 1][2]
                elif nxt is not None:
                    n_pitch = nxt.pitch
                    n_cs = self.chord_at(nxt.start)
                else:
                    n_pitch, n_cs = None, None
                p_pitch = (prev.pitch if prev is not None else None) if onset else e.pitch
                n_kind = classify(n_pitch % 12, n_cs.chord, key).kind if (n_pitch is not None and n_cs and n_cs.chord) else None
                step_in = p_pitch is not None and 1 <= abs(e.pitch - p_pitch) <= 2
                step_out = n_pitch is not None and 1 <= abs(n_pitch - e.pitch) <= 2
                resolves = step_out and n_kind in ("CT", "TN")
                anticipation = n_pitch == e.pitch and k + 1 >= len(segs) and n_kind == "CT"
                what = f"{pitch_name(e.pitch)} は {cs.chord.symbol} に対して {cls.label}"
                ct_names = " ".join(PC_NAMES[p] for p in sorted(cs.chord.pcs, key=lambda p: (p - cs.chord.root) % 12))
                fix = f"コードトーン（{ct_names}）に変えるか、隣の音へ順次進行（半音か全音）で解決させるか、コードを変える"
                if accented:
                    if resolves and du <= 2 * long_thr:
                        kind = "掛留音" if not onset else "倚音"
                        self.add("info", song.where(st), pname, f"{what}。{kind}として次の {pitch_name(n_pitch)} へ解決している")
                    elif anticipation and du <= long_thr:
                        continue
                    elif resolves:
                        self.add("error", song.where(st), pname, f"{what}で、強拍で {float(du):g} 拍のびる。倚音は 2 拍までにする。{fix}")
                    else:
                        self.add("error", song.where(st), pname, f"{what}で、強拍か長い音なのに解決しない。{fix}")
                else:
                    if cls.kind == "CHR" and not (step_in and step_out) and not resolves:
                        self.add("error", song.where(st), pname,
                                 f"{what}。調にない音は、前後とも順次進行の経過音・刺繍音にするか、次の音へ半音で解決させる。{fix}")
                    elif not (step_in or step_out or anticipation):
                        self.add("error", song.where(st), pname,
                                 f"{what}で、跳躍で入って跳躍で出ている（非和声音は前か後ろを順次進行にする）。{fix}")
        if role in ("melody", "counter") and strong_total:
            ratio = strong_ct / strong_total
            self.stats[f"{pname}_strong_ct"] = ratio
            lvl = "warn" if ratio < 0.6 else "info"
            self.add(lvl, "曲全体", pname,
                     f"強拍・長い音のうちコードトーンは {ratio:.0%}（{strong_ct}/{strong_total}）" +
                     ("。60% より低いと旋律がコードから浮いて聞こえる。強拍の音をコードトーンに寄せる" if lvl == "warn" else ""))
        self.stats[f"{pname}_classes"] = counts

    def check_contour(self, pname: str):
        song = self.song
        evs = self.line(pname)
        if len(evs) < 2:
            return
        role = song.parts[pname].role
        for i in range(1, len(evs)):
            a, b = evs[i - 1], evs[i]
            if a.start + a.dur < b.start - Fraction(1, 2):
                continue  # 休符を挟んだら別のフレーズ
            leap = b.pitch - a.pitch
            if abs(leap) > 12:
                self.add("warn", b.where, pname, f"{pitch_name(a.pitch)} → {pitch_name(b.pitch)} は 1 オクターブを超える跳躍。歌いにくい")
            elif abs(leap) == 6 and role != "bass":
                self.add("warn", b.where, pname, f"{pitch_name(a.pitch)} → {pitch_name(b.pitch)} は増 4 度（三全音）の跳躍。意図がなければ避ける")
            if abs(leap) >= 8 and i + 1 < len(evs) and role != "bass":
                c = evs[i + 1]
                back = c.pitch - b.pitch
                if not (back != 0 and (back > 0) != (leap > 0) and abs(back) <= 4):
                    self.add("warn", b.where, pname,
                             f"{pitch_name(a.pitch)} → {pitch_name(b.pitch)} の大きな跳躍のあと、反対向きの順次進行で戻っていない")
            if i >= 2 and role != "bass":
                z = evs[i - 2]
                l1, l2 = a.pitch - z.pitch, b.pitch - a.pitch
                if abs(l1) >= 3 and abs(l2) >= 3 and (l1 > 0) == (l2 > 0) and abs(l1 + l2) > 12:
                    self.add("warn", b.where, pname, "同じ向きの跳躍が続いて 1 オクターブを超える")
        run = 1
        for i in range(1, len(evs)):
            run = run + 1 if evs[i].pitch == evs[i - 1].pitch else 1
            if run == 7 and role == "melody":
                self.add("warn", evs[i].where, pname, "同じ高さの音が 7 回以上続く。旋律が止まって聞こえる")
        for name, s_start, s_end in song.section_spans:
            ps = [e.pitch for e in evs if s_start <= e.start < s_end]
            if ps and max(ps) - min(ps) > 19 and role == "melody":
                self.add("warn", f"区間 {name}", pname, f"1 つの区間で旋律の音域が {max(ps) - min(ps)} 半音ある。1 オクターブ半以内に収める")

    def check_bass(self):
        song = self.song
        for pname, pd in song.parts.items():
            if pd.role != "bass" or pd.kind == "drums":
                continue
            evs = self.line(pname)
            if not evs:
                continue
            for cs in song.chords:
                if cs.chord is None:
                    continue
                sounding = [e for e in evs if e.start <= cs.start < e.start + e.dur]
                if not sounding:
                    continue
                low = min(sounding, key=lambda e: e.pitch)
                if low.pitch % 12 != cs.chord.bass and not low.intended:
                    want = PC_NAMES[cs.chord.bass]
                    self.add("error", cs.where, pname,
                             f"コードが {cs.chord.symbol} に変わる所で低音が {pitch_name(low.pitch)}。低音は {want} にする"
                             f"（転回形にしたいなら {cs.chord.symbol.split('/')[0]}/{PC_NAMES[low.pitch % 12]} と書く）")

    def lowest_at(self, t, parts):
        evs = [e for e in self.song.events if e.part in parts and e.start <= t < e.start + e.dur]
        return min(evs, key=lambda e: e.pitch) if evs else None

    def highest_at(self, t, parts):
        evs = [e for e in self.song.events if e.part in parts and e.start <= t < e.start + e.dur]
        return max(evs, key=lambda e: e.pitch) if evs else None

    def check_outer_voices(self):
        song = self.song
        mel = [n for n, p in song.parts.items() if p.role == "melody"]
        bass = [n for n, p in song.parts.items() if p.role == "bass"]
        if not mel or not bass:
            return
        prev = None
        for cs in song.chords:
            m = self.highest_at(cs.start, mel)
            b = self.lowest_at(cs.start, bass)
            if m is None or b is None:
                prev = None
                continue
            # 旋律が休符を挟んで入り直した所は、前の和音とのつながりを見ない
            mel_evs = [e for e in song.events if e.part in mel and e.start < m.start]
            if mel_evs and max(e.start + e.dur for e in mel_evs) < m.start - Fraction(1, 4):
                prev = None
            if m.pitch <= b.pitch:
                self.add("warn", cs.where, mel[0], f"旋律 {pitch_name(m.pitch)} が低音 {pitch_name(b.pitch)} より低い")
            if prev:
                pm, pb = prev
                ic1, ic2 = (pm - pb) % 12, (m.pitch - b.pitch) % 12
                if ic1 == ic2 and ic1 in (0, 7) and pm != m.pitch and pb != b.pitch and (m.pitch - pm > 0) == (b.pitch - pb > 0):
                    name = "8 度" if ic1 == 0 else "5 度"
                    self.add("warn", cs.where, mel[0],
                             f"旋律と低音が連続{name}（{pitch_name(pm)}/{pitch_name(pb)} → {pitch_name(m.pitch)}/{pitch_name(b.pitch)}）。"
                             "響きが薄くなる。旋律か低音の片方を反対に動かす")
            prev = (m.pitch, b.pitch)

    def check_part_clashes(self):
        """書いた旋律どうし（melody と counter）の半音のぶつかり。"""
        song = self.song
        written = [n for n, p in song.parts.items() if p.kind == "notes" and p.role in ("melody", "counter")]
        if len(written) < 2:
            return
        evs = [e for e in song.events if e.part in written]
        for i, a in enumerate(evs):
            for b in evs[i + 1:]:
                if b.start >= a.start + a.dur:
                    break
                if b.part == a.part:
                    continue
                overlap = min(a.start + a.dur, b.start + b.dur) - max(a.start, b.start)
                if overlap < song.beat_len:
                    continue  # 短い経過音どうしのぶつかりは気にしない
                if (a.pitch - b.pitch) % 12 in (1, 11) and not (a.intended or b.intended):
                    t = max(a.start, b.start)
                    cs = self.chord_at(t)
                    both_ct = cs and cs.chord and a.pitch % 12 in cs.chord.pcs and b.pitch % 12 in cs.chord.pcs
                    if not both_ct:
                        self.add("warn", song.where(t), f"{a.part}/{b.part}",
                                 f"{pitch_name(a.pitch)} と {pitch_name(b.pitch)} が半音でぶつかって {float(overlap):g} 拍重なる")

    def check_phrase_ends(self):
        song, key = self.song, self.song.key
        for pname, pd in song.parts.items():
            if pd.role != "melody":
                continue
            evs = self.line(pname)
            for i, e in enumerate(evs):
                end = e.start + e.dur
                nxt = evs[i + 1] if i + 1 < len(evs) else None
                section_end = any(end == s_end for _, _, s_end in song.section_spans)
                rest_after = nxt is None or nxt.start - end >= song.beat_len
                if not (rest_after or section_end) or e.dur < song.beat_len:
                    continue
                cs = self.chord_at(e.start + e.dur - Fraction(1, 64))
                if cs and cs.chord and e.pitch % 12 not in cs.chord.pcs and not e.intended:
                    self.add("warn", e.where, pname,
                             f"フレーズの終わりの {pitch_name(e.pitch)} が {cs.chord.symbol} のコードトーンでない。終わりの音は落ち着かせる")
            if evs and not song.loop:
                last = evs[-1]
                if last.pitch % 12 != key.tonic and (last.pitch - key.tonic) % 12 not in (4, 3, 7):
                    self.add("warn", last.where, pname, "ループしない曲の最後の旋律の音が主和音の音でない")

    def check_accompaniment_above_melody(self):
        song = self.song
        mel = [n for n, p in song.parts.items() if p.role == "melody"]
        acc = [n for n, p in song.parts.items() if p.role in ("harmony",)]
        if not mel or not acc:
            return
        mel_evs = [e for e in song.events if e.part in mel]
        acc_evs = [e for e in song.events if e.part in acc]
        over = 0
        for m in mel_evs:
            if any(a.start < m.start + m.dur and a.start + a.dur > m.start and a.pitch > m.pitch for a in acc_evs):
                over += 1
        if mel_evs and over / len(mel_evs) > 0.25:
            self.add("warn", "曲全体", ",".join(acc),
                     f"旋律の音の {over / len(mel_evs):.0%} で、伴奏の和音が旋律より高い。伴奏の oct= を下げて旋律を一番上にする")

    def check_rhythm_variety(self):
        song = self.song
        for pname, pd in song.parts.items():
            if pd.role != "melody":
                continue
            durs = {e.dur for e in self.line(pname)}
            if len(durs) <= 1 and self.line(pname):
                self.add("warn", "曲全体", pname, "旋律の音の長さが 1 種類だけ。リズムが単調になる。長い音と短い音を組み合わせる")

    def check_scale_flavor(self):
        song, key = self.song, self.song.key
        if len(key.scale) >= 7:
            return
        for pname, pd in song.parts.items():
            if pd.role != "melody":
                continue
            evs = self.line(pname)
            outside = [e for e in evs if e.pitch % 12 not in key.scale]
            if evs:
                ratio = len(outside) / len(evs)
                self.add("warn" if ratio > 0.2 else "info", "曲全体", pname,
                         f"旋律のうち {key.describe()} の外の音は {ratio:.0%}（{len(outside)}/{len(evs)}）" +
                         ("。和の雰囲気が薄れる。外の音は経過音などにとどめる" if ratio > 0.2 else ""))


    def check_texture(self):
        """編成の厚み。SNES の JRPG の BGM は、8 音を使い切るくらいに音を重ねる。"""
        song = self.song
        if not song.loop:
            return
        counts = []
        for i, (b0, _name, _n) in enumerate(song.bars):
            if b0 < song.loop_start:
                continue
            b1 = b0 + song.bar_len
            parts = {e.part for e in song.events if e.start < b1 and e.start + e.dur > b0 and song.parts[e.part].kind != "drums"}
            counts.append(len(parts))
        if not counts:
            return
        mean = sum(counts) / len(counts)
        has_drums = any(p.kind == "drums" for p in song.parts.values())
        msg = f"打楽器以外で同時に鳴っているパートは、1 小節あたり平均 {mean:.1f}"
        if mean < 3.5:
            self.add("warn", "曲全体", "", msg + "。薄くてファミコンのように聞こえる。和音の持続（弦・合唱・笙）、"
                     "刻み、対旋律、旋律の 3 度・オクターブ重ね（follow=）を足して 4 パート以上にする")
        else:
            self.add("info", "曲全体", "", msg)
        if not has_drums:
            self.add("info", "曲全体", "", "打楽器がない（静かな曲なら問題ない）")


def harmony_chart(song: Song) -> str:
    """区間ごとのコードと度数の一覧。"""
    lines = []
    for name in dict.fromkeys(song.intro + song.form):
        sec = song.sections[name]
        bars = []
        for bar in sec.chords:
            bars.append(" ".join(f"{c.symbol}({roman(c, song.key)})" if c else "N.C." for c, _ in bar))
        lines.append(f"[{name}] | " + " | ".join(bars) + " |")
    return "\n".join(lines)
