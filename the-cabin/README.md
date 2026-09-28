# The Ted test

A full-screen 3D oracle. Ten questions, one verdict: how closely do you match the
profile of the people Ted Kaczynski (the Unabomber) targeted?

Built with Next.js 16 (App Router), TypeScript, React Three Fiber, Framer Motion,
and the Web Audio API. Optional Claude narration through the Anthropic SDK.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

**Replit:** import this folder, set the run command to `npm run dev`, and it binds
to `0.0.0.0:3000`. To turn on AI narration, add `ANTHROPIC_API_KEY` in Secrets.
Without a key, the oracle uses its built-in offline narration and everything
else still works.

## Preview without a server

`npm run preview:html` bundles the app into one self-contained file,
`preview/the-cabin.html`, that opens in any browser. It has no API route, so it
always uses the offline narration.

## The guides

Visitors choose one of four fictional guides before the quiz. Each has a
background, a lens (what they notice in your answers), and an ElevenLabs voice.
The guide changes how your result is read to you, never the score.

| Guide | Role | Lens | ElevenLabs voice |
| --- | --- | --- | --- |
| Dr. Elias Marr | Forensic psychologist | Motive and grievance | Signal |
| Warren Cole | Retired criminal profiler | Victimology: who was chosen and how they were found | Jason Abadi |
| Professor Aldous Wren | Psychoanalyst and historian of ideas | Where you stand in the manifesto's argument | Eldrin |
| Dr. Vera Lorne | Clinical psychologist, isolation and radicalization | Contempt, and whether scorn became a target | Ariana |

The ten questions run in three parts (`lib/chapters.ts`): The work (4), The
machine (4) and The mind (2). Each part opens with a card: a fact from the
record and a short spoken introduction from the guide.

Everything a guide says on a fixed script (greeting, intro, three part
introductions, loading line, and a verdict line for each of the six tiers) is
pre-rendered in `public/voices/`: 12 clips per guide, 48 in all.
To change a line, edit `lib/guides.ts` and re-render it:

```bash
ELEVENLABS_API_KEY=... npm run voices -- marr intro   # one clip
ELEVENLABS_API_KEY=... npm run voices                 # all 48
```

With `ELEVENLABS_API_KEY` set on the server, the guide also reads your personal
reading aloud on the result screen (`app/api/speak`). Without it, the reading
stays on screen as text.

## How it works

| Piece | File | What it does |
| --- | --- | --- |
| Knowledge base | `lib/corpus.ts` | His three published books, ten manifesto themes (paraphrased, by section heading), the record of all 16 devices, and 8 target archetypes built from that record. |
| Questions | `lib/questions.ts` | 10 questions. Each answer adds weight to one or more dimensions. |
| Algorithm | `lib/algorithm.ts` | Scores 7 dimensions, then computes a 0-100 target-profile match (see below) and the nearest historical archetype by cosine similarity. |
| Narration | `app/api/verdict/route.ts` | Re-scores server-side, then asks Claude to write the Archivist's reading, grounded in the corpus digest. Falls back to `lib/narrate.ts` offline. |
| 3D scene | `components/Scene.tsx`, `components/Landscape.tsx`, `components/Fireflies.tsx` | A cold Montana night: shader sky, twinkling stars, a thin moon, four receding ridgelines with moonlit snow, a pine valley, one lit cabin, two lanterns on wet ground, mist, light snow, and fireflies in three depth layers. Film grade, grain, flicker, dust and letterbox bars finish it. It also picks which shape the pages hold at each stage. |
| Paper swarm | `components/PaperSwarm.tsx`, `lib/paperTexture.ts` | 520 procedurally drawn manuscript pages. They blow in, then spin between a ball, a paper bust, a tornado, a nest and a drift, with a red thread winding through. The homepage loops through the shapes; each answer re-forms them; the verdict shape follows your score. |
| Buttons | `components/Organic.tsx` | Pill buttons with soft, wobbling edges drawn by animated SVG noise filters. |
| Sound | `lib/audio.ts` | Fully synthesized: wind, a drone that tightens with each answer, typewriter keys, bells, and a sub-bass reveal. Spoken voice via browser speech synthesis. |
| UI | `components/Experience.tsx` | Gate, intro, questions, divining, verdict, and memorial. Keys 1-5 answer questions. |

### The scoring model

Dimensions: technological proximity, agent of the system, behavior engineering,
public visibility, institutional embedding, autonomy, and contempt.

1. **Profile.** His targets were specialists, so the strongest of tech / system /
   behavior engineering counts for more than their average.
2. **Reach.** Every target had a findable name and address, so visibility and
   institutional ties multiply the profile.
3. **Shield.** Autonomy, the manifesto's own ideal, cuts the score by up to 85%.
4. **Contempt** is shown but never raises the score. The manifesto scorns many
   more people than he ever targeted.

Tune the weights in `lib/questions.ts` and the curve in `riskOf()`.

## Content notes

This is a history piece about real violence: 3 people killed and 23 injured
between 1978 and 1995. The verdict screen links to a memorial listing every
device and who it hurt. The Claude prompt forbids glorifying the attacks,
speaking as Kaczynski, or giving any tactical detail. The oracle quotes only
section headings and short, widely published fragments, and paraphrases the rest.
