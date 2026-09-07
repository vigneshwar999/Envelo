import { useMemo, useState } from 'react';
import { useSceneTimer } from '@/lib/video';

/**
 * Returns the index of the latest beat reached (-1 before the first).
 * Beats are milliseconds from scene mount; timers pause with the player.
 */
export function useBeats(beatsMs: number[]): number {
  const [beat, setBeat] = useState(-1);
  const events = useMemo(
    () => beatsMs.map((time, index) => ({ time, callback: () => setBeat((b) => Math.max(b, index)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beatsMs.join('|')],
  );
  useSceneTimer(events);
  return beat;
}
