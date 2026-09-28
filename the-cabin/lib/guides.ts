/**
 * The four guides a visitor can choose. They are fictional characters, each
 * with an ElevenLabs voice, a background, and a lens: the part of the record
 * they pay most attention to. The lens changes how your result is read to
 * you, never the score itself.
 *
 * Every fixed line here is pre-rendered to public/voices/<id>/<key>.mp3 by
 * scripts/render-voices.mjs. Change a line and re-render it.
 */

export type GuideId = "marr" | "cole" | "wren" | "lorne";

export type TierKey = "package" | "list" | "notebook" | "crowd" | "woods" | "unnoticed";

/** Maps a verdict tier title (lib/algorithm.ts) to its key. */
export const TIER_KEYS: Record<string, TierKey> = {
  "A package with your name on it": "package",
  "On the list": "list",
  "A name in the notebook": "notebook",
  "A face in the crowd": "crowd",
  "The woods let you pass": "woods",
  "Beneath his notice": "unnoticed",
};

export interface Guide {
  id: GuideId;
  name: string; // how the guide introduces themself
  short: string; // for tight UI
  title: string;
  background: string;
  lens: string;
  voiceId: string; // ElevenLabs voice
  voiceNote: string; // how to write in this guide's voice, for the AI reading
  glyph: "eye" | "file" | "quill" | "thread";
  greeting: string;
  intro: string[];
  divining: string;
  /** What the guide says first on the result screen, one line per verdict tier. */
  openers: Record<TierKey, string>;
}

