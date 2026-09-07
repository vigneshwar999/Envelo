import { motion } from 'framer-motion';

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Where the single soft key light sits per scene (in vw of the 16:9 canvas).
// Chapters keep it on the right so the product panels catch the light; brand
// moments centre it behind the logo.
const LIGHT: Record<string, { x: string; y: string; o: number }> = {
  problem: { x: '58vw', y: '6vw', o: 0.4 },
  reveal: { x: '35vw', y: '3vw', o: 0.55 },
  seal: { x: '55vw', y: '8vw', o: 0.55 },
  anchor: { x: '55vw', y: '8vw', o: 0.55 },
  pay: { x: '55vw', y: '6vw', o: 0.55 },
  verify: { x: '35vw', y: '4vw', o: 0.5 },
  arc: { x: '35vw', y: '0vw', o: 0.5 },
  end: { x: '35vw', y: '2vw', o: 0.55 },
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
        transition={{ duration: 2.4, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Fine grain and vignette are static layers. */}
      <div className="absolute inset-0" style={{ backgroundImage: NOISE, opacity: 0.05, mixBlendMode: 'screen' }} />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)' }}
      />
    </div>
  );
}
