import { motion } from 'framer-motion';

export default function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white overflow-hidden"
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

      <div className="absolute top-[12vw] w-full text-center z-20">
        <motion.h2 
          className="font-serif text-[4vw] text-gray-200 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Leaving only verifiable<br/>proof on Arc.
        </motion.h2>
      </div>

      {/* Proof visualization */}
      <div className="mt-[15vw] relative w-[70vw] h-[20vw] flex items-center justify-center z-20">
        
        {/* Left side: The Hash */}
        <motion.div
          className="absolute left-[2vw] glass-panel bg-[#121212]/90 border border-white/10 p-[2.5vw] rounded-2xl flex flex-col gap-3 shadow-2xl z-10"
          initial={{ opacity: 0, x: -60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 1.5, type: "spring", stiffness: 80, damping: 20 }}
        >
          <div className="flex items-center gap-3">
             <div className="w-[2vw] h-[2vw] rounded-full bg-red-500/20 flex items-center justify-center">
               <div className="w-[1vw] h-[1vw] rounded-full bg-red-500" />
             </div>
             <span className="font-sans text-[1.1vw] text-red-400 uppercase tracking-[0.15em] font-semibold">Sealed Proof</span>
          </div>
          <span className="font-sans text-[1.3vw] text-gray-300 font-mono tracking-tight mt-2 border-t border-white/10 pt-3">
            e3b0c44298fc1c149afb...
          </span>
        </motion.div>

        {/* Connection line */}
        <motion.div 
          className="absolute left-[30vw] w-[18vw] h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/50 to-gray-400/0 z-0"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.5 }}
          style={{ originX: 0 }}
        >
          {/* Moving particle */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 w-[6px] h-[6px] bg-red-400 rounded-full shadow-[0_0_15px_3px_rgba(248,113,113,0.8)]"
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 2, delay: 3, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Right side: Arc Testnet */}
        <motion.div
          className="absolute right-[2vw] glass-panel bg-[#121212]/90 border border-white/10 p-[3vw] rounded-2xl flex flex-col gap-4 items-center shadow-2xl z-10"
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 2.2, type: "spring", stiffness: 80, damping: 20 }}
        >
          <motion.div 
            className="w-[5vw] h-[5vw] rounded-full border-[2px] border-gray-600 flex items-center justify-center bg-gray-900"
            animate={{ borderColor: ["#4B5563", "#E2E1E1", "#4B5563"] }}
            transition={{ duration: 3, delay: 3.5, repeat: Infinity }}
          >
             <div className="w-[2.5vw] h-[2.5vw] bg-gray-200 rounded-full" />
          </motion.div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="font-sans text-[1.4vw] text-gray-100 font-semibold tracking-wide">Arc Testnet</span>
            <span className="font-sans text-[1vw] text-gray-400">Anchored permanently</span>
          </div>
        </motion.div>

      </div>
      
    </motion.div>
  );
}
