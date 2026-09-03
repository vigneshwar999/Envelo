import { motion } from 'framer-motion';

export default function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div 
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw'
        }}
      />

      <div className="flex flex-col items-center gap-[4vw] z-20">
        
        {/* Three core values staggering in */}
        <div className="flex gap-[4vw] font-serif text-[4vw] text-gray-400 italic">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            Clients.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            Pricing.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 1.9 }}
          >
            Terms.
          </motion.div>
        </div>

        {/* Main message */}
        <div className="overflow-hidden p-4 bg-[#F4F4F5]/80 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/5 border border-black/5">
          <motion.h2 
            className="font-serif text-[6.5vw] leading-none text-gray-900 text-center"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: "0%" }}
            transition={{ duration: 1.2, delay: 3.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Keep them <span className="text-red-600 font-medium">private.</span>
          </motion.h2>
        </div>
      </div>
      
      {/* A dark sweeping circle that starts growing at the very end to transition to dark mode in Scene 3 */}
      <motion.div
        className="absolute w-[250vw] h-[250vw] rounded-full bg-[#050505] z-50 pointer-events-none"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1.5 }}
        transition={{ duration: 1.5, delay: 5.5, ease: [0.76, 0, 0.24, 1] }}
      />
    </motion.div>
  );
}
