import { motion } from 'framer-motion';
import { SceneLayout } from '@/lib/video';

export default function Scene5() {
  return (
    <SceneLayout className="bg-[#030303] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />

      {/* Top Lockup */}
      <motion.div 
        className="flex items-center justify-center gap-4 mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-8 h-8" />
          <span className="font-sans font-semibold text-2xl text-foreground tracking-tight">Envelo</span>
        </div>
        <div className="flex items-center gap-2 border border-border/50 bg-muted/20 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
          <span className="font-mono text-xs font-semibold text-foreground/60 tracking-[0.15em] uppercase mt-[1px]">
            Arc Testnet
          </span>
        </div>
      </motion.div>

      {/* Main Tagline */}
      <div className="flex flex-col items-center gap-2 text-center mb-16">
        <motion.h1 
          className="text-7xl font-sans font-medium text-foreground tracking-tight"
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Private paperwork.
        </motion.h1>
        <motion.h1 
          className="text-7xl font-sans font-medium text-muted-foreground tracking-tight"
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Public proof.
        </motion.h1>
      </div>

      {/* Footer Text */}
      <motion.div 
        className="flex items-center gap-6 font-mono text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        <span>Live on Arc Testnet</span>
        <div className="w-1 h-1 rounded-full bg-border" />
        <span className="text-foreground">envelo.online</span>
      </motion.div>

    </SceneLayout>
  );
}
