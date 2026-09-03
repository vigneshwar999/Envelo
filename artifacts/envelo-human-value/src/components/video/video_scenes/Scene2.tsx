import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200); // Pricing.
    const t2 = setTimeout(() => setPhase(2), 2400); // Terms.
    const t3 = setTimeout(() => setPhase(3), 4000); // Keep them private.
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-bg"
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -100, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex flex-col items-center gap-[6vw] z-20 w-full px-[10vw]">
        
        {/* Three core values staggering in, elegant serif */}
        <div className="flex justify-between w-full font-display text-[5vw] text-silver-dark italic">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Clients.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={phase >= 1 ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: 20 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Pricing.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: 20 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Terms.
          </motion.div>
        </div>

        {/* Main message */}
        <div className="h-[9vw] overflow-hidden">
          <motion.h2 
            className="font-display text-[8vw] leading-none text-silver-glow text-center"
            initial={{ opacity: 0, y: "100%", filter: 'blur(10px)' }}
            animate={phase >= 3 ? { opacity: 1, y: "0%", filter: 'blur(0px)' } : { opacity: 0, y: "100%", filter: 'blur(10px)' }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Keep them <span className="text-primary italic tracking-tight glow-box" style={{ textShadow: '0 0 30px rgba(238,28,37,0.4)' }}>private.</span>
          </motion.h2>
        </div>
      </div>
      
      {/* Background flare - subtle red */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none mix-blend-screen"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />
    </motion.div>
  );
}
