import { motion } from 'framer-motion';

export default function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white overflow-hidden bg-bg"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute top-[15vw] w-full text-center z-30">
        <motion.h2 
          className="font-display text-[6vw] text-silver-glow leading-tight"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Leaving only verifiable<br/>
          <span className="italic text-[6vw] text-silver-dark">proof on Arc.</span>
        </motion.h2>
      </div>

      {/* Proof visualization - Macro style */}
      <div className="mt-[20vw] relative w-[80vw] h-[25vw] flex items-center justify-center z-20">
        
        {/* Left side: The Hash - Large, out of focus to in focus */}
        <motion.div
          className="absolute left-[5vw] glow-box bg-bg-panel/40 border border-white/5 p-[3vw] rounded-2xl flex flex-col gap-4 shadow-2xl z-10 backdrop-blur-xl"
          initial={{ opacity: 0, x: -60, filter: 'blur(30px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="w-[1vw] h-[1vw] rounded-full bg-primary/20 flex items-center justify-center">
               <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
             </div>
             <span className="font-mono text-[1.2vw] text-primary uppercase tracking-[0.2em] font-semibold">Sealed Proof</span>
          </div>
          <span className="font-mono text-[1.6vw] text-silver font-medium tracking-tight">
            e3b0c44298fc1c149afb...
          </span>
        </motion.div>

        {/* Connection line - Glowing silver/red */}
        <motion.div 
          className="absolute left-[38vw] w-[14vw] h-[1px] bg-gradient-to-r from-primary/0 via-primary/60 to-silver/0 z-0"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.2, ease: "easeOut" }}
          style={{ originX: 0 }}
        >
          {/* Moving particle */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-[4px] h-[4px] bg-white rounded-full shadow-[0_0_20px_4px_rgba(238,28,37,0.8)]"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 0] }}
            transition={{ duration: 2, delay: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Right side: Arc Testnet */}
        <motion.div
          className="absolute right-[5vw] glow-box bg-bg-panel/40 border border-white/5 p-[3vw] rounded-2xl flex flex-col gap-4 items-center shadow-2xl z-10 backdrop-blur-xl"
          initial={{ opacity: 0, x: 60, filter: 'blur(30px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.8, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            className="w-[4vw] h-[4vw] rounded-full border-[1px] border-silver-dark/40 flex items-center justify-center bg-bg"
            animate={{ borderColor: ["rgba(158,162,163,0.4)", "rgba(226,225,225,0.8)", "rgba(158,162,163,0.4)"], boxShadow: ["0 0 0px rgba(226,225,225,0)", "0 0 30px rgba(226,225,225,0.3)", "0 0 0px rgba(226,225,225,0)"] }}
            transition={{ duration: 3, delay: 3, repeat: Infinity }}
          >
             <div className="w-[1.5vw] h-[1.5vw] bg-silver-light rounded-full" />
          </motion.div>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="font-sans text-[1.4vw] text-silver-light font-medium tracking-wide">Arc Testnet</span>
            <span className="font-mono text-[1vw] text-silver-dark tracking-widest uppercase">Anchored</span>
          </div>
        </motion.div>

      </div>
      
    </motion.div>
  );
}
