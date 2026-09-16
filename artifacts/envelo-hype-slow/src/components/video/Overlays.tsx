import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef, type PropsWithChildren } from 'react';

import { EASE_OUT, SILVER } from './ui/primitives';

export type CutKind = 'none' | 'drop' | 'chapter' | 'claim' | 'end';

// How hard each cut lands: camera punch, flash strength, whether the seal-line wipe runs.
const CUT: Record<CutKind, { punch: number; flash: number; wipe: boolean; shake: boolean }> = {
  none: { punch: 1, flash: 0, wipe: false, shake: false },
  drop: { punch: 1.09, flash: 0.95, wipe: false, shake: true },
  chapter: { punch: 1.035, flash: 0.28, wipe: true, shake: false },
  claim: { punch: 1.07, flash: 0.75, wipe: false, shake: true },
  end: { punch: 1.02, flash: 0.35, wipe: false, shake: false },
};

/**
 * Camera rig around the whole frame. Each cut punches the scale in and settles,
 * then keeps a slow push so nothing ever sits perfectly still.
 */
export function CameraRig({ cutId, kind, children }: PropsWithChildren<{ cutId: number; kind: CutKind }>) {
  const controls = useAnimationControls();
  const cutRef = useRef(cutId);

  useEffect(() => {
    cutRef.current = cutId;
    const spec = CUT[kind];
    let cancelled = false;
    controls.stop();
    const run = async () => {
      if (spec.punch !== 1) {
        controls.set({ scale: spec.punch, x: 0, y: 0 });
        if (spec.shake) {
          await controls.start({
            x: ['0vw', '-0.6vw', '0.45vw', '-0.25vw', '0.1vw', '0vw'],
            y: ['0vw', '0.35vw', '-0.3vw', '0.15vw', '-0.05vw', '0vw'],
            transition: { duration: 0.42, ease: 'easeOut' },
          });
          if (cancelled || cutRef.current !== cutId) return;
        }
        await controls.start({ scale: 1, transition: { duration: 0.55, ease: EASE_OUT } });
        if (cancelled || cutRef.current !== cutId) return;
      } else {
        controls.set({ scale: 1, x: 0, y: 0 });
      }
      controls.start({ scale: 1.025, transition: { duration: 6, ease: 'linear' } });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [cutId, kind, controls]);

  return (
    <motion.div className="absolute inset-0" style={{ transformOrigin: '50% 50%' }} animate={controls} initial={{ scale: 1 }}>
      {children}
    </motion.div>
  );
}

/** White radial flash under the cut, screen-blended so silver reads as light, not paint. */
export function ImpactFlash({ cutId, kind }: { cutId: number; kind: CutKind }) {
  const strength = CUT[kind].flash;
  if (strength === 0) return null;
  return (
    <motion.div
      key={cutId}
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255,255,255,1) 0%, rgba(226,225,225,0.7) 35%, rgba(0,0,0,0) 75%)', mixBlendMode: 'screen', zIndex: 30 }}
      initial={{ opacity: strength }}
      animate={{ opacity: 0 }}
      transition={{ duration: kind === 'drop' || kind === 'claim' ? 0.5 : 0.36, ease: 'easeOut' }}
    />
  );
}

/** Thin vertical seal line that wipes across on chapter cuts. */
export function SealWipe({ cutId, kind }: { cutId: number; kind: CutKind }) {
  if (!CUT[kind].wipe) return null;
  return (
    <motion.div
      key={cutId}
      className="absolute pointer-events-none"
      style={{ top: 0, left: 0, width: '0.22vw', height: '56.25vw', background: `linear-gradient(180deg, rgba(226,225,225,0) 0%, ${SILVER} 30%, #ffffff 50%, ${SILVER} 70%, rgba(226,225,225,0) 100%)`, boxShadow: '0 0 2vw rgba(226,225,225,0.7)', zIndex: 31 }}
      initial={{ x: '-2vw', opacity: 1 }}
      animate={{ x: '102vw', opacity: [1, 1, 0] }}
      transition={{ duration: 0.46, ease: [0.7, 0, 0.3, 1], opacity: { times: [0, 0.85, 1], duration: 0.46 } }}
    />
  );
}

const CHAPTER_KEYS = ['seal', 'anchor', 'pay', 'verify'];

/** Four-segment progress bar for the product chapters. */
export function ChapterProgress({ sceneKey }: { sceneKey: string }) {
  const index = CHAPTER_KEYS.indexOf(sceneKey);
  const visible = index >= 0;
  return (
    <motion.div
      className="absolute flex pointer-events-none"
      style={{ left: '6vw', top: '50.2vw', gap: '0.5vw', zIndex: 20 }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.4 : 0.15 }}
    >
      {CHAPTER_KEYS.map((key, i) => (
        <div key={key} style={{ width: '3.4vw', height: '0.18vw', background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: SILVER, transformOrigin: 'left', width: '100%' }}
            initial={false}
            animate={{ scaleX: i <= index ? 1 : 0, opacity: i <= index ? 1 : 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          />
        </div>
      ))}
    </motion.div>
  );
}
