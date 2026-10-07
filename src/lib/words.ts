import data from "@/data/words.json";
import type { PartOfSpeech } from "@/lib/part-of-speech";

export type { PartOfSpeech };

export type Word = {
  word: string;
  ipa?: string;
  readingTh?: string; // Thai transliteration, e.g. "แกม-เบิล"
  meaning: string;
  partOfSpeech: PartOfSpeech;
  example?: string;
  exampleTh?: string;
};

export type WordDay = {
  index: number; // day number: 1, 2, 3, ...
  date: string; // YYYY-MM-DD
  words: Word[];
};

export type WordWithDate = Word & { date: string };

// Sorted newest first, regardless of order in the JSON file
const days: WordDay[] = (data as WordDay[])
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date));

export function getAllDays(): WordDay[] {
  return days;
}

export function getDates(): string[] {
  return days.map((d) => d.date);
}

export function getLatestDay(): WordDay | undefined {
  return days[0];
}

export function getWordsByDate(date: string): Word[] {
  return days.find((d) => d.date === date)?.words ?? [];
}

export function getDayByIndex(index: number): WordDay | undefined {
  return days.find((d) => d.index === index);
}

// Review schedule: days to study in order, as "days before the latest day".
// 0 = latest day, 1 = the day before, and so on.
export const REVIEW_OFFSETS = [0, 1, 2, 4, 6, 10, 14, 20];

export type ReviewSet = WordDay & { offset: number };

// Days to study in order: latest day minus each offset. Days that don't exist are skipped.
export function getReviewSets(offsets: number[] = REVIEW_OFFSETS): ReviewSet[] {
  const latest = getLatestDay();
  if (!latest) return [];
  return offsets.flatMap((offset) => {
    const day = getDayByIndex(latest.index - offset);
    return day ? [{ ...day, offset }] : [];
  });
}

export function getAllWords(): WordWithDate[] {
  return days.flatMap((d) => d.words.map((w) => ({ ...w, date: d.date })));
}

export function findWord(word: string): WordWithDate | undefined {
  const target = word.toLowerCase();
  return getAllWords().find((w) => w.word.toLowerCase() === target);
}
