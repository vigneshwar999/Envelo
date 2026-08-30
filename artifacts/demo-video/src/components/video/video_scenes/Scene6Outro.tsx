import { motion } from 'framer-motion';
import { useState } from 'react';

import { useSceneTimer } from '@/lib/video';

export function Scene6Outro() {
  const [phase, setPhase] = useState(0);

  // Pause-aware phase schedule -- freezes and resumes with the player.
  // Exit stays at 8500: the 1.5s fade completes exactly at the 10s cut,
  // ending the video on a finished fade-out.
  useSceneTimer([
    { time: 500, callback: () => setPhase(1) }, // Image fade in
    { time: 1500, callback: () => setPhase(2) }, // Text reveal
    { time: 8500, callback: () => setPhase(3) }, // Exit
  ]);

  return (
    <motion.div
      className="scene-container flex flex-col items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase < 3 ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      {/* Background Image */}
      <motion.div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/envelope-seal.jpg)` }}
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ 
          scale: phase >= 1 ? 1 : 1.1,
          opacity: phase >= 1 ? 0.3 : 0 
        }}
        transition={{ duration: 3, ease: "easeOut" }}
      />
      
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-light via-bg-light/80 to-transparent z-10" />

      {/* Content */}
      <div className="z-20 flex flex-col items-center text-center mt-[10vh]">
        <div className="overflow-hidden mb-[2vh]">
          <motion.h1
            className="text-[6vw] font-display font-bold text-primary tracking-tight"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 2 ? '0%' : '100%' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Envelo
          </motion.h1>
        </div>
        
        <div className="overflow-hidden">
          <motion.div
            className="text-[1.8vw] font-body text-text-secondary flex items-center gap-[1vw]"
            initial={{ y: '100%' }}
            animate={{ y: phase >= 2 ? '0%' : '100%' }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>Powered by</span>
            <span className="font-display font-semibold text-primary">Arc</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
