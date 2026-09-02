import { motion } from 'framer-motion';
import { Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SceneLayout } from '@/lib/video';
import { Node, ConnectionLine } from '../components/Diagram';

export default function Scene4() {
  return (
    <SceneLayout className="bg-background flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Dots */}
      <div className="absolute inset-0 w-full h-full [background-image:radial-gradient(hsl(var(--success)/0.1)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      {/* Step Label */}
      <motion.div 
        className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <span className="text-success font-mono text-sm tracking-[0.2em] font-bold">STEP 3</span>
        <h2 className="text-5xl font-sans font-medium text-foreground tracking-tight">Settle the payment</h2>
      </motion.div>

      {/* Main Diagram */}
      <div className="flex flex-col items-center justify-center gap-12 mt-8 w-full max-w-4xl relative z-10">
        
        {/* Payment Flow */}
        <div className="flex items-center justify-between w-full">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-xs font-mono text-muted-foreground mb-2">CLIENT WALLET</div>
            <Node 
              title="0x8f...4e9a" 
              subtitle="Testnet Balance: 500k USDC"
              delay={0.6}
            />
          </motion.div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
            <div className="w-full h-px bg-border relative">
              <motion.div
                initial={{ left: "0%", width: "0%", opacity: 0 }}
                animate={{ left: ["0%", "50%", "100%"], width: ["0%", "50%", "0%"], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-0 h-full bg-success rounded-full"
                style={{ transform: "translateY(-50%)", height: "3px" }}
              />
            </div>
            
            <motion.div 
              className="absolute -translate-y-8 bg-background px-4 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
            >
              <div className="flex items-center gap-2 text-success font-mono font-bold border border-success/30 bg-success/10 px-4 py-2 rounded-full">
                <Banknote className="w-4 h-4" />
                250,000.00 USDC
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="text-xs font-mono text-muted-foreground mb-2 text-right">MERCHANT WALLET</div>
            <Node 
              title="0x3a...1b8c" 
              subtitle="Receiving account"
              delay={0.9}
            />
          </motion.div>

        </div>

        {/* Sealed Context */}
        <motion.div 
          className="flex flex-col items-center p-6 border border-border bg-muted/20 rounded-2xl relative w-[400px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
        >
          <div className="absolute -top-3 bg-background px-2 text-xs font-mono text-muted-foreground tracking-widest">
            CONTEXT
          </div>
          
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-border rounded flex items-center justify-center shrink-0">
               <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="font-mono text-sm text-foreground">INV-001 (Encrypted)</span>
              <span className="text-xs font-sans text-muted-foreground mt-1">Payment executes independently of the sealed data.</span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          </div>
        </motion.div>

      </div>

      {/* Explainer Text */}
      <motion.div 
        className="absolute bottom-24 w-[700px] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8, duration: 0.8 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <p className="text-2xl font-sans text-muted-foreground leading-relaxed">
          Settlement flows on-chain in test USDC.<br/>
          <span className="text-foreground">The transaction works, but the invoice context stays yours.</span>
        </p>
      </motion.div>

    </SceneLayout>
  );
}
