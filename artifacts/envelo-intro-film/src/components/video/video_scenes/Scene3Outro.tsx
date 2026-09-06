import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import enveloLogo from '@assets/envelo-logo.svg';

// Same geometry as attached_assets/envelo-logo.svg. It is only used as a
// clip path so the highlight sweep is confined to the logo's own silhouette;
// the visible mark is still the untouched official SVG rendered beneath it.
const LOGO_VIEWBOX = '0 0 144.7 144.7';
const LOGO_PATH_TRANSFORM = 'translate(0 8.25)';
const LOGO_PATH =
  'm124 8.5c-9.2-0.2-22.1 4.8-38.4 14.9-3.4 2.1-7.2 4.6-10.7 7h5.7c16.4-10.1 31.9-18.7 44-18.6 4.3 0.1 8.2 1.7 8.3 7.7 0.5 16.8-29.1 48.4-54.9 67.5-22.2 16.6-37.9 23.8-47.8 27.3l-0.3 0.1c-3.3 0.8-6 2.1-11.3 1.7-3.6-0.6-6.7-2.2-6.8-7.2-0.3-8.4 8.9-20.9 14.2-28.7v-5c-6.7 8.4-17.4 22.2-17.4 33 0 6.2 3.5 10.9 12.7 11.3h0.6c7 0 21.2-3.4 41.7-16 30-18.3 72.4-55.2 72.4-83.3 0-5.6-2.9-11.7-12-11.7zm-57.3 85.4 4.9-4h-36.4l27.2-26.6 11.5 9.2 11.7-9.3 8.5 8.3 2.4-2.4-8.2-8.1 27.3-22.7v9.6l3.4-4.8v-10h-90.3v60.8h38zm-34.5-55.6 27.5 22.7-27.5 26.5v-49.2zm41.7 29.7-38.3-31.4h76.9l-38.6 31.4zm41.7-5.8v25.9l-12.7-12.9-2.6 2.3 12.6 12.4h-26.6l-4.7 3.9h37.4v-35.9l-3.4 4.3z';

const SHINE_DURATION_SEC = 2.4;
const SHINE_EASE = [0.4, 0, 0.2, 1] as const;

export function Scene3Outro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200), // shine starts (28200 ms overall, just after the shine SFX)
      setTimeout(() => setPhase(2), 2600), // tagline
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // The reveal fades to black in 0.5s; the lockup comes up alone after it.
      transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
    >
      {/* Soft silver floor light behind the lockup */}
      <div
        className="absolute left-1/2 top-1/2 h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(226,225,225,0.10) 0%, rgba(226,225,225,0.04) 32%, rgba(0,0,0,0) 65%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center -translate-y-[4vh]">
        {/* Logo mark: official SVG untouched, highlight confined to its silhouette */}
        <div className="relative h-[12.5vw] w-[12.5vw]">
          <img
            src={enveloLogo}
            alt="Envelo"
            className="h-full w-full drop-shadow-[0_0_22px_rgba(250,250,250,0.22)]"
          />
          <svg
            viewBox={LOGO_VIEWBOX}
            className="absolute inset-0 h-full w-full pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <clipPath id="envelo-shine-clip">
                <path d={LOGO_PATH} transform={LOGO_PATH_TRANSFORM} />
              </clipPath>
              <linearGradient id="envelo-shine-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g clipPath="url(#envelo-shine-clip)">
              {/* attrX animates the SVG x attribute in user units; plain `x`
                  would become a CSS transform and override the skew. */}
              <motion.rect
                y={-40}
                width={46}
                height={230}
                fill="url(#envelo-shine-gradient)"
                transform="skewX(-22)"
                initial={{ attrX: -90 }}
                animate={{ attrX: phase >= 1 ? 250 : -90 }}
                transition={{ duration: SHINE_DURATION_SEC, ease: SHINE_EASE }}
              />
            </g>
          </svg>
        </div>

        {/* Wordmark: a light band sweeps through the glyphs via background-position */}
        <motion.div
          className="mt-[3.5vh] font-display text-[7vw] leading-none font-medium tracking-[0.12em] text-transparent silver-glow"
          style={{
            backgroundImage:
              'linear-gradient(105deg, #9EA2A3 0%, #C9CBCC 38%, #FFFFFF 50%, #C9CBCC 62%, #9EA2A3 100%)',
            backgroundSize: '250% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
          initial={{ backgroundPosition: '120% 50%' }}
          animate={{ backgroundPosition: phase >= 1 ? '-30% 50%' : '120% 50%' }}
          transition={{ duration: SHINE_DURATION_SEC, ease: SHINE_EASE, delay: 0.15 }}
        >
          ENVELO
        </motion.div>

        <motion.div
          className="mt-[5vh] font-display text-[1.45vw] font-light tracking-[0.34em] text-text-secondary whitespace-nowrap"
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={
            phase >= 2
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 10, filter: 'blur(10px)' }
          }
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          BUILDING WHAT COMES NEXT.
        </motion.div>
      </div>
    </motion.div>
  );
}
