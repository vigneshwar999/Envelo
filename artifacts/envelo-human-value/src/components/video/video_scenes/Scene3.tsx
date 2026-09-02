import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene3() {
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSealed(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 1 }}
    >
      <div 
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw'
        }}
      />

      {/* Brand Logo at top */}
      <motion.div 
        className="absolute top-[5vw] flex items-center gap-3 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-[2.5vw] h-[2.5vw]" />
        <span className="font-sans font-semibold text-[1.8vw] tracking-wide text-white">Envelo</span>
      </motion.div>

      {/* Main Copy */}
      <div className="absolute top-[12vw] w-full text-center z-20">
        <motion.h2 
          className="font-serif text-[4vw] text-gray-200 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          Seals sensitive details<br/>in your browser.
        </motion.h2>
      </div>

      {/* Stylized UI Card */}
      <motion.div 
        className="mt-[15vw] w-[50vw] glass-panel rounded-3xl p-[3vw] flex flex-col gap-[2vw] relative overflow-hidden bg-[#121212]/90 border-gray-800 z-20 shadow-2xl"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 1.8, type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="flex justify-between items-center border-b border-white/10 pb-[1.5vw]">
          <span className="font-sans text-[1.2vw] text-gray-400 font-medium">Invoice #INV-2024</span>
          <motion.div 
            className="flex items-center justify-center w-[3vw] h-[3vw] rounded-full"
            animate={{ 
              backgroundColor: sealed ? "rgba(225, 29, 72, 1)" : "rgba(225, 29, 72, 0.15)",
              color: sealed ? "#fff" : "#E11D48"
            }}
            transition={{ duration: 0.5 }}
          >
            {sealed ? (
              <svg className="w-[1.5vw] h-[1.5vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            ) : (
              <svg className="w-[1.5vw] h-[1.5vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-[1.5vw]">
          <Field label="Client" value="Acme Corporation" delay={2.4} sealed={sealed} />
          <Field label="Amount" value="$125,000.00 USDC" delay={2.6} sealed={sealed} highlight />
          <Field label="Terms" value="Net 30 / 5% Late Fee" delay={2.8} sealed={sealed} />
        </div>

        {/* Lock Overlay effect */}
        <AnimatePresence>
          {sealed && (
            <motion.div 
              className="absolute inset-0 bg-[#0A0A0A]/70 backdrop-blur-md flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="font-sans text-red-500 font-medium text-[1.4vw] tracking-[0.2em] uppercase border border-red-500/30 px-[2.5vw] py-[1vw] rounded-full bg-red-500/10 shadow-[0_0_20px_rgba(225,29,72,0.2)]"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
              >
                AES-256-GCM Sealed
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
        className="font-sans text-[1.4vw] text-gray-500"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay }}
      >{label}</motion.span>
      
      <div className="relative overflow-hidden w-[25vw] flex justify-end">
        <motion.span 
          className={`font-sans text-[1.6vw] absolute right-0 ${highlight ? 'text-gray-100 font-medium' : 'text-gray-300'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ x: sealed ? "-100%" : "0%", opacity: sealed ? 0 : 1 }}
          transition={{ duration: sealed ? 0.4 : 0.8, delay: sealed ? 0 : delay }}
        >
          {value}
        </motion.span>
        <motion.span 
          className="font-sans text-[1.6vw] text-red-400 absolute right-0 tracking-widest font-mono"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: sealed ? "0%" : "100%", opacity: sealed ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {cipher.substring(0, value.length)}
        </motion.span>
        {/* Placeholder to keep layout stable */}
        <span className="font-sans text-[1.6vw] opacity-0 pointer-events-none">{value}</span>
      </div>
    </div>
  );
}
