/**
 * The quiz runs in three parts. Each opens with a card: a fact from the
 * record, and a short spoken introduction from the visitor's guide
 * (lib/guides.ts, `chapters`).
 */

export type ChapterId = "work" | "machine" | "mind";

export interface Chapter {
  id: ChapterId;
  numeral: string;
  title: string;
  theme: string; // one line on what these questions measure
  fact: string; // a verifiable detail from the record, shown on the card
  questions: string[]; // question ids, in order
}

export const CHAPTERS: Chapter[] = [
  {
    id: "work",
    numeral: "I",
    title: "The work",
    theme: "He chose people for what they did, and found them by where their names appeared.",
    fact: "Nine of the sixteen devices were aimed at university campuses or university researchers.",
    questions: ["work", "where", "persuade", "visible"],
  },
  {
    id: "machine",
    numeral: "II",
    title: "The machine",
    theme: "He believed technology could not be reformed, only escaped.",
    fact: "He lived for about twenty-five years in a ten-by-twelve-foot cabin near Lincoln, Montana, with no electricity or running water.",
    questions: ["tech", "future", "power", "nature"],
  },
  {
    id: "mind",
    numeral: "III",
    title: "The mind",
    theme: "He scorned far more people than he ever targeted.",
    fact: "The search lasted nearly two decades. It ended when his brother, David, recognized his phrasing in the published manifesto.",
    questions: ["politics", "package"],
  },
];

/** Index of the chapter a question (by position) belongs to. */
export function chapterOf(qi: number): number {
  let end = 0;
  for (let c = 0; c < CHAPTERS.length; c++) {
    end += CHAPTERS[c].questions.length;
    if (qi < end) return c;
  }
  return CHAPTERS.length - 1;
}

/** Position of the first question in a chapter. */
export function chapterStart(c: number): number {
  return CHAPTERS.slice(0, c).reduce((n, ch) => n + ch.questions.length, 0);
}
