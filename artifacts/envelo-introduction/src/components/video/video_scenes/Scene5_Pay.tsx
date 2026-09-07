import { AnimatePresence, motion } from 'framer-motion';
import { Check, Wallet } from 'lucide-react';

import { Avatar, Chip, CopyColumn, EASE_OUT, FieldLabel, GREEN, Headline, INK, Kicker, MUTED, Panel, SILVER_BRIGHT, SceneRoot, Support, UIButton } from '../ui/primitives';
import { RegistryPanel } from '../ui/product';
import { useBeats } from '../ui/useBeats';

const BEATS = [300, 2200, 2600, 4600, 5000, 6300, 7100];
const B = { card: 0, press: 1, sheet: 2, confirm: 3, done: 4, flip: 5, note: 6 };

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '0.75vw 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.15vw', color: strong ? INK : MUTED }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: strong ? '1.4vw' : '1.2vw', color: INK }}>{value}</span>
    </div>
  );
}

export function Scene5_Pay() {
  const beat = useBeats(BEATS);
  const at = (k: keyof typeof B) => beat >= B[k];

  return (
    <SceneRoot>
      <motion.div exit={{ opacity: 0, y: '-0.8vw' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <CopyColumn top="12.5vw" width="40vw">
          <Kicker index="03" label="Pay" />
          <Headline lines={['Your client pays in', 'USDC. The receipt', 'is a transaction.']} delay={0.1} />
          <Support delay={1.1} maxWidth="36vw">
            Your client pays from their built-in wallet. USDC goes straight to you, and the paid flag flips on-chain beside the fingerprint.
          </Support>
        </CopyColumn>
      </motion.div>

      {/* Client's view of the sealed invoice */}
      <motion.div
        className="absolute"
        style={{ left: '49vw', top: '5.5vw', width: '43vw' }}
        initial={{ opacity: 0, y: 30 }}
        animate={at('card') ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <Panel style={{ position: 'relative', minHeight: '18.6vw' }}>
          <div className="flex items-center justify-between" style={{ padding: '1.2vw 1.6vw', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center" style={{ gap: '1vw' }}>
              <Avatar initial="R" />
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.35vw', fontWeight: 500, color: INK }}>From Riya Studio</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.02vw', color: MUTED, marginTop: '0.2vw' }}>INV-2026-014 · Brand identity</div>
              </div>
            </div>
            <Chip tone="amber">Awaiting Payment</Chip>
          </div>
          <div style={{ padding: '1.4vw 1.6vw 0', display: 'grid', gridTemplateColumns: '1.7fr 0.9fr 0.9fr', gap: '1vw' }}>
            <div>
              <FieldLabel>Amount due</FieldLabel>
              <div className="flex items-baseline" style={{ gap: '0.6vw' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8vw', color: INK, letterSpacing: '-0.02em' }}>1,250.00</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1vw', color: MUTED, whiteSpace: 'nowrap' }}>test USDC</span>
              </div>
            </div>
            <div>
              <FieldLabel>Due</FieldLabel>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.3vw', color: INK, paddingTop: '0.55vw' }}>6 Oct 2026</div>
            </div>
            <div>
              <FieldLabel>Network</FieldLabel>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.3vw', color: INK, paddingTop: '0.55vw' }}>Arc Testnet</div>
            </div>
          </div>
          <div className="flex justify-end" style={{ padding: '1.2vw 1.6vw 1.2vw' }}>
            <UIButton primary pressed={at('press')}>
              <Wallet size="1.05vw" strokeWidth={2.2} /> Review &amp; Pay with Test USDC
            </UIButton>
          </div>

          {/* Approval sheet */}
          <AnimatePresence>
            {at('sheet') && (
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)', padding: '1.3vw 1.6vw' }}
                initial={{ y: '30%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE_OUT }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {!at('done') ? (
                    <motion.div key="approve" exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.45vw', fontWeight: 500, color: INK }}>Approve transaction</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1vw', color: MUTED, marginTop: '0.2vw' }}>Contract interaction · payInvoice</div>
                        </div>
                        <Chip tone="neutral" dot={false}>Arc Testnet</Chip>
                      </div>
                      <div className="flex items-center justify-between" style={{ marginTop: '1vw', padding: '0.7vw 0.9vw', borderRadius: '0.5vw', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center" style={{ gap: '0.7vw', fontFamily: 'var(--font-body)', fontSize: '1.15vw', color: INK }}>
                          <Wallet size="1.2vw" color={SILVER_BRIGHT} /> Paying from your built-in wallet
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05vw', color: MUTED }}>0x5b1e…c7d3</span>
                      </div>
                      <div style={{ marginTop: '0.8vw' }}>
                        <Row label="Amount" value="1,250.00 USDC" />
                        <Row label="Network fee (est.)" value="≈ 0.02 USDC" />
                        <Row label="Total" value="1,250.02 USDC" strong />
                      </div>
                      <div className="flex justify-end" style={{ marginTop: '0.3vw' }}>
                        <UIButton primary pressed={at('confirm')} style={{ minWidth: '10vw' }}>
                          Confirm
                        </UIButton>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="done" className="flex flex-col items-center justify-center" style={{ height: '16vw', gap: '0.75vw' }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
                      <motion.div
                        className="flex items-center justify-center"
                        style={{ width: '4.2vw', height: '4.2vw', borderRadius: 999, background: 'rgba(52,211,153,0.12)', border: `1.5px solid ${GREEN}`, color: GREEN, boxShadow: '0 0 2vw rgba(52,211,153,0.35)' }}
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      >
                        <Check size="2.1vw" strokeWidth={2.6} />
                      </motion.div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.7vw', fontWeight: 500, color: INK }}>Payment Complete</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.2vw', color: MUTED }}>The USDC moved on Arc testnet.</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05vw', color: SILVER_BRIGHT, marginTop: '0.2vw' }}>tx 0x8c2f…41ae</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </motion.div>

      {/* Registry carried over from Anchor */}
      <div className="absolute" style={{ left: '49vw', top: '29.5vw' }}>
        <RegistryPanel status={at('flip') ? 'paid' : 'anchored'} showTx />
        <motion.div
          style={{ marginTop: '1.1vw', marginLeft: '-2vw', width: '47vw', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1vw', letterSpacing: '0.05em', color: MUTED, whiteSpace: 'nowrap' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: at('note') ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        >
          Arc Testnet · test USDC · amounts and addresses are public on-chain
        </motion.div>
      </div>
    </SceneRoot>
  );
}
