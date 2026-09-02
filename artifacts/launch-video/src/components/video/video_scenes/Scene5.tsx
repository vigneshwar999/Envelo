import { motion } from 'framer-motion';

export default function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 bg-background flex flex-col items-center justify-center p-[5vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
    >
      {/* Texture Background */}
      <motion.div
        className="absolute inset-0 z-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2 }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}endcard.jpg`} 
          alt="Endcard Texture" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-background/60"></div>
      </motion.div>

      <div className="z-10 flex flex-col items-center">
        <motion.div
          className="flex items-center gap-[1.2vw] mb-[5vw]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo Logo" className="w-[3.5vw] h-[3.5vw]" />
          <span className="text-[2.8vw] font-bold text-white tracking-tight">Envelo</span>
          <div className="ml-[1vw] px-[1.2vw] py-[0.5vw] rounded-full border border-brand-500/30 text-[0.9vw] text-brand-400 uppercase tracking-widest flex items-center gap-[0.6vw] bg-background/50 backdrop-blur-sm">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-brand-300"></div>
            ARC TESTNET
          </div>
        </motion.div>

        <motion.div 
          className="text-center mb-[5vw]"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[7.5vw] leading-[1.05] font-medium tracking-tight drop-shadow-2xl">
            <span className="text-white block">Private paperwork.</span>
            <span className="text-brand-400 block">Public proof.</span>
          </h1>
        </motion.div>
        
        <motion.div
          className="text-center text-[1.8vw] text-brand-300 flex items-center gap-[1vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <span>Live on Arc Testnet</span>
          <span className="text-brand-500 font-black">·</span>
          <span className="text-white font-medium">envelo.online</span>
        </motion.div>
      </div>
    </motion.div>
  );
}