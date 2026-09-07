import { motion } from 'framer-motion';

import { CopyColumn, EASE_OUT, Headline, INK, Kicker, MUTED, SILVER_BRIGHT, SceneRoot, Support } from '../ui/primitives';
import { RegistryPanel, SealedEnvelope } from '../ui/product';
import { FINGERPRINT, FINGERPRINT_SHORT, Scramble } from '../ui/textfx';
import { useBeats } from '../ui/useBeats';

const BEATS = [800, 1300, 3000, 4800, 5600, 6300];
const B = { lift: 0, hash: 1, registry: 2, anchored: 3, tx: 4, emphasis: 5 };

export function Scene4_Anchor() {
  const beat = useBeats(BEATS);
  const at = (k: keyof typeof B) => beat >= B[k];

  return (
    <SceneRoot>
      <motion.div exit={{ opacity: 0, y: '-0.8vw' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <CopyColumn top="12.5vw" width="40vw">
          <Kicker index="02" label="Anchor" />
          <Headline lines={['Only a fingerprint', 'touches the chain.']} delay={0.1} />
          <Support delay={1.1}>A SHA-256 fingerprint of the invoice, written to the SealedInvoiceRegistry on Arc Testnet.</Support>
          {at('emphasis') && (
            <Support color={INK} weight={500} size="1.6vw">
              No names. No amounts. No line items.
            </Support>
          )}
        </CopyColumn>
      </motion.div>

      {/* Envelope carried over from Seal, lifts to make room */}
      <motion.div
        className="absolute"
        style={{ left: '59.5vw', top: '17vw', transformOrigin: '50% 0%' }}
        initial={{ y: 0, scale: 1 }}
        animate={at('lift') ? { y: '-11.5vw', scale: 0.82 } : {}}
        transition={{ duration: 0.9, ease: EASE_OUT }}
      >
        <SealedEnvelope width="22vw" />
      </motion.div>

      {/* Fingerprint derivation */}
      <motion.div
        className="absolute"
        style={{ left: '49vw', top: '20vw', width: '43vw', textAlign: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: at('hash') ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute"
          style={{ left: '50%', top: '-2.4vw', width: 1, height: '2.2vw', background: 'linear-gradient(180deg, rgba(226,225,225,0) 0%, rgba(226,225,225,0.8) 100%)', transformOrigin: 'top' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: at('hash') ? 1 : 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.02vw', letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED }}>SHA-256 fingerprint</div>
        <div style={{ marginTop: '0.6vw', fontFamily: 'var(--font-mono)', fontSize: '1.4vw', lineHeight: 1.5, color: SILVER_BRIGHT, letterSpacing: '0.04em' }}>
          <div>
            <Scramble active={at('hash')} to={FINGERPRINT.slice(0, 32)} duration={1500} />
          </div>
          <div>
            <Scramble active={at('hash')} to={FINGERPRINT.slice(32)} duration={1500} />
          </div>
        </div>
      </motion.div>

      {/* The fingerprint drops into the registry */}
      <motion.div
        className="absolute"
        style={{ left: '49vw', width: '43vw', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1.32vw', color: SILVER_BRIGHT, pointerEvents: 'none' }}
        initial={{ top: '25vw', opacity: 0 }}
        animate={at('registry') ? { top: '35vw', opacity: [0, 1, 1, 0] } : {}}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        {FINGERPRINT_SHORT}
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: '49vw', top: '29.5vw' }}
        initial={{ opacity: 0, y: 30 }}
        animate={at('registry') ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <RegistryPanel status={at('anchored') ? 'anchored' : 'pending'} showTx={at('tx')} />
        {/* light sweep on anchor */}
        <motion.div
          className="absolute"
          style={{ top: 0, bottom: 0, width: '10vw', background: 'linear-gradient(90deg, rgba(226,225,225,0) 0%, rgba(226,225,225,0.12) 50%, rgba(226,225,225,0) 100%)', pointerEvents: 'none' }}
          initial={{ left: '-12vw', opacity: 0 }}
          animate={at('anchored') ? { left: '45vw', opacity: [0, 1, 1, 0] } : {}}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      </motion.div>
    </SceneRoot>
  );
}
