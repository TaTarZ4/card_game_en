"use client";

import { useEffect, useRef, useState } from "react";
import { partOfSpeechTh } from "@/lib/part-of-speech";
import { playAudio, shuffle } from "@/lib/play-audio";
import SpellModal from "@/components/SpellModal";
import type { ReviewSet } from "@/lib/words";

const SWIPE_THRESHOLD = 110;

type Dir = "left" | "right";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export default function Flashcards({ sets }: { sets: ReviewSet[] }) {
  const [setIdx, setSetIdx] = useState(0);
  const set = sets[setIdx];
  const nextSet = sets[setIdx + 1];
  const words = set.words;

  const [order, setOrder] = useState(() => shuffle(range(words.length)));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Dir | null>(null);
  const [snap, setSnap] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [unknown, setUnknown] = useState<number[]>([]);
  // Each new card stays locked behind the spelling popup until the word is spelled
  const [locked, setLocked] = useState(true);

  const startX = useRef(0);
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const total = order.length;
  const done = pos >= total;
  const word = words[order[Math.min(pos, total - 1)]];

  // Skip transitions for one frame so the next card appears without animating
  function snapReset() {
    setSnap(true);
    timer.current = setTimeout(() => setSnap(false), 40);
  }

  function swipe(dir: Dir) {
    if (leaving || done) return;
    setLeaving(dir);
    setDragging(false);
    setDx(dir === "right" ? 560 : -560);
    clearTimeout(timer.current);
    const id = order[pos];
    timer.current = setTimeout(() => {
      if (dir === "right") setKnown((k) => [...k, id]);
      else setUnknown((u) => [...u, id]);
      setPos((p) => p + 1);
      setDx(0);
      setFlipped(false);
      setLeaving(null);
      setLocked(true);
      snapReset();
    }, 280);
  }

  function startRound(list: number[]) {
    clearTimeout(timer.current);
    setOrder(shuffle(list));
    setPos(0);
    setFlipped(false);
    setDx(0);
    setDragging(false);
    setLeaving(null);
    setKnown([]);
    setUnknown([]);
    setLocked(true);
    snapReset();
  }

  function goToSet(i: number) {
    setSetIdx(i);
    startRound(range(sets[i].words.length));
  }

  function toggleFlip() {
    if (!leaving) setFlipped((f) => !f);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (leaving || done) return;
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    setDx(0);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(d);
  }

  function onPointerUp() {
    if (!dragging) return;
    if (dx > SWIPE_THRESHOLD) swipe("right");
    else if (dx < -SWIPE_THRESHOLD) swipe("left");
    else {
      setDragging(false);
      setDx(0);
    }
  }

  function onCardClick() {
    if (moved.current) {
      moved.current = false;
      return;
    }
    toggleFlip();
  }

  if (!word) return <p className="p-8 text-muted">ยังไม่มีคำศัพท์</p>;

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const pct = total ? Math.round((pos / total) * 100) : 0;
  const posTh = partOfSpeechTh[word.partOfSpeech];

  return (
    <div className="flex w-full max-w-105 flex-col gap-4.5 overflow-hidden px-6 pt-7 pb-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
            Day {set.index} · ชุด {setIdx + 1}/{sets.length}
          </div>
          <h1 className="text-[28px] leading-[1.2] font-bold">
            {set.offset === 0 ? "ท่องศัพท์วันนี้" : `ทบทวน ${set.offset} วันก่อน`}
          </h1>
        </div>
        <div className="font-serif text-[22px] font-medium">
          {done ? total : pos + 1} / {total}
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-2 rounded-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-xl bg-unknown-bg px-3.5 py-2.5 text-unknown-ink">
          <span className="text-sm font-semibold">ยังไม่จำ</span>
          <span className="font-serif text-[22px] font-bold">{unknown.length}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-known-bg px-3.5 py-2.5 text-known-ink">
          <span className="text-sm font-semibold">จำได้</span>
          <span className="font-serif text-[22px] font-bold">{known.length}</span>
        </div>
      </div>

      {!done ? (
        <>
          {locked && (
            <SpellModal
              key={`${setIdx}:${pos}:${total}`}
              word={word}
              onUnlock={() => setLocked(false)}
            />
          )}
          {/* Card stack */}
          <div className="relative h-125 perspective-[1400px]">
            {pos + 1 < total && (
              <div className="absolute top-4.5 right-3.5 -bottom-1.5 left-3.5 rounded-3xl border border-line bg-card opacity-70" />
            )}

            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={onCardClick}
              className="absolute inset-0 cursor-grab touch-none select-none"
              style={{
                transform: `translateX(${dx}px) rotate(${(dx / 18).toFixed(2)}deg)`,
                transition: dragging || snap ? "none" : "transform .3s ease",
              }}
            >
              <div
                className="absolute inset-0 transform-3d"
                style={{
                  transform: `rotateY(${flipped ? 180 : 0}deg)`,
                  transition: snap ? "none" : "transform .5s cubic-bezier(.2,.7,.2,1)",
                }}
              >
                {/* Front */}
                <div className="backface-hidden absolute inset-0 flex flex-col rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_rgba(60,45,20,0.12)]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-chip px-3 py-1.5 text-sm font-semibold text-subtle">
                      {word.partOfSpeech} · {posTh}
                    </span>
                    <div className="flex items-center gap-2">
                      <CopyButton
                        text={word.word}
                        className="border border-line-strong bg-transparent text-ink"
                      />
                      <SpeakButton
                        label="ฟังเสียงคำศัพท์"
                        className="bg-ink text-card"
                        onPointerDown={stop}
                        onClick={(e) => {
                          stop(e);
                          playAudio(word, "word");
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex grow flex-col items-center justify-center gap-2 text-center">
                    <div className="font-serif text-[46px] leading-[1.1] font-bold tracking-[-0.01em]">
                      {word.word}
                    </div>
                    {word.ipa && <div className="text-[17px] text-muted">{word.ipa}</div>}
                    {word.readingTh && (
                      <div className="text-lg font-medium text-subtle">{word.readingTh}</div>
                    )}
                  </div>
                  {word.example && (
                    <div className="flex flex-col gap-2 rounded-2xl bg-panel p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold tracking-[0.06em] text-muted">
                          ตัวอย่างการใช้
                        </span>
                        <SpeakButton
                          label="ฟังเสียงประโยคตัวอย่าง"
                          small
                          className="border border-line-strong bg-transparent text-ink"
                          onPointerDown={stop}
                          onClick={(e) => {
                            stop(e);
                            playAudio(word, "example");
                          }}
                        />
                      </div>
                      <div className="text-[17px] leading-normal">“{word.example}”</div>
                    </div>
                  )}
                  <div className="mt-3.5 text-center text-[13px] text-muted">
                    แตะการ์ด หรือกดปุ่มพลิก เพื่อดูเฉลย
                  </div>
                </div>

                {/* Back */}
                <div className="backface-hidden absolute inset-0 flex rotate-y-180 flex-col rounded-3xl bg-back p-6 text-white shadow-[0_18px_40px_rgba(20,30,50,0.25)]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold">
                      {posTh}
                    </span>
                    <div className="flex items-center gap-2">
                      <CopyButton
                        text={word.word}
                        className="border border-white/30 bg-transparent text-white"
                      />
                      <SpeakButton
                        label="ฟังเสียงคำศัพท์"
                        className="bg-white text-back"
                        onPointerDown={stop}
                        onClick={(e) => {
                          stop(e);
                          playAudio(word, "word");
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex grow flex-col items-center justify-center gap-2.5 text-center">
                    <div className="text-4xl leading-[1.3] font-bold">{word.meaning}</div>
                    <div className="font-serif text-xl text-back-muted">
                      {word.word} · {word.partOfSpeech}
                    </div>
                    {word.readingTh && (
                      <div className="text-base text-back-muted">อ่านว่า {word.readingTh}</div>
                    )}
                  </div>
                  {word.example && (
                    <div className="flex flex-col gap-2 rounded-2xl bg-white/8 p-4">
                      <span className="text-[13px] font-semibold tracking-[0.06em] text-back-muted">
                        ตัวอย่างการใช้
                      </span>
                      <div className="text-base leading-normal text-back-text">“{word.example}”</div>
                      {word.exampleTh && (
                        <div className="text-[17px] leading-[1.55] font-medium">{word.exampleTh}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe stamps */}
              <div
                className="pointer-events-none absolute top-7 left-5.5 -rotate-12 rounded-[10px] border-3 border-known bg-white/92 px-3.5 py-1.5 text-[22px] font-bold text-known"
                style={{ opacity: clamp(dx / SWIPE_THRESHOLD) }}
              >
                จำได้
              </div>
              <div
                className="pointer-events-none absolute top-7 right-5.5 rotate-12 rounded-[10px] border-3 border-unknown bg-white/92 px-3.5 py-1.5 text-[22px] font-bold text-unknown"
                style={{ opacity: clamp(-dx / SWIPE_THRESHOLD) }}
              >
                ยังไม่จำ
              </div>
            </div>
          </div>

          <div className="flex justify-between text-[13px] text-muted">
            <span>← ปัดซ้าย = ยังไม่จำ</span>
            <span>ปัดขวา = จำได้ →</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => swipe("left")}
              aria-label="ยังไม่จำ"
              className="flex size-16 items-center justify-center rounded-full border-2 border-unknown bg-card text-unknown"
            >
              <Icon size={26} d="M6 6l12 12M18 6L6 18" />
            </button>
            <button
              onClick={toggleFlip}
              className="flex h-14 items-center gap-2 rounded-full bg-ink px-5.5 text-base font-semibold text-card"
            >
              <Icon
                size={20}
                d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"
              />
              <span>{flipped ? "ดูคำศัพท์" : "พลิกดูเฉลย"}</span>
            </button>
            <button
              onClick={() => swipe("right")}
              aria-label="จำได้"
              className="flex size-16 items-center justify-center rounded-full bg-known text-white"
            >
              <Icon size={26} d="M5 12.5l4.5 4.5L19 7" />
            </button>
          </div>
        </>
      ) : (
        /* Round summary */
        <div className="flex grow flex-col gap-4.5 overflow-hidden rounded-3xl border border-line bg-card px-6 py-7">
          <div className="flex flex-col gap-1.5 text-center">
            <div className="font-serif text-[56px] leading-none font-bold">
              {known.length}/{total}
            </div>
            <div className="text-xl font-bold">จบรอบแล้ว!</div>
            <div className="text-[15px] text-muted">
              {unknown.length === 0
                ? "เยี่ยมมาก จำได้ครบทุกคำ"
                : `เหลืออีก ${unknown.length} คำที่ต้องทบทวน`}
            </div>
          </div>

          {unknown.length > 0 && (
            <div className="flex grow flex-col gap-2 overflow-auto">
              <div className="text-[13px] font-semibold tracking-[0.06em] text-unknown-ink">
                คำที่ควรทบทวน
              </div>
              {unknown.map((i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3 rounded-xl bg-panel px-3.5 py-2.5"
                >
                  <span className="font-serif text-lg font-bold">{words[i].word}</span>
                  <span className="text-right text-[15px] text-subtle">{words[i].meaning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2.5">
            {nextSet ? (
              <button
                onClick={() => goToSet(setIdx + 1)}
                className="flex h-13 items-center justify-center gap-2 rounded-full bg-known text-base font-semibold text-white"
              >
                <span>
                  ท่องชุดต่อไป · Day {nextSet.index} ({nextSet.words.length} คำ)
                </span>
                <Icon size={20} d="M5 12h14M13 6l6 6-6 6" />
              </button>
            ) : (
              <div className="rounded-xl bg-known-bg px-3.5 py-2.5 text-center text-[15px] font-semibold text-known-ink">
                ท่องครบทุกชุดแล้ว 🎉
              </div>
            )}
            {unknown.length > 0 && (
              <button
                onClick={() => startRound(unknown)}
                className="h-13 rounded-full bg-unknown text-base font-semibold text-white"
              >
                ทบทวนเฉพาะคำที่ยังไม่จำ
              </button>
            )}
            <button
              onClick={() => startRound(range(words.length))}
              className="h-13 rounded-full bg-ink text-base font-semibold text-card"
            >
              เริ่มชุดนี้ใหม่
            </button>
            {!nextSet && sets.length > 1 && (
              <button
                onClick={() => goToSet(0)}
                className="h-13 rounded-full border border-line-strong text-base font-semibold"
              >
                กลับไปชุดแรก
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Icon({ d, size }: { d: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function SpeakButton({
  label,
  small,
  className,
  onClick,
  onPointerDown,
}: {
  label: string;
  small?: boolean;
  className: string;
  onClick: (e: React.MouseEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`flex items-center justify-center rounded-full ${small ? "size-11" : "size-12"} ${className}`}
    >
      <Icon
        size={small ? 18 : 22}
        d={
          small
            ? "M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7"
            : "M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
        }
      />
    </button>
  );
}

function CopyButton({ text, className }: { text: string; className: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <button
      aria-label={copied ? "คัดลอกแล้ว" : "คัดลอกคำศัพท์"}
      title={copied ? "คัดลอกแล้ว" : "คัดลอกคำศัพท์"}
      onClick={copy}
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex size-12 items-center justify-center rounded-full ${className}`}
    >
      <Icon
        size={20}
        d={copied ? "M5 12.5l4.5 4.5L19 7" : "M9 9h11v11H9zM5 15H4V4h11v1"}
      />
    </button>
  );
}
