# The Cabin

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

## How it works

| Piece | File | What it does |
| --- | --- | --- |
| Knowledge base | `lib/corpus.ts` | His three published books, ten manifesto themes (paraphrased, by section heading), the record of all 16 devices, and 8 target archetypes built from that record. |
| Questions | `lib/questions.ts` | 10 questions. Each answer adds weight to one or more dimensions. |
| Algorithm | `lib/algorithm.ts` | Scores 7 dimensions, then computes a 0-100 target-profile match (see below) and the nearest historical archetype by cosine similarity. |
| Narration | `app/api/verdict/route.ts` | Re-scores server-side, then asks Claude to write the Archivist's reading, grounded in the corpus digest. Falls back to `lib/narrate.ts` offline. |
| 3D scene | `components/Scene.tsx` | Night forest, lit cabin, falling ash, and the oracle: a distorted orb that breathes with the audio and shifts from cold blue to ember as you answer. |
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
