import { motion } from 'framer-motion';
import { Lock, FileText, Database, Shield } from 'lucide-react';
import { SceneLayout } from '@/lib/video';
import { Node, ConnectionLine } from '../components/Diagram';

export default function Scene2() {
  return (
    <SceneLayout className="bg-background flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Step Label */}
      <motion.div 
        className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <span className="text-brand font-mono text-sm tracking-[0.2em] font-bold">STEP 1</span>
        <h2 className="text-5xl font-sans font-medium text-foreground tracking-tight">Seal the invoice</h2>
      </motion.div>

      {/* Main Diagram */}
      <div className="flex items-center justify-center gap-4 mt-8 w-full max-w-5xl">
        
        {/* Browser Input */}
        <motion.div 
          className="flex flex-col gap-3 z-10"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="text-xs font-mono text-muted-foreground ml-2">YOUR BROWSER</div>
          <Node 
            title="Invoice Details" 
            subtitle="Amount, Terms, Client"
            icon={<FileText />}
            delay={0.6}
          />
        </motion.div>

        {/* Connection & Encryption */}
        <div className="flex flex-col items-center justify-center -mx-4 z-0">
          <ConnectionLine delay={1.2} active={true} />
          
          <motion.div 
            className="absolute -translate-y-12 flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: 'spring' }}
            exit={{ opacity: 0 }}
          >
            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand shadow-[0_0_20px_rgba(225,29,72,0.2)]">
              <Lock className="w-4 h-4" />
            </div>
            <span className="font-mono text-[10px] text-brand tracking-widest bg-background/80 px-2 py-1 rounded">AES-256-GCM</span>
          </motion.div>
        </div>

        {/* Server Output */}
        <motion.div 
          className="flex flex-col gap-3 z-10"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.8 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <div className="text-xs font-mono text-muted-foreground ml-2 text-right">ENVELO SERVER</div>
          <Node 
            title="Sealed Ciphertext" 
            subtitle="Unreadable by server"
            icon={<Database />}
            color="border-brand/30"
            textColor="text-foreground"
            delay={1.9}
          />
        </motion.div>
      </div>

      {/* Explainer Text */}
      <motion.div 
        className="absolute bottom-24 w-[600px] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.8 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <p className="text-2xl font-sans text-muted-foreground leading-relaxed">
          Sensitive fields are encrypted <span className="text-foreground">in your browser</span> before anything is sent.
        </p>
      </motion.div>

      {/* Aesthetic UI elements from how-it-works.jpg */}
      <motion.div 
        className="absolute right-12 bottom-12 opacity-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ delay: 3 }}
      >
        <div className="border border-border rounded-xl p-4 flex gap-4 w-64">
           <div className="flex-1 space-y-2">
             <div className="h-2 bg-muted rounded w-3/4"></div>
             <div className="h-2 bg-muted rounded w-1/2"></div>
             <div className="h-2 bg-muted rounded w-full"></div>
           </div>
           <div className="w-12 h-12 bg-brand/20 rounded flex items-center justify-center">
             <Lock className="w-5 h-5 text-brand" />
           </div>
        </div>
      </motion.div>

    </SceneLayout>
  );
}
