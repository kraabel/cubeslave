# Motion studio: experiment kit

A runnable kit built from Movez's article **"How to build motion design studio with Opus 5.5 (Full-course)"**
([x.com/0xMovez/status/2104216919033192746](https://x.com/0xMovez/status/2104216919033192746), Sep 27, 2026).

The article's thesis: **"The prompt is 10% of the video. The other 90% is the harness."**
Opus can't output an MP4. It writes a program with a `seek(t)` function that paints any frame.
A headless browser screenshots every frame, ffmpeg stitches them together, and Opus looks at its own
frames to critique and fix them.

## What's here

| File | Article step | What it does |
|---|---|---|
| `index.html` | 07 Engine | One canvas, `window.seek(t)`, a scene list. Live preview when opened in a browser. |
| `render.mjs` | 07 Engine | Playwright walks time, pipes PNGs to ffmpeg, optional subframe motion blur. |
| `lib/motion.js` | 08 Springs | Closed-form `spring`, multi-target `track`, stretchy `indicator`, `swapAlpha`, `loopT`, seeded `rng`. |
| `beats.py` | 09 Sound | librosa beat, downbeat and hit grid → `beats.json`. |
| `sfx.mjs` + `cues.json` | 09 Sound | Synthesized click, pop, thump and whoosh → WAV. |
| `critique.sh` | 11 Critique | Contact sheet, strip, phone test and loop check stills. |
| `CLAUDE.md` | 02 Setup | House rules Claude Code reads on every run. |
| `prompts/` | 03–06, 10, 11 | Every prompt pattern from the article, ready to paste. |
| `.claude/skills/motion-reel/` | 12 Ship | The pipeline packaged as a `/motion-reel` skill. |

## Setup (about 10 minutes)

```bash
# Node 22+, ffmpeg, Python 3
brew install node ffmpeg python            # macOS (use apt on Linux)
pip install numpy librosa soundfile

cd motion-studio
npm install && npx playwright install chromium

# Smoke test: render 9s, add synthesized SFX, build critique stills
node render.mjs --fps 30 --dur 9 --sub 1
node sfx.mjs cues.json out/sfx.wav
ffmpeg -y -i out/silent.mp4 -i out/sfx.wav -c:v copy -c:a aac -shortest out/final.mp4
./critique.sh out/final.mp4

# Start Claude Code on Opus 5.5 inside this folder
claude --model claude-opus-5-5              # then /model → effort xhigh (new films) or max (flagship)
```

If ffmpeg isn't on PATH, set `FFMPEG=/path/to/ffmpeg`. Set `CHROMIUM=/path/to/chrome` to use a
browser you already have installed.

Optional add-ons the article uses:
```bash
npx skills add remotion-dev/skills          # Route B: React / Remotion
npx skills add heygen-com/hyperframes       # Route B: HTML + GSAP
claude plugin marketplace add buildwithhanif/claude-animation-skill
claude plugin install claude-animation@claude-animation-skill   # hand-drawn look
```

## Experiments, in order

Each one isolates one lever from the article. Keep a Claude Code session open per brand/project.

1. **Baseline one-liner** (`prompts/01`). Same prompt at `medium`, `xhigh` and `max` effort.
   Compare the three. The article says every viral one-shot ran on xhigh or max.
2. **Harness on vs off.** Run experiment 1 again in an empty folder with no `CLAUDE.md` and
   no `lib/`. The gap you see is what the harness is worth.
3. **Brand reel** (`prompts/02`). Point it at a real product URL. Watch whether it pulls real
   screenshots and assets or invents UI. Tony Dinh's version took under 30 minutes.
4. **Reference** (`prompts/03`). Drop a clip you like into `refs/`. It should write a
   `style_guide.md` and a shot list before any code.
5. **UI morph spec** (`prompts/04`). One shape that never cuts, driven by a cursor, looping.
   This was the most-bookmarked prompt of the week (907K views).
6. **Sound sync.** Put a track in `audio/track.wav`, run `python beats.py audio/track.wav > beats.json`,
   and ask Opus to put state changes on `beats` and SFX on `hits`.
7. **Critique loop** (`prompts/critique-pass.txt`). Run three rounds and log the scores each time.
   This is the step that separates the viral clips from the "mid" ones.
8. **Overnight director's brief** (`prompts/05`). A long autonomous run with gates and subagents,
   modeled on Donald's roughly 9,500-character brief, which took 12 hours.
9. **Skill.** Run `/motion-reel for [URL], 20s, vertical, reference ./refs/frame.png`.

## Route B: React (Remotion)

This fits a Next.js/TypeScript stack. Remotion compositions are plain React components, so scenes
can be ported into a Next app with `@remotion/player`.

```bash
npx create-video@latest launch-film && cd launch-film
npx skills add remotion-dev/skills
claude
> /remotion-create a 20s 9:16 launch film for [PRODUCT], springs only, one accent color
npx remotion studio
npx remotion render Main out/launch.mp4
```

## Repos the article links

- Music video: https://github.com/JohnHeibel/PDoomVideo (subagents + ANIMATION_GUIDE.md pattern)
- Starter: https://github.com/JohnHeibel/ClaudeAnimationBase
- Node canvas skill: https://github.com/buildwithhanif/claude-animation-skill
- HyperFrames (HTML): https://github.com/heygen-com/hyperframes
- Remotion AI skills: https://www.remotion.dev/docs/ai/skills
- Long form: https://github.com/WinterArc21/Battle-of-Austerlitz-Film
- Prompt library: https://github.com/guanmo-ai/awesome-ai-motion
- Dataset of Opus 5.5 videos: https://github.com/athemeroy/awesome-opus-5-5-videos

## Source posts cited in the article

- One-liner showreel, max effort: [@stephanlivera](https://x.com/stephanlivera/status/2103315922098470926); xhigh: [@robj3d3](https://x.com/robj3d3/status/2103875898349088830)
- Brand reel: [@tdinh_me](https://x.com/tdinh_me/status/2103703135902740699); mascot + ElevenLabs: [@achxvi](https://x.com/achxvi/status/2103918792845963545)
- Workflow teardown: [@rexan_wong](https://x.com/rexan_wong/status/2103707054108299437); route A analysis: [@__morse](https://x.com/__morse/status/2103485566570369333)
- UI morph XML template: [@twoclipping](https://x.com/twoclipping/status/2103273003555402193); MakerMap: [@verbove](https://x.com/verbove/status/2103483957266268381)
- 12-hour director's brief: [@donaldjewkes](https://x.com/donaldjewkes/status/2102801469976248500); re-run: [@pleometric](https://x.com/pleometric/status/2103082510607610023)
- Synthesized soundtracks: [@oozn](https://x.com/oozn/status/2103482545111232946), [@Voxyz_ai](https://x.com/Voxyz_ai/status/2102531681450119426)
- Honest iteration (163 calls): [@mablesjoseph](https://x.com/mablesjoseph/status/2103465246014746943)
