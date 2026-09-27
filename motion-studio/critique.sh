#!/usr/bin/env bash
# ./critique.sh [video] [strip-start-seconds]
# Builds the stills Opus reviews in the critique loop (step 11).
set -euo pipefail
FF="${FFMPEG:-ffmpeg}"
IN="${1:-out/final.mp4}"
SS="${2:-4.1}"

# Contact sheet: 2 frames per second, 6 across
"$FF" -y -loglevel error -i "$IN" -vf "fps=2,scale=270:-1,tile=6x5" -frames:v 1 out/contact.png
# Strip: 12 consecutive frames around a fast action (catch pops and overlaps)
"$FF" -y -loglevel error -ss "$SS" -i "$IN" -vf "scale=320:-1,tile=12x1" -frames:v 1 out/strip.png
# Phone test: how it reads at 360 px wide
"$FF" -y -loglevel error -i "$IN" -vf "fps=1,scale=360:-1,tile=5x3" -frames:v 1 out/phone.png
# Loop check: play it twice back to back and watch the seam
"$FF" -y -loglevel error -stream_loop 1 -i "$IN" -c copy out/loop_check.mp4

echo "wrote out/contact.png out/strip.png out/phone.png out/loop_check.mp4"
