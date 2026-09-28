"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "@/lib/audio";

interface Props {
  text: string;
  speed?: number; // ms per character
  delay?: number;
  className?: string;
  sound?: boolean;
  onDone?: () => void;
}

/** Types text out one character at a time with typewriter key strikes. */
export default function Typewriter({ text, speed = 32, delay = 0, className, sound = true, onDone }: Props) {
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    setShown(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i++;
      setShown(i);
      const ch = text[i - 1];
      if (sound && ch && ch !== " " && i % 2 === 0) audio.tick();
      if (i >= text.length) {
        done.current?.();
        return;
      }
      const pause = ch === "." || ch === "?" || ch === "…" ? speed * 9 : ch === "," ? speed * 4 : speed;
      timer = setTimeout(step, pause * (0.7 + Math.random() * 0.6));
    };
    timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [text, speed, delay, sound]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, shown)}</span>
      <span aria-hidden className="caret" data-done={shown >= text.length} />
    </span>
  );
}
