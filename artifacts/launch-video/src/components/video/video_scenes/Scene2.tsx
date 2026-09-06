import { motion } from 'framer-motion';

export default function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 bg-background flex flex-col items-center justify-center p-[8vw] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {/* Decorative background element */}
      <motion.div
        className="absolute inset-0 z-0 opacity-30 flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 4.5, ease: "easeOut" }}
      >
        <div className="w-[80vw] h-[80vw] rounded-full border border-brand-900/50 absolute"></div>
        <div className="w-[60vw] h-[60vw] rounded-full border border-brand-900/80 absolute"></div>
        <div className="w-[40vw] h-[40vw] rounded-full border border-brand-500/20 absolute"></div>
      </motion.div>

      <div className="max-w-[80vw] z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="text-[4.5vw] leading-[1.2] font-medium tracking-tight text-brand-300"
        >
          Keep <span className="text-white font-semibold">confidential paperwork</span> separate from <span className="text-white font-semibold">verifiable blockchain proof</span>.
        </motion.div>
      </div>
    </motion.div>
  );
}