"use client";

import dynamic from "next/dynamic";

// Client-only: the card order is shuffled with Math.random, which would not match a server render
const Flashcards = dynamic(() => import("@/components/Flashcards"), { ssr: false });

export default Flashcards;
