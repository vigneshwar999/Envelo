import { motion } from 'framer-motion';

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Where the single soft key light sits per scene (in vw of the 16:9 canvas).
// The opening stays almost dark so the drop can blow the frame open; chapters
// keep the light on the product side; brand moments centre it behind the mark.
const LIGHT: Record<string, { x: string; y: string; o: number }> = {
  open: { x: '35vw', y: '12vw', o: 0.18 },
  encrypt: { x: '35vw', y: '12vw', o: 0.28 },
  reveal: { x: '35vw', y: '2vw', o: 0.62 },
  seal: { x: '56vw', y: '6vw', o: 0.5 },
  anchor: { x: '56vw', y: '6vw', o: 0.5 },
  pay: { x: '56vw', y: '6vw', o: 0.5 },
  verify: { x: '12vw', y: '6vw', o: 0.5 },
  claim: { x: '35vw', y: '8vw', o: 0.42 },
  end: { x: '35vw', y: '1vw', o: 0.56 },
};

export function Atmosphere({ sceneKey }: { sceneKey: string }) {
  const light = LIGHT[sceneKey] ?? LIGHT.seal;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Single key light: 30vw disc, blur rasterised once, moved with translate/opacity only. */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '30vw',
          height: '30vw',
          left: 0,
          top: 0,
          background: 'radial-gradient(circle, rgba(226,225,225,0.7) 0%, rgba(201,205,208,0.22) 40%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
        }}
        initial={{ x: light.x, y: light.y, opacity: 0 }}
        animate={{ x: light.x, y: light.y, opacity: light.o }}
        transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Fine grain and vignette are static layers. */}
      <div className="absolute inset-0" style={{ backgroundImage: NOISE, opacity: 0.05, mixBlendMode: 'screen' }} />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)' }}
      />
    </div>
  );
}
