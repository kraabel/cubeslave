"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { divine, type Result } from "@/lib/algorithm";
import { audio, hush, speak } from "@/lib/audio";
import { ATTACKS, DIM_LABELS, THEMES, TOLL, WORKS, type Dim } from "@/lib/corpus";
import { offlineNarration, type Narration } from "@/lib/narrate";
import { QUESTIONS } from "@/lib/questions";
import { Arrow, Blob, OrganicDefs } from "./Organic";
import type { Stage } from "./Scene";
import SoundDeck from "./SoundDeck";
import Typewriter from "./Typewriter";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

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

const pad = (n: number) => String(n).padStart(2, "0");

const ease = [0.2, 0.7, 0.2, 1] as const;

type Overlay = "archive" | "about" | null;

function SoundToggle() {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setStarted(audio.started), 500);
    return () => clearInterval(id);
  }, []);

  const click = () => {
    if (!audio.started) {
      audio.start();
      setStarted(true);
      return;
    }
    const m = !muted;
    audio.setAllMuted(m);
    setMuted(m);
  };

  const label = !started ? "Enable sound" : muted ? "Sound off" : "Sound on";
  return (
    <Blob variant="outline" size="sm" onClick={click} aria-pressed={started && !muted} className="sound-toggle">
      <svg className="speaker" viewBox="0 0 20 16" aria-hidden>
        <path className="cone" d="M2 6 H5 L10 2 V14 L5 10 H2 Z" />
        {started && !muted ? (
          <path className="waves" d="M13 5.5 Q15 8 13 10.5 M15.5 3.5 Q19 8 15.5 12.5" />
        ) : (
          <path className="waves" d="M13 5 L18 11 M18 5 L13 11" />
        )}
      </svg>
      {label}
    </Blob>
  );
}

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
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [reasoning, setReasoning] = useState(false);

  // Pointer parallax: the question floats with the cursor.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [3, -3]), { stiffness: 50, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 50, damping: 18 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [mx, my]);

  const begin = () => {
    audio.start();
    audio.select();
    setIntroLine(0);
    setStage("intro");
    setTimeout(() => speak(INTRO.join(" ")), 900);
  };

  const startQuestions = () => {
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

  const goBack = () => {
    audio.hover();
    if (qi === 0) {
      setStage("gate");
      return;
    }
    const prev = answers.slice(0, -1);
    setAnswers(prev);
    setQi(prev.length);
    audio.setTension(prev.length / QUESTIONS.length);
  };

  // Keyboard: 1-5 to answer.
  useEffect(() => {
    if (stage !== "question" || overlay) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= QUESTIONS[qi].options.length) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, qi, choose, overlay]);

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
    setReasoning(false);
    setOverlay(null);
    setStage("question");
  };

  const home = () => {
    hush();
    audio.setTension(0);
    setAnswers([]);
    setQi(0);
    setResult(null);
    setNarration(null);
    setReasoning(false);
    setOverlay(null);
    setStage("gate");
  };

  const progress = stage === "question" ? answers.length / QUESTIONS.length : stage === "gate" || stage === "intro" ? 0 : 1;
  const q = QUESTIONS[qi];

  return (
    <main className="stage" data-stage={stage}>
      <OrganicDefs />
      <Scene stage={stage} step={qi} progress={progress} risk={result?.risk ?? null} />

      <header className="topbar">
        <button className="brand" onClick={home} aria-label="The Ted test, home">
          <span className="mark" aria-hidden />
          The Ted test
        </button>
        <nav className="nav">
          <button className="nav-link" onClick={() => setOverlay("archive")}>
            Archive
          </button>
          <button className="nav-link" onClick={() => setOverlay("about")}>
            About
          </button>
          <SoundToggle />
        </nav>
      </header>

      <AnimatePresence mode="wait">
        {stage === "gate" && (
          <motion.section key="gate" className="panel hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30, filter: "blur(10px)" }} transition={{ duration: 1 }}>
            <h1>
              {["Would Ted", "have killed", "you?"].map((line, i) => (
                <motion.span key={line} className="line" initial={{ opacity: 0, y: 40, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.3 + i * 0.18, duration: 1.2, ease }}>
                  {line}
                </motion.span>
              ))}
            </h1>
            <motion.p className="lede" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1 }}>
              Answer 10 questions about your work, your beliefs, and the technology you depend on.
            </motion.p>
            <motion.div className="actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 1 }}>
              <Blob variant="primary" onClick={begin}>
                Begin the test <Arrow />
              </Blob>
              <button className="text-link" onClick={() => setOverlay("archive")}>
                Explore sources
              </button>
            </motion.div>
          </motion.section>
        )}

        {stage === "intro" && (
          <motion.section key="intro" className="panel intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -24, filter: "blur(10px)" }} transition={{ duration: 1 }}>
            {INTRO.slice(0, introLine + 1).map((line, i) => (
              <motion.p key={i} className="oracle-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: i === introLine ? 1 : 0.4, y: 0 }} transition={{ duration: 0.8 }}>
                <Typewriter text={line} delay={i === 0 ? 900 : 300} onDone={() => setTimeout(() => setIntroLine((n) => Math.max(n, i + 1)), 700)} />
              </motion.p>
            ))}
            <div className="actions center">
              {introLine >= INTRO.length ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                  <Blob variant="primary" onClick={startQuestions}>
                    Continue <Arrow />
                  </Blob>
                </motion.div>
              ) : (
                <button
                  className="text-link"
                  onClick={() => {
                    hush();
                    setIntroLine(INTRO.length);
                  }}
                >
                  Skip the introduction
                </button>
              )}
            </div>
          </motion.section>
        )}

        {stage === "question" && (
          <motion.section
            key={`q-${qi}`}
            className="panel question"
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1400 }}
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -30, filter: "blur(12px)" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="dots" aria-hidden>
              {QUESTIONS.map((_, i) => (
                <span key={i} data-state={i < answers.length ? "done" : i === qi ? "now" : "todo"} />
              ))}
            </div>
            <p className="count">
              {pad(qi + 1)} / {QUESTIONS.length}
            </p>
            <h2>{q.prompt}</h2>
            <motion.p className="whisper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1.2 }}>
              {q.whisper}
            </motion.p>
            <ol className="options">
              {q.options.map((o, i) => (
                <motion.li
                  key={o.label}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: picked === null || picked === i ? 1 : 0.2, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: picked === null ? 0.35 + i * 0.09 : 0, duration: 0.7, ease }}
                >
                  <Blob variant="glass" active={picked === i} onClick={() => choose(i)} onMouseEnter={() => audio.hover()} aria-keyshortcuts={String(i + 1)}>
                    {o.label}
                  </Blob>
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
          <motion.section key="verdict" className="panel verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}>
              Your result
              <span className="match-chip" data-level={result.risk >= 60 ? "high" : result.risk >= 15 ? "mid" : "low"}>
                {count}% target-profile match
              </span>
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.8, duration: 1.2, ease }}>
              {result.tier.title}
            </motion.h2>
            <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}>
              {result.tier.line} Your nearest historical profile is {result.archetype.name.replace(/^The /, "the ")}.
            </motion.p>
            <motion.div className="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 1 }}>
              <Blob variant="primary" onClick={() => setReasoning((r) => !r)} aria-expanded={reasoning}>
                {reasoning ? "Hide reasoning" : "View reasoning"} <Arrow />
              </Blob>
              <Blob variant="outline" size="sm" onClick={() => setOverlay("archive")}>
                Read sources
              </Blob>
              <button className="text-link" onClick={restart}>
                Try again
              </button>
            </motion.div>

            <AnimatePresence>
              {reasoning && (
                <motion.div className="reasoning" initial={{ opacity: 0, y: 16, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 10, filter: "blur(8px)" }} transition={{ duration: 0.8, ease }}>
                  <p className="label">
                    Entered in the archive as <strong>{narration.epithet}</strong>
                  </p>
                  <p className="reading">
                    <Typewriter text={narration.reading} speed={14} sound={false} />
                  </p>
                  <ul className="bars">
                    {BAR_DIMS.map((d, i) => (
                      <li key={d} data-dim={d}>
                        <span>{DIM_LABELS[d]}</span>
                        <i>
                          <motion.b initial={{ width: 0 }} animate={{ width: `${Math.round(result.scores[d] * 100)}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 1.2, ease: "easeOut" }} />
                        </i>
                        <em>{Math.round(result.scores[d] * 100)}</em>
                      </li>
                    ))}
                  </ul>
                  <p className="method">
                    Scored by a fixed model built from the manifesto&apos;s themes and the profiles of all {TOLL.devices} targets. Contempt is shown but never raises your score; he scorned far more people than he attacked.
                    {narration.source === "claude" ? " Reading written by Claude from the same material." : ""}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="footbar">
        <div className="foot-left">
          {stage === "question" && (
            <button className="back" onClick={goBack}>
              <svg viewBox="0 0 20 12" aria-hidden>
                <path d="M19 6 H2 M7 1 L2 6 L7 11" />
              </svg>
              Go back
            </button>
          )}
          <p className="disclaimer">
            {stage === "verdict" ? "This is an interpretation of your answers, not a prediction of violence." : "This thought experiment cannot predict violence."}
          </p>
        </div>
        <SoundDeck />
      </footer>

      <AnimatePresence>
        {overlay && (
          <motion.aside className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} onClick={(e) => e.target === e.currentTarget && setOverlay(null)}>
            <motion.div className="overlay-inner" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.7, ease }}>
              <button className="close" onClick={() => setOverlay(null)} aria-label="Close">
                <svg viewBox="0 0 16 16" aria-hidden>
                  <path d="M3 3 L13 13 M13 3 L3 13" />
                </svg>
              </button>

              {overlay === "archive" ? (
                <>
                  <p className="eyebrow">The archive</p>
                  <h2>
                    {TOLL.killed} killed. {TOLL.injured} injured.
                  </h2>
                  <p className="lede">Sixteen devices between {TOLL.span}. Behind every score on this site is a person who opened a box.</p>
                  <ol className="record">
                    {ATTACKS.map((a, i) => (
                      <li key={i} data-killed={!!a.killed}>
                        <span className="year">{a.year}</span>
                        <span className="who">
                          {a.target}
                          <em>
                            {a.place}. {a.outcome}.
                          </em>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="label">What the oracle read</p>
                  <ul className="works">
                    {WORKS.map((w) => (
                      <li key={w.title}>
                        <strong>{w.title}</strong> <span>({w.year})</span> {w.note}
                      </li>
                    ))}
                  </ul>
                  <p className="label">Themes it weighs, by manifesto section</p>
                  <ul className="themes">
                    {THEMES.map((t) => (
                      <li key={t.section}>
                        <strong>{t.section}</strong> {t.gist}
                      </li>
                    ))}
                  </ul>
                  <p className="fine">
                    Kaczynski was arrested at his Montana cabin in April 1996, after his brother David recognized the manifesto&apos;s writing and went to the FBI. He died in federal custody in 2023.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow">About</p>
                  <h2>How the Ted test works</h2>
                  <p className="lede">
                    Ten questions place you against the pattern of people Ted Kaczynski targeted between {TOLL.span}, and against the ideas in his published writing.
                  </p>
                  <ol className="steps">
                    <li>
                      <strong>Profile.</strong> His targets were specialists in computing, engineering, genetics, behavioral science, advertising and extractive industry. Your strongest match to those fields counts most.
                    </li>
                    <li>
                      <strong>Reach.</strong> Every target had a findable name and address. Public visibility and institutional ties raise the score.
                    </li>
                    <li>
                      <strong>Autonomy.</strong> Self-sufficiency, the manifesto&apos;s own ideal, lowers it by up to 85%.
                    </li>
                    <li>
                      <strong>Contempt.</strong> Shown on your result, never added to it. His writing scorns far more people than he ever attacked.
                    </li>
                  </ol>
                  <p className="fine">
                    The score always comes from the fixed model. When an AI writes your reading, it works from the same summary of his writing and the public record, and it is instructed never to speak as him, praise the attacks, or describe methods. This piece covers real violence and real victims; the archive lists every one.
                  </p>
                </>
              )}
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
