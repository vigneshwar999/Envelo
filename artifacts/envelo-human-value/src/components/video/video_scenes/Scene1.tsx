import { motion } from 'framer-motion';

export default function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      {/* Grid background for "public ledger" feel */}
      <div 
        className="absolute inset-0 w-full h-full opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw'
        }}
      />

      {/* Drifting Invoice Details */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <FloatingDetail delay={0.2} top="15%" left="20%" label="Client Name" value="Acme Corporation" />
        <FloatingDetail delay={0.6} top="65%" left="15%" label="Invoice Amount" value="$125,000.00 USDC" highlight />
        <FloatingDetail delay={1.0} top="25%" left="65%" label="Services Rendered" value="Q3 Retainer & Strategy" />
        <FloatingDetail delay={1.4} top="70%" left="70%" label="Payment Terms" value="Net 30 / Late Fee 5%" />
        <FloatingDetail delay={1.8} top="45%" left="80%" label="Wallet Address" value="0x8a9C...3b1F" />
      </div>

      {/* Main Copy */}
      <div className="relative z-20 text-center flex flex-col items-center gap-6">
        <div className="overflow-hidden p-6 bg-[#121212]/90 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/50 border border-white/10">
          <motion.h1 
            className="font-serif text-[5.5vw] leading-[1.1] text-white tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 2.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Public chains<br/>
            <span className="italic text-gray-400">expose</span> your business.
          </motion.h1>
        </div>
      </div>

    </motion.div>
  );
}

function FloatingDetail({ label, value, top, left, delay, highlight = false }: { label: string, value: string, top: string, left: string, delay: number, highlight?: boolean }) {
  return (
    <motion.div
      className="absolute flex flex-col gap-1 p-[1.5vw] rounded-xl shadow-2xl bg-[#121212]/90 border border-white/10 backdrop-blur-md"
      style={{ top, left }}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        y: [-40, -120],
        x: [0, (Math.random() - 0.5) * 60]
      }}
      transition={{ 
        duration: 8, 
        delay, 
        ease: "linear",
        opacity: { duration: 8, times: [0, 0.1, 0.8, 1], delay }
      }}
    >
      <span className="font-sans text-[0.8vw] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`font-sans text-[1.4vw] font-semibold ${highlight ? 'text-red-500' : 'text-gray-200'}`}>
        {value}
      </span>
    </motion.div>
  );
}
