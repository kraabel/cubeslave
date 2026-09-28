/**
 * The oracle's knowledge base.
 *
 * Everything here is paraphrased from the public record: Kaczynski's published
 * writing and the FBI/court record of the 16 devices (1978-1995). No text from
 * his books is reproduced beyond short, widely quoted fragments. The same
 * summary is handed to Claude in /api/verdict so its narration stays grounded.
 */

export type Dim =
  | "tech" // proximity to computing, engineering, genetics, AI
  | "system" // acting as an agent of large industrial organizations
  | "manipulation" // shaping human behavior: advertising, PR, behavioral science
  | "visibility" // public prominence: named, quoted, published, listed
  | "institution" // embedded in universities and big organizations
  | "autonomy" // self-sufficiency and distance from the system (protective)
  | "contempt"; // traits the writing scorns, without making you a target

export const DIM_LABELS: Record<Dim, string> = {
  tech: "Technological proximity",
  system: "Agent of the system",
  manipulation: "Behavior engineering",
  visibility: "Public visibility",
  institution: "Institutional embedding",
  autonomy: "Autonomy",
  contempt: "Contempt index",
};

export interface Work {
  title: string;
  year: string;
  note: string;
}

export const WORKS: Work[] = [
  {
    title: "Industrial Society and Its Future",
    year: "1995",
    note: "The 35,000-word manifesto published by The Washington Post and The New York Times on Sept. 19, 1995. Its publication led to his identification.",
  },
  {
    title: "Technological Slavery",
    year: "2010",
    note: "Collected writings: a corrected manifesto, letters and essays, including “The Truth About Primitive Life” and “Hit Where It Hurts.”",
  },
  {
    title: "Anti-Tech Revolution: Why and How",
    year: "2016",
    note: "Argues self-propagating systems cannot be steered and lays out a strategy for a movement against the technological system.",
  },
];

export interface Theme {
  section: string;
  gist: string;
  dims: Dim[];
}

/** Section headings are the manifesto's own; the gists are paraphrase. */
export const THEMES: Theme[] = [
  {
    section: "Introduction",
    gist: "It opens by calling the Industrial Revolution and its consequences a disaster for the human race.",
    dims: ["tech", "system"],
  },
  {
    section: "The Power Process",
    gist: "People need goals that take real effort and carry real stakes, reached through their own action.",
    dims: ["autonomy"],
  },
  {
    section: "Surrogate Activities",
    gist: "Careers, science and status games are artificial goals that stand in for the survival work people evolved for. Scientists work for the satisfaction of the chase, not for humanity.",
    dims: ["tech", "institution"],
  },
  {
    section: "Autonomy",
    gist: "Real fulfillment needs control over the life-and-death matters of one's own life, which large organizations take away.",
    dims: ["autonomy", "institution"],
  },
  {
    section: "The Psychology of Modern Leftism",
    gist: "It diagnoses what he calls oversocialization and feelings of inferiority. The target of scorn, not of the bombs.",
    dims: ["contempt"],
  },
  {
    section: "Control of Human Behavior",
    gist: "It warns of propaganda, advertising and psychological technique, and of biological engineering, reshaping people to suit the system.",
    dims: ["manipulation", "tech"],
  },
  {
    section: "The 'Bad' Parts of Technology Cannot Be Separated from the 'Good' Parts",
    gist: "Medicine, computing and genetics come bundled; you cannot keep the benefits and refuse the dependence.",
    dims: ["tech"],
  },
  {
    section: "Two Kinds of Technology",
    gist: "Small-scale technology a local community can run is set apart from organization-dependent technology that needs a vast apparatus.",
    dims: ["autonomy", "system"],
  },
  {
    section: "Revolution Is Easier than Reform",
    gist: "It argues the system cannot be reformed. Reformers and conservatives who cheer economic growth are dismissed as naive.",
    dims: ["contempt", "system"],
  },
  {
    section: "Strategy",
    gist: "It names wild nature as the positive ideal, and computer scientists, biologists and propagandists as drivers of the system.",
    dims: ["tech", "manipulation", "autonomy"],
  },
];

export interface Attack {
  year: number;
  place: string;
  target: string;
  outcome: string;
  killed?: boolean;
  archetype: ArchetypeId;
}

