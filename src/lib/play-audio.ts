import { getAudio, type AudioKind } from "@/app/actions";
import type { Word } from "@/lib/words";

const SPEECH_RATE = 0.9;

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = SPEECH_RATE;
    synth.speak(u);
  } catch {}
}

// Clip URLs already resolved this session, keyed by "kind:word"
const audioUrls = new Map<string, string>();

// Only one clip plays at a time; a newer call supersedes any pending or playing one
// (also stops Strict Mode's double-run effects from playing the clip twice)
let current: HTMLAudioElement | null = null;
let latestCall = 0;

function stopCurrent() {
  current?.pause();
  current = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}

// Play the ElevenLabs clip (generated on first use); fall back to the browser's TTS
export async function playAudio(word: Word, kind: AudioKind) {
  const text = kind === "word" ? word.word : word.example;
  if (!text) return;
  const call = ++latestCall;
  stopCurrent();
  const key = `${kind}:${word.word}`;
  try {
    let url = audioUrls.get(key);
    if (!url) {
      const res = await getAudio(word.word, kind);
      if (!res.ok) throw new Error(res.error);
      url = res.url;
      audioUrls.set(key, url);
    }
    if (call !== latestCall) return;
    const audio = new Audio(url);
    current = audio;
    await audio.play();
  } catch (e) {
    // pause() from a newer call rejects play() with AbortError; don't speak over it
    if (call !== latestCall || (e instanceof DOMException && e.name === "AbortError")) return;
    speak(text);
  }
}

// Fisher–Yates shuffle, returns a new array
export function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
