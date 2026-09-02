import { motion } from 'framer-motion';

export default function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 bg-background text-brand-50 flex items-center justify-center p-[8vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <div className="max-w-[70vw] z-10 space-y-[4vw]">
        <motion.div
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="text-[4vw] leading-[1.1] font-medium tracking-tight text-brand-300"
        >
          Stablecoin payments are <span className="text-white font-semibold">public by default.</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2.2 }}
          className="text-[2.5vw] leading-[1.3] text-brand-500 font-normal max-w-[55vw]"
        >
          A normal on-chain invoice exposes who got paid, how much, and for what.
        </motion.div>
      </div>

      {/* Subtle UI element in background: a block explorer style row fading out */}
      <motion.div 
        className="absolute right-[-10vw] top-[30vh] w-[60vw] h-[40vh] border border-brand-900/50 rounded-xl bg-brand-900/10 backdrop-blur-sm p-[2vw] flex flex-col gap-[1.5vw] opacity-20"
        initial={{ opacity: 0, x: '5vw' }}
        animate={{ opacity: 0.15, x: 0 }}
        transition={{ duration: 2, ease: "easeOut", delay: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="h-[2vw] w-[30%] bg-brand-500/20 rounded-md"></div>
        <div className="h-[2vw] w-[80%] bg-brand-500/10 rounded-md"></div>
        <div className="h-[2vw] w-[60%] bg-brand-500/10 rounded-md"></div>
        <div className="h-[2vw] w-[70%] bg-brand-500/10 rounded-md"></div>
        <div className="h-[2vw] w-[50%] bg-brand-500/10 rounded-md"></div>
      </motion.div>
    </motion.div>
  );
}