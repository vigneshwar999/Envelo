import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CSSProperties, PropsWithChildren } from 'react';

import { CopyColumn, EASE_OUT, GREEN, Headline, INK, MUTED, RED, SceneRoot, Support } from '../ui/primitives';
import { useBeats } from '../ui/useBeats';

const BEATS = [600, 1800, 2700, 3600, 5300, 7450];

const paperText: CSSProperties = { fontFamily: 'var(--font-body)', color: '#1d1d1d' };

/** A field on the paper that gets outlined and copied away when `leak` is true. */
function Leak({ children, leak, copies = 3, style }: PropsWithChildren<{ leak: boolean; copies?: number; style?: CSSProperties }>) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }}>
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
      <motion.span
        style={{ position: 'absolute', inset: '-0.35vw -0.5vw', border: `1.5px solid ${RED}`, borderRadius: '0.25vw', transformOrigin: 'left center', zIndex: 3 }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={leak ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      />
      {Array.from({ length: copies }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', color: RED, zIndex: 1 }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={leak ? { x: `${16 + i * 5}vw`, y: `${-3 - i * 3.2}vw`, opacity: [0, 0.85, 0] } : { opacity: 0 }}
          transition={{ delay: i * 0.16, duration: 1.7, ease: 'easeOut' }}
        >
          {children}
        </motion.span>
      ))}
    </span>
  );
}

