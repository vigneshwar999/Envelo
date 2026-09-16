import { motion, type Transition } from 'framer-motion';
import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from 'react';

import { VideoPausedContext } from '@/lib/video';

import { EASE_OUT, INK, MUTED, SILVER, silverTextStyle } from './primitives';
import { makeHex } from './textfx';

/* Trailer-speed motion vocabulary shared by every scene. */
export const SLAM_EASE: Transition['ease'] = [0.1, 0.9, 0.2, 1];
export const CANVAS_H = '56.25vw';

/** Scene shell for hard cuts: no fade-in (the flash or wipe covers the cut) and a fast fade-out. */
export function HardCut({ children, style, exitMs = 160 }: PropsWithChildren<{ style?: CSSProperties; exitMs?: number }>) {
  return (
    <motion.div
      className="absolute inset-0"
      style={style}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: exitMs / 1000, ease: 'easeIn' } }}
    >
      {children}
    </motion.div>
  );
}

interface SlamProps {
  /** The word is hidden until this is true, then punches in. */
  active: boolean;
  /** Snaps the word out again (next word takes its place). */
  leave?: boolean;
  size?: string;
  color?: string;
  silver?: boolean;
  weight?: number;
  letterSpacing?: string;
  from?: number;
  style?: CSSProperties;
  className?: string;
}

/** Display word that slams into place: instant opacity pop, scale settling from `from`. */
export function Slam({ active, leave = false, size = '8vw', color = INK, silver = false, weight = 700, letterSpacing = '-0.04em', from = 1.5, style, className, children }: PropsWithChildren<SlamProps>) {
  return (
    <motion.div
      className={className}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: weight,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing,
        textTransform: 'uppercase',
        color,
        whiteSpace: 'nowrap',
        ...(silver ? silverTextStyle : {}),
        ...style,
      }}
      initial={{ opacity: 0, scale: from }}
      animate={
        !active
          ? { opacity: 0, scale: from }
          : leave
            ? { opacity: 0, scale: 0.94, transition: { duration: 0.12, ease: 'easeIn' } }
            : { opacity: 1, scale: 1, transition: { opacity: { duration: 0.05 }, scale: { duration: 0.26, ease: SLAM_EASE } } }
      }
    >
      {children}
    </motion.div>
  );
}

/** Corner read-outs used by the opening: tiny mono labels top-left and top-right. */
export function Hud({ left, right, leftColor = MUTED }: { left: ReactNode; right: ReactNode; leftColor?: string }) {
  const base: CSSProperties = { position: 'absolute', top: '4.2vw', fontFamily: 'var(--font-mono)', fontSize: '1.02vw', letterSpacing: '0.24em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  return (
    <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ ...base, left: '6vw', color: leftColor }}>{left}</div>
      <div style={{ ...base, right: '6vw', color: MUTED }}>{right}</div>
    </motion.div>
  );
}

/** Radial burst of thin light lines: the visual hit under the drop. Transform/opacity only. */
export function Burst({ delay = 0, lines = 18, color = 'rgba(226,225,225,0.85)' }: { delay?: number; lines?: number; color?: string }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: '50vw', top: '20.5vw', width: 0, height: 0 }} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => {
        const angle = (360 / lines) * i + (i % 2) * 6;
        const len = 16 + ((i * 7) % 5) * 3;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `rotate(${angle}deg)`, transformOrigin: '0 0' }}>
            <motion.div
              style={{ width: `${len}vw`, height: '0.14vw', transformOrigin: '0 50%', background: `linear-gradient(90deg, ${color} 0%, rgba(226,225,225,0) 100%)` }}
              initial={{ scaleX: 0.1, opacity: 0, x: '5vw' }}
              animate={{ scaleX: [0.1, 1.15], opacity: [0, 0.9, 0], x: ['5vw', '18vw'] }}
              transition={{ delay: delay + (i % 3) * 0.02, duration: 0.75, ease: EASE_OUT, times: [0, 0.2, 1] }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Expanding ring for stamps and pulses. */
export function Shockwave({ active, size = '12vw', color = 'rgba(226,225,225,0.85)', delay = 0, style, thickness = '0.16vw', radius = 999 }: { active: boolean; size?: string; color?: string; delay?: number; style?: CSSProperties; thickness?: string; radius?: number | string }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ width: size, height: size, borderRadius: radius, border: `${thickness} solid ${color}`, ...style }}
      initial={{ scale: 0.25, opacity: 0 }}
      animate={active ? { scale: [0.25, 1.7], opacity: [0.9, 0] } : { scale: 0.25, opacity: 0 }}
      transition={active ? { delay, duration: 0.65, ease: EASE_OUT } : { duration: 0 }}
    />
  );
}

interface HexRainProps {
  left?: string;
  width?: string;
  columns?: number;
  opacity?: number;
  /** Seconds for one pass; lower is faster. */
  speed?: number;
  seed?: number;
}

/** Falling ciphertext columns. Each column is one translated text node, so it costs almost nothing. */
export function HexRain({ left = '48vw', width = '52vw', columns = 9, opacity = 0.14, speed = 7, seed = 11 }: HexRainProps) {
  // 112 byte pairs at 0.92vw / 1.35 line height is ~139vw tall, so a column
  // still covers the whole frame at both ends of its fall.
  const cols = useMemo(
    () => Array.from({ length: columns }, (_, i) => (makeHex(112, seed + i * 3).match(/.{1,2}/g) ?? []).join('\n')),
    [columns, seed],
  );
  return (
    <div className="absolute overflow-hidden pointer-events-none" style={{ left, top: 0, width, height: CANVAS_H, opacity }} aria-hidden>
      {cols.map((text, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: `${(i / columns) * 100}%`, top: 0, fontFamily: 'var(--font-mono)', fontSize: '0.92vw', lineHeight: 1.35, whiteSpace: 'pre', color: SILVER }}
          initial={{ y: `${-78 - ((i * 13) % 6)}vw` }}
          animate={{ y: `${-2 - ((i * 7) % 4)}vw` }}
          transition={{ duration: speed * (0.8 + ((i * 5) % 4) / 10), ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
        >
          {text}
        </motion.div>
      ))}
      {/* Soft top/bottom fades kept inside the rain so they never tint the rest of the frame. */}
      <div className="absolute" style={{ left: 0, right: 0, top: 0, height: '12vw', background: 'linear-gradient(180deg, #050505 0%, rgba(5,5,5,0) 100%)' }} />
      <div className="absolute" style={{ left: 0, right: 0, bottom: 0, height: '12vw', background: 'linear-gradient(0deg, #050505 0%, rgba(5,5,5,0) 100%)' }} />
    </div>
  );
}

/** Pause-aware count-up (ease-out cubic) for amounts. */
export function useCountUp(active: boolean, to: number, duration = 900): number {
  const paused = useContext(VideoPausedContext);
  const [value, setValue] = useState(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!active) {
      elapsedRef.current = 0;
      setValue(0);
      return;
    }
    if (paused || elapsedRef.current >= duration) return;
    const start = performance.now() - elapsedRef.current;
    let raf = 0;
    const tick = () => {
      elapsedRef.current = performance.now() - start;
      const p = Math.min(1, elapsedRef.current / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(p >= 1 ? to : to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, to, duration]);
  return value;
}

/** Sub-caption under a chapter word: first sentence bright, the rest muted. */
export function Sub({ bright, muted }: { bright: string; muted?: string }) {
  return (
    <>
      <span style={{ color: INK }}>{bright}</span>
      {muted && <span style={{ color: MUTED }}> {muted}</span>}
    </>
  );
}
