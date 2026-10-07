"use client";

import { useState, useTransition } from "react";
import { addWords, type NewWordInput } from "@/app/add/actions";
import { PARTS_OF_SPEECH, partOfSpeechTh } from "@/lib/part-of-speech";

const INITIAL_ROWS = 5;

const emptyRow = (): NewWordInput => ({
  word: "",
  ipa: "",
  readingTh: "",
  meaning: "",
  partOfSpeech: "noun",
  example: "",
  exampleTh: "",
});

type DaySummary = { index: number; date: string; count: number };

const inputClass =
  "h-11 w-full rounded-xl border border-line-strong bg-card px-3 text-[15px] outline-none focus:border-known";
const labelClass = "text-[12px] font-semibold tracking-[0.06em] text-muted";

export default function AddWordsForm({
  defaultDate,
  days,
}: {
  defaultDate: string;
  days: DaySummary[];
}) {
  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<NewWordInput[]>(() =>
    Array.from({ length: INITIAL_ROWS }, emptyRow),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  const existing = days.find((d) => d.date === date);
  const nextIndex = Math.max(0, ...days.map((d) => d.index)) + 1;
  const filled = rows.filter((r) => r.word.trim() || r.meaning.trim()).length;

  function update(i: number, patch: Partial<NewWordInput>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setMessage(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addWords(date, rows);
      if (res.ok) {
        setMessage({ ok: true, text: `เพิ่ม ${res.added} คำใน Day ${res.index} แล้ว` });
        setRows(Array.from({ length: INITIAL_ROWS }, emptyRow));
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Date */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>วันที่</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} max-w-52 font-serif`}
          />
        </label>
        <p className="text-sm text-muted">
          {existing
            ? `เพิ่มเข้า Day ${existing.index} (มีอยู่แล้ว ${existing.count} คำ)`
            : `สร้าง Day ${nextIndex} ใหม่`}
        </p>
      </div>

      {/* Word rows */}
      {rows.map((row, i) => (
        <fieldset
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <legend className="font-serif text-lg font-bold">คำที่ {i + 1}</legend>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                className="text-sm font-semibold text-unknown hover:underline"
              >
                ลบแถว
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>คำศัพท์ *</span>
              <input
                value={row.word}
                onChange={(e) => update(i, { word: e.target.value })}
                placeholder="apple"
                className={`${inputClass} font-serif`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>ความหมาย *</span>
              <input
                value={row.meaning}
                onChange={(e) => update(i, { meaning: e.target.value })}
                placeholder="แอปเปิล"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>ชนิดคำ</span>
              <select
                value={row.partOfSpeech}
                onChange={(e) => update(i, { partOfSpeech: e.target.value })}
                className={inputClass}
              >
                {PARTS_OF_SPEECH.map((p) => (
                  <option key={p} value={p}>
                    {p} · {partOfSpeechTh[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>คำอ่าน (IPA)</span>
              <input
                value={row.ipa}
                onChange={(e) => update(i, { ipa: e.target.value })}
                placeholder="/ˈæpəl/"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelClass}>คำอ่านภาษาไทย</span>
              <input
                value={row.readingTh}
                onChange={(e) => update(i, { readingTh: e.target.value })}
                placeholder="แอป-เปิล"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelClass}>ประโยคตัวอย่าง</span>
              <input
                value={row.example}
                onChange={(e) => update(i, { example: e.target.value })}
                placeholder="I eat an apple every morning."
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelClass}>คำแปลประโยคตัวอย่าง</span>
              <input
                value={row.exampleTh}
                onChange={(e) => update(i, { exampleTh: e.target.value })}
                placeholder="ฉันกินแอปเปิลทุกเช้า"
                className={inputClass}
              />
            </label>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
        className="h-12 rounded-full border-2 border-dashed border-line-strong text-base font-semibold text-subtle"
      >
        + เพิ่มแถว
      </button>

      {message && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${
            message.ok ? "bg-known-bg text-known-ink" : "bg-unknown-bg text-unknown-ink"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || filled === 0}
        className="h-13 rounded-full bg-ink text-base font-semibold text-card disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก…" : `บันทึก ${filled} คำ`}
      </button>
      <p className="-mt-2 text-center text-[13px] text-muted">
        แถวที่ว่างจะถูกข้าม · บันทึกลง src/data/words.json
      </p>
    </form>
  );
}
