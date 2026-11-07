"""標準 MIDI ファイル（SMF）の最小限の読み書き。外部のライブラリを使わない。"""
import struct
from dataclasses import dataclass, field

TPQ = 480  # 四分音符 1 つの tick 数


def _vlq(n: int) -> bytes:
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))


@dataclass
class Track:
    events: list = field(default_factory=list)  # (tick, 並び順, バイト列)

    def meta(self, tick: int, kind: int, data: bytes, order: int = 0):
        self.events.append((tick, order, bytes([0xFF, kind]) + _vlq(len(data)) + data))

    def text(self, tick: int, kind: int, text: str, order: int = 0):
        self.meta(tick, kind, text.encode("utf-8"), order)

    def msg(self, tick: int, data: bytes, order: int = 5):
        self.events.append((tick, order, data))

    def encode(self) -> bytes:
        body = b""
        last = 0
        # 同じ tick では、メタ情報 → 消音 → 発音 の順にする
        for tick, _order, data in sorted(self.events, key=lambda e: (e[0], e[1])):
            body += _vlq(tick - last) + data
            last = tick
        body += _vlq(0) + b"\xFF\x2F\x00"
        return b"MTrk" + struct.pack(">I", len(body)) + body


def write_smf(path, tracks: list) -> None:
    data = b"MThd" + struct.pack(">IHHH", 6, 1, len(tracks), TPQ)
    for t in tracks:
        data += t.encode()
    with open(path, "wb") as f:
        f.write(data)


# ---- 読み込み ----

@dataclass
class MidiNote:
    track: int
    channel: int
    start: int  # tick
    end: int
    pitch: int
    vel: int
    program: int
    volume: int
    pan: int
    expression: int


@dataclass
class MidiFile:
    tpq: int
    notes: list
    tempos: list  # [(tick, 四分音符あたりのマイクロ秒)]
    track_names: dict  # トラック番号 → 名前
    markers: list  # [(tick, 文字列)]
    texts: list  # [(tick, 文字列)]
    end_tick: int

    def seconds(self, tick: int) -> float:
        t = 0.0
        last_tick = 0
        tempo = 500000
        for tt, tp in self.tempos:
            if tt >= tick:
                break
            t += (tt - last_tick) * tempo / 1e6 / self.tpq
            last_tick, tempo = tt, tp
        return t + (tick - last_tick) * tempo / 1e6 / self.tpq


def read_smf(path) -> MidiFile:
    data = open(path, "rb").read()
    if data[:4] != b"MThd":
        raise ValueError("MIDI ファイルではない")
    hlen, fmt, ntrks, division = struct.unpack(">IHHH", data[4:14])
    if division & 0x8000:
        raise ValueError("SMPTE 形式の時間は読めない")
    pos = 8 + hlen
    notes, tempos, markers, texts, names = [], [], [], [], {}
    end_tick = 0
    for tr in range(ntrks):
        if data[pos:pos + 4] != b"MTrk":
            raise ValueError("トラックの見出しが壊れている")
        tlen = struct.unpack(">I", data[pos + 4:pos + 8])[0]
        p = pos + 8
        endp = p + tlen
        pos = endp
        tick = 0
        status = 0
        on = {}
        ch_state = {c: {"program": 0, "volume": 100, "pan": 64, "expression": 127} for c in range(16)}

        def vlq():
            nonlocal p
            n = 0
            while True:
                b = data[p]
                p += 1
                n = (n << 7) | (b & 0x7F)
                if not b & 0x80:
                    return n

        while p < endp:
            tick += vlq()
            b = data[p]
            if b & 0x80:
                status = b
                p += 1
            if status == 0xFF:
                kind = data[p]
                p += 1
                ln = vlq()
                payload = data[p:p + ln]
                p += ln
                if kind == 0x51:
                    tempos.append((tick, int.from_bytes(payload, "big")))
                elif kind == 0x03:
                    names[tr] = payload.decode("utf-8", "replace")
                elif kind == 0x06:
                    markers.append((tick, payload.decode("utf-8", "replace")))
                elif kind == 0x01:
                    texts.append((tick, payload.decode("utf-8", "replace")))
                elif kind == 0x2F:
                    break
                continue
            if status in (0xF0, 0xF7):
                ln = vlq()
                p += ln
                continue
            kind = status & 0xF0
            ch = status & 0x0F
            if kind in (0xC0, 0xD0):
                a = data[p]
                p += 1
                if kind == 0xC0:
                    ch_state[ch]["program"] = a
                continue
            a, v = data[p], data[p + 1]
            p += 2
            st = ch_state[ch]
            if kind == 0x90 and v > 0:
                on.setdefault((ch, a), []).append((tick, v, dict(st)))
            elif kind == 0x80 or (kind == 0x90 and v == 0):
                lst = on.get((ch, a))
                if lst:
                    s_tick, vel, snap = lst.pop(0)
                    notes.append(MidiNote(tr, ch, s_tick, tick, a, vel, snap["program"], snap["volume"], snap["pan"],
                                          snap["expression"]))
            elif kind == 0xB0:
                if a == 7:
                    st["volume"] = v
                elif a == 10:
                    st["pan"] = v
                elif a == 11:
                    st["expression"] = v
        end_tick = max(end_tick, tick)
        for (ch, a), lst in on.items():
            for s_tick, vel, snap in lst:
                notes.append(MidiNote(tr, ch, s_tick, tick, a, vel, snap["program"], snap["volume"], snap["pan"],
                                      snap["expression"]))
    tempos.sort()
    if not tempos or tempos[0][0] > 0:
        tempos.insert(0, (0, 500000))
    notes.sort(key=lambda n: (n.start, n.track, n.pitch))
    return MidiFile(division, notes, tempos, names, markers, texts, end_tick)
