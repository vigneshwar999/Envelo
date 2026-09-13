import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { EASE_OUT, GREEN, INK, MUTED, Panel, PanelHeader, RED, SILVER, silverTextStyle } from './primitives';
import { Scramble } from './textfx';
import { Shockwave } from './hype';

export const SLAM_EASE_LOCAL = [0.1, 0.9, 0.2, 1] as const;

const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

/* ---------- Chapter 01: the invoice draft that gets encrypted field by field ---------- */

interface Row {
  label: string;
  value: string;
  strong?: boolean;
}

const ROWS: Row[] = [
  { label: 'Client', value: 'Arjun Mehta' },
  { label: 'Invoice', value: 'INV-2026-014' },
  { label: 'Item', value: 'Design retainer · September' },
  { label: 'Total (test USDC)', value: '1,250.00', strong: true },
];

/** Invoice card whose readable fields scramble into ciphertext when `sealed` flips. */
export function InvoiceDraft({ sealed, width = '38vw' }: { sealed: boolean; width?: string }) {
  return (
    <Panel width={width}>
      <PanelHeader title="New Sealed Invoice" right={<span style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.18em', color: sealed ? SILVER : RED, textTransform: 'uppercase' }}>{sealed ? 'AES-256-GCM' : 'Plaintext'}</span>} />
      <div style={{ display: 'grid', gap: '1.05vw', padding: '1.6vw 1.9vw 1.9vw' }}>
        {ROWS.map((row, i) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2vw', borderBottom: i < ROWS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: i < ROWS.length - 1 ? '1.05vw' : 0 }}>
            <span style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>{row.label}</span>
            <span style={{ ...(row.strong && !sealed ? { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.7vw', color: INK } : { ...mono, fontSize: '1.22vw', color: sealed ? SILVER : INK }), whiteSpace: 'nowrap' }}>
              <Scramble from={row.value} to={cipherFor(row.value, i)} active={sealed} duration={700} />
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function cipherFor(value: string, seed: number): string {
  let out = '';
  let x = 2654435761 * (seed + 7);
  for (let i = 0; i < value.length; i++) {
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    out += '0123456789ABCDEF'[x % 16];
  }
  return out;
}

/** Wax-style seal disc that stamps onto the envelope. */
export function SealDisc({ active, size = '5.6vw' }: { active: boolean; size?: string }) {
  return (
    <div className="absolute" style={{ left: '50%', top: '50%', width: 0, height: 0 }}>
      <Shockwave active={active} size="9vw" style={{ left: '-4.5vw', top: '-4.5vw' }} />
      <motion.div
        className="absolute flex items-center justify-center rounded-full"
        style={{ width: size, height: size, left: `calc(${size} / -2)`, top: `calc(${size} / -2)`, background: 'radial-gradient(circle at 35% 30%, #f2f2f2 0%, #bfc3c6 45%, #7b8085 100%)', boxShadow: '0 1.2vw 2.4vw rgba(0,0,0,0.6), inset 0 0 0 0.12vw rgba(255,255,255,0.35)' }}
        initial={{ opacity: 0, scale: 2.2 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2.2 }}
        transition={active ? { duration: 0.22, ease: SLAM_EASE_LOCAL } : { duration: 0 }}
      >
        <Lock style={{ width: '2.1vw', height: '2.1vw', color: '#141414' }} strokeWidth={2.2} />
      </motion.div>
    </div>
  );
}

/** Envelope face that slides up behind the stamped seal. */
export function EnvelopeFace({ width = '24vw' }: { width?: string }) {
  const h = `calc(${width} * 0.64)`;
  return (
    <div className="relative overflow-hidden" style={{ width, height: h, borderRadius: '0.6vw', background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 2vw 5vw rgba(0,0,0,0.6)' }}>
      {/* flap */}
      <div className="absolute" style={{ left: 0, right: 0, top: 0, height: '52%', background: 'linear-gradient(180deg, #2a2a2a 0%, #171717 100%)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
      <div className="absolute" style={{ left: '1.4vw', bottom: '1.2vw', ...mono, fontSize: '0.92vw', letterSpacing: '0.2em', color: MUTED, textTransform: 'uppercase' }}>INV-2026-014</div>
      <div className="absolute" style={{ right: '1.4vw', bottom: '1.2vw', ...mono, fontSize: '0.92vw', letterSpacing: '0.2em', color: SILVER, textTransform: 'uppercase' }}>Sealed</div>
    </div>
  );
}

/* ---------- Chapter 03: payment ---------- */

/** A registry flag that flips between two values with a quick vertical roll. */
export function FlipBool({ value, trueColor = GREEN }: { value: boolean; trueColor?: string }) {
  return (
    <span className="relative inline-block overflow-hidden align-baseline" style={{ height: '1.5em', lineHeight: '1.5em' }}>
      <motion.span className="block" animate={{ y: value ? '-1.5em' : '0em' }} transition={{ duration: 0.28, ease: EASE_OUT }} style={{ display: 'block' }}>
        <span className="block" style={{ color: MUTED }}>false</span>
        <span className="block" style={{ color: trueColor }}>true</span>
      </motion.span>
    </span>
  );
}

interface PayPanelProps {
  amount: number;
  pressed: boolean;
  paid: boolean;
  width?: string;
}

export function PayPanel({ amount, pressed, paid, width = '38vw' }: PayPanelProps) {
  const label = paid ? 'Payment Complete' : 'Awaiting Payment';
  return (
    <Panel width={width} style={paid ? { boxShadow: `0 1.5vw 5vw rgba(0,0,0,0.65), 0 0 0 1px ${GREEN}55, 0 0 3vw ${GREEN}33` } : undefined}>
      <PanelHeader title="Pay Invoice" right={<span style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.18em', color: MUTED, textTransform: 'uppercase' }}>Arc Testnet</span>} />
      <div style={{ padding: '1.6vw 1.9vw 1.9vw', display: 'grid', gap: '1.4vw' }}>
        <div>
          <div style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED, marginBottom: '0.5vw' }}>Total (test USDC)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '4.2vw', lineHeight: 1, letterSpacing: '-0.03em', ...silverTextStyle, fontVariantNumeric: 'tabular-nums' }}>
            {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5vw' }}>
          <div style={{ ...mono, fontSize: '1.05vw', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.4em', lineHeight: '1.5em' }}>
            <span>paid:</span>
            <FlipBool value={paid} />
          </div>
          <motion.div
            className="flex items-center justify-center"
            style={{ height: '3.4vw', padding: '0 2vw', borderRadius: '0.5vw', background: paid ? 'rgba(52,211,153,0.16)' : 'linear-gradient(180deg, #f1f1f1 0%, #c9cdd0 100%)', border: paid ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.3)', color: paid ? GREEN : '#0a0a0a', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '1.25vw', whiteSpace: 'nowrap', gap: '0.6vw' }}
            animate={{ scale: pressed && !paid ? 0.94 : 1 }}
            transition={{ duration: 0.12 }}
          >
            {paid ? <Check style={{ width: '1.4vw', height: '1.4vw' }} strokeWidth={2.6} /> : null}
            {paid ? label : 'Pay 1,250.00 test USDC'}
          </motion.div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- Chapter 04: verification ---------- */

interface VerifyPanelProps {
  computing: boolean;
  onChainVisible: boolean;
  matched: boolean;
  width?: string;
}

const HASH_A = '9F3A7C1E2B48D05F';
const HASH_B = '61C0E97A3D5B24F8';
const FULL_HASH = `${HASH_A}…${HASH_B}`;

export function VerifyPanel({ computing, onChainVisible, matched, width = '38vw' }: VerifyPanelProps) {
  return (
    <Panel width={width} style={matched ? { boxShadow: `0 1.5vw 5vw rgba(0,0,0,0.65), 0 0 0 1px ${GREEN}55, 0 0 3vw ${GREEN}33` } : undefined}>
      <PanelHeader title="Verify Content Matches Record" right={<span style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.18em', color: matched ? GREEN : MUTED, textTransform: 'uppercase' }}>{matched ? 'Match' : 'Checking'}</span>} />
      <div style={{ padding: '1.6vw 1.9vw 1.9vw', display: 'grid', gap: '1.3vw' }}>
        <HashRow label="Computed from file" value={<Scramble to={FULL_HASH} from={'·'.repeat(FULL_HASH.length)} active={computing} duration={700} />} highlight={matched} />
        <motion.div initial={{ opacity: 0, y: '0.6vw' }} animate={onChainVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.6vw' }} transition={{ duration: 0.3, ease: EASE_OUT }}>
          <HashRow label="On-chain record" value={FULL_HASH} highlight={matched} />
        </motion.div>
      </div>
    </Panel>
  );
}

function HashRow({ label, value, highlight }: { label: string; value: ReactNode; highlight: boolean }) {
  return (
    <div style={{ display: 'grid', gap: '0.45vw' }}>
      <div style={{ ...mono, fontSize: '0.98vw', letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
      <div style={{ ...mono, fontSize: '1.32vw', color: highlight ? GREEN : INK, whiteSpace: 'nowrap', transition: 'color 0.25s' }}>{value}</div>
    </div>
  );
}

/** Green stamp slamming over the verify panel. */
export function MatchStamp({ active }: { active: boolean }) {
  return (
    <div className="absolute" style={{ left: '50%', top: '50%', width: 0, height: 0 }}>
      <Shockwave active={active} size="16vw" color="rgba(52,211,153,0.7)" style={{ left: '-8vw', top: '-8vw' }} radius="0.8vw" />
      <motion.div
        className="absolute flex items-center gap-[0.8vw]"
        style={{ left: '-8.2vw', top: '-2.2vw', padding: '0.9vw 1.6vw', borderRadius: '0.5vw', border: `0.2vw solid ${GREEN}`, color: GREEN, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.6vw', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(5,5,5,0.85)', rotate: '-6deg', whiteSpace: 'nowrap' }}
        initial={{ opacity: 0, scale: 2.4 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2.4 }}
        transition={active ? { duration: 0.2, ease: SLAM_EASE_LOCAL } : { duration: 0 }}
      >
        <Check style={{ width: '2.4vw', height: '2.4vw' }} strokeWidth={3} />
        Match
      </motion.div>
    </div>
  );
}
