"use client";

import { useEffect, useState } from "react";

type RotatingWordProps = {
  words: string[];
};

export function RotatingWord({ words }: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [words.length]);

  return (
    <span className="inline-flex min-w-[9ch] align-baseline">
      <span
        key={words[index]}
        className="rounded-md border border-white/10 bg-white/[0.055] px-2 text-stone-100 shadow-[0_12px_34px_rgba(0,0,0,0.22)] motion-safe:animate-[wordFade_2200ms_ease-in-out]"
      >
        {words[index]}
      </span>
    </span>
  );
}
