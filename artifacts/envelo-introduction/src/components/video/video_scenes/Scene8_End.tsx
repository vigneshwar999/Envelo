import { motion } from 'framer-motion';

import { EnveloMark } from '../ui/EnveloMark';
import { Chip, EASE_OUT, INK, MUTED, SceneRoot, silverTextStyle } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

export function Scene8_End() {
  const beat = useBeats([5300]);
  const fadeOut = beat >= 0;

  return (
    <SceneRoot>
      <motion.div
        className="absolute rounded-full"
        style={{ left: '30vw', top: '0vw', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,225,225,0.3) 0%, rgba(201,205,208,0.06) 45%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      <motion.div className="absolute flex items-center justify-center" style={{ left: 0, right: 0, top: '12.5vw', gap: '1.8vw' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE_OUT }}>
        <EnveloMark size="8.2vw" shineAt={0.9} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '5.8vw', letterSpacing: '-0.03em', lineHeight: 1, ...silverTextStyle }}>Envelo</span>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 0, right: 0, top: '24.4vw', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '2.45vw', color: INK, letterSpacing: '-0.01em' }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: EASE_OUT }}
      >
        Private by default. <span style={{ color: MUTED }}>Verifiable when it matters.</span>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: '40vw', top: '30.6vw', width: '20vw', height: 1, background: 'linear-gradient(90deg, rgba(201,205,208,0) 0%, rgba(226,225,225,0.7) 50%, rgba(201,205,208,0) 100%)' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.9, ease: EASE_OUT }}
      />

      <motion.div
        className="absolute flex items-center justify-center"
        style={{ left: 0, right: 0, top: '33.4vw', gap: '1.6vw', fontFamily: 'var(--font-mono)', fontSize: '1.5vw', color: INK, letterSpacing: '0.02em' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.9, ease: EASE_OUT }}
      >
        <span>envelo.online</span>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: MUTED }}>@enveloarc</span>
        <span style={{ color: MUTED }}>·</span>
        <Chip tone="green" size="1.1vw">Live on Arc Testnet</Chip>
      </motion.div>

      {/* Fade to black for a clean loop */}
      <motion.div className="absolute inset-0" style={{ background: '#050505', pointerEvents: 'none' }} initial={{ opacity: 0 }} animate={{ opacity: fadeOut ? 1 : 0 }} transition={{ duration: 0.65, ease: 'easeIn' }} />
    </SceneRoot>
  );
}
