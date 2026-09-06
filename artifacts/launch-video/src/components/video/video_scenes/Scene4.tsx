import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

export default function Scene4() {
  const [activeStep, setActiveStep] = useState(1);

  useSceneTimer([
    { time: 0, callback: () => setActiveStep(1) },
    { time: 2500, callback: () => setActiveStep(2) },
    { time: 5000, callback: () => setActiveStep(3) },
    { time: 7500, callback: () => setActiveStep(4) },
  ]);

  const steps = [
    { num: 1, title: "Seal", desc: "Invoice encrypted end-to-end in the browser." },
    { num: 2, title: "Anchor", desc: "SHA-256 fingerprint written to Arc Testnet." },
    { num: 3, title: "Settle", desc: "Client pays in test USDC on Arc Testnet." },
    { num: 4, title: "Verify", desc: "Anyone verifies the proof; authorized parties decrypt." },
  ];

  return (
    <motion.div 
      className="absolute inset-0 bg-background overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {/* Top Half: Product Material */}
      <motion.div
        className="relative w-full h-[45vh] bg-brand-900/30 border-b border-brand-900/50 flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0, y: '-5vh' }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}how-it-works.jpg`} 
          alt="How It Works UI" 
          className="absolute inset-0 w-full h-full object-cover object-top opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background"></div>
        
        <div className="z-10 text-[1.5vw] tracking-[0.3em] text-white/90 font-semibold uppercase bg-black/60 px-[2.5vw] py-[1vw] rounded-full backdrop-blur-md border border-white/10 shadow-xl">
          How It Works
        </div>
      </motion.div>

      {/* Bottom Half: Horizontal Timeline */}
      <div className="flex-1 w-full px-[4vw] py-[4vw] flex flex-col justify-center relative">
        <div className="flex justify-between w-full relative z-10">
          {/* Progress Line Background */}
          <div className="absolute top-[1vw] left-[11.5vw] right-[11.5vw] h-[2px] bg-brand-900 -z-10" />
          {/* Progress Line Fill */}
          <div className="absolute top-[1vw] left-[11.5vw] right-[11.5vw] h-[2px] -z-10 flex items-center">
            <motion.div 
              className="h-full bg-brand-300"
              initial={{ width: "0%" }}
              animate={{ width: `${((activeStep - 1) / 3) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>

          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center w-[23vw] relative">
              {/* Step Node */}
              <motion.div 
                className={`w-[2vw] h-[2vw] rounded-full border-2 mb-[2vw] flex items-center justify-center bg-background shadow-[0_0_10px_rgba(0,0,0,0.5)]
                  ${activeStep >= step.num ? 'border-brand-50' : 'border-brand-900'}`}
                initial={false}
                animate={{ 
                  scale: activeStep === step.num ? 1.3 : 1,
                  backgroundColor: activeStep >= step.num ? '#fafafa' : '#050505',
                  borderColor: activeStep >= step.num ? '#fafafa' : '#111827'
                }}
                transition={{ duration: 0.4 }}
              />

              {/* Content */}
              <motion.div
                className="text-center px-[1vw]"
                initial={{ opacity: 0, y: '1vw' }}
                animate={{ 
                  opacity: activeStep === step.num ? 1 : (activeStep > step.num ? 0.6 : 0.3),
                  y: activeStep === step.num ? 0 : '0.5vw'
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <h3 className="text-[2.2vw] font-semibold text-white mb-[1vw] tracking-tight">{step.title}</h3>
                <p className="text-[1.3vw] leading-[1.4] text-brand-300">{step.desc}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}