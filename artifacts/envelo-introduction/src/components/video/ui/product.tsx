import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Hexagon, Lock } from 'lucide-react';

import { Chip, DIM, EASE_OUT, FieldLabel, GREEN, INK, MUTED, Panel, PanelHeader, SILVER_BRIGHT, type ChipTone } from './primitives';
import { FINGERPRINT_SHORT } from './textfx';

/* The sealed invoice: the object that carries from Seal to Anchor. */
export function SealedEnvelope({ width = '22vw' }: { width?: string }) {
  return (
    <div
      style={{
        width,
        aspectRatio: '18 / 11.5',
        position: 'relative',
        borderRadius: '0.8vw',
        background: 'linear-gradient(180deg, #141414 0%, #0a0a0a 100%)',
        border: '1px solid rgba(226,225,225,0.22)',
        boxShadow: '0 2vw 6vw rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* flap */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
          clipPath: 'polygon(0 0, 100% 0, 50% 58%)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '58%', pointerEvents: 'none' }}>
        <svg viewBox="0 0 180 67" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path d="M0 0 L90 67 L180 0" fill="none" stroke="rgba(226,225,225,0.28)" strokeWidth="0.8" />
        </svg>
      </div>
      {/* seal */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '50%',
          top: '52%',
          width: '4.2vw',
          height: '4.2vw',
          transform: 'translate(-50%, -50%)',
          borderRadius: 999,
          background: 'radial-gradient(circle at 35% 30%, #f1f1f1 0%, #c3c7ca 45%, #8b8f91 100%)',
          boxShadow: '0 0 0 0.25vw rgba(0,0,0,0.6), 0 0 2vw rgba(226,225,225,0.35)',
          color: '#111',
        }}
      >
        <Lock size="1.75vw" strokeWidth={2.2} />
      </div>
      <div className="absolute flex items-center justify-between" style={{ left: '1.2vw', right: '1.2vw', bottom: '1vw', fontFamily: 'var(--font-mono)', fontSize: '0.92vw', letterSpacing: '0.12em', color: MUTED }}>
        <span style={{ whiteSpace: 'nowrap' }}>INV-2026-014</span>
        <span style={{ color: SILVER_BRIGHT, whiteSpace: 'nowrap' }}>AES-256-GCM</span>
      </div>
    </div>
  );
}

interface RegistryPanelProps {
  width?: string;
  status: 'pending' | 'anchored' | 'paid';
  showTx?: boolean;
}

const STATUS: Record<RegistryPanelProps['status'], { label: string; tone: ChipTone }> = {
  pending: { label: 'Pending Anchor', tone: 'amber' },
  anchored: { label: 'Anchored', tone: 'silver' },
  paid: { label: 'Paid', tone: 'green' },
};

/* The on-chain record: the object that carries from Anchor to Pay. */
export function RegistryPanel({ width = '43vw', status, showTx = false }: RegistryPanelProps) {
  const paid = status === 'paid';
  const s = STATUS[status];
  return (
    <Panel width={width}>
      <PanelHeader
        title="SealedInvoiceRegistry"
        icon={<Hexagon size="1.25vw" color={SILVER_BRIGHT} />}
        right={<Chip tone="neutral" dot={false}>Arc Testnet · 5042002</Chip>}
      />
      <div style={{ padding: '1.3vw 1.6vw', display: 'grid', gridTemplateColumns: '1.5fr 0.7fr 1fr', gap: '1vw' }}>
        <div>
          <FieldLabel>Fingerprint</FieldLabel>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.32vw', color: INK }}>{FINGERPRINT_SHORT}</div>
        </div>
        <div>
          <FieldLabel>Paid</FieldLabel>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.32vw', height: '1.7vw', position: 'relative', perspective: '20vw' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={paid ? 'true' : 'false'}
                style={{ position: 'absolute', left: 0, top: 0, color: paid ? GREEN : MUTED }}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                {paid ? 'true' : 'false'}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div>
          <FieldLabel>Block</FieldLabel>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.32vw', color: INK }}>#8,412,930</div>
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ padding: '1vw 1.6vw 1.2vw', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ position: 'relative', height: '2.2vw', minWidth: '12vw' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={status}
              style={{ position: 'absolute', left: 0, top: 0 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <Chip tone={s.tone}>{s.label}</Chip>
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.div
          className="flex items-center"
          style={{ gap: '0.5vw', fontFamily: 'var(--font-mono)', fontSize: '1.05vw', color: showTx ? MUTED : DIM }}
          initial={{ opacity: 0 }}
          animate={{ opacity: showTx ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <span>Transaction on Arc Explorer</span>
          <span style={{ color: SILVER_BRIGHT }}>{paid ? '0x8c2f…41ae' : '0x71c4…9be2'}</span>
          <ArrowUpRight size="1vw" color={SILVER_BRIGHT} />
        </motion.div>
      </div>
    </Panel>
  );
}
