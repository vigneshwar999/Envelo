import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene5Verify() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Elements enter
    { time: 1500, callback: () => setPhase(2) }, // Document slides into scanner
    { time: 2500, callback: () => setPhase(3) }, // Scan complete, match shown
    { time: 3500, callback: () => setPhase(4) }, // Text
    { time: 9200, callback: () => setPhase(5) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-col items-center justify-center pt-[8vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 5 ? 1 : 0, scale: phase === 5 ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[60vw] h-[30vw] mb-[6vh] flex items-center justify-center">
        
        {/* Verification Terminal / Box */}
        <motion.div
          className="absolute z-10 w-[32vw] h-[24vw] bg-white rounded-2xl shadow-xl border border-bg-muted flex flex-col overflow-hidden"
          initial={{ x: '10vw', opacity: 0 }}
          animate={{ x: 0, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
        >
          <div className="h-[4vw] bg-primary flex items-center px-[2vw] gap-[1vw]">
            <div className="w-[1vw] h-[1vw] rounded-full bg-accent/80" />
            <div className="text-white font-display text-[1.2vw]">Public Verification</div>
          </div>
          
          <div className="flex-grow relative flex flex-col items-center justify-center p-[2vw]">
            
            {/* The Document that slides in */}
            <motion.div
              className="absolute z-0 w-[18vw] h-[12vw] bg-[#E2E8F0] rounded-xl border border-white/50 flex flex-col justify-between p-[1vw] shadow-md"
              initial={{ x: '-40vw', y: '2vw', opacity: 0, rotate: -15 }}
              animate={
                phase >= 2 
                  ? { x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.9 }
                  : phase >= 1
                  ? { x: '-20vw', y: '2vw', opacity: 1, rotate: -15 }
                  : { x: '-40vw', y: '2vw', opacity: 0, rotate: -15 }
              }
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
            >
              <div className="w-[4vw] h-[4vw] bg-accent/20 rounded-full flex items-center justify-center ml-auto">
                <div className="w-[2vw] h-[2vw] bg-accent rounded-full" />
              </div>
            </motion.div>

            {/* Scanning Light */}
            <motion.div
              className="absolute left-0 w-full h-[0.5vw] bg-accent/50 shadow-[0_0_2vw_var(--color-accent)] z-20 pointer-events-none"
              initial={{ top: '20%', opacity: 0 }}
              animate={
                phase >= 2 && phase < 3 
                  ? { top: ['20%', '80%', '20%'], opacity: [0, 1, 1, 0] }
                  : { opacity: 0 }
              }
              transition={{ duration: 1, ease: "linear" }}
            />

            {/* Match Result Overlay */}
            <motion.div
              className="absolute bottom-[2vw] left-0 w-full flex flex-col items-center gap-[1vw] z-30"
              initial={{ y: '2vw', opacity: 0 }}
              animate={{ y: phase >= 3 ? 0 : '2vw', opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-success/10 border border-success/20 px-[2vw] py-[0.8vw] rounded-full flex items-center gap-[1vw] backdrop-blur-md">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" className="w-[1.5vw] h-[1.5vw]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-success font-display font-bold text-[1.2vw]">Verified Match</span>
              </div>
              
              <div className="bg-black/80 px-[1.5vw] py-[0.5vw] rounded font-mono text-accent text-[1vw] shadow-lg">
                0x8f3c...9a12b4e7
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="text-center z-20">
        <div className="overflow-hidden mb-[1vh]">
          <motion.h2
            className="text-[3.5vw] font-display font-semibold text-primary leading-tight"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Publicly verifiable
          </motion.h2>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className="text-[1.8vw] font-body text-text-secondary"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Prove status without revealing contents.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
