import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene3Pay() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Wallet appears
    { time: 1500, callback: () => setPhase(2) }, // USDC floats across
    { time: 3000, callback: () => setPhase(3) }, // PAID stamp
    { time: 4000, callback: () => setPhase(4) }, // Text
    { time: 9200, callback: () => setPhase(5) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-col items-center justify-center pt-[5vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 5 ? 1 : 0, y: phase === 5 ? -50 : 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-row items-center justify-center gap-[8vw] w-full max-w-[80vw] mb-[8vh]">
        
        {/* Payer Wallet */}
        <motion.div
          className="w-[20vw] h-[25vw] bg-bg-dark rounded-2xl shadow-xl border border-bg-muted flex flex-col items-center p-[2vw] relative"
          initial={{ x: '-20vw', opacity: 0, rotate: -10 }}
          animate={{ x: phase >= 1 ? 0 : '-20vw', opacity: phase >= 1 ? 1 : 0, rotate: phase >= 1 ? -5 : -10 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          <div className="w-full flex justify-between items-center mb-[2vh]">
            <div className="w-[8vw] h-[1.5vw] bg-primary/20 rounded" />
            <div className="w-[3vw] h-[3vw] bg-primary/10 rounded-full" />
          </div>
          <div className="text-[3vw] font-mono font-medium text-text-primary mb-[1vh]">
            $1,250<span className="text-[1.5vw] text-text-muted">.00</span>
          </div>
          <div className="text-[1.2vw] font-display text-text-muted mb-[4vh]">USDC Balance</div>
          
          <div className="w-full h-[3vw] bg-primary rounded-lg flex items-center justify-center text-white text-[1.2vw] font-display">
            Send Payment
          </div>

          {/* USDC Coin that flies out */}
          <motion.div
            className="absolute top-[60%] left-1/2 w-[4vw] h-[4vw] bg-primary rounded-full flex items-center justify-center shadow-lg border-[0.2vw] border-primary/50 z-30 text-white font-display font-bold text-[1.5vw]"
            initial={{ scale: 0, x: '-50%', y: '-50%' }}
            animate={
              phase >= 2 && phase < 3 
                ? { scale: 1, x: '12vw', y: '-2vw', rotate: 360 } 
                : phase >= 3 
                ? { scale: 0, x: '20vw', y: '-2vw', opacity: 0 }
                : { scale: 0, x: '-50%', y: '-50%' }
            }
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            $
          </motion.div>
        </motion.div>

        {/* Invoice */}
        <motion.div
          className="w-[24vw] h-[32vw] bg-bg-dark rounded-xl shadow-2xl border border-bg-muted p-[2vw] relative overflow-hidden flex flex-col"
          initial={{ x: '20vw', opacity: 0, rotate: 10 }}
          animate={{ x: phase >= 1 ? 0 : '20vw', opacity: phase >= 1 ? 1 : 0, rotate: phase >= 1 ? 5 : 10 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.2 }}
        >
          <div className="w-[8vw] h-[1.5vw] bg-text-secondary/20 rounded mb-[2vh]" />
          <div className="flex flex-col gap-[1vw] flex-grow">
            <div className="w-full h-[1vw] bg-bg-muted rounded" />
            <div className="w-3/4 h-[1vw] bg-bg-muted rounded" />
            <div className="w-5/6 h-[1vw] bg-bg-muted rounded" />
          </div>
          <div className="mt-auto flex justify-between border-t border-bg-muted pt-[1vw]">
            <div className="w-[4vw] h-[1.5vw] bg-text-secondary/20 rounded" />
            <div className="w-[6vw] h-[2vw] bg-primary/80 rounded" />
          </div>

          {/* PAID Stamp */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            initial={{ scale: 5, opacity: 0 }}
            animate={{
              scale: phase >= 3 ? 1 : 5,
              opacity: phase >= 3 ? 1 : 0,
            }}
            transition={{ duration: 0.4, type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className="border-[0.5vw] border-success text-success font-display font-bold text-[5vw] px-[2vw] py-[1vw] rounded-xl transform -rotate-15 shadow-sm">
              PAID
            </div>
          </motion.div>
          
          {/* Green flash overlay */}
          <motion.div
            className="absolute inset-0 bg-success/10 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 3 ? [0, 1, 0] : 0 }}
            transition={{ duration: 1 }}
          />
        </motion.div>

      </div>

      <div className="text-center">
        <div className="overflow-hidden mb-[1vh]">
          <motion.h2
            className="text-[4vw] font-display font-semibold text-text-primary leading-tight"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Instant USDC Settlement
          </motion.h2>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className="text-[1.8vw] font-body text-text-secondary"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 4 ? '0%' : '100%' }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Invoice flips to paid onchain.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
