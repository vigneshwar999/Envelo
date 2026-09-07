import { motion } from 'framer-motion';

import { Chip, EASE_OUT, Headline, INK, SILVER_BRIGHT, SceneRoot } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

const POINTS = ['Gas is paid in USDC, no second token', 'Public, checkable receipts', 'Stablecoin-native settlement'];

export function Scene7_Arc() {
  const beat = useBeats([4000]);
  const leaving = beat >= 0;

  return (
    <SceneRoot>
      <motion.div className="absolute inset-0" animate={leaving ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeIn' }}>
        <div className="absolute" style={{ left: 0, right: 0, top: '12vw', display: 'flex', justifyContent: 'center' }}>
          <Headline lines={['Built on Arc.']} size="6.2vw" align="center" silver delay={0.05} />
        </div>

        <div className="absolute flex flex-col items-start" style={{ left: '27vw', width: '46vw', top: '23.5vw', gap: '1.6vw' }}>
          {POINTS.map((p, i) => (
            <motion.div
              key={p}
              className="flex items-center"
              style={{ gap: '1.2vw', fontFamily: 'var(--font-body)', fontSize: '2.35vw', color: INK, fontWeight: 400, whiteSpace: 'nowrap' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.5, duration: 0.8, ease: EASE_OUT }}
            >
              <span style={{ width: '0.7vw', height: '0.7vw', borderRadius: 999, background: SILVER_BRIGHT, boxShadow: '0 0 0.9vw rgba(226,225,225,0.8)' }} />
              {p}
            </motion.div>
          ))}
        </div>

        <motion.div className="absolute flex justify-center" style={{ left: 0, right: 0, top: '40vw' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.7, duration: 0.7, ease: EASE_OUT }}>
          <Chip tone="green" size="1.2vw" style={{ padding: '0.6vw 1.4vw' }}>
            Live on Arc Testnet today.
          </Chip>
        </motion.div>
      </motion.div>
    </SceneRoot>
  );
}
