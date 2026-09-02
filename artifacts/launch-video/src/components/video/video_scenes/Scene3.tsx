import { motion, type Variants } from 'framer-motion';

export default function Scene3() {
  const itemVariants: Variants = {
    hidden: { opacity: 0, x: '-2vw' },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };
  
  const rightItemVariants: Variants = {
    hidden: { opacity: 0, x: '2vw' },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="absolute inset-0 bg-background flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {/* PUBLIC SIDE */}
      <motion.div 
        className="w-1/2 h-full flex flex-col justify-center items-end pr-[6vw] relative border-r border-brand-900/50"
        initial={{ x: '-5vw', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-[30vw] flex flex-col items-start">
          <div className="text-[1.2vw] tracking-[0.2em] text-brand-500 mb-[2vw]">PUBLIC ON ARC</div>
          
          <motion.ul 
            className="space-y-[1.5vw]"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.2, delayChildren: 0.8 }}
          >
            <motion.li variants={itemVariants} className="text-[2.5vw] font-medium text-brand-300 flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] border border-brand-500/50 rotate-45"></div>
              SHA-256 Fingerprint
            </motion.li>
            <motion.li variants={itemVariants} className="text-[2.5vw] font-medium text-brand-300 flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] border border-brand-500/50 rotate-45"></div>
              Timestamp
            </motion.li>
            <motion.li variants={itemVariants} className="text-[2.5vw] font-medium text-brand-300 flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] border border-brand-500/50 rotate-45"></div>
              Settlement Tx
            </motion.li>
          </motion.ul>
        </div>
      </motion.div>

      {/* PRIVATE SIDE */}
      <motion.div 
        className="w-1/2 h-full flex flex-col justify-center items-start pl-[6vw] relative"
        initial={{ x: '5vw', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-[30vw] flex flex-col items-start">
          <div className="text-[1.2vw] tracking-[0.2em] text-white mb-[2vw] bg-brand-900 px-[1vw] py-[0.2vw] rounded">END-TO-END ENCRYPTED</div>
          
          <motion.ul 
            className="space-y-[1.5vw]"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.2, delayChildren: 1.6 }}
          >
            <motion.li variants={rightItemVariants} className="text-[2.5vw] font-medium text-white flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] bg-white rounded-full"></div>
              Client Names
            </motion.li>
            <motion.li variants={rightItemVariants} className="text-[2.5vw] font-medium text-white flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] bg-white rounded-full"></div>
              Line Items
            </motion.li>
            <motion.li variants={rightItemVariants} className="text-[2.5vw] font-medium text-white flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] bg-white rounded-full"></div>
              Exact Amounts
            </motion.li>
            <motion.li variants={rightItemVariants} className="text-[2.5vw] font-medium text-white flex items-center gap-[1vw]">
              <div className="w-[1vw] h-[1vw] bg-white rounded-full"></div>
              Terms & Notes
            </motion.li>
          </motion.ul>
        </div>
      </motion.div>

    </motion.div>
  );
}