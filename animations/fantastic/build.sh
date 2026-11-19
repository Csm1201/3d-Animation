#!/usr/bin/env bash
# Renders "Fantastic" to out/fantastic.mp4 (1080x1920, 30 fps, with audio).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=../..
BUILD=build
mkdir -p "$BUILD" "$ROOT/out"
rm -rf "$BUILD/frames"

node render.js "$BUILD/frames"
python3 build_audio.py "$ROOT/audio/fantastic" "$BUILD/soundtrack.wav"

ffmpeg -v error -y -framerate 30 -i "$BUILD/frames/f_%04d.png" -i "$BUILD/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -shortest -movflags +faststart "$ROOT/out/fantastic.mp4"

ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "$ROOT/out/fantastic.mp4"
