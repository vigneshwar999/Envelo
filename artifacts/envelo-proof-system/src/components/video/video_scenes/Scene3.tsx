import { motion } from 'framer-motion';
import { Fingerprint, Network, Hash, Link as LinkIcon } from 'lucide-react';
import { SceneLayout } from '@/lib/video';
import { Node, ConnectionLine } from '../components/Diagram';

export default function Scene3() {
  return (
    <SceneLayout className="bg-background flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Arc Graphic */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-[0.5px] border-accent/10 opacity-50"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.5 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <div className="absolute inset-0 rounded-full border-[0.5px] border-accent/20 scale-75" />
        <div className="absolute inset-0 rounded-full border-[0.5px] border-accent/30 scale-50" />
      </motion.div>

      {/* Step Label */}
      <motion.div 
        className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <span className="text-brand font-mono text-sm tracking-[0.2em] font-bold">STEP 2</span>
        <h2 className="text-5xl font-sans font-medium text-foreground tracking-tight">Anchor the fingerprint</h2>
      </motion.div>

      {/* Main Diagram */}
      <div className="flex flex-col items-center justify-center gap-2 mt-8 w-full max-w-2xl">
        
        {/* SHA-256 Hash */}
        <motion.div 
          className="flex flex-col items-center gap-3 z-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shadow-[0_0_30px_rgba(225,29,72,0.15)] relative">
            <Fingerprint className="w-8 h-8" />
            
            {/* Ping animation */}
            <motion.div 
              className="absolute inset-0 rounded-full border border-brand"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            />
          </div>
          
          <div className="flex flex-col items-center bg-muted/30 border border-border p-3 rounded-lg mt-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">SHA-256 HASH</span>
            <span className="font-mono text-xs text-foreground/80 break-all w-64 text-center">
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </span>
          </div>
        </motion.div>

        {/* Vertical Connection */}
        <div className="flex flex-col items-center z-0 my-2">
          <ConnectionLine delay={1.2} active={true} vertical={true} />
          
          <motion.div 
            className="absolute translate-y-8 bg-background px-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: 'spring' }}
            exit={{ opacity: 0 }}
          >
            <LinkIcon className="w-4 h-4 text-accent/50" />
          </motion.div>
        </div>

        {/* Arc Testnet */}
        <motion.div 
          className="flex flex-col items-center gap-3 z-10 mt-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Node 
            title="Arc Testnet" 
            subtitle="Immutable Public Ledger"
            icon={<Network />}
            color="border-accent/40 bg-accent/10"
            textColor="text-accent"
            delay={1.9}
          />
        </motion.div>
      </div>

      {/* Explainer Text */}
      <motion.div 
        className="absolute bottom-24 w-[700px] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.8 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <p className="text-2xl font-sans text-muted-foreground leading-relaxed">
          A unique digital wax stamp is anchored on-chain. <br/>
          <span className="text-foreground">The document stays sealed; the proof is public.</span>
        </p>
      </motion.div>

    </SceneLayout>
  );
}
