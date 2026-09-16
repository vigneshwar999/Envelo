import { motion } from 'framer-motion';

import { HardCut, HexRain, Slam } from '../ui/hype';
import { useBeats } from '../ui/useBeats';

// 0 "PRIVATE BY DEFAULT." (hit) · 840 "PROVABLE ON-CHAIN." (kick) · 1860 zoom-through exit (kick)
const BEATS = [0, 840, 1860];

export function Scene8_Claim() {
  const beat = useBeats(BEATS);
  const second = beat >= 1;
  const leaving = beat >= 2;

  return (
    <HardCut>
      <HexRain left="0vw" width="100vw" columns={18} opacity={0.16} speed={3.4} seed={5} />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: '1vw', transformOrigin: '50% 50%' }}
        animate={leaving ? { scale: 3.2, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
      >
        {/* Two claims share one slot; the first snaps out as the second slams in. */}
        <div className="relative flex flex-col items-center" style={{ gap: '1vw', height: '21vw', justifyContent: 'center' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: '1vw' }}>
            <Slam active={beat >= 0} leave={second} size="10.2vw" silver>PRIVATE</Slam>
            <Slam active={beat >= 0} leave={second} size="10.2vw">BY DEFAULT.</Slam>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: '1vw' }}>
            <Slam active={second} size="10.2vw" silver>PROVABLE</Slam>
            <Slam active={second} size="10.2vw">ON-CHAIN.</Slam>
          </div>
        </div>
      </motion.div>
    </HardCut>
  );
}
