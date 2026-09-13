import { motion } from 'framer-motion';
import { useRef } from 'react';

import { EnveloMark } from './ui/EnveloMark';
import { SLAM_EASE } from './ui/hype';
import { EASE_OUT, silverTextStyle } from './ui/primitives';

export type LockupState = 'hidden' | 'hero' | 'corner' | 'end';

const WORDMARK = 'Envelo'.split('');

// The lockup is laid out once at hero size (42vw x 12vw box) and only ever
// moved with translate/scale, so the brand never re-rasterises between cuts.
const POSE: Record<Exclude<LockupState, 'hidden'>, { x: string; y: string; scale: number }> = {
  hero: { x: '25.2vw', y: '13.3vw', scale: 1.18 },
  corner: { x: '5.6vw', y: '3.6vw', scale: 0.21 },
  end: { x: '36.1vw', y: '15.4vw', scale: 0.66 },
};

interface LockupProps {
  state: LockupState;
  /** Bumped whenever the mark should sweep its highlight again. */
  shineKey: number;
}

export function Lockup({ state, shineKey }: LockupProps) {
  const visible = state !== 'hidden';
  // While hidden, stay parked where the brand was last seen so the fade-out never slides.
  const lastPoseRef = useRef<Exclude<LockupState, 'hidden'>>('hero');
  if (visible) lastPoseRef.current = state;
  const pose = POSE[lastPoseRef.current];
  const entering = state === 'hero' || state === 'end';

  return (
    <motion.div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{ left: 0, top: 0, width: '42vw', height: '12vw', gap: '2.4vw', transformOrigin: 'top left', zIndex: 20 }}
      initial={false}
      animate={
        visible
          ? { opacity: 1, x: pose.x, y: pose.y, scale: pose.scale }
          : { opacity: 0, x: pose.x, y: pose.y, scale: pose.scale * 1.6 }
      }
      transition={
        !visible
          ? // The end card leaves under a full fade-to-black, so nothing should linger at the loop point.
            { duration: lastPoseRef.current === 'end' ? 0 : 0.12, ease: 'easeIn' }
          : entering
            ? { opacity: { duration: 0.05 }, scale: { duration: 0.5, ease: SLAM_EASE }, x: { duration: 0 }, y: { duration: 0 } }
            : { duration: 0.55, ease: EASE_OUT }
      }
    >
      <div style={{ filter: 'drop-shadow(0 0 1.2vw rgba(226,225,225,0.35))' }}>
        <EnveloMark size="12vw" shineAt={0.45} shineKey={shineKey} />
      </div>
      <div style={{ display: 'flex', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '8.4vw', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {WORDMARK.map((ch, i) => (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
            <motion.span
              style={{ display: 'inline-block', ...silverTextStyle }}
              initial={false}
              animate={visible ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
              transition={visible ? { delay: 0.08 + i * 0.045, duration: 0.55, ease: EASE_OUT } : { duration: 0 }}
            >
              {ch}
            </motion.span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}
