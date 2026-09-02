import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSceneTimer } from '@/lib/video';

export default function Scene4() {
  const [activeStep, setActiveStep] = useState(1);

  useSceneTimer([
    { time: 0, callback: () => setActiveStep(1) },
    { time: 3000, callback: () => setActiveStep(2) },
    { time: 6000, callback: () => setActiveStep(3) },
    { time: 9000, callback: () => setActiveStep(4) },
  ]);

  const steps = [
    { num: 1, title: "Seal", desc: "Invoice encrypted end-to-end in the browser." },
    { num: 2, title: "Anchor", desc: "SHA-256 fingerprint written to Arc Testnet." },
    { num: 3, title: "Settle", desc: "Client pays in USDC tied to that anchored proof." },
    { num: 4, title: "Verify", desc: "Anyone checks proof; no one reads the invoice." },
  ];

  // Calculate pan position based on step
  const getPanPosition = () => {
    switch(activeStep) {
      case 1: return '0%';
      case 2: return '-25%';
      case 3: return '-50%';
      case 4: return '-75%';
      default: return '0%';
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 bg-background overflow-hidden flex items-center justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      {/* Panning Background Image */}
      <motion.div
        className="absolute inset-0 z-0 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3, y: getPanPosition() }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}how-it-works.jpg`} 
          alt="How It Works UI" 
          className="w-full h-auto object-cover opacity-80 mix-blend-screen invert" 
          style={{ minHeight: '200%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-background/40"></div>
      </motion.div>

      {/* Foreground Content */}
      <div className="z-10 w-[55vw] pl-[8vw] pr-[5vw] h-full flex flex-col justify-center">
        <motion.div 
          className="text-[1.2vw] tracking-[0.2em] text-brand-500 mb-[4vw] uppercase"
          initial={{ opacity: 0, x: '-2vw' }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          How It Works
        </motion.div>

        <div className="relative pl-[4vw]">
          {/* Vertical Line */}
          <div className="absolute left-0 top-[2vw] bottom-[2vw] w-[2px] bg-brand-900/50">
            <motion.div 
              className="w-full bg-brand-300"
              initial={{ height: "0%" }}
              animate={{ height: `${((activeStep - 1) / 3) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>

          <div className="flex flex-col gap-[3vw]">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                {/* Step Node */}
                <motion.div 
                  className={`absolute left-[-4vw] -ml-[1px] w-[2vw] h-[2vw] rounded-full border-2 top-[0.5vw] flex items-center justify-center bg-background
                    ${activeStep >= step.num ? 'border-brand-50' : 'border-brand-900'}`}
                  initial={false}
                  animate={{ 
                    scale: activeStep === step.num ? 1.2 : 1,
                    backgroundColor: activeStep >= step.num ? '#fafafa' : '#050505',
                    borderColor: activeStep >= step.num ? '#fafafa' : '#111827'
                  }}
                  transition={{ duration: 0.4 }}
                />

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, x: '2vw' }}
                  animate={{ 
                    opacity: activeStep === step.num ? 1 : (activeStep > step.num ? 0.4 : 0.1),
                    x: activeStep === step.num ? 0 : '1vw'
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <h3 className="text-[3vw] font-semibold text-white mb-[0.5vw] tracking-tight">{step.title}</h3>
                  <p className="text-[1.6vw] leading-[1.4] text-brand-300 max-w-[40vw]">{step.desc}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}