#!/usr/bin/env bash
# Builds public/audio/bg_music.mp3 (music bed) and
# public/audio/composite_audio.mp3 (music + SFX) for the 40.5 s slow cut.
#
# Video timeline (PACE 1.5, see src/components/video/pace.ts):
#   open 0.000 · encrypt 4.860 · reveal 9.000 · seal 14.805 · anchor 18.435
#   pay 22.785 · verify 27.150 · claim 31.110 · end 34.800 · out 40.500
#   URL typewriter on the end card at 36.000; picture fades 39.15-39.75.
#
# The music source is attached_assets/generated_audio/envelo_pro_d.mp3, a
# 118 BPM keynote-style tech anthem (piano, plucked arps, pads, clean drums):
#   0-9.18   quiet build (the first second is silent)
#   9.18     soft entry, 4 moderate bars
#   17.315   drop: full arrangement, 8 strong bars (bar = 2.0335 s); bar 8
#            already filters down towards the breakdown
#   33.58    two breakdown bars, then a soft piano chord at 37.655, a second
#            chord 1.8 s later, and a ring-out that decays to silence by 45 s
#
# Edit: the track is slowed 5.7 % (asetrate, about 112 BPM) so that 12 bars
# equal the 25.8 s between the reveal cut (9.0) and the end card (34.8). Then:
#   build, source 0.67-9.18 -> out 0.0 - 9.0    (the 4 moderate bars are cut)
#   drop, bars 1-4       -> out 9.0 - 17.6
#   bars 1-4 again       -> out 17.6 - 26.2  (the drop phrase plays twice, as
#                                             most 8-bar drops do)
#   bars 5-8             -> out 26.2 - 34.8  (bar 8 is the track's own
#                                             wind-down)
#   final chords         -> out 34.8 on the end card, second chord under the
#                           URL typewriter, ring-out ends with the picture;
#                           the two breakdown bars are skipped so the groove
#                           resolves straight into the chord on the cut
# Splices are 25 ms equal-power crossfades placed just before a downbeat so
# every downbeat transient stays intact and the beat grid is continuous; bar
# positions are kept (bar 4 -> bar 1, bar 8 -> chord) so the harmony never
# skips.
#
# All SFX times below are video seconds; each entry already subtracts the
# sample's own lead (attack length) so its transient lands on the visual beat.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="../../attached_assets/generated_audio/envelo_pro_d.mp3"
OUT_DIR="public/audio"
DUR=40.5

# Source grid (seconds in the original file).
DROP=17.315
BAR=2.0335
ENTRY=$(awk -v d="$DROP" -v b="$BAR" 'BEGIN { printf "%.4f", d - 4 * b }')   # 9.181
F5=$(awk -v d="$DROP" -v b="$BAR" 'BEGIN { printf "%.4f", d + 4 * b }')      # 25.449
F8END=$(awk -v d="$DROP" -v b="$BAR" 'BEGIN { printf "%.4f", d + 8 * b }')   # 33.583
CHORD=37.655                                                                # first piano chord

# Stretch so 12 bars span reveal -> end card (34.8 - 9.0 = 25.8 s).
S=$(awk -v b="$BAR" 'BEGIN { printf "%.6f", (25.8 / 12) / b }')             # 1.05729
RATE=$(awk -v s="$S" 'BEGIN { printf "%d", 44100 / s + 0.5 }')             # 41710
XF=0.025

st() { awk -v t="$1" -v s="$S" -v o="${2:-0}" 'BEGIN { printf "%.4f", t * s + o }'; }
SEG1_START=$(st "$ENTRY" -9.0)
SEG1_END=$(st "$ENTRY")
SEG2_START=$(st "$DROP" "-$XF")
SEG2_END=$(st "$F5")
SEG3_END=$(st "$F8END")
SEG4_START=$(st "$CHORD" "-$XF")

[ -f "$SRC" ] || { echo "missing music source: $SRC" >&2; exit 1; }

