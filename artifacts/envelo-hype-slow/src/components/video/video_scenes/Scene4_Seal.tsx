import { motion } from 'framer-motion';

import { Chapter } from '../Chapter';
import { Sub } from '../ui/hype';
import { EnvelopeFace, InvoiceDraft, SealDisc } from '../ui/hypeProduct';
import { EASE_OUT } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

// 300 fields encrypt · 950 card folds into the envelope · 1760 seal stamps (on the kick)
const BEATS = [300, 950, 1760];

export function Scene4_Seal() {
  const beat = useBeats(BEATS);
  const sealed = beat >= 0;
  const folded = beat >= 1;
  const stamped = beat >= 2;

  return (
    <Chapter index="01" kicker="In your browser" word="SEAL" sub={<Sub bright="Encrypted in your browser." muted="AES-256-GCM." />}>
      <div className="relative flex items-center justify-center" style={{ width: '38vw', height: '30vw' }}>
        <motion.div
          className="absolute"
          style={{ transformOrigin: '50% 50%' }}
          animate={folded ? { scaleY: 0.04, scaleX: 0.7, opacity: 0 } : { scaleY: 1, scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.7, 0, 0.3, 1] }}
        >
          <InvoiceDraft sealed={sealed} />
        </motion.div>
        <motion.div
          className="absolute"
          initial={{ opacity: 0, y: '5vw', scale: 0.9 }}
          animate={folded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: '5vw', scale: 0.9 }}
          transition={{ delay: folded ? 0.16 : 0, duration: 0.45, ease: EASE_OUT }}
        >
          <div className="relative">
            <EnvelopeFace width="26vw" />
            <SealDisc active={stamped} />
          </div>
        </motion.div>
      </div>
    </Chapter>
  );
}
