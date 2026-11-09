"use server";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureAudio } from "@/lib/tts";
import { findWord } from "@/lib/words";
import { addResult, getStat, type WordStat, type WordStats } from "@/lib/word-stats";

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

// ---- Word stats: how many times each word was swiped "known" / "not yet" ----
// Kept outside src/ so writing it doesn't trigger a dev-server reload.
const STATS_FILE = path.join(process.cwd(), "data", "word-stats.json");

async function readStats(): Promise<WordStats> {
  try {
    const parsed = JSON.parse(await readFile(STATS_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {}; // missing or unreadable file = no stats yet
  }
}

// Writes go through one queue so two quick swipes can't overwrite each other
let writeQueue: Promise<unknown> = Promise.resolve();

export async function getWordStats(): Promise<WordStats> {
  await writeQueue;
  return readStats();
}

export async function recordWordResult(word: string, known: boolean): Promise<WordStat | null> {
  const entry = findWord(word);
  if (!entry || typeof known !== "boolean") return null;

  const task = writeQueue.then(async () => {
    const stats = addResult(await readStats(), entry.word, known);
    await mkdir(path.dirname(STATS_FILE), { recursive: true });
    await writeFile(STATS_FILE, JSON.stringify(stats, null, 2) + "\n", "utf8");
    return getStat(stats, entry.word);
  });
  writeQueue = task.catch(() => {});
  try {
    return await task;
  } catch (e) {
    console.error("recordWordResult failed:", e);
    return null;
  }
}
