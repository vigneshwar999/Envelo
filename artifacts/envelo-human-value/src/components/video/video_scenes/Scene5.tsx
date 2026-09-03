import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 2500);
    const t3 = setTimeout(() => setPhase(3), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg overflow-hidden"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex flex-col items-center gap-[6vw] z-20">
        
        {/* Brand Lockup */}
        <motion.div 
          className="flex flex-col items-center gap-[2vw]"
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-[6vw] h-[6vw]" />
          <span className="font-sans font-semibold text-[4vw] tracking-[0.1em] text-silver-glow">Envelo</span>
        </motion.div>

        {/* Tagline */}
        <div className="text-center flex flex-col gap-[1.5vw] h-[16vw]">
          <div className="overflow-hidden">
            <motion.h2 
              className="font-display text-[7vw] leading-none text-silver"
              initial={{ opacity: 0, y: "100%", filter: 'blur(10px)' }}
              animate={phase >= 1 ? { opacity: 1, y: "0%", filter: 'blur(0px)' } : { opacity: 0, y: "100%", filter: 'blur(10px)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Private paperwork.
            </motion.h2>
          </div>
          <div className="overflow-hidden">
            <motion.h2 
              className="font-display text-[7vw] leading-none text-silver-dark italic"
              initial={{ opacity: 0, y: "100%", filter: 'blur(10px)' }}
              animate={phase >= 2 ? { opacity: 1, y: "0%", filter: 'blur(0px)' } : { opacity: 0, y: "100%", filter: 'blur(10px)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Public proof.
            </motion.h2>
          </div>
        </div>

        {/* CTA / URL */}
        <motion.p
          className="font-mono text-[1.4vw] text-silver-dark/60 tracking-[0.3em] uppercase absolute bottom-[10vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          envelo.online
        </motion.p>
      </div>
      
      {/* Background flare - subtle red to tie it all together */}
      <motion.div
        className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[100vw] h-[50vw] rounded-[100%] bg-primary/10 blur-[120px] pointer-events-none mix-blend-screen"
        initial={{ opacity: 0, y: 50 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />
    </motion.div>
  );
}
