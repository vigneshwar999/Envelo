import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene4Share() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Share modal pops up
    { time: 1500, callback: () => setPhase(2) }, // Select role / link created
    { time: 3000, callback: () => setPhase(3) }, // Timer ticks down
    { time: 4000, callback: () => setPhase(4) }, // Text
    { time: 9200, callback: () => setPhase(5) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-row items-center justify-center gap-[6vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 5 ? 1 : 0, filter: phase === 5 ? 'blur(10px)' : 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[35vw] h-[35vw] flex flex-col items-center justify-center">
        
        {/* Background UI (Invoice blurry in back) */}
        <motion.div
          className="absolute w-[26vw] h-[32vw] bg-white rounded-xl shadow-sm border border-bg-muted p-[2vw] flex flex-col blur-sm opacity-60"
        >
          <div className="w-[8vw] h-[1.5vw] bg-primary/20 rounded mb-[2vh]" />
          <div className="flex flex-col gap-[1vw] flex-grow">
            <div className="w-full h-[1vw] bg-bg-muted rounded" />
            <div className="w-3/4 h-[1vw] bg-bg-muted rounded" />
          </div>
        </motion.div>

        {/* Share Modal */}
        <motion.div
          className="z-10 w-[30vw] bg-white rounded-2xl shadow-2xl border border-primary/10 overflow-hidden flex flex-col"
          initial={{ y: '20vh', opacity: 0, scale: 0.9 }}
          animate={{ y: phase >= 1 ? 0 : '20vh', opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.9 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
        >
          <div className="p-[1.5vw] border-b border-bg-muted bg-bg-light/50 flex justify-between items-center">
            <div className="font-display font-medium text-primary text-[1.2vw]">Share Access</div>
            <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-bg-muted" />
          </div>
          
          <div className="p-[2vw] flex flex-col gap-[1.5vw]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[3vw] h-[3vw] rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[1.5vw] h-[1.5vw]">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="text-[1.2vw] font-display text-primary">Accountant</div>
                <div className="text-[1vw] font-body text-text-secondary">View-only, expires automatically</div>
              </div>
            </div>

            <motion.div
              className="w-full h-[4vw] bg-bg-muted/50 rounded-lg border border-bg-muted flex items-center justify-between px-[1vw]"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, height: phase >= 2 ? '4vw' : 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="font-mono text-text-secondary text-[0.9vw]">arc.link/grant/a7x...</div>
              <div className="bg-white border border-bg-muted px-[1vw] py-[0.5vw] rounded text-[0.9vw] font-display shadow-sm">Copy</div>
            </motion.div>
          </div>

          <motion.div
            className="bg-accent/10 p-[1.5vw] flex items-center justify-between"
            initial={{ opacity: 0, backgroundColor: 'transparent' }}
            animate={{ opacity: phase >= 3 ? 1 : 0, backgroundColor: phase >= 3 ? 'var(--color-accent)' : 'transparent' }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-[0.8vw]">
              <motion.svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={phase >= 3 ? 'white' : 'currentColor'} 
                strokeWidth="2" 
                className="w-[1.5vw] h-[1.5vw]"
                animate={{ rotate: phase >= 3 ? 360 : 0 }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </motion.svg>
              <div className={`text-[1vw] font-display ${phase >= 3 ? 'text-white' : 'text-accent'}`}>
                {phase >= 3 ? 'Access expires in 7 days' : 'Setting expiration...'}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-col items-start w-[35vw]">
        <div className="overflow-hidden mb-[1vh]">
          <motion.h2
            className="text-[3.5vw] font-display font-semibold text-primary leading-tight"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Time-limited Access
          </motion.h2>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className="text-[1.8vw] font-body text-text-secondary"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Auto-expiring accountant grants.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
