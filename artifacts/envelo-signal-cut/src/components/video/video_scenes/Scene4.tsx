import { motion } from 'framer-motion';
import { SafeFrame, VideoText } from '@/lib/video';
import { useEffect, useState } from 'react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 120, damping: 25 };

export default function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Logo and pill
      setTimeout(() => setPhase(2), 1200), // Main tagline
      setTimeout(() => setPhase(3), 2000), // Sub tagline
      setTimeout(() => setPhase(4), 3000), // Settles
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-[#050505] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      
      {/* Subtle pulse behind the text */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[8vw]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      ></motion.div>

      <SafeFrame className="flex flex-col items-center justify-center text-center">
        
        {/* Top Header (Logo + Pill) */}
        <motion.div
          className="flex items-center gap-[1.5vw] mb-[6vh]"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={SPRING_SNAPPY}
        >
          <div className="flex items-center gap-[1vw]">
            <img 
              src={`${import.meta.env.BASE_URL}logo.svg`} 
              alt="Envelo" 
              className="w-[3vw] h-[3vw]" 
            />
            <VideoText size="xl" className="font-display font-semibold text-white tracking-tight">
              Envelo
            </VideoText>
          </div>
          
          <div className="px-[1vw] py-[0.5vh] border border-[#333] rounded-full flex items-center gap-[0.5vw]">
            <div className="w-[0.5vw] h-[0.5vw] bg-accent rounded-full"></div>
            <VideoText size="xs" className="font-mono text-[#aaa] uppercase tracking-wider">
              ARC TESTNET
            </VideoText>
          </div>
        </motion.div>

        {/* Main Tagline */}
        <div className="flex flex-col items-center gap-[1vh]">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
            transition={SPRING_SMOOTH}
          >
            <VideoText
              as="h1"
              size="4xl"
              className="font-display font-medium text-white tracking-tight"
            >
              Private paperwork.
            </VideoText>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
          >
            <VideoText
              as="h1"
              size="4xl"
              className="font-display font-light text-[#888] tracking-tight"
            >
              Public proof.
            </VideoText>
          </motion.div>
        </div>

        {/* Sub Tagline */}
        <motion.div
          className="mt-[8vh] flex items-center gap-[1vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <VideoText size="base" className="font-body text-[#888]">
            Live on Arc Testnet
          </VideoText>
          <div className="w-[4px] h-[4px] bg-[#444] rounded-full"></div>
          <VideoText size="base" className="font-body text-white font-medium">
            envelo.online
          </VideoText>
        </motion.div>

      </SafeFrame>
    </motion.div>
  );
}
