import { motion } from 'framer-motion';
import { SafeFrame, VideoText } from '@/lib/video';
import { useEffect, useState } from 'react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 120, damping: 25 };

export default function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Invoice appears
      setTimeout(() => setPhase(2), 2000), // Highlights turn red
      setTimeout(() => setPhase(3), 3500), // Message overrides
      setTimeout(() => setPhase(4), 7000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-bg-dark flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      {/* Background Noise & Grid */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw',
        }}
      ></div>

      <SafeFrame className="flex flex-col items-center justify-center">
        {/* Fake Invoice UI */}
        <motion.div
          className="absolute w-[60vw] h-[70vh] bg-[#111] border border-[#333] rounded-2xl p-[4vw] shadow-2xl flex flex-col"
          initial={{ y: '100vh', rotateX: 45, opacity: 0 }}
          animate={
            phase === 0
              ? { y: '100vh', rotateX: 45, opacity: 0 }
              : phase < 3
              ? { y: '5vh', rotateX: 0, opacity: 1 }
              : { y: '-10vh', scale: 0.9, opacity: 0.2, filter: 'blur(8px)' }
          }
          transition={SPRING_SNAPPY}
          style={{ perspective: 1000 }}
        >
          <div className="flex justify-between items-start mb-[4vh]">
            <div className="w-[15vw] h-[4vh] bg-[#222] rounded-md"></div>
            <div className="w-[10vw] h-[4vh] bg-[#222] rounded-md"></div>
          </div>
          
          <div className="space-y-[3vh]">
            <div className="flex justify-between border-b border-[#333] pb-[2vh]">
              <span className="text-[#666] font-mono text-[1.5vw]">Client</span>
              <motion.span 
                className="font-mono text-[1.5vw] text-white"
                animate={phase >= 2 ? { color: '#ef4444', scale: 1.05 } : { color: '#ffffff' }}
              >
                ACME CORP
              </motion.span>
            </div>
            <div className="flex justify-between border-b border-[#333] pb-[2vh]">
              <span className="text-[#666] font-mono text-[1.5vw]">Services</span>
              <motion.span 
                className="font-mono text-[1.5vw] text-white"
                animate={phase >= 2 ? { color: '#ef4444', scale: 1.05 } : { color: '#ffffff' }}
              >
                M&A ADVISORY
              </motion.span>
            </div>
            <div className="flex justify-between border-b border-[#333] pb-[2vh]">
              <span className="text-[#666] font-mono text-[1.5vw]">Amount</span>
              <motion.span 
                className="font-mono text-[2vw] font-bold text-white"
                animate={phase >= 2 ? { color: '#ef4444', scale: 1.1 } : { color: '#ffffff' }}
              >
                $2,500,000.00
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              phase >= 3
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.8 }
            }
            transition={SPRING_SNAPPY}
            className="text-center"
          >
            <VideoText
              as="h1"
              size="4xl"
              className="font-display font-bold tracking-tighter uppercase text-white leading-none drop-shadow-2xl"
              style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
            >
              NORMAL PUBLIC-CHAIN
              <br />
              INVOICING <span className="text-error">EXPOSES EVERYTHING</span>
            </VideoText>
          </motion.div>
        </div>
      </SafeFrame>
    </motion.div>
  );
}
