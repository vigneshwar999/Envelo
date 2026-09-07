import { motion } from 'framer-motion';

import { EnveloMark } from '../ui/EnveloMark';
import { EASE_OUT, MUTED, SILVER, SceneRoot, silverTextStyle } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

const WORDMARK = 'Envelo'.split('');

export function Scene2_Reveal() {
  const beat = useBeats([4450]);
  const leaving = beat >= 0;

  return (
    <SceneRoot>
      <motion.div
        className="absolute inset-0"
        animate={leaving ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeIn' }}
      >
        {/* Wide halo behind the lockup: static blur, opacity only. */}
        <motion.div
          className="absolute rounded-full"
          style={{ left: '30vw', top: '2vw', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,225,225,0.35) 0%, rgba(201,205,208,0.08) 45%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.2, ease: 'easeOut' }}
        />

        {/* Lockup */}
        <div className="absolute flex items-center justify-center" style={{ left: 0, right: 0, top: '14vw', gap: '2.4vw' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.82, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 1.1, ease: EASE_OUT }}
            style={{ filter: 'drop-shadow(0 0 1.2vw rgba(226,225,225,0.35))' }}
          >
            <EnveloMark size="12vw" shineAt={1.35} />
          </motion.div>
          <div style={{ display: 'flex', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '8.4vw', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {WORDMARK.map((ch, i) => (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
                <motion.span
                  style={{ display: 'inline-block', ...silverTextStyle }}
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{ delay: 0.75 + i * 0.06, duration: 0.9, ease: EASE_OUT }}
                >
                  {ch}
                </motion.span>
              </span>
            ))}
          </div>
        </div>

        {/* Seal line */}
        <motion.div
          className="absolute"
          style={{ left: '32vw', top: '29.4vw', width: '36vw', height: 1, background: 'linear-gradient(90deg, rgba(201,205,208,0) 0%, rgba(226,225,225,0.9) 50%, rgba(201,205,208,0) 100%)', transformOrigin: 'center' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 1, ease: EASE_OUT }}
        />

        {/* Tagline */}
        <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: '31.8vw', gap: '0.3em', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: '2.9vw', letterSpacing: '-0.01em', color: '#eef0f1' }}>
          {['Private', 'paperwork.', 'Public', 'proof.'].map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9 + i * 0.12, duration: 0.9, ease: EASE_OUT }}
              style={{ color: i >= 2 ? SILVER : '#eef0f1' }}
            >
              {w}
            </motion.span>
          ))}
        </div>

        {/* Caption */}
        <motion.div
          className="absolute flex items-center justify-center"
          style={{ left: 0, right: 0, top: '37.8vw', gap: '1.2vw', fontFamily: 'var(--font-mono)', fontSize: '1.15vw', letterSpacing: '0.3em', textTransform: 'uppercase', color: SILVER }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.9, duration: 0.9 }}
        >
          <span style={{ width: '3vw', height: 1, background: 'rgba(201,205,208,0.35)' }} />
          <span>Privacy-first invoicing on Arc Testnet</span>
          <span style={{ width: '3vw', height: 1, background: 'rgba(201,205,208,0.35)' }} />
        </motion.div>
      </motion.div>
    </SceneRoot>
  );
}
