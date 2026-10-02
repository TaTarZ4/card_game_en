// Kept separate from words.ts so client components can use it without bundling words.json
export const partOfSpeechTh = {
  noun: "คำนาม",
  verb: "คำกริยา",
  adjective: "คำคุณศัพท์",
  adverb: "คำกริยาวิเศษณ์",
  preposition: "คำบุพบท",
  conjunction: "คำสันธาน",
  pronoun: "คำสรรพนาม",
  interjection: "คำอุทาน",
  phrase: "วลี",
} as const;

export type PartOfSpeech = keyof typeof partOfSpeechTh;

export const PARTS_OF_SPEECH = Object.keys(partOfSpeechTh) as PartOfSpeech[];

export function isPartOfSpeech(value: unknown): value is PartOfSpeech {
  return typeof value === "string" && value in partOfSpeechTh;
}
