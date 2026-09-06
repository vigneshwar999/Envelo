import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const TITLE = 'THE ONCHAIN FUTURE';
const LETTERS = TITLE.split('');
const CENTER_INDEX = Math.floor(LETTERS.length / 2);

// Each glyph carries its own clipped metallic gradient. A gradient on the
// parent does not paint through children that animate filter/transform, which
// leaves only the blurred text-shadow visible.
const GLYPH_STYLE = {
  backgroundImage: 'linear-gradient(180deg, #FAFAFA 0%, #D8D9DA 48%, #9EA2A3 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as const;

// Deterministic scatter for the particle dissolve (no Math.random in render).
function scatter(index: number) {
  const angle = index * 2.399; // golden angle keeps neighbours apart
  const radius = 40 + (index % 4) * 22;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius - 10 };
}

const REVEAL_EASE = [0.2, 0.8, 0.2, 1] as const;
const LINE_EASE = [0.16, 1, 0.3, 1] as const;

export function Scene0Opening() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500), // first light
      setTimeout(() => setPhase(2), 1500), // light expands, letters resolve (crisp by ~3.3s)
      setTimeout(() => setPhase(3), 5500), // letters dissolve into particles
      setTimeout(() => setPhase(4), 5800), // horizon line draws outward
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Silver light: a point that widens into a soft band behind the title */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '3.6vw',
          height: '3.6vw',
          background:
            'radial-gradient(ellipse at center, rgba(250,250,250,0.9) 0%, rgba(226,225,225,0.35) 35%, rgba(0,0,0,0) 70%)',
          filter: 'blur(10px)',
        }}
        initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
        animate={
          phase === 1
            ? { scaleX: 1, scaleY: 1, opacity: 1 }
            : phase === 2
              ? { scaleX: 22, scaleY: 2.4, opacity: 0.45 }
              : phase >= 3
                ? { scaleX: 30, scaleY: 0.6, opacity: 0 }
                : { scaleX: 0, scaleY: 0, opacity: 0 }
        }
        transition={{ duration: phase === 1 ? 0.9 : 2.4, ease: REVEAL_EASE }}
      />

      {/* Title */}
      <div className="relative z-10 flex font-display text-[4.8vw] font-medium tracking-[0.25em]">
        <AnimatePresence>
          {phase >= 2 &&
            phase < 3 &&
            LETTERS.map((letter, i) => {
              const distance = Math.abs(CENTER_INDEX - i);
              const drift = scatter(i);
              return (
                <motion.span
                  key={`letter-${i}`}
                  className={letter === ' ' ? 'inline-block w-[1.6vw]' : 'inline-block origin-center silver-glow'}
                  style={letter === ' ' ? undefined : GLYPH_STYLE}
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 6, scale: 1.04 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    filter: 'blur(8px)',
                    x: drift.x,
                    y: drift.y,
                    scale: 0.9,
                    transition: { duration: 1.1, ease: 'easeOut', delay: distance * 0.03 },
                  }}
                  transition={{ duration: 1.1, delay: distance * 0.07, ease: REVEAL_EASE }}
                >
                  {letter}
                </motion.span>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Horizon line: draws outward from the light point, becomes the network's horizon */}
      <div className="absolute inset-x-0 top-1/2 flex items-center justify-center pointer-events-none">
        <motion.div
          className="absolute h-[28px] rounded-full"
          style={{ background: 'rgba(226,225,225,0.5)', filter: 'blur(30px)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 4 ? { width: '96vw', opacity: 0.5 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.3, ease: LINE_EASE }}
        />
        <motion.div
          className="absolute h-[5px] rounded-full"
          style={{ background: 'rgba(250,250,250,0.7)', filter: 'blur(6px)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 4 ? { width: '92vw', opacity: 0.6 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: LINE_EASE }}
        />
        <motion.div
          className="absolute h-[1.5px] rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(226,225,225,0) 0%, rgba(226,225,225,0.85) 18%, #FAFAFA 50%, rgba(226,225,225,0.85) 82%, rgba(226,225,225,0) 100%)',
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 4 ? { width: '92vw', opacity: 0.9 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: LINE_EASE }}
        />
      </div>
    </motion.div>
  );
}
