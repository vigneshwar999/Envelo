import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene1Seal() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Invoice rises
    { time: 1500, callback: () => setPhase(2) }, // Invoice lines
    { time: 3000, callback: () => setPhase(3) }, // Envelope seals
    { time: 4000, callback: () => setPhase(4) }, // Padlock & encryption
    { time: 5000, callback: () => setPhase(5) }, // Headline + subtitle
    { time: 9200, callback: () => setPhase(6) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-col items-center justify-center pt-[10vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 6 ? 1 : 0, scale: phase === 6 ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[40vw] h-[25vw] mb-[5vh] perspective-[1000px] flex items-center justify-center">
        {/* The Invoice */}
        <motion.div
          className="absolute w-[30vw] h-[40vw] bg-white rounded-xl shadow-2xl p-[2vw] flex flex-col gap-[1.5vw] border border-bg-muted"
          initial={{ y: '50vh', rotateX: 20, opacity: 0 }}
          animate={{
            y: phase >= 1 ? (phase >= 3 ? '2vw' : 0) : '50vh',
            rotateX: phase >= 1 ? 0 : 20,
            opacity: phase >= 1 ? 1 : 0,
            scale: phase >= 3 ? 0.8 : 1,
          }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-[10vw] h-[2vw] bg-primary/10 rounded-full" />
          
          <motion.div className="flex flex-col gap-[1vw]">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-full h-[1.5vw] bg-primary/5 rounded flex items-center justify-between px-[1vw]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -20 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="w-[12vw] h-[0.8vw] bg-primary/20 rounded" />
                <div className="w-[4vw] h-[0.8vw] bg-accent/20 rounded" />
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-auto flex justify-between border-t border-bg-muted pt-[1vw]">
            <div className="w-[6vw] h-[1.5vw] bg-primary/20 rounded" />
            <div className="w-[8vw] h-[2vw] bg-primary/80 rounded" />
          </div>
        </motion.div>

        {/* Envelope Base */}
        <motion.div
          className="absolute w-[36vw] h-[24vw] bg-[#E2E8F0] rounded-xl shadow-xl border border-white/50 z-10 overflow-hidden"
          initial={{ y: '60vh', opacity: 0 }}
          animate={{
            y: phase >= 3 ? 0 : '60vh',
            opacity: phase >= 3 ? 1 : 0,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Flap */}
          <motion.div
            className="absolute top-0 left-0 w-full h-[18vw] bg-[#CBD5E1] origin-top border-b border-white/30"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
            initial={{ rotateX: -180 }}
            animate={{ rotateX: phase >= 4 ? 0 : -180 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Padlock */}
        <motion.div
          className="absolute z-20 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: phase >= 4 ? 1 : 0,
            opacity: phase >= 4 ? 1 : 0,
          }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
        >
          <div className="w-[6vw] h-[6vw] bg-primary rounded-full flex items-center justify-center shadow-lg border-[0.2vw] border-white text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[3vw] h-[3vw]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </motion.div>
      </div>

      <div className="text-center z-20">
        <div className="overflow-hidden mb-[1vh]">
          <motion.h1
            className="text-[4vw] font-display font-semibold text-primary leading-tight"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 5 ? '0%' : '100%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Sealed in the browser
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className="text-[1.8vw] font-body text-text-secondary"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 5 ? '0%' : '100%' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            Contents never leave the device readable.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