# 1. Music bed: slow down, cut the four segments, splice them with short
#    crossfades before each downbeat, lift the quiet build, fade under the
#    end card. The source is opened once per segment (one decoder each)
#    because a single asplit feeding differently-timed trims overflows
#    ffmpeg's buffer queues and silently drops the later segments.
#    A button ending is layered on the end-card cut so the groove does not
#    simply stop: the drop's own downbeat, split into its cymbal wash
#    (high-passed, 2 s ring-out) and its kick/bass thump (low-passed), plus
#    the same wash reversed as a short swell into the cut.
BUTTON_MS=34800
SWELL=0.9
SWELL_MS=$(awk -v b="$BUTTON_MS" -v s="$SWELL" 'BEGIN { printf "%d", b - s * 1000 }')
HIT_START=$(st "$DROP" -0.004)
ffmpeg -y -loglevel error -i "$SRC" -i "$SRC" -i "$SRC" -i "$SRC" -i "$SRC" -filter_complex "
  [0:a]asetrate=$RATE,aresample=44100,atrim=start=$SEG1_START:end=$SEG1_END,asetpts=PTS-STARTPTS[s1];
  [1:a]asetrate=$RATE,aresample=44100,atrim=start=$SEG2_START:end=$SEG2_END,asetpts=PTS-STARTPTS[s2];
  [2:a]asetrate=$RATE,aresample=44100,atrim=start=$SEG2_START:end=$SEG3_END,asetpts=PTS-STARTPTS[s3];
  [3:a]asetrate=$RATE,aresample=44100,atrim=start=$SEG4_START,asetpts=PTS-STARTPTS[s4];
  [4:a]asetrate=$RATE,aresample=44100,atrim=start=$HIT_START:duration=2.4,asetpts=PTS-STARTPTS,asplit=3[h1][h2][h3];
  [h1]highpass=f=5000,highpass=f=5000,afade=t=out:st=0.3:d=2.0,volume=1.5,adelay=${BUTTON_MS}|${BUTTON_MS}[crash];
  [h2]lowpass=f=180,atrim=end=0.6,afade=t=out:st=0.12:d=0.45,volume=1.0,adelay=${BUTTON_MS}|${BUTTON_MS}[thump];
  [h3]highpass=f=5000,highpass=f=5000,atrim=end=$SWELL,areverse,afade=t=in:st=0:d=$SWELL,volume=1.4,adelay=${SWELL_MS}|${SWELL_MS}[swell];
  [s1][s2]acrossfade=d=$XF:c1=qsin:c2=qsin[x1];
  [x1][s3]acrossfade=d=$XF:c1=qsin:c2=qsin[x2];
  [x2][s4]acrossfade=d=$XF:c1=qsin:c2=qsin[cut];
  [cut][swell][crash][thump]amix=inputs=4:normalize=0:dropout_transition=0[bed];
  [bed]atrim=end=$DUR,
       volume='if(lt(t,9),2.5-1.5*t/9,1)':eval=frame,
       afade=t=out:st=39.2:d=1.3[out]" \
  -map "[out]" -c:a libmp3lame -b:a 192k "$OUT_DIR/bg_music.mp3"

