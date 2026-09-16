import { motion } from 'framer-motion';
import type { PropsWithChildren, ReactNode } from 'react';

import { HardCut, Slam } from './ui/hype';
import { EASE_OUT, Kicker } from './ui/primitives';
import { useBeats } from './ui/useBeats';

// Every chapter lands the same way: word on the cut, object 150 ms later, sub at 450 ms.
const LAYOUT_BEATS = [0, 150, 450];

interface ChapterProps {
  index: string;
  kicker: string;
  word: string;
  wordSize?: string;
  sub: ReactNode;
  /** Put the object on the left and the copy on the right. */
  flipped?: boolean;
  /** Extra layer rendered under everything (hex rain, glows). */
  background?: ReactNode;
  /** Fade-out length; 0 when the next cut's flash already covers the change. */
  exitMs?: number;
}

/**
 * Shared layout for the four product chapters: kicker, one giant word and a
 * one-line sub on one side, the product object on the other.
 */
export function Chapter({ index, kicker, word, wordSize = '9.6vw', sub, flipped = false, background, exitMs, children }: PropsWithChildren<ChapterProps>) {
  const beat = useBeats(LAYOUT_BEATS);
  const copyLeft = flipped ? '52vw' : '6vw';
  const objectLeft = flipped ? '5vw' : '53vw';
  return (
    <HardCut exitMs={exitMs}>
      {background}
      <div className="absolute" style={{ left: copyLeft, top: '13.6vw', width: '44vw' }}>
        <Kicker index={index} label={kicker} delay={0.05} />
        <div style={{ marginTop: '1.1vw', height: '9.4vw', display: 'flex', alignItems: 'center' }}>
          <Slam active={beat >= 0} size={wordSize} silver from={1.45} style={{ transformOrigin: 'left center' }}>
            {word}
          </Slam>
        </div>
        <motion.div
          style={{ marginTop: '1.6vw', fontFamily: 'var(--font-body)', fontSize: '1.95vw', lineHeight: 1.3, letterSpacing: '-0.01em', maxWidth: '40vw' }}
          initial={{ opacity: 0, y: '0.8vw' }}
          animate={beat >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.8vw' }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          {sub}
        </motion.div>
      </div>
      <motion.div
        className="absolute flex items-center justify-center"
        style={{ left: objectLeft, top: '8vw', width: '42vw', height: '40vw', transformOrigin: flipped ? '35% 50%' : '65% 50%' }}
        initial={{ opacity: 0, scale: 1.12, x: flipped ? '-2vw' : '2vw' }}
        animate={beat >= 1 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 1.12, x: flipped ? '-2vw' : '2vw' }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </HardCut>
  );
}
