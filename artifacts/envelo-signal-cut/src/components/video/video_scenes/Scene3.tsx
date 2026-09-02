import { motion } from 'framer-motion';
import { SafeFrame, VideoText, MediaFrame } from '@/lib/video';
import { useEffect, useState } from 'react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 120, damping: 25 };

export default function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Anchor visual starts
      setTimeout(() => setPhase(3), 4500), // Verification text
      setTimeout(() => setPhase(4), 8500), // Exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-[#111] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '-10vh' }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

      {/* Abstract Arc network visual */}
      <motion.div
        className="absolute w-[80vw] h-[80vw] border-[1px] border-[#333] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[60vw] h-[60vw] border-[1px] border-[#444] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[40vw] h-[40vw] border-[2px] border-accent/20 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
      >
        <div className="w-[15vw] h-[15vw] bg-accent/10 rounded-full blur-[4vw]"></div>
      </motion.div>

      <SafeFrame className="flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={SPRING_SNAPPY}
        >
          <VideoText
            as="h2"
            size="3xl"
            className="font-display font-semibold text-white tracking-tight uppercase"
          >
            ANCHORED ON
            <br />
            <span className="text-accent">ARC TESTNET</span>
          </VideoText>
        </motion.div>

        {/* SHA-256 Hash Visual */}
        <motion.div
          className="mt-[6vh] bg-black/60 border border-[#333] rounded-lg p-[1.5vw] backdrop-blur-md overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={
            phase >= 2
              ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
              : { opacity: 0, scale: 0.9, filter: 'blur(10px)' }
          }
          transition={SPRING_SMOOTH}
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent"></div>
          <VideoText size="sm" className="font-mono text-[#888] mb-[1vh] uppercase tracking-widest text-left">
            SHA-256 Proof Anchor
          </VideoText>
          <div className="flex items-center gap-[2vw]">
            <motion.div
              className="text-accent font-mono text-[1.5vw]"
              animate={phase >= 3 ? { color: '#ffffff' } : { color: '#9EA2A3' }}
            >
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="w-[3vw] h-[3vw] bg-white rounded-full flex items-center justify-center"
            >
              <svg className="w-[1.5vw] h-[1.5vw] text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="mt-[4vh]"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <VideoText size="lg" className="text-[#aaa] font-body">
            Verifiable truth, zero exposed data.
          </VideoText>
        </motion.div>

      </SafeFrame>
    </motion.div>
  );
}
