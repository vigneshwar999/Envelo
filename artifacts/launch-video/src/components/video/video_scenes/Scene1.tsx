import { motion } from 'framer-motion';

export default function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 bg-background flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.8 } }}
    >
      <motion.div
        className="absolute inset-0 z-0 opacity-40"
        initial={{ scale: 1.1, y: '5vw' }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 5, ease: "easeOut" }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}landing.jpg`} 
          alt="Envelo Landing UI" 
          className="w-full h-full object-cover object-top" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent opacity-80"></div>
      </motion.div>

      <div className="z-10 flex flex-col items-center p-[5vw] w-full mt-[2vw]">
        <motion.div
          className="flex items-center gap-[1.5vw] mb-[4vw]"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo Logo" className="w-[5vw] h-[5vw]" />
          <span className="text-[4.5vw] font-semibold text-white tracking-tight">Envelo</span>
        </motion.div>

        <motion.div 
          className="text-center space-y-[2vw]"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[5.5vw] leading-[1.05] font-medium tracking-tight text-white drop-shadow-lg">
            Privacy-first invoicing.
          </h1>
          <p className="text-[3vw] text-brand-300 font-medium tracking-tight drop-shadow-md">
            For people getting paid in stablecoins.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}