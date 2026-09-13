import { motion } from 'framer-motion';

import { Chapter } from '../Chapter';
import { HexRain, Sub } from '../ui/hype';
import { MatchStamp, VerifyPanel } from '../ui/hypeProduct';
import { useBeats } from '../ui/useBeats';

// 300 hash computes · 700 on-chain record · 1440 MATCH (on the kick)
const BEATS = [300, 700, 1440];

export function Scene7_Verify() {
  const beat = useBeats(BEATS);
  const matched = beat >= 2;

  return (
    <Chapter
      index="04"
      kicker="Public proof"
      word="VERIFY"
      sub={<Sub bright="Public proof." muted="Private contents." />}
      flipped
      background={<HexRain left="0vw" width="48vw" opacity={0.1} speed={6} seed={29} />}
      exitMs={0}
    >
      <div className="relative flex items-center justify-center">
        <motion.div animate={matched ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <VerifyPanel computing={beat >= 0} onChainVisible={beat >= 1} matched={matched} />
        </motion.div>
        <MatchStamp active={matched} />
      </div>
    </Chapter>
  );
}
