/**
 * Global pace for the slow cut. Every scene duration and every beat time is
 * multiplied by this factor, so the choreography of the 27 s hype intro is
 * preserved while each moment holds longer. Animation *durations* (slams,
 * scrambles, typewriter cadence) are intentionally left alone so the cuts
 * stay punchy; only the gaps between them stretch.
 *
 * Changing PACE changes the total runtime and therefore the music edit in
 * scripts/build-audio.sh; keep the two in step.
 */
export const PACE = 1.3;

/** Scales a millisecond value from the fast cut to this cut's pace. */
export function paced(ms: number): number {
  return Math.round(ms * PACE);
}
