#!/usr/bin/env bash
# Builds public/audio/bg_music.mp3 (trimmed music bed) and
# public/audio/composite_audio.mp3 (music + SFX) for the 27.0 s hype intro.
#
# The music source is attached_assets/generated_audio/envelo_hype_b.mp3. Its
# drop sits at 7.76 s, so trimming 1.76 s from the head lands the drop on the
# `reveal` cut at 6.00 s. All SFX times below are video seconds; each entry
# already subtracts the sample's own onset offset so the transient lands on
# the visual beat.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="../../attached_assets/generated_audio/envelo_hype_b.mp3"
OUT_DIR="public/audio"
DUR=27.0
TRIM=1.76

[ -f "$SRC" ] || { echo "missing music source: $SRC" >&2; exit 1; }

# 1. Music bed: trim, short fade-in, +4 dB ramp over the quiet intro, fade-out.
ffmpeg -y -loglevel error -ss "$TRIM" -t "$DUR" -i "$SRC" \
  -af "afade=t=in:st=0:d=0.15,volume='if(lt(t,6),1.55-0.55*t/6,1)':eval=frame,afade=t=out:st=26.3:d=0.7" \
  -c:a libmp3lame -b:a 192k "$OUT_DIR/bg_music.mp3"

# 2. SFX schedule: file | start (s, already onset-corrected) | gain
SFX=(
  "sfx_impact 0.14 0.45"
  "sfx_glitch 0.33 0.5"
  "sfx_whoosh 1.00 0.55"
  "sfx_impact 1.11 0.5"
  "sfx_impact 2.08 0.6"
  "sfx_glitch 2.27 0.55"
  "sfx_paper_exposed 2.10 1.2"
  "sfx_glitch 3.24 0.65"
  "sfx_riser 3.95 0.6"
  "sfx_hash 3.97 0.4"
  "sfx_whoosh 4.35 0.65"
  "sfx_tick 5.39 2"
  "sfx_tick 5.51 2"
  "sfx_tick 5.63 2"
  "sfx_tick 5.75 2"
  "sfx_impact 5.81 1.0"
  "sfx_logo_reveal 6.00 0.9"
  "sfx_type 7.10 0.45"
  "sfx_whoosh 9.52 0.65"
  "sfx_impact 9.68 0.3"
  "sfx_hash 10.00 0.4"
  "sfx_whoosh 10.47 0.5"
  "sfx_seal 10.82 2.2"
  "sfx_impact 11.44 0.55"
  "sfx_whoosh 11.94 0.65"
  "sfx_impact 12.10 0.3"
  "sfx_hash 12.52 0.4"
  "sfx_impact 13.55 0.5"
  "sfx_anchor 13.74 6"
  "sfx_whoosh 14.84 0.65"
  "sfx_impact 15.00 0.3"
  "sfx_tick 15.46 2"
  "sfx_tick 15.76 2"
  "sfx_tick 16.06 2"
  "sfx_impact 16.53 0.5"
  "sfx_confirm 16.72 5"
  "sfx_whoosh 17.75 0.65"
  "sfx_impact 17.91 0.3"
  "sfx_hash 18.23 0.4"
  "sfx_seal 18.73 1.6"
  "sfx_impact 19.35 0.6"
  "sfx_impact 20.55 1.0"
  "sfx_glitch 20.74 0.5"
  "sfx_impact 21.39 0.7"
  "sfx_whoosh 22.45 0.7"
  "sfx_impact 23.01 0.35"
  "sfx_logo_reveal 23.20 0.75"
  "sfx_type 24.00 0.45"
  "sfx_end 24.60 0.55"
)

inputs=(-i "$OUT_DIR/bg_music.mp3")
filters="[0:a]volume=0.9[m0];"
mix="[m0]"
i=1
for entry in "${SFX[@]}"; do
  read -r name start gain <<<"$entry"
  file="$OUT_DIR/$name.mp3"
  [ -f "$file" ] || { echo "missing sfx: $file" >&2; exit 1; }
  inputs+=(-i "$file")
  ms=$(awk -v s="$start" 'BEGIN { printf "%d", (s < 0 ? 0 : s) * 1000 }')
  filters+="[$i:a]volume=$gain,adelay=${ms}|${ms}[s$i];"
  mix+="[s$i]"
  i=$((i + 1))
done
count=$i
filters+="${mix}amix=inputs=$count:normalize=0:dropout_transition=0,alimiter=limit=0.95:level=false[out]"

ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filters" -map "[out]" -t "$DUR" \
  -c:a libmp3lame -b:a 192k "$OUT_DIR/composite_audio.mp3"

for f in bg_music composite_audio; do
  printf '%s: %.2fs\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT_DIR/$f.mp3")"
done
