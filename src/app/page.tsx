import Link from "next/link";
import Flashcards from "@/components/Flashcards";
import { getReviewSets } from "@/lib/words";

export default function Home() {
  const sets = getReviewSets();

  return (
    <main className="flex flex-1 justify-center">
      {sets.length > 0 ? (
        <Flashcards sets={sets} />
      ) : (
        <p className="p-8 text-muted">ยังไม่มีคำศัพท์</p>
      )}
      {process.env.NODE_ENV !== "production" && (
        <Link
          href="/add"
          className="fixed right-4 bottom-4 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-card shadow-lg"
        >
          + เพิ่มคำ
        </Link>
      )}
    </main>
  );
}
