import { BGM_TRACKS, type BgmTrack } from '../data/bgmTracks';
import type { BgmId } from '../systems/audio';

// 曲の再生処理（Web Audio）。src/systems/audio.ts の playBgm・playJingle から、曲が替わったときだけ呼ばれる。
// - ループする曲は、前奏の後（loopStart）から曲の終わり（loopEnd）までを継ぎ目なく繰り返す。
// - ジングルは、鳴らしている曲を止めて 1 度鳴らし、鳴り終えたら止めた位置から曲に戻す。ジングルの間（読み込み中も）に別の曲を頼まれたら、ジングルを切ってその曲にする。
//   曲を止める頼み（null）ではジングルを切らない（勝利・全滅・終劇は、曲を止めてからジングルを鳴らすため）。
// - ブラウザは操作があるまで音を出させないので、最初の操作で AudioContext を動かす。画面が隠れている間は止める。

const MASTER_VOLUME = 0.6;
/** 曲を止めるとき・戻すときのフェードの長さ（秒）。 */
const FADE = 0.3;
/** 音を伸ばしたままメモリに置いておく曲の数（1 曲で数十 MB になるため、近ごろ鳴らした曲だけにする）。 */
const DECODED_CACHE = 4;

/** 曲の頭から t 秒鳴らしたときの、曲の中の位置。loopEnd を過ぎたら loopStart からの繰り返しに入る。 */
export function loopPosition(t: number, loopStart: number, loopEnd: number): number {
  if (t < loopEnd || loopEnd <= loopStart) return t;
  return loopStart + ((t - loopStart) % (loopEnd - loopStart));
}

interface Voice {
  id: BgmId;
  track: BgmTrack;
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** 鳴らし始めた AudioContext の時刻と、そのときの曲の中の位置。 */
  startedAt: number;
  offset: number;
}

/** 再生に使う AudioContext の部分（テストでは偽物を渡す）。 */
export type PlayerContext = BaseAudioContext & Pick<AudioContext, 'resume' | 'suspend'>;

export class WebBgmPlayer {
  private readonly ctx: PlayerContext;
  private readonly master: GainNode;
  /** 読み込んだファイル（圧縮したまま。すべて置いておく）と、音に伸ばしたもの（近ごろの数曲だけ）。 */
  private readonly files = new Map<BgmId, Promise<ArrayBuffer | null>>();
  private readonly decoded = new Map<BgmId, Promise<AudioBuffer | null>>();
  /** 鳴らすことになっている曲（ジングルの間も、ジングルの後に戻る曲として持つ）。 */
  private wanted: BgmId | null = null;
  private bgm: Voice | null = null;
  /** ジングルのために止めた曲と、その位置。 */
  private paused: { id: BgmId; position: number } | null = null;
  private jingle: Voice | null = null;
  /** 読み込みを待っている間に頼みが替わったら、古い頼みを捨てるための番号。 */
  private bgmToken = 0;
  private jingleToken = 0;
  private warned = false;

