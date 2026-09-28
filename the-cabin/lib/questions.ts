import type { Dim } from "./corpus";

export interface Option {
  label: string;
  w: Partial<Record<Dim, number>>;
}

export interface Question {
  id: string;
  prompt: string;
  whisper: string; // the oracle's aside, shown under the prompt
  options: Option[];
}

export const QUESTIONS: Question[] = [
  {
    id: "work",
    prompt: "What do you do for work?",
    whisper: "He read professional directories before he addressed a package.",
    options: [
      { label: "I build software, hardware or AI", w: { tech: 3, institution: 1 } },
      { label: "Lab science: genetics, biotech, psychology", w: { tech: 2, manipulation: 2, institution: 2 } },
      { label: "Advertising, PR, media or marketing", w: { manipulation: 3, system: 2 } },
      { label: "Executive in industry: energy, timber, airlines", w: { system: 3, visibility: 1 } },
      { label: "I work with my hands: trades, farming, craft", w: { autonomy: 2 } },
    ],
  },
  {
    id: "where",
    prompt: "Where does your work happen?",
    whisper: "Most of the packages went to university addresses.",
    options: [
      { label: "A university or research institute", w: { institution: 3, tech: 1 } },
      { label: "A large corporation", w: { system: 2, institution: 2 } },
      { label: "My own small business", w: { system: 1 } },
      { label: "Outdoors, or nowhere in particular", w: { autonomy: 2 } },
    ],
  },
  {
    id: "tech",
    prompt: "How do you live with technology?",
    whisper: "He lived without electricity or running water.",
    options: [
      { label: "I build the things everyone else depends on", w: { tech: 3 } },
      { label: "Early adopter. Smart home, every new device", w: { tech: 1, contempt: 1 } },
      { label: "I use it and feel uneasy about it", w: {} },
      { label: "As little as I can manage", w: { autonomy: 2 } },
    ],
  },
  {
    id: "future",
    prompt: "What should we do about AI and genetic engineering?",
    whisper: "The manifesto calls reform a fool's errand.",
    options: [
      { label: "Accelerate. Progress solves its own problems", w: { tech: 2, system: 1, contempt: 1 } },
      { label: "Regulate it carefully and reform the system", w: { contempt: 2 } },
      { label: "I don't think about it much", w: { contempt: 1 } },
      { label: "Walk away from the industrial system entirely", w: { autonomy: 2 } },
    ],
  },
  {
    id: "nature",
    prompt: "What is wild land for?",
    whisper: "He called wild nature the positive ideal.",
    options: [
      { label: "Resources. Timber, energy, development", w: { system: 3 } },
      { label: "Protecting it through policy and nonprofits", w: { contempt: 1, institution: 1 } },
      { label: "A weekend hike, a good photo", w: { contempt: 1 } },
      { label: "Living in it. Hunting, growing, staying", w: { autonomy: 3 } },
    ],
  },
  {
    id: "visible",
    prompt: "How easy is your name to find?",
    whisper: "One victim was chosen after his firm appeared in the news.",
    options: [
      { label: "Quoted in the press, cited in my field", w: { visibility: 3 } },
      { label: "Published papers, conference talks", w: { visibility: 2, institution: 1 } },
      { label: "A professional profile, like everyone", w: { visibility: 1 } },
      { label: "Almost nobody knows who I am", w: { autonomy: 1 } },
    ],
  },
  {
    id: "persuade",
    prompt: "Is it your job to change what people want?",
    whisper: "Propaganda and psychological technique, he wrote, adapt people to the machine.",
    options: [
      { label: "Yes. Persuasion or behavior design is my craft", w: { manipulation: 3 } },
      { label: "I shape minds as a teacher or researcher", w: { manipulation: 1, institution: 1 } },
      { label: "No, but I'm easily persuaded", w: { contempt: 1 } },
      { label: "No. I'm hard to sell anything", w: { autonomy: 1 } },
    ],
  },
  {
    id: "power",
    prompt: "How do you meet your needs?",
    whisper: "“The power process”: real goals, real effort, your own hands.",
    options: [
      { label: "I grow, build or hunt much of what I need", w: { autonomy: 3 } },
      { label: "A salary from a large organization", w: { institution: 2 } },
      { label: "Investments, equity, status", w: { system: 2, contempt: 1 } },
      { label: "A mix. I patch it together", w: {} },
    ],
  },
  {
    id: "politics",
    prompt: "Where do you stand politically?",
    whisper: "The manifesto spends pages scorning the left, and more on growth-minded conservatives. Scorn and targets are separate lists.",
    options: [
      { label: "Progressive activist", w: { contempt: 3 } },
      { label: "Pro-business, pro-growth conservative", w: { system: 1, contempt: 2 } },
      { label: "Apolitical", w: {} },
      { label: "Against the technological system itself", w: { autonomy: 2 } },
    ],
  },
  {
    id: "package",
    prompt: "A heavy package arrives. No return address. You…",
    whisper: "Several of the injured were never the intended recipient.",
    options: [
      { label: "Open it at my desk", w: { institution: 1 } },
      { label: "Hand it to an assistant to deal with", w: { system: 1, visibility: 1, contempt: 1 } },
      { label: "Leave it alone and call the authorities", w: {} },
      { label: "I don't get mail. The road ends before my place", w: { autonomy: 2 } },
    ],
  },
];
