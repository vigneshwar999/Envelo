import { motion } from 'framer-motion';

import { HardCut, Hud, Slam } from '../ui/hype';
import { INK, MUTED, RED } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';
import { HUD_LEFT_OPEN, HUD_RIGHT, OPEN_LINES, OpenStack } from './openStack';

// Three slams on the intro pulses, then the invoice's contents leak into view.
const BEATS = [330, 1300, 2270, 2760];

const LEAKS: { text: string; left: string; top: string; rotate: number }[] = [
  { text: 'Arjun Mehta', left: '9vw', top: '18vw', rotate: -4 },
  { text: '1,250.00 test USDC', left: '76vw', top: '16vw', rotate: 3 },
  { text: 'Design retainer · September', left: '64vw', top: '43vw', rotate: -2 },
  { text: 'Northwind Studio', left: '12vw', top: '41vw', rotate: 5 },
  { text: 'Due Sep 30', left: '84vw', top: '30vw', rotate: -6 },
];

export function Scene1_Open() {
  const beat = useBeats(BEATS);
  return (
    <HardCut>
      <Hud left={HUD_LEFT_OPEN} right={HUD_RIGHT} leftColor={RED} />

      {/* Red pulse behind the third slam. */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(224,100,79,0.55) 0%, rgba(224,100,79,0) 70%)' }}
        initial={{ opacity: 0 }}
        animate={beat >= 2 ? { opacity: [0, 0.6, 0.18] } : { opacity: 0 }}
        transition={{ duration: 0.7, times: [0, 0.15, 1], ease: 'easeOut' }}
      />

      <OpenStack>
        <Slam active={beat >= 0}>{OPEN_LINES[0]}</Slam>
        <Slam active={beat >= 1}>{OPEN_LINES[1]}</Slam>
        <Slam active={beat >= 2} from={1.7}>
          <span style={{ color: INK }}>IS </span>
          <span style={{ color: RED }}>OPEN.</span>
        </Slam>
      </OpenStack>

      {/* Leaked invoice fragments. */}
      {LEAKS.map((leak, i) => (
        <motion.div
          key={leak.text}
          className="absolute pointer-events-none"
          style={{ left: leak.left, top: leak.top, rotate: `${leak.rotate}deg`, fontFamily: 'var(--font-mono)', fontSize: '1.15vw', letterSpacing: '0.06em', color: MUTED, whiteSpace: 'nowrap' }}
          initial={{ opacity: 0, y: '0.6vw' }}
          animate={beat >= 3 ? { opacity: 0.7, y: 0 } : { opacity: 0, y: '0.6vw' }}
          transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
        >
          {leak.text}
        </motion.div>
      ))}
    </HardCut>
  );
}
