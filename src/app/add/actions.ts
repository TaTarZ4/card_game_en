"use server";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isPartOfSpeech } from "@/lib/part-of-speech";
import type { Word, WordDay } from "@/lib/words";

const WORDS_FILE = path.join(process.cwd(), "src", "data", "words.json");

export type NewWordInput = {
  word: string;
  ipa: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleTh: string;
};

export type AddWordsResult = { ok: true; added: number; index: number } | { ok: false; error: string };

export async function addWords(date: string, inputs: NewWordInput[]): Promise<AddWordsResult> {
  // Writing to the source tree only makes sense on a local dev machine
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "เพิ่มคำได้เฉพาะตอนรัน npm run dev เท่านั้น" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "รูปแบบวันที่ไม่ถูกต้อง" };
  }

  const words: Word[] = [];
  for (const [i, input] of inputs.entries()) {
    const word = input.word?.trim() ?? "";
    const meaning = input.meaning?.trim() ?? "";
    if (!word && !meaning) continue; // skip blank rows
    if (!word || !meaning) {
      return { ok: false, error: `แถวที่ ${i + 1}: ต้องใส่ทั้งคำศัพท์และความหมาย` };
    }
    if (!isPartOfSpeech(input.partOfSpeech)) {
      return { ok: false, error: `แถวที่ ${i + 1}: ชนิดคำไม่ถูกต้อง` };
    }

    const optional = (v: string | undefined) => v?.trim() || undefined;
    words.push({
      word,
      ipa: optional(input.ipa),
      meaning,
      partOfSpeech: input.partOfSpeech,
      example: optional(input.example),
      exampleTh: optional(input.exampleTh),
    });
  }

  if (words.length === 0) {
    return { ok: false, error: "ยังไม่ได้ใส่คำศัพท์" };
  }

  const days = JSON.parse(await readFile(WORDS_FILE, "utf8")) as WordDay[];

  const seen = new Set(days.flatMap((d) => d.words.map((w) => w.word.toLowerCase())));
  const dupes: string[] = [];
  for (const w of words) {
    const key = w.word.toLowerCase();
    if (seen.has(key)) dupes.push(w.word);
    seen.add(key);
  }
  if (dupes.length > 0) {
    return { ok: false, error: `มีคำนี้อยู่แล้ว: ${dupes.join(", ")}` };
  }

  let day = days.find((d) => d.date === date);
  if (!day) {
    const latest = days.reduce<WordDay | undefined>(
      (a, d) => (!a || d.index > a.index ? d : a),
      undefined,
    );
    if (latest && date < latest.date) {
      return {
        ok: false,
        error: `วันที่ต้องไม่ก่อน Day ล่าสุด (${latest.date}) หรือเลือกวันที่ที่มีอยู่แล้ว`,
      };
    }
    day = { index: (latest?.index ?? 0) + 1, date, words: [] };
    days.push(day);
  }
  day.words.push(...words);

  days.sort((a, b) => a.index - b.index);
  await writeFile(WORDS_FILE, formatDays(days), "utf8");

  revalidatePath("/", "layout");
  return { ok: true, added: words.length, index: day.index };
}

// Same layout as the hand-written file: one word per line
function formatDays(days: WordDay[]): string {
  const line = (w: Word) =>
    "{ " +
    Object.entries(w)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(", ") +
    " }";

  const blocks = days.map(
    (d) =>
      `  {\n    "index": ${d.index},\n    "date": ${JSON.stringify(d.date)},\n    "words": [\n` +
      d.words.map((w) => `      ${line(w)}`).join(",\n") +
      `\n    ]\n  }`,
  );
  return `[\n${blocks.join(",\n")}\n]\n`;
}
