import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import enveloLogo from '@assets/envelo-logo.svg';

export function Scene2Reveal() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500), // Merge completes, rings fully form
      setTimeout(() => setPhase(2), 2000), // INTRODUCING appears (21000ms global)
      setTimeout(() => setPhase(3), 4000), // ENVELO hero reveal (23000ms global)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
      transition={{ duration: 1 }}
    >
      {/* Cinematic Push In */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ scale: 0.5 }}
        animate={{ scale: phase >= 3 ? 1.2 : 1 }}
        transition={{ duration: 8, ease: "easeOut" }}
      >
        {/* Converging Elements (Visible immediately to bridge from Scene 1 contraction) */}
        <AnimatePresence>
          {phase < 1 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.5, ease: "easeIn" }}
            >
              {[...Array(12)].map((_, i) => {
                return (
                  <div key={i} className="absolute inset-0 flex justify-center items-center" style={{ transform: `rotate(${i * 30}deg)` }}>
                    {/* Streak Core */}
                    <motion.div
                      className="absolute w-[14vw] h-[2px] bg-primary box-glow rounded-full"
                      initial={{ x: 800, opacity: 0, scaleX: 2 }}
                      animate={{ x: 0, opacity: [0, 0.85, 0.85, 0], scaleX: 0.2 }}
                      transition={{ duration: 1.5, ease: "easeIn" }}
                      style={{ originX: 0 }}
                    />
                    {/* Streak Bloom */}
                    <motion.div
                      className="absolute w-[14vw] h-[8px] bg-primary blur-[8px] rounded-full"
                      initial={{ x: 800, opacity: 0, scaleX: 2 }}
                      animate={{ x: 0, opacity: [0, 0.5, 0.5, 0], scaleX: 0.2 }}
                      transition={{ duration: 1.5, ease: "easeIn" }}
                      style={{ originX: 0 }}
                    />
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative w-[50vh] h-[50vh]">
          {/* Rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-[1px] border-primary/45"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, rotateZ: 360, scale: phase >= 3 ? 1.1 : 1.2 }}
            transition={{ 
               opacity: { duration: 1, delay: 0.5 },
               rotateZ: { duration: 20, repeat: Infinity, ease: "linear" }, 
               scale: { duration: 3, ease: "easeOut" } 
            }}
            style={{ rotateX: 60, rotateY: 20 }}
          />
          <motion.div
            className="absolute inset-[-20%] rounded-full border-[1px] border-primary/55 box-glow"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, rotateZ: -360, scale: phase >= 3 ? 1.05 : 1.1 }}
            transition={{ 
               opacity: { duration: 1, delay: 0.5 },
               rotateZ: { duration: 15, repeat: Infinity, ease: "linear" }, 
               scale: { duration: 3, ease: "easeOut" } 
            }}
            style={{ rotateX: 70, rotateY: -10 }}
          />
          {/* Core Glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[25vw] h-[25vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[80px]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: phase >= 3 ? [0.5, 1, 0.8] : 0.5, scale: phase >= 3 ? 1.5 : 1 }}
            transition={{ duration: phase >= 3 ? 1.4 : 2, delay: phase >= 3 ? 0 : 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Text Sequence */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full h-full">
        <motion.div
          className="absolute top-[25vh] font-display text-[2vw] font-medium tracking-[0.3em] text-text-secondary"
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={
            phase === 2 
              ? { opacity: 1, y: 0, filter: "blur(0px)" } 
              : phase > 2 
                ? { opacity: 0, y: -20, filter: "blur(10px)" }
                : { opacity: 0, y: 20, filter: "blur(10px)" }
          }
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          INTRODUCING
        </motion.div>

        {/* ENVELO HERO */}
        <motion.div
          className="flex flex-col items-center justify-center absolute top-[35vh]"
          initial={{ opacity: 0, scale: 0.94, filter: "blur(20px)" }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.94, filter: "blur(20px)" }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Logo Mark */}
          <div className="w-[12vw] h-[12vw] mb-[3vh]">
            <img src={enveloLogo} alt="Envelo Logo" className="w-full h-full drop-shadow-[0_0_30px_rgba(250,250,250,0.4)]" />
          </div>
          {/* Wordmark */}
          <div className="font-display text-[7.5vw] leading-none font-medium tracking-[0.15em] text-transparent silver-gradient-text silver-glow-heavy">
            ENVELO
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
