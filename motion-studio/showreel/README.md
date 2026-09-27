# Showreel (experiment 1)

The viral one-liner from the article, made in this kit:

> make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.

1920x1080, 15s, 60 fps with 2-subframe motion blur, original score at 120 BPM. One orange dot threads the whole film and it loops seamlessly.

| Time | Shot | Technique |
|---|---|---|
| 0–2s | Dot drops, lands, stretches into a line; MOTION rises | squash and stretch, masked type |
| 2–4s | TIMING / SPACING / WEIGHT / RHYTHM, one per beat | kinetic type, ruler + playhead |
| 4–6s | Circle wipe; one shape morphs on every beat | springs with overshoot, echo trails |
| 6–7.5s | 576-dot grid, cursor clicks send ripples | wave field |
| 7.5–10s | Same 576 dots become a sphere, then a torus | hand-rolled 3D projection |
| 10–12s | Dots form a UI card; toggle, slider, chart | cursor-driven UI motion |
| 12–13.5s | Zoom through the toggle; a line draws a Lissajous curve | iris, path animation |
| 13.5–15s | "made in code." end card; dot leaves and loops | loop seam |

## Re-render

```bash
node render.mjs --page showreel/index.html --w 1920 --h 1080 --fps 60 --dur 15 --sub 2 --out out/showreel_silent.mp4
node showreel/score.mjs out/score.wav
ffmpeg -y -i out/showreel_silent.mp4 -i out/score.wav -af loudnorm=I=-14:TP=-1 -c:v copy -c:a aac -b:a 256k -shortest out/showreel.mp4
node stills.mjs --page showreel/index.html --times 0.7,2.7,4.7,6.6,8.2,10.9,12.6,14.2 --out out/stills.png
```

Open `showreel/index.html` in a browser for a live preview.
