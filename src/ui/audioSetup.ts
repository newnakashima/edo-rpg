import { availableBgmIds } from '../data/bgmTracks';
import { availableSeIds } from '../data/seTracks';
import { setAvailableBgm, setAvailableSe, setBgmPlayer, setJinglePlayer, setSePlayer } from '../systems/audio';
import { createAudioContext, WebBgmPlayer, type PlayerContext } from './bgmPlayer';
import { WebSePlayer } from './sePlayer';

// 曲と効果音の再生を始める（docs/audio.md）。書き出した曲・効果音を src/systems/audio.ts に教え、再生処理をつなぐ。
// 曲と効果音は 1 つの AudioContext を共に使う（動かす・止めるのは WebBgmPlayer の役目なので、効果音にだけ別の AudioContext を渡すと、効果音はいつまでも鳴らない）。

export interface AudioPlayers {
  bgm: WebBgmPlayer;
  se: WebSePlayer;
}

/** createContext・target・doc はテストで差し替える。Web Audio を使えない環境では例外を投げる（呼ぶ側で無音にする）。 */
export function startAudio(
  createContext: () => PlayerContext = createAudioContext,
  target: EventTarget = window,
  doc: Pick<Document, 'hidden' | 'addEventListener'> = document,
): AudioPlayers {
  const ctx = createContext();
  const bgm = new WebBgmPlayer(ctx, target, doc);
  const se = new WebSePlayer(ctx);
  setAvailableBgm(availableBgmIds());
  setBgmPlayer((id) => bgm.play(id));
  setJinglePlayer((id) => bgm.playJingle(id));
  const seIds = availableSeIds();
  setAvailableSe(seIds);
  se.preload(seIds);
  setSePlayer((id) => se.play(id));
  return { bgm, se };
}
