import { seUrl } from '../data/seTracks';
import type { SeId } from '../systems/audio';
import type { PlayerContext } from './bgmPlayer';

// 効果音の再生処理（Web Audio）。src/systems/audio.ts の playSe から、書き出してある効果音だけが渡される。
// - 効果音は短いので、起動時にすべて読み込んで音に伸ばし、置いておく。同じ音も別の音も重ねて鳴らせる。
// - AudioContext は曲（src/ui/bgmPlayer.ts）と共に使う。動かすのは曲の再生処理の役目（最初の操作・画面の表示）で、
//   動いていない間（操作の前・画面が隠れている間）は鳴らさない（鳴らすと、動き出したときにまとめて鳴ってしまう）。

/** 効果音の大きさ（曲の MASTER_VOLUME と同じ尺度。効果音どうしの大きさは scripts/sfx/build.py がそろえている）。 */
const SE_VOLUME = 0.6;
/** 同じ効果音をこの秒数より短い間に続けて頼まれたら、2 つ目は鳴らさない（全体技などで重なって大きくなるのを防ぐ）。 */
const SAME_SE_GAP = 0.03;
/** 一度に鳴らす効果音の数の上限。超えたら、いちばん古い音を止める。 */
const MAX_VOICES = 8;
/** 読み込みの途中で頼まれた音は、これより遅れたら鳴らさない（場面とずれた音を鳴らさないため。ミリ秒）。 */
const LATE_LIMIT_MS = 150;

interface SeVoice {
  id: SeId;
  source: AudioBufferSourceNode;
  startedAt: number;
}

export class WebSePlayer {
  private readonly ctx: PlayerContext;
  private readonly out: GainNode;
  private readonly buffers = new Map<SeId, Promise<AudioBuffer | null>>();
  /** 読み込みを終えた音（すぐ鳴らせる音）。 */
  private readonly ready = new Map<SeId, AudioBuffer>();
  private voices: SeVoice[] = [];
  private warned = false;
  private readonly now: () => number;

  /** now はテストで差し替える（読み込みの遅れを測る時計。ミリ秒）。 */
  constructor(ctx: PlayerContext, now: () => number = () => performance.now()) {
    this.ctx = ctx;
    this.now = now;
    this.out = ctx.createGain();
    this.out.gain.value = SE_VOLUME;
    this.out.connect(ctx.destination);
  }

  /** 効果音を読み込んで置いておく（起動時に、書き出してあるすべての効果音で呼ぶ）。 */
  preload(ids: Iterable<SeId>): void {
    for (const id of ids) void this.load(id);
  }

  /** 効果音を 1 度鳴らす。読み込みの途中なら、読み込めたときに遅れが小さければ鳴らす。 */
  play(id: SeId): void {
    if (this.ctx.state !== 'running') return;
    const buffer = this.ready.get(id);
    if (buffer) {
      this.start(id, buffer);
      return;
    }
    const asked = this.now();
    void this.load(id).then((b) => {
      if (b && this.ctx.state === 'running' && this.now() - asked <= LATE_LIMIT_MS) this.start(id, b);
    });
  }

  /** いま鳴らしている効果音（動作確認用）。 */
  status(): { playing: SeId[]; loaded: SeId[] } {
    return { playing: this.voices.map((v) => v.id), loaded: [...this.ready.keys()] };
  }

  private start(id: SeId, buffer: AudioBuffer): void {
    const now = this.ctx.currentTime;
    if (this.voices.some((v) => v.id === id && now - v.startedAt < SAME_SE_GAP)) return;
    while (this.voices.length >= MAX_VOICES) {
      const oldest = this.voices.shift()!;
      oldest.source.onended = null;
      oldest.source.stop();
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.out);
    const voice: SeVoice = { id, source, startedAt: now };
    source.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice);
    };
    this.voices.push(voice);
    source.start(now);
  }

  private load(id: SeId): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(id);
    if (!buffer) {
      const url = seUrl(id);
      buffer = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${url}`);
          return res.arrayBuffer();
        })
        .then((file) => this.ctx.decodeAudioData(file))
        .then((decoded) => {
          this.ready.set(id, decoded);
          return decoded;
        })
        .catch((error: unknown) => {
          // Ogg Opus を読めないブラウザなどで、黙って無音にならないよう 1 度だけ知らせる。失敗したら覚えておかず、次に頼まれたときに読み直す
          if (!this.warned) console.warn(`効果音 ${id} を鳴らせない`, error);
          this.warned = true;
          this.buffers.delete(id);
          return null;
        });
      this.buffers.set(id, buffer);
    }
    return buffer;
  }
}
