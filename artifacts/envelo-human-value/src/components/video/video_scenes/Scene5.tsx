import { motion } from 'framer-motion';

export default function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div 
        className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4vw 4vw'
        }}
      />

      <div className="flex flex-col items-center gap-[6vw] z-20">
        
        {/* Brand Lockup */}
        <motion.div 
          className="flex items-center gap-[1.5vw]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-[4vw] h-[4vw]" />
          <span className="font-sans font-semibold text-[3vw] tracking-wider text-white">Envelo</span>
          <div className="ml-[1vw] px-[1.2vw] py-[0.6vw] rounded-full border border-gray-700 bg-gray-800/80 flex items-center gap-[0.8vw]">
             <motion.div 
                className="w-[0.8vw] h-[0.8vw] rounded-full bg-gray-300" 
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
             />
             <span className="font-sans text-[1vw] text-gray-300 uppercase tracking-widest font-medium mt-[1px]">Arc Testnet</span>
          </div>
        </motion.div>

        {/* Tagline */}
        <div className="text-center flex flex-col gap-[1vw]">
          <motion.h2 
            className="font-serif text-[6.5vw] leading-[1.1] text-gray-100"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Private paperwork.
          </motion.h2>
          <motion.h2 
            className="font-serif text-[6.5vw] leading-[1.1] text-gray-500 italic"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Public proof.
          </motion.h2>
        </div>

        {/* CTA / URL */}
        <motion.p
          className="font-sans text-[1.4vw] text-gray-400 tracking-[0.2em] uppercase mt-[2vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 3.5 }}
        >
          envelo.online
        </motion.p>
      </div>
      
      {/* Slow zoom on the whole scene for final beat */}
      <motion.div
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        initial={{ scale: 1 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 6, ease: "linear" }}
      />
    </motion.div>
  );
}