  /** ctx・target・doc はテストで差し替える。AudioContext を作れない環境では例外を投げる（呼ぶ側で無音にする）。 */
  constructor(ctx: PlayerContext = createContext(), target: EventTarget = window, doc: Pick<Document, 'hidden' | 'addEventListener'> = document) {
    this.ctx = ctx;
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_VOLUME;
    this.master.connect(this.ctx.destination);
    this.unlockOnGesture(target);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  /** ループする曲を頭から鳴らす（null なら止める）。 */
  play(id: BgmId | null): void {
    this.wanted = id;
    this.paused = null;
    const token = ++this.bgmToken;
    this.fadeOut(this.bgm);
    this.bgm = null;
    if (id === null) return;
    // ジングルの間（読み込み中も）に次の曲を頼まれたら、ジングルを切る（勝利のジングルの途中でフィールドに戻ったときなど）
    this.jingleToken++;
    this.stopJingle();
    void this.startBgm(id, 0, false, () => token === this.bgmToken);
  }

  /** ジングルを 1 度鳴らし、鳴り終えたら鳴らしていた曲に戻る。 */
  playJingle(id: BgmId): void {
    const token = ++this.jingleToken;
    this.stopJingle();
    if (this.wanted !== null && !this.paused) {
      const position = this.bgm && this.bgm.id === this.wanted ? this.position(this.bgm) : 0;
      this.paused = { id: this.wanted, position };
    }
    // 読み込み中の曲も、ジングルの後に回す
    this.bgmToken++;
    this.fadeOut(this.bgm);
    this.bgm = null;
    void this.load(id).then((buffer) => {
      if (token !== this.jingleToken) return;
      const track = BGM_TRACKS[id];
      if (!buffer || !track) {
        this.resume();
        return;
      }
      const voice = this.startVoice(id, track, buffer, 0, false, false);
      this.jingle = voice;
      voice.source.onended = () => {
        if (token !== this.jingleToken) return;
        this.jingle = null;
        this.resume();
      };
    });
  }

  /** いま鳴らしている曲と、曲の中の位置（動作確認用）。 */
  status(): { bgm: BgmId | null; position: number; jingle: BgmId | null; context: AudioContextState } {
    return { bgm: this.bgm?.id ?? null, position: this.bgm ? this.position(this.bgm) : 0, jingle: this.jingle?.id ?? null, context: this.ctx.state };
  }

  private resume(): void {
    const paused = this.paused;
    this.paused = null;
    if (!paused || paused.id !== this.wanted) return;
    const token = ++this.bgmToken;
    void this.startBgm(paused.id, paused.position, true, () => token === this.bgmToken);
  }

  private async startBgm(id: BgmId, offset: number, fadeIn: boolean, current: () => boolean): Promise<void> {
    const track = BGM_TRACKS[id];
    const buffer = track ? await this.load(id) : null;
    if (!track || !buffer || !current()) return;
    this.bgm = this.startVoice(id, track, buffer, offset, track.loop, fadeIn);
  }

  private startVoice(id: BgmId, track: BgmTrack, buffer: AudioBuffer, offset: number, loop: boolean, fadeIn: boolean): Voice {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    if (loop) {
      source.loop = true;
      source.loopStart = track.loopStart;
      source.loopEnd = Math.min(track.loopEnd, buffer.duration);
    }
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    if (fadeIn) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + FADE);
    }
    source.connect(gain).connect(this.master);
    source.start(now, Math.min(offset, buffer.duration));
    return { id, track, source, gain, startedAt: now, offset };
  }

  private position(voice: Voice): number {
    const t = voice.offset + this.ctx.currentTime - voice.startedAt;
    return voice.track.loop ? loopPosition(t, voice.track.loopStart, Math.min(voice.track.loopEnd, voice.source.buffer?.duration ?? Infinity)) : t;
  }

  private stopJingle(): void {
    if (!this.jingle) return;
    this.jingle.source.onended = null;
    this.fadeOut(this.jingle);
    this.jingle = null;
  }

  private fadeOut(voice: Voice | null): void {
    if (!voice) return;
    const now = this.ctx.currentTime;
    // 音を出し始める前（操作の前・画面が隠れている間）は時刻が進まず、フェードの予約が後で鳴るので、すぐ止める
    if (this.ctx.state !== 'running') {
      voice.source.stop();
      return;
    }
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + FADE);
    voice.source.stop(now + FADE);
  }

  private load(id: BgmId): Promise<AudioBuffer | null> {
    const cached = this.decoded.get(id);
    if (cached) {
      // 近ごろ鳴らした順に並べ直す
      this.decoded.delete(id);
      this.decoded.set(id, cached);
      return cached;
    }
    const decoding = this.fetchFile(id)
      .then((file) => (file ? this.ctx.decodeAudioData(file.slice(0)) : null))
      .catch((error: unknown) => {
        // Ogg Opus を読めないブラウザなどで、黙って無音にならないよう 1 度だけ知らせる
        if (!this.warned) console.warn(`曲 ${id} を鳴らせない`, error);
        this.warned = true;
        return null;
      })
      .then((buffer) => {
        // 失敗したら覚えておかず、次に頼まれたときに読み直す
        if (!buffer && this.decoded.get(id) === decoding) this.decoded.delete(id);
        return buffer;
      });
    this.decoded.set(id, decoding);
    while (this.decoded.size > DECODED_CACHE) {
      const oldest = this.decoded.keys().next().value as BgmId;
      this.decoded.delete(oldest);
    }
    return decoding;
  }

  private fetchFile(id: BgmId): Promise<ArrayBuffer | null> {
    let file = this.files.get(id);
    if (!file) {
      const track = BGM_TRACKS[id];
      file = track
        ? fetch(track.url).then((res) => {
            if (!res.ok) throw new Error(`${res.status} ${track.url}`);
            return res.arrayBuffer();
          })
        : Promise.resolve(null);
      file.catch(() => this.files.delete(id));
      this.files.set(id, file);
    }
    return file;
  }

  /** 操作のたびに、止まっていれば動かす（最初の操作のほか、iOS で通話などのあとに止められたときも戻すため、外さない）。 */
  private unlockOnGesture(target: EventTarget): void {
    const unlock = (): void => {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    };
    for (const e of ['pointerdown', 'keydown', 'touchend']) target.addEventListener(e, unlock, true);
  }
}

/** 曲は 48 kHz で書き出してあるので、できれば同じ周波数で動かして伸ばし直しの手間を省く。 */
function createContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: 48000 });
  } catch {
    return new AudioContext();
  }
}
