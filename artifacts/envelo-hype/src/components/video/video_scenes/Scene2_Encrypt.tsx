import { motion } from 'framer-motion';

import { HardCut, Hud, Shockwave } from '../ui/hype';
import { EASE_OUT, INK, RED, SILVER } from '../ui/primitives';
import { Scramble, makeHex } from '../ui/textfx';
import { useBeats } from '../ui/useBeats';
import { HUD_LEFT_SEALED, HUD_RIGHT, OPEN_LINES, OpenStack, openLineStyle } from './openStack';

// 0 scramble · 900 hex rows · 1460 compress · 1940 dot · 2280-2640 four rings · 2660 blackout
const BEATS = [0, 900, 1460, 1940, 2280, 2400, 2520, 2640, 2660];

// Same-length ciphertext for each line so the layout never shifts while cycling.
const CIPHER = OPEN_LINES.map((line, i) => {
  const hex = makeHex(line.length, 21 + i * 5).toUpperCase();
  return line
    .split('')
    .map((ch, j) => (ch === ' ' ? ' ' : hex[j] ?? 'F'))
    .join('');
});

const ROWS = Array.from({ length: 6 }, (_, i) => makeHex(48, 40 + i).toUpperCase().replace(/(.{8})/g, '$1 ').trim());

export function Scene2_Encrypt() {
  const beat = useBeats(BEATS);
  const compressed = beat >= 2;
  const dotted = beat >= 3;

  return (
    <HardCut>
      <Hud left={<Scramble to={HUD_LEFT_SEALED} from={HUD_LEFT_SEALED.replace(/AES-256-GCM/, 'PLAINTEXT  ')} active duration={700} />} right={HUD_RIGHT} leftColor={SILVER} />

      {/* Everything readable collapses into one line, then one point. */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 20vw' }}
        animate={compressed ? { scaleY: 0.01, opacity: 0 } : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.7, 0, 0.3, 1] }}
      >
        <OpenStack>
          {OPEN_LINES.slice(0, 2).map((line, i) => (
            <motion.div key={line} style={openLineStyle} initial={{ color: INK }} animate={{ color: SILVER }} transition={{ duration: 0.6 }}>
              <Scramble to={CIPHER[i]} from={line} active duration={850} pool="glyphs" />
            </motion.div>
          ))}
          <div style={openLineStyle}>
            <motion.span initial={{ color: INK }} animate={{ color: SILVER }} transition={{ duration: 0.6 }}>
              <Scramble to={CIPHER[2].slice(0, 3)} from="IS " active duration={850} pool="glyphs" />
            </motion.span>
            <motion.span initial={{ color: RED }} animate={{ color: SILVER }} transition={{ duration: 0.6 }}>
              <Scramble to={CIPHER[2].slice(3)} from="OPEN." active duration={850} pool="glyphs" />
            </motion.span>
          </div>
        </OpenStack>

        {/* Extra ciphertext rows fill the frame around the words. */}
        {ROWS.map((row, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: 0, right: 0, textAlign: 'center', top: i < 3 ? `${5.5 + i * 2.6}vw` : `${41.5 + (i - 3) * 2.6}vw`, fontFamily: 'var(--font-mono)', fontSize: '1.3vw', letterSpacing: '0.12em', color: SILVER, whiteSpace: 'nowrap' }}
            initial={{ opacity: 0 }}
            animate={beat >= 1 ? { opacity: 0.55 } : { opacity: 0 }}
            transition={{ delay: (i % 3) * 0.06, duration: 0.2 }}
          >
            {row}
          </motion.div>
        ))}
      </motion.div>

      {/* Bright seal line, then the point. */}
      <motion.div
        className="absolute"
        style={{ left: '20vw', top: '20vw', width: '60vw', height: '0.26vw', background: 'linear-gradient(90deg, rgba(226,225,225,0) 0%, #ffffff 50%, rgba(226,225,225,0) 100%)', boxShadow: '0 0 1.6vw rgba(255,255,255,0.8)', transformOrigin: 'center' }}
        initial={{ opacity: 0, scaleX: 1 }}
        animate={dotted ? { opacity: 1, scaleX: 0.012 } : compressed ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 1 }}
        transition={dotted ? { duration: 0.32, ease: [0.7, 0, 0.3, 1] } : { duration: 0.12 }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ left: '49.6vw', top: '19.6vw', width: '0.8vw', height: '0.8vw', background: '#ffffff', boxShadow: '0 0 2vw rgba(255,255,255,0.9)' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={dotted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ delay: dotted ? 0.25 : 0, duration: 0.2, ease: EASE_OUT }}
      />
      {[4, 5, 6, 7].map((b, i) => (
        <Shockwave key={b} active={beat >= b} size="10vw" style={{ left: '45vw', top: '15vw' }} color={`rgba(226,225,225,${0.9 - i * 0.12})`} />
      ))}

      {/* Blackout right before the drop. */}
      <motion.div className="absolute inset-0" style={{ background: '#050505' }} initial={{ opacity: 0 }} animate={beat >= 8 ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 0.08 }} />
    </HardCut>
  );
}
