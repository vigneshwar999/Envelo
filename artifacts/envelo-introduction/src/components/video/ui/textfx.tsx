import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { VideoPausedContext } from '@/lib/video';

const HEX = '0123456789abcdef';
const GLYPHS = '0123456789abcdefABCDEF#%&*+=<>/\\|';

function randomChar(pool: string) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function makeHex(length: number, seed = 7): string {
  // Deterministic pseudo-random hex (mulberry32) so the same fingerprint appears in every scene.
  let a = (seed * 0x9e3779b9) >>> 0;
  let out = '';
  for (let i = 0; i < length; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out += HEX[Math.floor(r * 16)];
  }
  return out;
}

export const FINGERPRINT = `9f3a7c1e${makeHex(48, 3)}d4b20c21`;
export const FINGERPRINT_SHORT = `${FINGERPRINT.slice(0, 8)}…${FINGERPRINT.slice(-8)}`;

interface TypeTextProps {
  text: string;
  /** Start typing when true. */
  active: boolean;
  /** Milliseconds per character. */
  speed?: number;
  cursor?: boolean;
  className?: string;
  style?: CSSProperties;
  onDone?: () => void;
}

/** Typewriter reveal with a steady block cursor while typing. */
export function TypeText({ text, active, speed = 34, cursor = true, className, style, onDone }: TypeTextProps) {
  const paused = useContext(VideoPausedContext);
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const doneRef = useRef(false);
  useEffect(() => {
    // Progress lives in a ref so a pause/resume continues where typing stopped.
    if (!active || paused || countRef.current >= text.length) return;
    const id = window.setInterval(() => {
      countRef.current += 1;
      setCount(countRef.current);
      if (countRef.current >= text.length) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, text, speed]);
  const typing = active && count < text.length;
  return (
    <span className={className} style={style}>
      {text.slice(0, count)}
      {cursor && typing && (
        <span
          style={{
            display: 'inline-block',
            width: '0.55em',
            height: '1.05em',
            marginLeft: '0.08em',
            verticalAlign: '-0.15em',
            background: 'rgba(226,225,225,0.9)',
          }}
        />
      )}
    </span>
  );
}

interface ScrambleProps {
  /** Final text after the animation. */
  to: string;
  /** Text shown before the animation starts. */
  from?: string;
  active: boolean;
  /** Total duration in ms. */
  duration?: number;
  /** Character pool used while cycling. */
  pool?: 'hex' | 'glyphs';
  className?: string;
  style?: CSSProperties;
}

/**
 * Cycles characters left-to-right until they settle on `to`.
 * Used both to "encrypt" readable fields and to resolve hashes.
 */
export function Scramble({ to, from, active, duration = 900, pool = 'hex', className, style }: ScrambleProps) {
  const paused = useContext(VideoPausedContext);
  const [text, setText] = useState(from ?? '');
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!active) {
      elapsedRef.current = 0;
      setText(from ?? '');
      return;
    }
    if (paused || elapsedRef.current >= duration) return;
    const chars = pool === 'hex' ? HEX : GLYPHS;
    // Resume from the accumulated elapsed time so a pause does not skip the cycle.
    const start = performance.now() - elapsedRef.current;
    const len = Math.max(to.length, (from ?? '').length);
    const id = window.setInterval(() => {
      elapsedRef.current = performance.now() - start;
      const p = Math.min(1, elapsedRef.current / duration);
      const settled = Math.floor(p * to.length);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (i < settled) out += to[i] ?? '';
        else if (i < to.length) out += to[i] === ' ' ? ' ' : randomChar(chars);
      }
      setText(out);
      if (p >= 1) {
        setText(to);
        window.clearInterval(id);
      }
    }, 42);
    return () => window.clearInterval(id);
  }, [active, paused, to, from, duration, pool]);
  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}