export function Scene1_Problem() {
  const beat = useBeats(BEATS);
  const leaving = beat >= 5;

  return (
    <SceneRoot>
      <motion.div animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.5 }}>
        <CopyColumn top="12.5vw" width="42vw">
          <Headline lines={['Every invoice you', 'send travels in', 'the open.']} size="4.1vw" delay={0.1} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55vw', marginTop: '0.6vw' }}>
            {['Your rates.', "Your client's name.", 'Your address.'].map((line, i) => (
              <motion.div
                key={line}
                className="flex items-center"
                style={{ gap: '1vw', fontFamily: 'var(--font-body)', fontSize: '2.05vw', color: INK, fontWeight: 500 }}
                initial={{ opacity: 0, x: -14 }}
                animate={beat >= i + 1 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                <span style={{ width: '0.65vw', height: '0.65vw', borderRadius: 999, background: RED, boxShadow: `0 0 0.8vw ${RED}` }} />
                {line}
              </motion.div>
            ))}
          </div>
          {beat >= 4 && (
            <Support size="1.85vw" color={MUTED} maxWidth="38vw" delay={0}>
              And the proof it was paid is a screenshot.
            </Support>
          )}
        </CopyColumn>
      </motion.div>

      {/* The exposed paper invoice */}
      <motion.div
        className="absolute"
        style={{ left: '57vw', top: '7.5vw', width: '30vw', height: '38.5vw', perspective: '140vw' }}
        initial={{ opacity: 0, y: 40 }}
        animate={leaving ? { opacity: 0, y: 60 } : beat >= 0 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: leaving ? 0.6 : 1.1, ease: EASE_OUT }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(160deg, #f4f4f2 0%, #e9e9e6 60%, #dcdcd8 100%)',
            borderRadius: '0.35vw',
            boxShadow: '0 3vw 7vw rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.35) inset',
            padding: '2.4vw 2.4vw',
            ...paperText,
          }}
          initial={{ rotateY: -18, rotateX: 4 }}
          animate={{ rotateY: -13, rotateX: 3 }}
          transition={{ duration: 7, ease: 'linear' }}
        >
          <div className="flex items-start justify-between">
            <div style={{ fontSize: '1.7vw', fontWeight: 700, letterSpacing: '0.06em' }}>INVOICE</div>
            <div style={{ textAlign: 'right', fontSize: '0.95vw', lineHeight: 1.5, color: '#444' }}>
              <div>No. 0142</div>
              <div>07 Sep 2026</div>
            </div>
          </div>

          <div style={{ marginTop: '2.4vw', fontSize: '0.78vw', letterSpacing: '0.18em', color: '#777' }}>BILL TO</div>
          <div style={{ marginTop: '0.5vw', fontSize: '1.25vw', fontWeight: 600 }}>
            <Leak leak={beat >= 2}>Arjun Mehta</Leak>
          </div>
          <div style={{ fontSize: '1vw', lineHeight: 1.5, color: '#3a3a3a' }}>Northwind Studio</div>
          <div style={{ fontSize: '1vw', lineHeight: 1.5, color: '#3a3a3a' }}>
            <Leak leak={beat >= 3} copies={2}>14 Residency Road, Bengaluru 560025</Leak>
          </div>

          <div style={{ marginTop: '2.6vw', borderTop: '1px solid #cfcfca', borderBottom: '1px solid #cfcfca', padding: '0.6vw 0', display: 'grid', gridTemplateColumns: '1fr 5vw 5.5vw', fontSize: '0.78vw', letterSpacing: '0.14em', color: '#777' }}>
            <span>DESCRIPTION</span>
            <span style={{ textAlign: 'right' }}>RATE</span>
            <span style={{ textAlign: 'right' }}>AMOUNT</span>
          </div>
          <div style={{ padding: '1vw 0', display: 'grid', gridTemplateColumns: '1fr 5vw 5.5vw', fontSize: '1.02vw', alignItems: 'center' }}>
            <span>Brand identity, phase 2</span>
            <span style={{ textAlign: 'right' }}>
              <Leak leak={beat >= 1}>1,250.00</Leak>
            </span>
            <span style={{ textAlign: 'right' }}>1,250.00</span>
          </div>
          <div style={{ padding: '0.3vw 0 1vw', display: 'grid', gridTemplateColumns: '1fr 5vw 5.5vw', fontSize: '1.02vw', color: '#3a3a3a' }}>
            <span>Design retainer, September</span>
            <span />
            <span />
          </div>
          <div style={{ borderTop: '1.5px solid #1d1d1d', paddingTop: '0.9vw', display: 'flex', justifyContent: 'space-between', fontSize: '1.2vw', fontWeight: 700 }}>
            <span>TOTAL</span>
            <span>1,250.00 USDC</span>
          </div>

          <div style={{ position: 'absolute', left: '2.4vw', bottom: '2vw', fontSize: '0.9vw', color: '#666', fontFamily: 'var(--font-mono)' }}>pay to 0x3f8a91c4…a1c2</div>
        </motion.div>
      </motion.div>

      {/* The "proof": a screenshot */}
      <motion.div
        className="absolute"
        style={{ left: '48vw', top: '31vw', width: '14vw' }}
        initial={{ opacity: 0, scale: 1.08, rotate: -6 }}
        animate={leaving ? { opacity: 0, y: 40 } : beat >= 4 ? { opacity: 1, scale: 1, rotate: -4 } : {}}
        transition={{ duration: 0.55, ease: EASE_OUT }}
      >
        <div style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '0.7vw', padding: '1.1vw', boxShadow: '0 2vw 5vw rgba(0,0,0,0.7)' }}>
          <div className="flex items-center justify-center" style={{ width: '2.4vw', height: '2.4vw', borderRadius: 999, background: 'rgba(52,211,153,0.15)', border: `1px solid ${GREEN}`, color: GREEN, margin: '0 auto' }}>
            <Check size="1.3vw" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.7vw', fontSize: '1.05vw', color: INK, fontWeight: 600 }}>Payment sent</div>
          <div style={{ textAlign: 'center', marginTop: '0.25vw', fontSize: '1.15vw', color: INK, fontFamily: 'var(--font-mono)' }}>1,250.00</div>
          <div style={{ textAlign: 'center', marginTop: '0.2vw', fontSize: '0.8vw', color: MUTED }}>to Riya Studio · 10:42</div>
        </div>
        <div style={{ marginTop: '0.6vw', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8vw', color: MUTED }}>Screenshot 2026-09-07 at 10.42.png</div>
        {/* shutter flash */}
        <motion.div
          className="absolute inset-0"
          style={{ background: '#fff', borderRadius: '0.7vw' }}
          initial={{ opacity: 0 }}
          animate={beat >= 4 ? { opacity: [0.7, 0] } : { opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      </motion.div>
    </SceneRoot>
  );
}
