import { THEMES, type Dim } from "./corpus";
import type { Result } from "./algorithm";
import { GUIDES, tierKeyOf, type Guide } from "./guides";

export interface Narration {
  epithet: string; // 2-5 word name the oracle gives you
  reading: string; // the spoken verdict, ~100 words
  source: "claude" | "offline";
}

/** Which manifesto section speaks most directly to each dimension. */
const LEAD_THEME: Partial<Record<Dim, string>> = {
  tech: "Surrogate Activities",
  system: "Two Kinds of Technology",
  manipulation: "Control of Human Behavior",
  visibility: "Strategy",
  institution: "Autonomy",
};

/** Deterministic narration used when no API key is configured or the call fails. */
export function offlineNarration(r: Result, guide: Guide = GUIDES[0]): Narration {
  const s = r.scores;
  const ranked = (Object.entries(s) as [Dim, number][])
    .filter(([d]) => d !== "contempt" && d !== "autonomy")
    .sort((a, b) => b[1] - a[1]);
  const lead = ranked[0]?.[0] ?? "tech";
  const theme = THEMES.find((t) => t.section === LEAD_THEME[lead]) ?? THEMES[0];
  const shelter = THEMES.find((t) => t.section === "The Power Process")!;

  const opening = guide.openers[tierKeyOf(r.tier.title)];

  const middle =
    r.risk >= 15
      ? `The section called “${theme.section}” could be read as a description of you. ${theme.gist} Your answers place you nearest ${r.archetype.name.replace(/^The /, "the ")}. ${r.archetype.line}`
      : s.autonomy >= 0.4
        ? `The section called “${shelter.section}” describes the life you already lead: ${lowerFirst(shelter.gist)} That is his ideal, not his target.`
        : `You operate the machine without steering it. The writing pities that more than it hates it.`;

  const contempt =
    s.contempt >= 0.5 ? ` His writing scorns how you live or what you believe. Scorn alone never got anyone a package.` : "";

  return {
    epithet: r.archetype.name,
    reading: `${opening} ${middle}${contempt}`,
    source: "offline",
  };
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
