import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene3() {
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSealed(true);
    }, 3500); // Trigger seal at 3.5s
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', y: -50 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Brand mark at top */}
      <motion.div 
        className="absolute top-[8vw] flex flex-col items-center gap-4 z-20"
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-[4vw] h-[4vw] opacity-80" />
      </motion.div>

      {/* Main Copy */}
      <div className="absolute top-[20vw] w-full text-center z-20">
        <motion.h2 
          className="font-display text-[6vw] text-silver-glow leading-tight"
          initial={{ opacity: 0, y: 30, filter: 'blur(15px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Seals sensitive details<br/>
          <span className="italic text-silver-dark text-[5.5vw]">in your browser.</span>
        </motion.h2>
      </div>

      {/* Stylized Data Encryption Fragment */}
      <motion.div 
        className="mt-[35vw] w-[60vw] relative z-20 border border-white/5 rounded-2xl p-[3vw] glow-box bg-bg-panel/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.5, delay: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col gap-[2vw]">
          <Field label="Client" value="Acme Corporation" delay={1.5} sealed={sealed} />
          <Field label="Amount" value="$125,000.00 USDC" delay={1.8} sealed={sealed} highlight />
          <Field label="Terms" value="Net 30 / 5% Late Fee" delay={2.1} sealed={sealed} />
        </div>

        {/* Lock Overlay effect */}
        <AnimatePresence>
          {sealed && (
            <motion.div 
              className="absolute inset-0 bg-bg/80 backdrop-blur-xl flex flex-col items-center justify-center z-10 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="font-mono text-primary text-[2vw] tracking-[0.3em] uppercase glow-box px-8 py-4 rounded-xl border border-primary/20"
                initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1, type: "spring", bounce: 0.4 }}
              >
                AES-256-GCM
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, sealed, delay, highlight = false }: { label: string, value: string, sealed: boolean, delay: number, highlight?: boolean }) {
  const cipher = "******************************";
  
  return (
    <div className="flex justify-between items-center overflow-hidden">
      <motion.span 
        className="font-mono uppercase tracking-widest text-[1vw] text-silver-dark/60"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay, ease: "easeOut" }}
      >
        {label}
      </motion.span>
      
      <div className="relative overflow-hidden w-[35vw] flex justify-end">
        <motion.span 
          className={`font-sans text-[2vw] absolute right-0 ${highlight ? 'text-silver-glow' : 'text-silver-dark'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ x: sealed ? "-100%" : "0%", opacity: sealed ? 0 : 1 }}
          transition={{ duration: sealed ? 0.6 : 1, delay: sealed ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
        >
          {value}
        </motion.span>
        <motion.span 
          className="font-mono text-[2vw] text-primary absolute right-0 tracking-widest opacity-0"
          animate={{ x: sealed ? "0%" : "100%", opacity: sealed ? 1 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {cipher.substring(0, value.length)}
        </motion.span>
        <span className="font-sans text-[2vw] opacity-0 pointer-events-none">{value}</span>
      </div>
    </div>
  );
}
