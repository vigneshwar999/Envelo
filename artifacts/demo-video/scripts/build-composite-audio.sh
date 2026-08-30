#!/bin/bash
# Rebuilds public/audio/composite_audio.mp3 - the single pre-mixed track the
# EXPORT path plays (direct page load = what the download recorder captures).
#
# Re-run this whenever bg_music.mp3, any vo/*.mp3 clip, or SCENE_DURATIONS
# changes; the composite bakes scene timing in and will silently drift from
# the visuals otherwise.
#
# Mix design (per the video stack's export-parity guidance):
# - music bed at 0.25 (ducked level; narration must stay intelligible)
# - each narration clip loudnorm'd to speech level (-18 LUFS, true peak
#   -1.5 dB) because the raw TTS clips are quiet (RMS -33..-37 dB), then
#   delayed to its scene start + 250 ms (scenes are 10 s each)
# - amix normalize=0 so those levels are respected, clamped to 60 s
set -euo pipefail
cd "$(dirname "$0")/.."

VO=public/audio/vo
NORM="loudnorm=I=-18:TP=-1.5:LRA=7,aresample=44100"

ffmpeg -hide_banner -loglevel error -y \
  -i public/audio/bg_music.mp3 \
  -i "$VO/seal.mp3" -i "$VO/anchor.mp3" -i "$VO/pay.mp3" \
  -i "$VO/share.mp3" -i "$VO/verify.mp3" -i "$VO/outro.mp3" \
  -filter_complex "\
[0:a]volume=0.25[m];\
[1:a]$NORM,adelay=250|250[vo0];\
[2:a]$NORM,adelay=10250|10250[vo1];\
[3:a]$NORM,adelay=20250|20250[vo2];\
[4:a]$NORM,adelay=30250|30250[vo3];\
[5:a]$NORM,adelay=40250|40250[vo4];\
[6:a]$NORM,adelay=50250|50250[vo5];\
[m][vo0][vo1][vo2][vo3][vo4][vo5]amix=inputs=7:duration=longest:dropout_transition=0:normalize=0[out]" \
  -map "[out]" -t 60 -c:a libmp3lame -b:a 192k -ar 44100 \
  public/audio/composite_audio.mp3

echo "Wrote public/audio/composite_audio.mp3:"
ffprobe -v error -show_entries format=duration,bit_rate -of csv=p=0 public/audio/composite_audio.mp3
