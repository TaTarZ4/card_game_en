"use server";

import { ensureAudio } from "@/lib/tts";
import { findWord } from "@/lib/words";

export type AudioKind = "word" | "example";

export type GetAudioResult = { ok: true; url: string } | { ok: false; error: string };

// Return the clip URL for a word (or its example sentence), generating it on first use.
// The text comes from words.json, not the client, so only known words can be voiced.
export async function getAudio(word: string, kind: AudioKind): Promise<GetAudioResult> {
  const entry = findWord(word);
  if (!entry) return { ok: false, error: "ไม่พบคำศัพท์นี้" };

  const text = kind === "word" ? entry.word : entry.example;
  if (!text) return { ok: false, error: "คำนี้ไม่มีประโยคตัวอย่าง" };

  try {
    const { url } = await ensureAudio(text, audioUrlFor(entry.word, kind));
    return { ok: true, url };
  } catch (e) {
    console.error("getAudio failed:", e);
    return { ok: false, error: "สร้างเสียงไม่สำเร็จ" };
  }
}

const AUDIO_BASE = "/audio/chisa2";

// "ice cream" -> /audio/chisa2/ice-cream.mp3 (example: ice-cream-example.mp3)
function audioUrlFor(word: string, kind: AudioKind): string {
  const slug = word.toLowerCase().trim().replace(/\s+/g, "-");
  return `${AUDIO_BASE}/${slug}${kind === "example" ? "-example" : ""}.mp3`;
}
