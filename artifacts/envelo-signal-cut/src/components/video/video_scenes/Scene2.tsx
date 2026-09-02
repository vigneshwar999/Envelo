import { motion } from 'framer-motion';
import { SafeFrame, VideoText, MediaFrame } from '@/lib/video';
import { useEffect, useState } from 'react';

const SPRING_SMOOTH = { type: 'spring', stiffness: 120, damping: 25 };
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30 };

export default function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500), // Show how it works snippet
      setTimeout(() => setPhase(3), 5000), // Shift focus
      setTimeout(() => setPhase(4), 10500), // Exit prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-[#050505] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

      {/* Persisting UI bg from landing */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ scale: 1.2, y: '5vh' }}
        animate={
          phase === 0
            ? { scale: 1.2, y: '5vh' }
            : phase < 3
            ? { scale: 1, y: 0 }
            : { scale: 1.1, y: '-5vh', opacity: 0.1 }
        }
        transition={{ duration: 4, ease: 'easeOut' }}
      >
        <MediaFrame fit="cover" position="center">
          <img src={`${import.meta.env.BASE_URL}landing.jpg`} alt="Envelo Landing" />
        </MediaFrame>
      </motion.div>

      <SafeFrame className="flex items-center justify-start pl-[8vw]">
        <div className="flex flex-col gap-[4vh] max-w-[45vw] z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={SPRING_SNAPPY}
          >
            <VideoText
              as="h2"
              size="2xl"
              className="font-display font-semibold text-white leading-[1.1] tracking-tight"
            >
              ENVELO KEEPS IT
              <br />
              <span className="text-accent">STRICTLY PRIVATE.</span>
            </VideoText>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={SPRING_SNAPPY}
            className="bg-[#111] border border-[#222] p-[2vw] rounded-xl shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-[1vw] mb-[2vh]">
              <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-accent flex items-center justify-center">
                <svg className="w-[0.8vw] h-[0.8vw] text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <VideoText size="base" className="font-mono text-text-secondary uppercase tracking-widest">
                AES-256-GCM
              </VideoText>
            </div>
            <VideoText size="lg" className="text-white opacity-90 leading-relaxed font-body">
              Encrypts sensitive details <strong>in your browser</strong> before anything is sent.
            </VideoText>
          </motion.div>
        </div>

        {/* Floating UI Image from How it Works */}
        <motion.div
          className="absolute right-[5vw] top-[20vh] w-[35vw] h-[60vh] rounded-2xl overflow-hidden border border-[#222] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          initial={{ opacity: 0, x: 50, rotateY: -15, scale: 0.9 }}
          animate={
            phase >= 2
              ? { opacity: 1, x: 0, rotateY: -5, scale: 1 }
              : { opacity: 0, x: 50, rotateY: -15, scale: 0.9 }
          }
          transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
          style={{ perspective: 1000 }}
        >
          <MediaFrame fit="cover" position="top">
            <img src={`${import.meta.env.BASE_URL}how-it-works.jpg`} alt="How it works" />
          </MediaFrame>
        </motion.div>

      </SafeFrame>
    </motion.div>
  );
}
