import Link from "next/link";
import { notFound } from "next/navigation";
import AddWordsForm from "@/components/AddWordsForm";
import { getAllDays } from "@/lib/words";

export const metadata = { title: "เพิ่มคำศัพท์ใหม่" };

export default function AddPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const days = getAllDays();
  const latest = days[0];
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in server's local time
  const defaultDate = latest && latest.date > today ? latest.date : today;

  return (
    <main className="flex flex-1 justify-center">
      <div className="flex w-full max-w-2xl flex-col gap-6 px-6 pt-7 pb-12">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
              Vocabulary Deck · Admin
            </div>
            <h1 className="text-[28px] leading-[1.2] font-bold">เพิ่มคำศัพท์ใหม่</h1>
          </div>
          <Link href="/" className="text-sm font-semibold text-known hover:underline">
            ← กลับไปท่องศัพท์
          </Link>
        </div>

        <AddWordsForm
          defaultDate={defaultDate}
          days={days.map((d) => ({ index: d.index, date: d.date, count: d.words.length }))}
        />
      </div>
    </main>
  );
}
