import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene2Anchor() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Stamp comes down
    { time: 1500, callback: () => setPhase(2) }, // Hash generated
    { time: 3000, callback: () => setPhase(3) }, // Arc connection
    { time: 4000, callback: () => setPhase(4) }, // Text
    { time: 9200, callback: () => setPhase(5) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-row items-center justify-center gap-[5vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 5 ? 1 : 0, scale: phase === 5 ? 1.1 : 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center justify-center relative w-[30vw] h-[30vw]">
        {/* Envelope Base (smaller) */}
        <motion.div
          className="absolute w-[24vw] h-[16vw] bg-[#E2E8F0] rounded-xl shadow-xl border border-white/50 z-10 overflow-hidden"
        >
          {/* Flap */}
          <div
            className="absolute top-0 left-0 w-full h-[12vw] bg-[#CBD5E1] origin-top border-b border-white/30"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          />
        </motion.div>

        {/* Wax Stamp */}
        <motion.div
          className="absolute z-20"
          initial={{ scale: 3, opacity: 0, rotate: -45 }}
          animate={{
            scale: phase >= 1 ? 1 : 3,
            opacity: phase >= 1 ? 1 : 0,
            rotate: phase >= 1 ? 0 : -45,
          }}
          transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 15 }}
        >
          <div className="w-[8vw] h-[8vw] bg-accent rounded-full flex items-center justify-center shadow-2xl border-[0.2vw] border-accent/50 text-white font-mono font-bold text-[2vw] transform -rotate-12">
            SEAL
          </div>
        </motion.div>
      </div>

      {/* Connecting line */}
      <div className="relative w-[15vw] h-[0.4vw] overflow-hidden flex items-center">
        <motion.div
          className="h-[0.2vw] w-full bg-primary/20 absolute"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase >= 2 ? 1 : 0 }}
          style={{ originX: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        {/* Data flow particle */}
        <motion.div
          className="w-[1vw] h-[1vw] bg-accent rounded-full absolute"
          initial={{ x: '-2vw', opacity: 0 }}
          animate={phase >= 2 ? {
            x: ['-2vw', '15vw'],
            opacity: [0, 1, 0]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Blockchain Node & Hash */}
      <div className="flex flex-col items-start gap-[2vh] w-[35vw]">
        <motion.div
          className="bg-primary text-white p-[2vw] rounded-2xl shadow-2xl border border-primary/50 relative overflow-hidden"
          initial={{ x: '10vw', opacity: 0 }}
          animate={{ x: phase >= 3 ? 0 : '10vw', opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
        >
          <div className="absolute top-0 right-0 w-[10vw] h-[10vw] bg-accent/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="text-[1.5vw] font-display text-white/50 mb-[1vh]">Arc L1 Testnet</div>
          <div className="flex items-center gap-[1vw] mb-[2vh]">
            <div className="w-[1vw] h-[1vw] bg-accent rounded-full animate-pulse" />
            <div className="text-[2vw] font-display font-semibold">Anchored</div>
          </div>
          
          <motion.div
            className="font-mono text-[1.2vw] bg-black/40 p-[1vw] rounded-lg text-accent break-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
            transition={{ delay: 0.3 }}
          >
            0x8f3c...9a12b4e7
          </motion.div>
        </motion.div>

        <div className="mt-[2vh]">
          <div className="overflow-hidden mb-[1vh]">
            <motion.h2
              className="text-[3vw] font-display font-semibold text-primary leading-tight"
              initial={{ y: '100%' }}
              animate={{ y: phase >= 4 ? '0%' : '100%' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Fingerprint Only
            </motion.h2>
          </div>
          <div className="overflow-hidden">
            <motion.p
              className="text-[1.5vw] font-body text-text-secondary"
              initial={{ y: '100%' }}
              animate={{ y: phase >= 4 ? '0%' : '100%' }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              Never the invoice contents.
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
