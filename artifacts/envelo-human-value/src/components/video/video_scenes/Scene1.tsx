import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000); // "expose your business"
    const t2 = setTimeout(() => setPhase(2), 5000); // UI fragments shift
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Background Depth - Macro UI Fragments */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Fragment 1 */}
        <motion.div
          className="absolute top-[10%] left-[10%] p-6 border border-white/5 bg-white/[0.02] rounded-lg glow-box"
          initial={{ filter: 'blur(30px)', opacity: 0, scale: 1.2, x: -50 }}
          animate={{ 
            filter: phase >= 2 ? 'blur(10px)' : 'blur(25px)', 
            opacity: phase >= 2 ? 0.3 : 0.6, 
            scale: 1, 
            x: 0 
          }}
          transition={{ duration: 4, ease: "easeOut" }}
        >
          <div className="font-mono text-silver-dark/40 text-[1vw] mb-2 uppercase tracking-widest">Client</div>
          <div className="font-sans font-medium text-silver text-[2vw]">Acme Corp</div>
        </motion.div>

        {/* Fragment 2 */}
        <motion.div
          className="absolute bottom-[20%] right-[15%] p-6 border border-white/5 bg-white/[0.02] rounded-lg glow-box"
          initial={{ filter: 'blur(40px)', opacity: 0, scale: 1.3, y: 50 }}
          animate={{ 
            filter: phase >= 2 ? 'blur(5px)' : 'blur(20px)', 
            opacity: phase >= 2 ? 0.4 : 0.2, 
            scale: 1.05, 
            y: 0 
          }}
          transition={{ duration: 5, delay: 0.5, ease: "easeOut" }}
        >
          <div className="font-mono text-silver-dark/40 text-[1vw] mb-2 uppercase tracking-widest">Amount</div>
          <div className="font-mono font-medium text-silver text-[2.5vw]">$125,000.00</div>
        </motion.div>
        
        {/* Fragment 3 */}
        <motion.div
          className="absolute top-[40%] right-[30%] p-4 border border-white/5 bg-white/[0.02] rounded-lg glow-box"
          initial={{ filter: 'blur(15px)', opacity: 0, scale: 0.9, x: 20 }}
          animate={{ 
            filter: 'blur(35px)', 
            opacity: 0.5, 
            scale: 1, 
            x: 0 
          }}
          transition={{ duration: 6, delay: 1, ease: "easeOut" }}
        >
          <div className="font-mono text-silver-dark/40 text-[0.8vw] mb-2 uppercase tracking-widest">Services</div>
          <div className="font-sans font-medium text-silver text-[1.5vw]">Q3 Strategy</div>
        </motion.div>
      </div>

      {/* Foreground Typography */}
      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.h1 
          className="font-display text-[7vw] leading-[1.1] text-silver-glow tracking-tight"
          initial={{ opacity: 0, filter: 'blur(20px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        >
          Public chains
        </motion.h1>

        <div className="h-[7vw] overflow-hidden mt-2">
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={phase >= 1 ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display italic text-[6.5vw] leading-[1.1] text-silver-dark tracking-tight">
              expose <span className="not-italic text-silver-glow">your business.</span>
            </h1>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
