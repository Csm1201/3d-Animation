#!/usr/bin/env bash
# Combines the Cycles frames (renders/), the overlay pass and the soundtrack into out/life-as-a-gta6-npc.mp4.
set -euo pipefail
cd "$(dirname "$0")"
ROOT=../..
mkdir -p build "$ROOT/out"
rm -rf build/overlay
PAGE=../fantastic-blender/overlay.html node ../fantastic-3d/render.js "$PWD/build/overlay" 2>&1 | grep -v "GL Driver" || true
python3 ../fantastic-3d/build_audio.py "$ROOT/audio/fantastic" build/soundtrack.wav
# two-pass loudness normalisation: single-pass loudnorm undershoots on a 14 s clip
LIM="alimiter=limit=0.2:attack=2:release=60:level=false"   # tame the bonk/splat transients so the mix can reach -14 LUFS
M=$(ffmpeg -hide_banner -i build/soundtrack.wav -af $LIM,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi() { echo "$M" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
LN="$LIM,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(mi input_i):measured_TP=$(mi input_tp):measured_LRA=$(mi input_lra):measured_thresh=$(mi input_thresh):offset=$(mi target_offset):linear=true"
# upscale 720x1280 -> 1080x1920, warm sunset grade, overlay captions/title, mux audio
ffmpeg -v error -y -framerate 30 -i renders/f_%04d.png -framerate 30 -i build/overlay/f_%04d.png -i build/soundtrack.wav \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos,colorbalance=rs=.06:gs=-.01:bs=-.06:rm=.05:bm=-.04:rh=.04:bh=-.03,eq=saturation=1.18:contrast=1.04,unsharp=5:5:.4[base];[base][1:v]overlay=0:0:format=auto[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 -af "$LN,aresample=44100" -shortest -movflags +faststart "$ROOT/out/life-as-a-gta6-npc.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,duration -of compact "$ROOT/out/life-as-a-gta6-npc.mp4"
