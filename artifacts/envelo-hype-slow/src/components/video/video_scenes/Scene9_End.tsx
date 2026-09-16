import { motion } from 'framer-motion';

import { HardCut } from '../ui/hype';
import { Chip, EASE_OUT, MUTED, silverTextStyle } from '../ui/primitives';
import { TypeText } from '../ui/textfx';
import { useBeats } from '../ui/useBeats';

// Lockup pops on the cut and the final fade live in VideoTemplate's persistent layers.
// 500 tagline · 800 URL types · 1500 chips · 1900 footer
const BEATS = [500, 800, 1500, 1900];

export function Scene9_End() {
  const beat = useBeats(BEATS);
  return (
    <HardCut exitMs={0}>
      <motion.div
        className="absolute rounded-full"
        style={{ left: '30vw', top: '-2vw', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,225,225,0.35) 0%, rgba(201,205,208,0.08) 45%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />

      <motion.div
        className="absolute"
        style={{ left: 0, right: 0, top: '25.4vw', textAlign: 'center', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '2.4vw', letterSpacing: '-0.01em', color: '#eef0f1' }}
        initial={{ opacity: 0, y: '0.8vw' }}
        animate={beat >= 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.8vw' }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        Private paperwork. Public proof.
      </motion.div>

      <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: '30.2vw' }}>
        <TypeText
          text="envelo.online"
          active={beat >= 1}
          speed={55}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '3.6vw', letterSpacing: '-0.02em', ...silverTextStyle }}
        />
      </div>

      <motion.div
        className="absolute flex justify-center"
        style={{ left: 0, right: 0, top: '37vw', gap: '1vw' }}
        initial={{ opacity: 0, y: '0.8vw' }}
        animate={beat >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.8vw' }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <Chip tone="silver" size="1.15vw" dot={false}>@enveloarc</Chip>
        <Chip tone="green" size="1.15vw">Live on Arc Testnet</Chip>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 0, right: 0, top: '48vw', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1vw', letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED }}
        initial={{ opacity: 0 }}
        animate={beat >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        AES-256-GCM in your browser · SHA-256 on Arc Testnet · Test USDC
      </motion.div>
    </HardCut>
  );
}
