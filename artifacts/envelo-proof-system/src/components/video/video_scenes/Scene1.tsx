import { motion } from 'framer-motion';
import { Eye, ShieldCheck } from 'lucide-react';
import { SceneLayout } from '@/lib/video';

export default function Scene1() {
  return (
    <SceneLayout className="bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(11,minmax(0,1fr))] opacity-[0.03]">
        {Array.from({ length: 20 * 11 }).map((_, i) => (
          <div key={i} className="border-[0.5px] border-foreground/50" />
        ))}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full h-full gap-24">
        
        {/* The Problem: Public Invoice */}
        <motion.div 
          className="w-[28rem] bg-muted/30 border border-border rounded-2xl p-8 flex flex-col gap-6 relative"
          initial={{ opacity: 0, x: -50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
        >
          <div className="flex justify-between items-center border-b border-border pb-4">
            <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">Invoice #INV-001</span>
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="flex items-center gap-2 bg-brand/20 text-brand px-3 py-1 rounded-full text-xs font-bold font-mono border border-brand/30"
            >
              <Eye className="w-3 h-3" />
              PUBLIC
            </motion.div>
          </div>
          
          <div className="flex flex-col gap-4">
            {[
              { label: 'Client', value: 'Stark Industries', delay: 0.7 },
              { label: 'Amount', value: '250,000.00 USDC', delay: 0.8 },
              { label: 'Terms', value: 'Net 30 / Confidential', delay: 0.9 },
            ].map((item, i) => (
              <motion.div 
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay }}
                className="flex justify-between items-center"
              >
                <span className="font-sans text-muted-foreground">{item.label}</span>
                <motion.span 
                  className="font-mono text-foreground"
                  animate={{ color: i === 1 || i === 2 ? ['hsl(var(--foreground))', 'hsl(var(--brand))', 'hsl(var(--foreground))'] : 'hsl(var(--foreground))' }}
                  transition={{ delay: 2 + (i * 0.2), duration: 1.5 }}
                >
                  {item.value}
                </motion.span>
              </motion.div>
            ))}
          </div>

          {/* Alert Overlay */}
          <motion.div 
            className="absolute inset-0 bg-brand/5 border-2 border-brand/50 rounded-2xl flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          />
        </motion.div>

        {/* The Solution: Envelo */}
        <motion.div
          className="w-[28rem] bg-muted/10 border border-border rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden"
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 2.5 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
        >
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Envelo" className="w-5 h-5 opacity-80" />
              <span className="font-mono text-sm text-foreground uppercase tracking-wider">Envelo Invoice</span>
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3, type: 'spring' }}
              className="flex items-center gap-2 bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold font-mono border border-success/30"
            >
              <ShieldCheck className="w-3 h-3" />
              PRIVATE
            </motion.div>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { label: 'Client', value: '•••• •••••••••', delay: 2.7 },
              { label: 'Amount', value: '•••,•••.•• USDC', delay: 2.8 },
              { label: 'Terms', value: '•••••••••••••', delay: 2.9 },
            ].map((item, i) => (
              <motion.div 
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay }}
                className="flex justify-between items-center"
              >
                <span className="font-sans text-muted-foreground">{item.label}</span>
                <span className="font-mono text-muted-foreground/50 tracking-widest">{item.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Ciphertext effect */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
             <motion.div 
               className="w-full h-full font-mono text-[8px] leading-tight break-words text-success p-4"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 3.2 }}
             >
               {Array.from({length: 400}).map(() => Math.random().toString(36).substring(2,3)).join('')}
             </motion.div>
          </div>
        </motion.div>

      </div>

      {/* Typography Overlay */}
      <motion.div 
        className="absolute bottom-16 left-0 w-full text-center z-10 flex flex-col gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.8, duration: 1 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <h1 className="text-5xl font-sans font-medium text-foreground tracking-tight">
          Public chains expose your business.
        </h1>
        <p className="text-2xl font-sans text-muted-foreground">
          Envelo keeps it private.
        </p>
      </motion.div>
    </SceneLayout>
  );
}
