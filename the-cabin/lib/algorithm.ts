import { ARCHETYPES, type Archetype, type Dim } from "./corpus";
import { QUESTIONS } from "./questions";

export type Answers = number[]; // option index per question, in QUESTIONS order

export type Scores = Record<Dim, number>; // each 0..1

export interface Tier {
  min: number;
  title: string;
  line: string;
}

export const TIERS: Tier[] = [
  { min: 80, title: "A package with your name on it", line: "Your profile sits inside the pattern of those he chose." },
  { min: 60, title: "On the list", line: "You share the traits he singled out in writing and in action." },
  { min: 35, title: "A name in the notebook", line: "Close enough to the machine that he would have noted you." },
  { min: 15, title: "A face in the crowd", line: "Part of the machine, though not one of its drivers." },
  { min: 0, title: "The woods let you pass", line: "You live closer to his ideal than to his targets." },
];

/** Low scorers split by why they scored low: distance from the system, or irrelevance to it. */
const UNNOTICED: Tier = { min: 0, title: "Beneath his notice", line: "A cog, in his terms. Not worth the stamp." };

export interface Result {
  risk: number; // 0..100
  scores: Scores;
  tier: Tier;
  archetype: Archetype;
  runnerUp: Archetype;
}

const DIMS: Dim[] = ["tech", "system", "manipulation", "visibility", "institution", "autonomy", "contempt"];

/** Highest total each dimension can reach, so every score normalizes to 0..1. */
const MAX: Scores = DIMS.reduce((acc, d) => {
  acc[d] = QUESTIONS.reduce((sum, q) => sum + Math.max(0, ...q.options.map((o) => o.w[d] ?? 0)), 0);
  return acc;
}, {} as Scores);

export function score(answers: Answers): Scores {
  const raw = DIMS.reduce((acc, d) => ({ ...acc, [d]: 0 }), {} as Scores);
  answers.forEach((choice, qi) => {
    const option = QUESTIONS[qi]?.options[choice];
    if (!option) return;
    for (const [d, v] of Object.entries(option.w) as [Dim, number][]) raw[d] += v;
  });
  return DIMS.reduce((acc, d) => {
    acc[d] = MAX[d] > 0 ? Math.min(1, raw[d] / MAX[d]) : 0;
    return acc;
  }, {} as Scores);
}

/**
 * The model, in plain terms:
 * 1. Targets were specialists. The strongest of tech / system / manipulation
 *    matters more than the average.
 * 2. Every target had a findable name and address: visibility and institutions
 *    turn a profile into a target.
 * 3. Autonomy (his stated ideal) protects you.
 * Contempt is reported but never raises risk; he scorned far more people than
 * he attacked.
 */
export function riskOf(s: Scores): number {
  const core = Math.max(s.tech, s.system, s.manipulation);
  const spread = 0.34 * s.tech + 0.33 * s.system + 0.33 * s.manipulation;
  const profile = 0.6 * core + 0.4 * spread;
  const reach = 0.45 + 0.55 * Math.max(s.visibility, s.institution, (s.visibility + s.institution) / 1.4);
  const shield = 1 - 0.85 * s.autonomy;
  const x = Math.max(0, Math.min(1, profile * reach * shield * 1.45));
  // Soft knee so only the strongest profiles approach 100.
  return Math.round(100 * (1 - Math.exp(-2.4 * x)) / (1 - Math.exp(-2.4)));
}

function similarity(s: Scores, a: Archetype): number {
  const keys: Dim[] = ["tech", "system", "manipulation", "visibility", "institution", "autonomy", "contempt"];
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const x = s[k];
    const y = a.vector[k] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function divine(answers: Answers): Result {
  const scores = score(answers);
  const risk = riskOf(scores);
  let tier = TIERS.find((t) => risk >= t.min) ?? TIERS[TIERS.length - 1];
  if (risk < 15 && scores.autonomy < 0.4) tier = UNNOTICED;

  let pool = ARCHETYPES;
  if (risk < 15) pool = ARCHETYPES.filter((a) => a.id === "woods" || a.id === "bystander");
  else if (risk >= 35) pool = ARCHETYPES.filter((a) => a.id !== "woods" && a.id !== "bystander");

  const ranked = [...pool].sort((a, b) => similarity(scores, b) - similarity(scores, a));
  const fallback = ARCHETYPES.find((a) => a.id === "bystander")!;
  return { risk, scores, tier, archetype: ranked[0] ?? fallback, runnerUp: ranked[1] ?? ranked[0] ?? fallback };
}
