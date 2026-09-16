import { motion } from 'framer-motion';

import { Burst, HardCut, SLAM_EASE } from '../ui/hype';
import { Chip, EASE_OUT } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

// The drop. The persistent lockup pops to hero on the cut; this scene adds
// the burst, the seal line, the tagline and the two proof chips.
const BEATS = [150, 1100, 2300];
const TAGLINE = ['Private', 'paperwork.', 'Public', 'proof.'];

export function Scene3_Reveal() {
  const beat = useBeats(BEATS);
  return (
    <HardCut>
      {/* Wide halo behind the lockup: static blur, opacity only. */}
      <motion.div
        className="absolute rounded-full"
        style={{ left: '30vw', top: '0vw', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,225,225,0.4) 0%, rgba(201,205,208,0.1) 45%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      <Burst />

      {/* Seal line */}
      <motion.div
        className="absolute"
        style={{ left: '32vw', top: '29.4vw', width: '36vw', height: 1, background: 'linear-gradient(90deg, rgba(201,205,208,0) 0%, rgba(226,225,225,0.9) 50%, rgba(201,205,208,0) 100%)', transformOrigin: 'center' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={beat >= 0 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      />

      {/* Tagline: word pops on the bar. */}
      <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: '31.8vw', gap: '0.3em', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '2.9vw', letterSpacing: '-0.01em', color: '#eef0f1' }}>
        {TAGLINE.map((w, i) => (
          <motion.span
            key={w}
            initial={{ opacity: 0, scale: 1.35 }}
            animate={beat >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.35 }}
            transition={{ delay: beat >= 1 ? i * 0.11 : 0, opacity: { duration: 0.05, delay: beat >= 1 ? i * 0.11 : 0 }, scale: { duration: 0.28, ease: SLAM_EASE, delay: beat >= 1 ? i * 0.11 : 0 } }}
          >
            {w}
          </motion.span>
        ))}
      </div>

      {/* Proof chips */}
      <motion.div
        className="absolute flex justify-center"
        style={{ left: 0, right: 0, top: '38.4vw', gap: '1vw' }}
        initial={{ opacity: 0, y: '0.8vw' }}
        animate={beat >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.8vw' }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <Chip tone="green" size="1.15vw">Live on Arc Testnet</Chip>
        <Chip tone="silver" size="1.15vw">Private invoicing</Chip>
      </motion.div>
    </HardCut>
  );
}
