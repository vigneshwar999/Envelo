#!/usr/bin/env bash
# Builds public/audio/bg_music.mp3 (music bed) and
# public/audio/composite_audio.mp3 (music + SFX) for the 35.1 s slow cut.
#
# Video timeline (PACE 1.3, see src/components/video/pace.ts):
#   open 0.000 · encrypt 4.212 · reveal 7.800 · seal 12.831 · anchor 15.977
#   pay 19.747 · verify 23.530 · claim 26.962 · end 30.160 · out 35.100
#
# The music source is attached_assets/generated_audio/envelo_slow_b.mp3, a
# 92 BPM hybrid-trailer bed: sparse intro hits at 0.68 / 5.91 / 11.11 s, a
# riser from 15.0 s into the drop at 16.36 s, a 22 s full section, a short
# break and a final hit at 39.82 s, then a natural decay to silence by 44 s.
#
# Edit: the whole track is sped up 0.257 % (asetrate) so that the distance
# from the drop to the final hit equals the distance from the `reveal` cut
# (7.80 s) to the URL typewriter on the end card (31.20 s). The drop is then
# placed on the reveal cut, and the final hit lands under the typewriter.
# The intro hit at 11.11 s would land 0.39 s before the third opening slam
# (2.951 s), so the opening uses a second copy of the track offset to put that
# hit on the slam, crossfaded back to the main copy during the quiet pad
# before the encrypt cut (video 4.15-4.65 s).
#
# All SFX times below are video seconds; each entry already subtracts the
# sample's own lead (attack length) so its transient lands on the visual beat.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="../../attached_assets/generated_audio/envelo_slow_b.mp3"
OUT_DIR="public/audio"
DUR=35.1

# 44100 * 1.00257: drop 16.36 -> 16.318, intro hit 11.11 -> 11.082, final hit 39.82 -> 39.718
RATE=44213
MAIN_TRIM=8.518   # 16.318 - 7.800: the drop lands on the reveal cut
OPEN_TRIM=8.131   # 11.082 - 2.951: the intro hit lands on the third slam
XF_START=4.15     # crossfade window (video s) from the opening copy to the main copy
XF_LEN=0.5

[ -f "$SRC" ] || { echo "missing music source: $SRC" >&2; exit 1; }

# 1. Music bed: resample, splice the opening copy onto the main copy, lift the
#    quiet intro by up to +3.5 dB, fade out under the end card.
open_end=$(awk -v t="$OPEN_TRIM" -v s="$XF_START" -v l="$XF_LEN" 'BEGIN { printf "%.3f", t + s + l }')
main_start=$(awk -v t="$MAIN_TRIM" -v s="$XF_START" 'BEGIN { printf "%.3f", t + s }')
ffmpeg -y -loglevel error -i "$SRC" -filter_complex "
  [0:a]asetrate=$RATE,aresample=44100,asplit=2[a][b];
  [a]atrim=start=$OPEN_TRIM:end=$open_end,asetpts=PTS-STARTPTS[open];
  [b]atrim=start=$main_start,asetpts=PTS-STARTPTS[main];
  [open][main]acrossfade=d=$XF_LEN:c1=tri:c2=tri[bed];
  [bed]atrim=end=$DUR,afade=t=in:st=0:d=0.15,
       volume='if(lt(t,7.3),1.5-0.5*t/7.3,1)':eval=frame,
       afade=t=out:st=33.6:d=1.4[out]" \
  -map "[out]" -c:a libmp3lame -b:a 192k "$OUT_DIR/bg_music.mp3"

# 2. SFX schedule: file | start (s, lead already subtracted) | gain
SFX=(
  "sfx_impact 0.24 0.45"
  "sfx_glitch 0.43 0.5"
  "sfx_whoosh 1.39 0.55"
  "sfx_impact 1.50 0.5"
  "sfx_impact 2.76 0.6"
  "sfx_glitch 2.95 0.55"
  "sfx_paper_exposed 2.93 1.2"
  "sfx_glitch 4.21 0.65"
  "sfx_hash 5.21 0.4"
  "sfx_riser 5.75 0.6"
  "sfx_whoosh 5.76 0.65"
  "sfx_tick 7.05 2"
  "sfx_tick 7.20 2"
  "sfx_tick 7.36 2"
  "sfx_tick 7.51 2"
  "sfx_impact 7.61 1.0"
  "sfx_logo_reveal 7.80 0.9"
  "sfx_type 9.23 0.45"
  "sfx_whoosh 12.48 0.65"
  "sfx_impact 12.64 0.3"
  "sfx_hash 13.05 0.4"
  "sfx_whoosh 13.72 0.5"
  "sfx_seal 14.31 2.2"
  "sfx_impact 14.93 0.55"
  "sfx_whoosh 15.63 0.65"
  "sfx_impact 15.79 0.3"
  "sfx_hash 16.33 0.4"
  "sfx_impact 17.67 0.5"
  "sfx_anchor 17.86 6"
  "sfx_whoosh 19.40 0.65"
  "sfx_impact 19.56 0.3"
  "sfx_tick 20.14 2"
  "sfx_tick 20.44 2"
  "sfx_tick 20.74 2"
  "sfx_impact 21.55 0.5"
  "sfx_confirm 21.74 5"
  "sfx_whoosh 23.18 0.65"
  "sfx_impact 23.34 0.3"
  "sfx_hash 23.75 0.4"
  "sfx_seal 24.59 1.6"
  "sfx_impact 25.21 0.6"
  "sfx_impact 26.77 1.0"
  "sfx_glitch 26.96 0.5"
  "sfx_impact 27.86 0.7"
  "sfx_whoosh 29.23 0.7"
  "sfx_impact 29.97 0.35"
  "sfx_logo_reveal 30.16 0.75"
  "sfx_type 31.20 0.45"
  "sfx_end 32.01 0.55"
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
