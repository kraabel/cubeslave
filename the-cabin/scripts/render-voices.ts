/**
 * Re-renders every fixed guide line to public/voices/<guide>/<key>.mp3.
 * Usage: ELEVENLABS_API_KEY=... npm run voices [-- guideId [clipKey]]
 * Runs one request at a time to stay under ElevenLabs' concurrency limit.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ALL_TIERS } from "../lib/algorithm";
import { GUIDES, guideClips } from "../lib/guides";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}
const [onlyGuide, onlyClip] = process.argv.slice(2);

for (const g of GUIDES) {
  if (onlyGuide && g.id !== onlyGuide) continue;
  const dir = path.join("public", "voices", g.id);
  mkdirSync(dir, { recursive: true });
  for (const [clip, text] of Object.entries(guideClips(g, ALL_TIERS))) {
    if (onlyClip && clip !== onlyClip) continue;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${g.voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_v3" }),
    });
    if (!res.ok) {
      console.error(`${g.id}/${clip}: ${res.status} ${await res.text()}`);
      continue;
    }
    writeFileSync(path.join(dir, `${clip}.mp3`), Buffer.from(await res.arrayBuffer()));
    console.log(`${g.id}/${clip}.mp3`);
  }
}
