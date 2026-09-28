import { NextResponse } from "next/server";
import { GUIDE_BY_ID, type GuideId } from "@/lib/guides";

export const runtime = "nodejs";

/**
 * Speaks the personal reading on the result screen in the chosen guide's
 * voice. Needs ELEVENLABS_API_KEY; without it this returns 404 and the page
 * simply shows the reading as text. Fixed lines are pre-rendered files in
 * public/voices and never come through here.
 */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: "Live speech is not configured." }, { status: 404 });

  let guide: GuideId;
  let text: string;
  try {
    const body = (await req.json()) as { guide?: unknown; text?: unknown };
    if (typeof body.guide !== "string" || !(body.guide in GUIDE_BY_ID)) throw new Error("guide");
    if (typeof body.text !== "string" || !body.text.trim()) throw new Error("text");
    guide = body.guide as GuideId;
    text = body.text.trim().slice(0, 1200);
  } catch {
    return NextResponse.json({ error: "Expected { guide, text }." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${GUIDE_BY_ID[guide].voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_v3" }),
    },
  );
  if (!res.ok || !res.body) {
    console.error("[speak] ElevenLabs returned", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "Speech failed." }, { status: 502 });
  }
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
