# kraabel.ai ad (15s)

16:9, 1920x1080, 60 fps, original 96 BPM score. Built on the kraabel.ai design standard: ink `#121210`,
cream `#F1EFE8`, one accent `#E8650A`, Inter hairline (200) for display, rules instead of boxes, and the
KRAABEL.AI wordmark with the orange period. All on-screen copy comes from the kraabel.ai homepage.

| Time | Shot |
|---|---|
| 0–2.5s | A hand-drawn line and a machine hairline meet: "Human creativity meets augmented intelligence." The joined line becomes the header rule. |
| 2.5–5s | 01 Thinking clearly. Scattered strokes snap into ruled lines of text. |
| 5–7.5s | 02 Building carefully. Cream sheet; Brand Strategy, Digital Experience and AI Integration build as ruled columns. |
| 7.5–10s | 03 Iterating always. A circle is sketched, refined, then drawn exactly; it becomes the period. |
| 10–12.5s | The three commitments stacked. |
| 12.5–15s | KRAABEL.AI wordmark, orange rule, tagline, "Start a conversation at kraabel.ai". |

## Re-render

```bash
node render.mjs --page kraabel/index.html --w 1920 --h 1080 --fps 60 --dur 15 --sub 2 --out out/kraabel_silent.mp4
node kraabel/score.mjs out/kraabel-score.wav
ffmpeg -y -i out/kraabel_silent.mp4 -i out/kraabel-score.wav -af loudnorm=I=-14:TP=-1 -c:v copy -c:a aac -b:a 256k -shortest out/KRAABEL-ad-15s.mp4
```

`inter.css` is the embedded Inter from the kraabel-document skill, so renders need no network.
