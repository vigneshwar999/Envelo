import { motion, type Transition } from 'framer-motion';
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';

export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: Transition['ease'] = [0.65, 0, 0.35, 1];

export const SILVER = '#c9cdd0';
export const SILVER_BRIGHT = '#e6e8e9';
export const INK = '#f4f4f4';
export const MUTED = 'hsl(0 0% 62%)';
export const DIM = 'hsl(0 0% 40%)';
export const GREEN = '#34d399';
export const AMBER = '#f5b342';
export const RED = '#e0644f';

export const silverTextStyle: CSSProperties = {
  backgroundImage: 'linear-gradient(105deg, #f7f7f7 0%, #c9cdd0 45%, #8f9395 75%, #dcdedf 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/* ---------- Scene shell ---------- */

export function SceneRoot({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <motion.div
      className="absolute inset-0"
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  );
}

/** Left-hand copy column used by the four "how it works" chapters. */
export function CopyColumn({ children, top = '11vw', width = '40vw' }: PropsWithChildren<{ top?: string; width?: string }>) {
  return (
    <div className="absolute" style={{ left: '6vw', top, width, display: 'flex', flexDirection: 'column', gap: '1.8vw' }}>
      {children}
    </div>
  );
}

/* ---------- Typography ---------- */

export function Kicker({ index, label, delay = 0 }: { index?: string; label: string; delay?: number }) {
  return (
    <motion.div
      className="flex items-center"
      style={{ gap: '0.9vw', fontFamily: 'var(--font-mono)', fontSize: '1.12vw', letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase' }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.7, ease: EASE_OUT }}
    >
      {index && <span style={{ color: SILVER }}>{index}</span>}
      <span style={{ width: '2.2vw', height: 1, background: 'rgba(201,205,208,0.45)' }} />
      <span>{label}</span>
    </motion.div>
  );
}

interface HeadlineProps {
  lines: string[];
  size?: string;
  delay?: number;
  align?: 'left' | 'center';
  silver?: boolean;
  weight?: number;
}

/** Word-by-word masked rise. Each line is an explicit array so wraps are controlled. */
export function Headline({ lines, size = '4.3vw', delay = 0, align = 'left', silver = false, weight = 500 }: HeadlineProps) {
  let wordIndex = 0;
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.06,
        letterSpacing: '-0.025em',
        color: INK,
        textAlign: align,
      }}
    >
      {lines.map((line, li) => (
        <span key={li} style={{ display: 'block', whiteSpace: 'nowrap' }}>
          {line.split(' ').map((word, wi) => {
            const i = wordIndex++;
            return (
              <span key={wi} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.08em', marginBottom: '-0.08em' }}>
                <motion.span
                  style={{ display: 'inline-block', paddingRight: '0.24em', ...(silver ? silverTextStyle : {}) }}
                  initial={{ y: '112%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{ delay: delay + i * 0.055, duration: 0.85, ease: EASE_OUT }}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

export function Support({ children, delay = 0, size = '1.7vw', color = MUTED, maxWidth = '35vw', weight = 400 }: PropsWithChildren<{ delay?: number; size?: string; color?: string; maxWidth?: string; weight?: number }>) {
  return (
    <motion.p
      style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: size, lineHeight: 1.45, color, maxWidth, fontWeight: weight }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: EASE_OUT }}
    >
      {children}
    </motion.p>
  );
}

export function Mono({ children, size = '1vw', color = MUTED, style, upper = false }: PropsWithChildren<{ size?: string; color?: string; style?: CSSProperties; upper?: boolean }>) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: size, color, letterSpacing: upper ? '0.18em' : '0.01em', textTransform: upper ? 'uppercase' : 'none', ...style }}>
      {children}
    </span>
  );
}

/* ---------- Product UI recreations ---------- */

export function Panel({ children, width, style, className }: PropsWithChildren<{ width?: string; style?: CSSProperties; className?: string }>) {
  return (
    <div
      className={className}
      style={{
        width,
        background: 'linear-gradient(180deg, #0d0d0d 0%, #090909 100%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '0.9vw',
        boxShadow: '0 1.5vw 5vw rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ title, icon, right }: { title: string; icon?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '1.2vw 1.6vw', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center" style={{ gap: '0.8vw', color: INK, fontFamily: 'var(--font-body)', fontSize: '1.45vw', fontWeight: 500 }}>
        {icon}
        <span>{title}</span>
      </div>
      {right}
    </div>
  );
}

export function FieldLabel({ children }: PropsWithChildren) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1vw', letterSpacing: '0.16em', textTransform: 'uppercase', color: DIM, marginBottom: '0.5vw' }}>{children}</div>
  );
}

export function FieldBox({ children, mono = false, style }: PropsWithChildren<{ mono?: boolean; style?: CSSProperties }>) {
  return (
    <div
      style={{
        height: '3.4vw',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1vw',
        borderRadius: '0.45vw',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.09)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        fontSize: '1.3vw',
        color: INK,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type ChipTone = 'neutral' | 'amber' | 'green' | 'silver' | 'red';
const CHIP_TONES: Record<ChipTone, { fg: string; bg: string; dot: string; border: string }> = {
  neutral: { fg: MUTED, bg: 'rgba(255,255,255,0.04)', dot: DIM, border: 'rgba(255,255,255,0.10)' },
  silver: { fg: SILVER_BRIGHT, bg: 'rgba(201,205,208,0.10)', dot: SILVER_BRIGHT, border: 'rgba(201,205,208,0.35)' },
  amber: { fg: AMBER, bg: 'rgba(245,179,66,0.10)', dot: AMBER, border: 'rgba(245,179,66,0.35)' },
  green: { fg: GREEN, bg: 'rgba(52,211,153,0.10)', dot: GREEN, border: 'rgba(52,211,153,0.35)' },
  red: { fg: RED, bg: 'rgba(224,100,79,0.10)', dot: RED, border: 'rgba(224,100,79,0.35)' },
};

export function Chip({ tone = 'neutral', children, dot = true, size = '1.05vw', style }: PropsWithChildren<{ tone?: ChipTone; dot?: boolean; size?: string; style?: CSSProperties }>) {
  const t = CHIP_TONES[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: '0.5vw',
        padding: '0.42vw 0.95vw',
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.fg,
        fontFamily: 'var(--font-mono)',
        fontSize: size,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && <span style={{ width: '0.5vw', height: '0.5vw', borderRadius: 999, background: t.dot, boxShadow: `0 0 0.6vw ${t.dot}` }} />}
      {children}
    </span>
  );
}

export function UIButton({ children, primary = false, pressed = false, style }: PropsWithChildren<{ primary?: boolean; pressed?: boolean; style?: CSSProperties }>) {
  return (
    <motion.div
      className="inline-flex items-center justify-center"
      animate={pressed ? { scale: [1, 0.96, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        gap: '0.6vw',
        height: '3.4vw',
        padding: '0 1.6vw',
        borderRadius: '0.5vw',
        fontFamily: 'var(--font-body)',
        fontSize: '1.22vw',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        background: primary ? 'linear-gradient(180deg, #e6e8e9 0%, #c3c7ca 100%)' : 'rgba(255,255,255,0.04)',
        color: primary ? '#111' : INK,
        border: primary ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: pressed && primary ? '0 0 0 0.35vw rgba(201,205,208,0.25)' : 'none',
        transition: 'box-shadow 0.3s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function Avatar({ initial, size = '2.6vw' }: { initial: string; size?: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: 999, background: 'linear-gradient(135deg, #2a2a2a, #151515)', border: '1px solid rgba(255,255,255,0.12)', color: SILVER_BRIGHT, fontFamily: 'var(--font-body)', fontSize: `calc(${size} * 0.42)`, fontWeight: 600 }}
    >
      {initial}
    </div>
  );
}

export function Rise({ children, delay = 0, y = 18, style, className, duration = 0.8 }: PropsWithChildren<{ delay?: number; y?: number; style?: CSSProperties; className?: string; duration?: number }>) {
  return (
    <motion.div className={className} style={style} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}
