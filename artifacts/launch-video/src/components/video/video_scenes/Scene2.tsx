import { motion } from 'framer-motion';

export default function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 bg-background flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
    >
      {/* Background Image from real UI */}
      <motion.div
        className="absolute inset-0 z-0 opacity-40"
        initial={{ scale: 1.1, y: '5vw' }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 4, ease: "easeOut" }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}landing.jpg`} 
          alt="Envelo Landing" 
          className="w-full h-full object-cover object-top" 
        />
        {/* Gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent opacity-80"></div>
      </motion.div>

      <div className="z-10 flex flex-col items-center p-[5vw]">
        <motion.div
          className="flex items-center gap-[1vw] mb-[6vw]"
          initial={{ opacity: 0, y: '-2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo Logo" className="w-[3vw] h-[3vw]" />
          <span className="text-[2.2vw] font-semibold text-white tracking-tight">Envelo</span>
          <div className="ml-[1vw] px-[1vw] py-[0.4vw] rounded-full border border-brand-500/30 text-[0.8vw] text-brand-400 uppercase tracking-widest flex items-center gap-[0.5vw] bg-background/50 backdrop-blur-sm">
            <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-brand-300"></div>
            ARC TESTNET
          </div>
        </motion.div>

        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: '3vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[6.5vw] leading-[1.05] font-medium tracking-tight">
            <span className="text-white block">Private paperwork.</span>
            <span className="text-brand-500 block">Public proof.</span>
          </h1>
        </motion.div>
        
        <motion.div
          className="mt-[4vw] max-w-[50vw] text-center text-[1.6vw] leading-[1.5] text-brand-300 font-medium drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
        >
          Envelo seals sensitive invoice details in your browser, anchors proof on Arc, and settles payments in test USDC.
        </motion.div>
      </div>
    </motion.div>
  );
}