export const GUIDES: Guide[] = [
  {
    id: "marr",
    name: "Dr. Elias Marr",
    short: "Dr. Marr",
    title: "Forensic psychologist",
    background:
      "Twenty years assessing threats for courts and universities. He studies the slow turn from grievance to plan, and he speaks slowly because he is listening for the moment it happens.",
    lens: "Motive. He reads your answers for what the writing would resent.",
    voiceId: "dDFwUy1jwGLD1X8PGYKg",
    voiceNote: "Calm, clinical, unhurried. Short declarative sentences. Talks about grievance, motive and the logic a person builds to justify harm.",
    glyph: "eye",
    greeting:
      "I'm Doctor Elias Marr. For twenty years I've sat across from people deciding whether to hurt someone. I listen for grievance. Let me show you how he would have listened to you.",
    intro: [
      "I've read everything he published, the way I'd read a case file.",
      "The manifesto. The letters. The books he wrote from a cell.",
      "Sixteen packages. Twenty-six people hurt. Each one chosen for a reason he wrote down.",
      "Answer ten questions, and I'll tell you whether his reasons would have included you.",
    ],
    divining: "Give me a moment… I'm reading your answers against his.",
    openers: {
      package: "I've read his reasons and your answers side by side. They agree with each other.",
      list: "Your answers give his reasons something to hold on to.",
      notebook: "His reasons brush against you. Not a direct hit, but close.",
      crowd: "His grievance would have passed over you. You were furniture in his world, not a target.",
      woods: "Nothing in your answers feeds his grievance. You live the way he said people should.",
      unnoticed: "You don't feed his grievance, and you don't escape it. You simply don't register.",
    },
  },
  {
    id: "cole",
    name: "Warren Cole",
    short: "Cole",
    title: "Retired criminal profiler",
    background:
      "Built offender profiles on serial cases through the eighties and nineties. Methodical and plain-spoken, he trusts evidence over theory and will tell you so.",
    lens: "Victimology. Who was chosen, how they were found, and whether you'd be found the same way.",
    voiceId: "8BNZXqdnYLBqxWWAuQYn",
    voiceNote: "Plain-spoken, procedural, American. Talks like a case briefing: evidence, pattern, how targets were found. Dry, no drama.",
    glyph: "file",
    greeting:
      "Warren Cole. I built offender profiles for thirty years. Profiling runs both ways: you learn the offender by studying who he chose. Today, we study you.",
    intro: [
      "I've worked through every page he published, and every piece of the record.",
      "The manifesto. The letters. The books from prison.",
      "Sixteen devices. Twenty-six victims. He found them in directories, magazines and the news.",
      "Answer ten questions. I'll tell you whether you'd have made his list.",
    ],
    divining: "All right. Let me lay your answers next to the case file…",
    openers: {
      package: "You fit the victim pool, and you'd have been easy to find.",
      list: "You match the pool on the markers that mattered. Findable, too.",
      notebook: "You share a few markers with the victim pool. Enough to be noted, not enough to be picked.",
      crowd: "You don't match the pool. In the file, you're a bystander.",
      woods: "You're nowhere near the victim pool. He'd have had no way, and no reason, to find you.",
      unnoticed: "No markers, and no address worth finding. You'd never have come up.",
    },
  },
  {
    id: "wren",
    name: "Professor Aldous Wren",
    short: "Prof. Wren",
    title: "Psychoanalyst and historian of ideas",
    background:
      "Emeritus. Half a century spent with people who feared the machine: weavers, poets, hermits. Patient and literary, and still unsettled by how rarely those ideas turn violent, and how badly when they do.",
    lens: "The ideas. Where you stand in the manifesto's argument about technology and freedom.",
    voiceId: "LvmvHEBEmMJBJw9UuhwO",
    voiceNote: "Old, literary, British, patient. Speaks about ideas and history: the Luddites, the power process, surrogate activities. Warm but grave.",
    glyph: "quill",
    greeting:
      "Aldous Wren. I have spent half a century with people who feared the machine. Weavers, poets, hermits. Nearly all of them only wrote. One of them did not.",
    intro: [
      "I have read every word he published. Some of it more times than I would like.",
      "The manifesto. The letters. The books written in a cell.",
      "His ideas are old ones. Sixteen packages and twenty-six wounded people made them something else.",
      "Answer ten questions, and I will tell you where you stand in his argument.",
    ],
    divining: "Patience… I am turning your answers over against his pages.",
    openers: {
      package: "In his argument you are not a bystander. You are the machine he meant to stop.",
      list: "In his argument you are one of the hands that keeps the machine running.",
      notebook: "His argument has a place for you, near the machinery if not inside it.",
      crowd: "In his argument you are carried along by the system, not driving it.",
      woods: "In his argument you are closer to the answer than to the problem.",
      unnoticed: "His argument pities you more than it blames you.",
    },
  },
  {
    id: "lorne",
    name: "Dr. Vera Lorne",
    short: "Dr. Lorne",
    title: "Clinical psychologist, isolation and radicalization",
    background:
      "Works with people who withdraw from everyone and come back with a theory. Direct and unsentimental, she is not afraid of the dark parts of a person, including his.",
    lens: "Isolation and contempt. What his mind would scorn in you, and whether scorn became a target.",
    voiceId: "ApmTlGpFys2ypvx59okX",
    voiceNote: "Low, direct, unsentimental. Speaks about isolation, contempt and what a closed mind does with its anger. Occasionally cutting, never cruel.",
    glyph: "thread",
    greeting:
      "Vera Lorne. My patients are people who pulled away from everyone and came back with a theory. I know what isolation does to a mind. I'll show you what it did to his.",
    intro: [
      "I've read everything he published, including what he wrote when he thought no one would read it.",
      "The manifesto. The letters. The books written from a cell.",
      "Sixteen packages. Twenty-six people who opened a box.",
      "Answer ten questions. I'll tell you whether he would have come for you.",
    ],
    divining: "Stay with me… I'm reading you the way he would have.",
    openers: {
      package: "His contempt had a shape, and you fit inside it.",
      list: "His contempt kept a list. You're on it.",
      notebook: "His contempt would have found you. Whether it acted is another question.",
      crowd: "He'd have looked down on you, but he looked down on nearly everyone. Contempt isn't a target.",
      woods: "He would have seen something of himself in you. That kept people safe from him.",
      unnoticed: "He wouldn't have thought about you at all. For once, that's a mercy.",
    },
  },
];

export const GUIDE_BY_ID = Object.fromEntries(GUIDES.map((g) => [g.id, g])) as Record<GuideId, Guide>;

export function tierKeyOf(title: string): TierKey {
  return TIER_KEYS[title] ?? "crowd";
}

/** Every pre-rendered line for a guide, keyed by file name. */
export function guideClips(g: Guide, tiers: { title: string }[]): Record<string, string> {
  const clips: Record<string, string> = {
    greeting: g.greeting,
    intro: g.intro.slice(0, -1).join(" ") + " [whispers] " + g.intro[g.intro.length - 1],
    divining: g.divining,
  };
  for (const t of tiers) {
    const k = tierKeyOf(t.title);
    clips[`verdict-${k}`] = `${t.title}. ${g.openers[k]}`;
  }
  return clips;
}

export function clipUrl(g: GuideId, key: string) {
  return `voices/${g}/${key}.mp3`;
}
