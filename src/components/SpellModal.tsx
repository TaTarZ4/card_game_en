"use client";

import { useEffect, useRef, useState } from "react";
import { playAudio } from "@/lib/play-audio";
import type { Word } from "@/lib/words";

const COPIES_TO_UNLOCK = 5;

// Case and extra spaces are ignored: "Ice  Cream" matches "ice cream"
const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Pause on a finished word so the green letters are visible
const DONE_DELAY = 450;

// Blocks the card until the word is spelled from audio. Giving up reveals the word,
// which must then be typed COPIES_TO_UNLOCK times. Remount per card (key) to reset.
export default function SpellModal({ word, onUnlock }: { word: Word; onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [gaveUp, setGaveUp] = useState(false);
  const [copies, setCopies] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const unlocked = gaveUp && copies >= COPIES_TO_UNLOCK;

  useEffect(() => {
    inputRef.current?.focus();
  }, [gaveUp]);

  // Play once when the popup opens; the speaker button replays it.
  // If the browser blocks autoplay, playAudio falls back to speech synthesis or stays silent.
  useEffect(() => {
    playAudio(word, "word");
  }, [word]);

  const target = normalize(word.word);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(value: string) {
    if (finishing || unlocked) return;
    const v = value.toLowerCase().slice(0, target.length);
    setInput(v);
    if (v !== target) return;
    // Whole word typed correctly
    setFinishing(true);
    timer.current = setTimeout(() => {
      setFinishing(false);
      if (!gaveUp) {
        onUnlock();
        return;
      }
      if (copies + 1 >= COPIES_TO_UNLOCK) {
        setCopies(COPIES_TO_UNLOCK);
        onUnlock();
        return;
      }
      setCopies(copies + 1);
      setInput("");
      playAudio(word, "word");
    }, DONE_DELAY);
  }

  function giveUp() {
    setGaveUp(true);
    setInput("");
    playAudio(word, "word");
    inputRef.current?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="สะกดคำเพื่อปลดล็อกการ์ด"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-6"
    >
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex w-full max-w-90 flex-col items-center gap-5 rounded-3xl border border-line bg-card p-6 shadow-2xl"
      >
        <div className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
          สะกดคำเพื่อปลดล็อกการ์ด
        </div>

        {/* The word stays hidden: the audio is the only clue */}
        <button
          type="button"
          aria-label="ฟังเสียงคำศัพท์"
          onClick={() => playAudio(word, "word")}
          className="flex size-24 items-center justify-center rounded-full bg-ink text-card"
        >
          <svg
            width={44}
            height={44}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        </button>

        {gaveUp ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="font-serif text-[40px] leading-[1.1] font-bold">{word.word}</div>
            {word.ipa && <div className="text-[17px] text-muted">{word.ipa}</div>}
          </div>
        ) : (
          <div className="text-[15px] text-muted">กดฟังเสียง แล้วพิมพ์คำที่ได้ยิน</div>
        )}

        {/* One box per letter; each typed letter turns green if right, red if wrong */}
        <div
          className="relative flex flex-wrap justify-center gap-1.5"
          onClick={() => inputRef.current?.focus()}
        >
          {[...target].map((ch, i) => {
            const typed = input[i];
            const state = typed === undefined ? "empty" : typed === ch ? "ok" : "bad";
            if (ch === " ") return <span key={i} className="w-3" />;
            return (
              <span
                key={i}
                className={`flex h-12 w-9 items-center justify-center rounded-lg border-2 font-serif text-2xl font-bold ${
                  state === "ok"
                    ? "border-green-600 bg-green-100 text-green-800"
                    : state === "bad"
                      ? "border-unknown bg-unknown-bg text-unknown-ink"
                      : i === input.length
                        ? "border-known bg-panel"
                        : "border-line-strong bg-panel"
                }`}
              >
                {typed}
              </span>
            );
          })}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            disabled={unlocked}
            maxLength={target.length}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="พิมพ์คำศัพท์"
            className="absolute inset-0 size-full cursor-text opacity-0"
          />
        </div>

        {gaveUp && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2" aria-hidden>
              {Array.from({ length: COPIES_TO_UNLOCK }, (_, i) => (
                <span
                  key={i}
                  className={`size-3.5 rounded-full ${i < copies ? "bg-known" : "bg-line-strong"}`}
                />
              ))}
            </div>
            <div className="text-sm text-muted">
              {unlocked
                ? "ปลดล็อกแล้ว"
                : `พิมพ์คำนี้อีก ${COPIES_TO_UNLOCK - copies} ครั้งเพื่อปลดล็อก`}
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-2.5">
          {!gaveUp && (
            <button
              type="button"
              onClick={giveUp}
              className="h-13 rounded-full border-2 border-unknown text-base font-semibold text-unknown"
            >
              ยอมแพ้
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
