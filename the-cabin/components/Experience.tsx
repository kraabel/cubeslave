"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { divine, type Result } from "@/lib/algorithm";
import { audio, hush, speak } from "@/lib/audio";
import { ATTACKS, DIM_LABELS, TOLL, WORKS, type Dim } from "@/lib/corpus";
import { offlineNarration, type Narration } from "@/lib/narrate";
import { QUESTIONS } from "@/lib/questions";
import type { Stage } from "./Scene";
import Typewriter from "./Typewriter";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const INTRO = [
  "I have read everything he published.",
  "The manifesto. The letters. The books written from a cell.",
  `I have studied the ${TOLL.devices} packages, and the ${TOLL.killed + TOLL.injured} people they found.`,
  "Answer ten questions. I will tell you whether he would have come for you.",
];

const DIVINING = [
  "Reading Industrial Society and Its Future…",
  "Cross-referencing sixteen devices, 1978 to 1995…",
  "Weighing your place in the machine…",
];

const BAR_DIMS: Dim[] = ["tech", "system", "manipulation", "visibility", "institution", "autonomy", "contempt"];

const float = (i: number) => ({
  y: [0, -5, 0],
  transition: { duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" as const, delay: i * 0.35 },
});

export default function Experience() {
  const [stage, setStage] = useState<Stage>("gate");
  const [introLine, setIntroLine] = useState(0);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [divLine, setDivLine] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [memorial, setMemorial] = useState(false);
  const [readingDone, setReadingDone] = useState(false);

  // Pointer parallax for the floating card.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [5, -5]), { stiffness: 60, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-7, 7]), { stiffness: 60, damping: 18 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [mx, my]);

  const enter = () => {
    audio.start();
    setStage("intro");
    setTimeout(() => speak(INTRO.join(" ")), 900);
  };

  const begin = () => {
    hush();
    audio.select();
    setStage("question");
  };

  const choose = useCallback(
    (i: number) => {
      if (picked !== null) return;
      setPicked(i);
      audio.select();
      const next = [...answers, i];
      audio.setTension(next.length / QUESTIONS.length);
      window.setTimeout(() => {
        setAnswers(next);
        setPicked(null);
        if (next.length >= QUESTIONS.length) setStage("divining");
        else setQi(next.length);
      }, 650);
    },
    [answers, picked],
  );

  // Keyboard: 1-5 to answer.
  useEffect(() => {
    if (stage !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= QUESTIONS[qi].options.length) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, qi, choose]);

  // Divining: the reading and the fetch run together; the reveal waits for both.
  useEffect(() => {
    if (stage !== "divining") return;
    let cancelled = false;
    const local = divine(answers);
    const minWait = new Promise((r) => setTimeout(r, 6500));
    const fetched = fetch("/api/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { result: Result; narration: Narration }) => d)
      .catch(() => ({ result: local, narration: offlineNarration(local) }));

    const lines = DIVINING.map((_, i) => setTimeout(() => !cancelled && setDivLine(i), i * 2100));
    Promise.all([fetched, minWait]).then(([d]) => {
      if (cancelled) return;
      setResult(d.result);
      setNarration(d.narration);
      setStage("verdict");
      audio.reveal(d.result.risk / 100);
      audio.setTension(d.result.risk / 100);
    });
    return () => {
      cancelled = true;
      lines.forEach(clearTimeout);
    };
  }, [stage, answers]);

  // Verdict: count up to the score, then speak the reading.
  useEffect(() => {
    if (stage !== "verdict" || !result) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 2600);
      setCount(Math.round(result.risk * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const voice = setTimeout(() => narration && speak(narration.reading), 3200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(voice);
    };
  }, [stage, result, narration]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.setMuted(m);
    if (m) hush();
  };

  const restart = () => {
    hush();
    audio.select();
    audio.setTension(0);
    setAnswers([]);
    setQi(0);
    setResult(null);
    setNarration(null);
    setCount(0);
    setDivLine(0);
    setReadingDone(false);
    setMemorial(false);
    setStage("question");
  };

  const progress = stage === "question" ? answers.length / QUESTIONS.length : stage === "gate" || stage === "intro" ? 0 : 1;
  const q = QUESTIONS[qi];

  return (
    <main className="stage" data-stage={stage}>
      <Scene stage={stage} progress={progress} risk={result?.risk ?? null} />

      {stage !== "gate" && (
        <button className="chrome sound" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "Sound off" : "Sound on"}
        </button>
      )}

      {stage === "question" && (
        <div className="constellation" aria-hidden>
          {QUESTIONS.map((_, i) => (
            <span key={i} data-state={i < answers.length ? "done" : i === qi ? "now" : "todo"} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {stage === "gate" && (
          <motion.section
            key="gate"
            className="panel gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
            transition={{ duration: 1.2 }}
          >
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1.2 }}>
              An oracle trained on the Unabomber&apos;s writing and on the record of whom he chose
            </motion.p>
            <motion.h1 initial={{ opacity: 0, letterSpacing: "0.6em" }} animate={{ opacity: 1, letterSpacing: "0.22em" }} transition={{ delay: 0.2, duration: 2.4, ease: "easeOut" }}>
              THE CABIN
            </motion.h1>
            <motion.p className="question-lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1.2 }}>
              Would Ted Kaczynski have come for you?
            </motion.p>
            <motion.button className="enter" onClick={enter} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 1 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              Enter the woods
            </motion.button>
            <motion.p className="fine" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 2.6, duration: 1.2 }}>
              Sound on, headphones recommended. This piece covers real violence: {TOLL.killed} people killed and {TOLL.injured} injured, {TOLL.span}.
            </motion.p>
          </motion.section>
        )}

        {stage === "intro" && (
          <motion.section key="intro" className="panel intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30, filter: "blur(10px)" }} transition={{ duration: 1 }}>
            {INTRO.slice(0, introLine + 1).map((line, i) => (
              <motion.p key={i} className="oracle-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: i === introLine ? 1 : 0.45, y: 0 }} transition={{ duration: 0.8 }}>
                <Typewriter
                  text={line}
                  delay={i === 0 ? 900 : 300}
                  onDone={() => {
                    setTimeout(() => setIntroLine((n) => Math.max(n, i + 1)), 700);
                  }}
                />
              </motion.p>
            ))}
            {introLine >= INTRO.length && (
              <motion.button className="enter" onClick={begin} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} whileHover={{ scale: 1.03 }}>
                Begin
              </motion.button>
            )}
            {introLine < INTRO.length && (
              <button className="skip" onClick={() => { hush(); setIntroLine(INTRO.length); }}>
                Skip
              </button>
            )}
          </motion.section>
        )}

        {stage === "question" && (
          <motion.section
            key={`q-${qi}`}
            className="panel question"
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            initial={{ opacity: 0, y: 40, scale: 0.96, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -40, scale: 1.03, filter: "blur(14px)" }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <p className="numeral">
              {ROMAN[qi]} <span>/ X</span>
            </p>
            <h2>
              <Typewriter text={q.prompt} speed={26} delay={350} />
            </h2>
            <motion.p className="whisper" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.4, duration: 1.4 }}>
              {q.whisper}
            </motion.p>
            <ol className="options">
              {q.options.map((o, i) => (
                <motion.li key={o.label} initial={{ opacity: 0, x: -18, filter: "blur(6px)" }} animate={{ opacity: picked === null || picked === i ? 1 : 0.15, x: 0, filter: "blur(0px)" }} transition={{ delay: picked === null ? 0.9 + i * 0.12 : 0, duration: 0.6 }}>
                  <motion.button
                    className="option"
                    data-picked={picked === i}
                    onClick={() => choose(i)}
                    onMouseEnter={() => audio.hover()}
                    animate={float(i)}
                    whileHover={{ x: 10 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <kbd>{i + 1}</kbd>
                    <span>{o.label}</span>
                  </motion.button>
                </motion.li>
              ))}
            </ol>
          </motion.section>
        )}

        {stage === "divining" && (
          <motion.section key="divining" className="panel divining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(16px)" }} transition={{ duration: 1 }}>
            <AnimatePresence mode="wait">
              <motion.p key={divLine} className="oracle-line" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.6 }}>
                <Typewriter text={DIVINING[divLine]} speed={30} />
              </motion.p>
            </AnimatePresence>
          </motion.section>
        )}

        {stage === "verdict" && result && narration && (
          <motion.section key="verdict" className="panel verdict" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6, ease: "easeOut" }}>
            <p className="eyebrow">Target-profile match</p>
            <div className="score" data-level={result.risk >= 60 ? "high" : result.risk >= 15 ? "mid" : "low"}>
              {count}
              <span>%</span>
            </div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6, duration: 1 }}>
              {result.tier.title}
            </motion.h2>
            <motion.p className="epithet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1 }}>
              Entered in the ledger as <strong>{narration.epithet}</strong>
            </motion.p>
            <motion.div className="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2, duration: 0.6 }}>
              <Typewriter text={narration.reading} speed={18} delay={3300} onDone={() => setReadingDone(true)} />
            </motion.div>

            <motion.div className="details" initial={{ opacity: 0, y: 16 }} animate={readingDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 1 }}>
              <div className="match">
                <p className="label">Nearest historical profile</p>
                <p className="value">{result.archetype.name}</p>
                <p className="sub">{result.archetype.line}</p>
              </div>
              <ul className="bars">
                {BAR_DIMS.map((d, i) => (
                  <li key={d} data-dim={d}>
                    <span>{DIM_LABELS[d]}</span>
                    <i>
                      <motion.b initial={{ width: 0 }} animate={{ width: readingDone ? `${Math.round(result.scores[d] * 100)}%` : 0 }} transition={{ delay: 0.3 + i * 0.08, duration: 1.2, ease: "easeOut" }} />
                    </i>
                  </li>
                ))}
              </ul>
              <p className="method">
                Scored by a fixed model built from the manifesto&apos;s themes and the profiles of all {TOLL.devices} targets. Contempt is shown, but never raises your score: he scorned far more people than he attacked.
                {narration.source === "claude" ? " Reading written by Claude from the same material." : ""}
              </p>
              <div className="actions">
                <button className="enter" onClick={() => setMemorial(true)}>
                  Remember them
                </button>
                <button className="ghost" onClick={restart}>
                  Ask again
                </button>
              </div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {memorial && (
          <motion.aside className="memorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
            <div className="memorial-inner">
              <p className="eyebrow">The record, {TOLL.span}</p>
              <h2>
                {TOLL.killed} killed. {TOLL.injured} injured.
              </h2>
              <p className="sub">Behind every score on this site is a person who opened a box.</p>
              <ol>
                {ATTACKS.map((a, i) => (
                  <motion.li key={i} data-killed={!!a.killed} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                    <span className="year">{a.year}</span>
                    <span className="who">
                      {a.target}
                      <em>
                        {a.place}. {a.outcome}.
                      </em>
                    </span>
                  </motion.li>
                ))}
              </ol>
              <p className="label">What the oracle read</p>
              <ul className="works">
                {WORKS.map((w) => (
                  <li key={w.title}>
                    <strong>{w.title}</strong> ({w.year}). {w.note}
                  </li>
                ))}
              </ul>
              <p className="fine">
                Kaczynski was arrested at his Montana cabin in April 1996, after his brother David recognized the manifesto&apos;s writing and went to the FBI. He died in federal custody in 2023.
              </p>
              <button className="ghost" onClick={() => setMemorial(false)}>
                Close
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
