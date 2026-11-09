// Per-word swipe statistics. Stored on the server in data/word-stats.json
// (see src/app/actions.ts); this file only holds the shared types and helpers.
// Keyed by the lowercased word so the same word on different days shares one record.

export type WordStat = { known: number; unknown: number };
export type WordStats = Record<string, WordStat>;

export const statKey = (word: string) => word.trim().toLowerCase();

export function getStat(stats: WordStats, word: string): WordStat {
  return stats[statKey(word)] ?? { known: 0, unknown: 0 };
}

export function addResult(stats: WordStats, word: string, known: boolean): WordStats {
  const prev = getStat(stats, word);
  return {
    ...stats,
    [statKey(word)]: known
      ? { ...prev, known: prev.known + 1 }
      : { ...prev, unknown: prev.unknown + 1 },
  };
}
