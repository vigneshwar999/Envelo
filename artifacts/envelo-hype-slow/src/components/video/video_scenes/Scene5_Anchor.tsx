import { motion } from 'framer-motion';

import { Chapter } from '../Chapter';
import { HexRain, Shockwave, Sub } from '../ui/hype';
import { RegistryPanel } from '../ui/product';
import { useBeats } from '../ui/useBeats';

// 400 fingerprint resolves · 1450 anchored (on the break hit) · 1600 explorer link
const BEATS = [400, 1450, 1600];

export function Scene5_Anchor() {
  const beat = useBeats(BEATS);
  const anchored = beat >= 1;

  return (
    <Chapter
      index="02"
      kicker="Arc Testnet"
      word="ANCHOR"
      sub={<Sub bright="Only a fingerprint touches the chain." />}
      background={<HexRain left="50vw" width="50vw" opacity={0.11} speed={6} seed={17} />}
    >
      <div className="relative flex items-center justify-center">
        <Shockwave active={anchored} size="20vw" radius="1.2vw" style={{ left: 'calc(50% - 10vw)', top: 'calc(50% - 10vw)' }} color="rgba(226,225,225,0.7)" />
        <motion.div animate={anchored ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <RegistryPanel width="42vw" status={anchored ? 'anchored' : 'pending'} showTx={beat >= 2} resolveFingerprint={beat >= 0} />
        </motion.div>
      </div>
    </Chapter>
  );
}