/** The public record of the 16 devices, abbreviated. */
export const ATTACKS: Attack[] = [
  { year: 1978, place: "Northwestern University", target: "Package tied to engineering professor Buckley Crist", outcome: "Campus officer Terry Marker injured", archetype: "academy" },
  { year: 1979, place: "Northwestern University", target: "Technological Institute", outcome: "Graduate student John Harris injured", archetype: "academy" },
  { year: 1979, place: "American Airlines Flight 444", target: "Cargo-hold device", outcome: "Passengers treated for smoke inhalation", archetype: "aviation" },
  { year: 1980, place: "Lake Forest, Illinois", target: "Percy Wood, president of United Airlines", outcome: "Injured", archetype: "aviation" },
  { year: 1981, place: "University of Utah", target: "Business classroom building", outcome: "Defused", archetype: "academy" },
  { year: 1982, place: "Vanderbilt University", target: "Addressed to computer scientist Patrick Fischer", outcome: "Secretary Janet Smith injured", archetype: "academy" },
  { year: 1982, place: "UC Berkeley", target: "Electrical engineering professor Diogenes Angelakos", outcome: "Injured", archetype: "academy" },
  { year: 1985, place: "UC Berkeley", target: "Computer lab, Cory Hall", outcome: "Graduate student John Hauser injured", archetype: "academy" },
  { year: 1985, place: "Boeing, Auburn, Washington", target: "Fabrication division", outcome: "Defused", archetype: "aviation" },
  { year: 1985, place: "University of Michigan", target: "Psychologist James McConnell", outcome: "Assistant Nicklaus Suino injured", archetype: "behavior" },
  { year: 1985, place: "Sacramento", target: "Hugh Scrutton, computer rental store owner", outcome: "Killed", killed: true, archetype: "computing" },
  { year: 1987, place: "Salt Lake City", target: "Gary Wright, computer store owner", outcome: "Injured", archetype: "computing" },
  { year: 1993, place: "UC San Francisco", target: "Geneticist Charles Epstein", outcome: "Injured", archetype: "behavior" },
  { year: 1993, place: "Yale University", target: "Computer scientist David Gelernter", outcome: "Injured", archetype: "academy" },
  { year: 1994, place: "North Caldwell, New Jersey", target: "Thomas Mosser, advertising executive", outcome: "Killed", killed: true, archetype: "persuasion" },
  { year: 1995, place: "Sacramento", target: "Gilbert Murray, California Forestry Association", outcome: "Killed", killed: true, archetype: "extraction" },
];

export type ArchetypeId =
  | "academy"
  | "behavior"
  | "computing"
  | "aviation"
  | "persuasion"
  | "extraction"
  | "woods"
  | "bystander";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  line: string;
  vector: Partial<Record<Dim, number>>;
}

/** Profiles distilled from who was actually targeted, plus two non-targets. */
export const ARCHETYPES: Archetype[] = [
  { id: "academy", name: "The University Engineer", line: "Computer science and engineering faculty were his most frequent targets, from 1978 to 1993.", vector: { tech: 1, institution: 1, visibility: 0.6 } },
  { id: "behavior", name: "The Human Engineer", line: "Genetics and behavioral psychology: the sciences he wrote would re-engineer people to fit the system.", vector: { tech: 0.8, manipulation: 1, institution: 0.9, visibility: 0.6 } },
  { id: "computing", name: "The Computer Merchant", line: "Owners of computer businesses spread the machine into daily life. One was the first person he killed.", vector: { tech: 1, system: 0.7, visibility: 0.5, institution: 0.2 } },
  { id: "aviation", name: "The Airline Executive", line: "Airlines and aerospace, the most visible symbols of industrial reach, drew his early attacks.", vector: { system: 1, tech: 0.2, visibility: 0.8, institution: 0.7 } },
  { id: "persuasion", name: "The Persuader", line: "Advertising and public relations: the propaganda arm of the system he wanted to dismantle.", vector: { manipulation: 1, system: 0.8, visibility: 0.7 } },
  { id: "extraction", name: "The Extraction Lobbyist", line: "Timber and resource industries were the machinery turning wild nature into raw material.", vector: { system: 1, visibility: 0.7, institution: 0.5 } },
  { id: "woods", name: "The Woods Dweller", line: "The writing's own ideal: self-reliant, small-scale, out of reach of the machine.", vector: { autonomy: 1 } },
  { id: "bystander", name: "The Bystander", line: "Most people never registered with him. But secretaries, students and a campus guard were hurt by packages meant for others.", vector: { contempt: 0.4 } },
];

export const TOLL = { killed: 3, injured: 23, devices: 16, span: "1978–1995" };

/** Compact text version handed to the model as grounding. */
export function corpusDigest(): string {
  const works = WORKS.map((w) => `- ${w.title} (${w.year}): ${w.note}`).join("\n");
  const themes = THEMES.map((t) => `- "${t.section}": ${t.gist}`).join("\n");
  const attacks = ATTACKS.map((a) => `- ${a.year}, ${a.place}: ${a.target}. ${a.outcome}.`).join("\n");
  return `PUBLISHED WORKS\n${works}\n\nMANIFESTO THEMES (section headings, paraphrased)\n${themes}\n\nRECORD OF DEVICES ${TOLL.span} (${TOLL.killed} killed, ${TOLL.injured} injured)\n${attacks}`;
}
