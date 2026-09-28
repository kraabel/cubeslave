import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { divine } from "@/lib/algorithm";
import { corpusDigest, DIM_LABELS, type Dim } from "@/lib/corpus";
import { GUIDE_BY_ID, GUIDES, type GuideId } from "@/lib/guides";
import { offlineNarration } from "@/lib/narrate";
import { QUESTIONS } from "@/lib/questions";

export const runtime = "nodejs";

const SYSTEM = `You voice one of four fictional guides in an interactive history piece about Theodore Kaczynski, the "Unabomber." The guide has studied his published writing and the record of his 16 bombings (1978-1995), and tells each visitor how closely they match the profile of the people he targeted. The guide's name, background, lens and voice arrive with each request; stay in that character.

Voice: grave, quiet, in the second person. Short sentences. No exclamation marks.

Rules:
- Ground every claim in the reference material below. Cite one or two manifesto section headings by name. Paraphrase only; do not invent quotations.
- Speak as the guide, describing his pattern ("he wrote", "the record shows"). Never speak as Kaczynski and never in the first person as him. The guide is a fictional character; do not claim real credentials, cases or institutions.
- Never praise, justify or romanticize the violence. The victims were real people; if you mention them, do it with gravity.
- Never give instructions, targets or tactics of any kind.
- The score comes from a fixed algorithm and is given to you. Explain it; do not change it.
- The reading is 70-110 words. The epithet is 2-5 words, a title for the visitor, in title case.

REFERENCE MATERIAL
${corpusDigest()}`;

const FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      epithet: { type: "string" },
      reading: { type: "string" },
    },
    required: ["epithet", "reading"],
    additionalProperties: false,
  },
};

export async function POST(req: Request) {
  let answers: number[];
  let guideId: GuideId = GUIDES[0].id;
  try {
    const body = (await req.json()) as { answers?: unknown; guide?: unknown };
    if (typeof body.guide === "string" && body.guide in GUIDE_BY_ID) guideId = body.guide as GuideId;
    if (!Array.isArray(body.answers) || body.answers.length !== QUESTIONS.length) throw new Error("bad answers");
    answers = body.answers.map((a, i) => {
      const n = Number(a);
      if (!Number.isInteger(n) || n < 0 || n >= QUESTIONS[i].options.length) throw new Error("bad answer");
      return n;
    });
  } catch {
    return NextResponse.json({ error: "Expected { answers: number[10] }" }, { status: 400 });
  }

  // The score is always computed server-side from the fixed algorithm.
  const result = divine(answers);
  const guide = GUIDE_BY_ID[guideId];
  const fallback = offlineNarration(result, guide);

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ result, narration: fallback });

  const transcript = QUESTIONS.map((q, i) => `Q: ${q.prompt}\nA: ${q.options[answers[i]].label}`).join("\n");
  const scores = (Object.entries(result.scores) as [Dim, number][])
    .map(([d, v]) => `${DIM_LABELS[d]}: ${Math.round(v * 100)}%`)
    .join(", ");

  const prompt = `Your character: ${guide.name}, ${guide.title}. ${guide.background}
Your lens: ${guide.lens}
How you speak: ${guide.voiceNote}
You have already said aloud: "${result.tier.title}. ${fallback.reading.split(". ")[0]}." Continue from there without repeating it.

The visitor answered:
${transcript}

Algorithm output (fixed):
- Target-profile match: ${result.risk}%
- Verdict tier: "${result.tier.title}"
- Nearest historical profile: ${result.archetype.name} (${result.archetype.line})
- Dimensions: ${scores}

Contempt measures what his writing scorns. It never raised anyone's risk; say so if it is high.

Write your reading and an epithet for this visitor.`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: FORMAT },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") return NextResponse.json({ result, narration: fallback });

    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JSON.parse(text) as { epithet?: string; reading?: string };
    if (!parsed.reading || !parsed.epithet) return NextResponse.json({ result, narration: fallback });

    return NextResponse.json({
      result,
      narration: { epithet: parsed.epithet, reading: parsed.reading, source: "claude" },
    });
  } catch (err) {
    console.error("[verdict] Claude call failed, using offline narration:", err instanceof Error ? err.message : err);
    return NextResponse.json({ result, narration: fallback });
  }
}