# 2. SFX schedule: file | start (s, lead already subtracted) | gain | duck
#    duck=1 feeds the sample into the side-chain that dips the music a few dB
#    under the hit (film-mix style). Hits that land on a music downbeat (the
#    drop at 9.0, the end card at 34.8) do not duck, so the music keeps its own
#    accent there; textures (whooshes, risers, glitches, UI blips) never duck.
SFX=(
  "sfx_impact 0.31 0.45 1"
  "sfx_glitch 0.50 0.5 0"
  "sfx_whoosh 1.65 0.55 0"
  "sfx_impact 1.76 0.5 1"
  "sfx_impact 3.21 0.6 1"
  "sfx_glitch 3.40 0.55 0"
  "sfx_paper_exposed 3.48 1.2 0"
  "sfx_glitch 4.86 0.65 0"
  "sfx_hash 6.04 0.4 1"
  "sfx_whoosh 6.70 0.65 0"
  "sfx_riser 6.95 0.6 0"
  "sfx_tick 8.16 2 1"
  "sfx_tick 8.33 2 1"
  "sfx_tick 8.51 2 1"
  "sfx_tick 8.68 2 1"
  "sfx_impact 8.81 1.0 0"
  "sfx_logo_reveal 9.00 0.9 0"
  "sfx_type 10.65 0.45 0"
  "sfx_whoosh 14.45 0.65 0"
  "sfx_impact 14.61 0.3 1"
  "sfx_hash 15.08 0.4 1"
  "sfx_whoosh 15.89 0.5 0"
  "sfx_seal 16.64 1.8 1"
  "sfx_impact 17.26 0.55 1"
  "sfx_whoosh 18.09 0.65 0"
  "sfx_impact 18.25 0.3 1"
  "sfx_hash 18.87 0.4 1"
  "sfx_impact 20.42 0.5 1"
  "sfx_anchor 20.61 4 1"
  "sfx_whoosh 22.44 0.65 0"
  "sfx_impact 22.60 0.3 1"
  "sfx_tick 23.26 2 1"
  "sfx_tick 23.56 2 1"
  "sfx_tick 23.86 2 1"
  "sfx_impact 24.90 0.5 1"
  "sfx_confirm 25.09 3.5 1"
  "sfx_whoosh 26.80 0.65 0"
  "sfx_impact 26.96 0.3 1"
  "sfx_hash 27.43 0.4 1"
  "sfx_seal 28.50 1.6 1"
  "sfx_impact 29.12 0.6 1"
  "sfx_impact 30.92 1.0 1"
  "sfx_glitch 31.11 0.5 0"
  "sfx_impact 32.17 0.7 1"
  "sfx_whoosh 33.75 0.7 0"
  "sfx_impact 34.61 0.35 0"
  "sfx_logo_reveal 34.80 0.75 0"
  "sfx_type 36.00 0.45 0"
  "sfx_end 36.95 0.55 0"
)

inputs=(-i "$OUT_DIR/bg_music.mp3")
filters="[0:a]volume=0.65[m0];"
sfxmix=""
duckmix=""
i=1
nsfx=0
nduck=0
for entry in "${SFX[@]}"; do
  read -r name start gain duck <<<"$entry"
  file="$OUT_DIR/$name.mp3"
  [ -f "$file" ] || { echo "missing sfx: $file" >&2; exit 1; }
  inputs+=(-i "$file")
  ms=$(awk -v s="$start" 'BEGIN { printf "%d", (s < 0 ? 0 : s) * 1000 }')
  if [ "$duck" = "1" ]; then
    filters+="[$i:a]volume=$gain,adelay=${ms}|${ms},asplit=2[s$i][d$i];"
    duckmix+="[d$i]"
    nduck=$((nduck + 1))
  else
    filters+="[$i:a]volume=$gain,adelay=${ms}|${ms}[s$i];"
  fi
  sfxmix+="[s$i]"
  nsfx=$((nsfx + 1))
  i=$((i + 1))
done
# Side-chain: the ducking hits, summed, dip the music (peak detection, fast
# attack, ~220 ms release; a full-scale hit dips it 6 dB, a -10 dB hit 1 dB).
filters+="${duckmix}amix=inputs=$nduck:normalize=0:dropout_transition=0,apad=whole_dur=$DUR[sc];"
filters+="[m0][sc]sidechaincompress=threshold=0.25:ratio=2:attack=3:release=220:detection=peak:level_sc=1:mix=1[md];"
filters+="[md]${sfxmix}amix=inputs=$((nsfx + 1)):normalize=0:dropout_transition=0,alimiter=limit=0.95:level=false[out]"

ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filters" -map "[out]" -t "$DUR" \
  -c:a libmp3lame -b:a 192k "$OUT_DIR/composite_audio.mp3"

for f in bg_music composite_audio; do
  printf '%s: %.2fs\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT_DIR/$f.mp3")"
done
