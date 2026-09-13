import { motion } from 'framer-motion';

import { Chapter } from '../Chapter';
import { Shockwave, Sub, useCountUp } from '../ui/hype';
import { PayPanel } from '../ui/hypeProduct';
import { Chip, EASE_OUT } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

// 400 amount counts up · 1300 button press · 1530 paid (on the kick) · 1700 receipt chip
const BEATS = [400, 1300, 1530, 1700];

export function Scene6_Pay() {
  const beat = useBeats(BEATS);
  const amount = useCountUp(beat >= 0, 1250, 900);
  const paid = beat >= 2;

  return (
    <Chapter index="03" kicker="Test USDC" word="GET PAID" wordSize="8.8vw" sub={<Sub bright="Paid in test USDC." muted="The receipt is a transaction." />}>
      <div className="relative flex flex-col items-center" style={{ gap: '1.2vw' }}>
        <Shockwave active={paid} size="20vw" radius="1.2vw" style={{ left: 'calc(50% - 10vw)', top: '6vw' }} color="rgba(52,211,153,0.7)" />
        <motion.div animate={paid ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <PayPanel amount={amount} pressed={beat >= 1} paid={paid} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: '0.6vw' }} animate={beat >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.6vw' }} transition={{ duration: 0.35, ease: EASE_OUT }}>
          <Chip tone="green" size="1.1vw">Payment Complete · tx 0x8c2f…41ae</Chip>
        </motion.div>
      </div>
    </Chapter>
  );
}
