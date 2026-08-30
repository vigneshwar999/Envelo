import { motion } from 'framer-motion';

export function PersistentElements({ currentScene }: { currentScene: number }) {
  return (
    <>
      {/* Background gradients that shift based on scene */}
      <motion.div
        className="absolute inset-0 opacity-20 pointer-events-none"
        animate={{
          background: 
            currentScene === 0 ? 'radial-gradient(circle at 10% 10%, var(--color-primary) 0%, transparent 40%)' :
            currentScene === 1 ? 'radial-gradient(circle at 90% 10%, var(--color-accent) 0%, transparent 40%)' :
            currentScene === 2 ? 'radial-gradient(circle at 50% 50%, var(--color-success) 0%, transparent 50%)' :
            currentScene === 3 ? 'radial-gradient(circle at 10% 90%, var(--color-primary) 0%, transparent 40%)' :
            currentScene === 4 ? 'radial-gradient(circle at 90% 90%, var(--color-accent) 0%, transparent 40%)' :
            'none'
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} 
      />
      
      {/* A persistent wax seal shape that moves around or hides */}
      <motion.div
        className="absolute w-[12vw] h-[12vw] rounded-full border-[0.5vw] border-accent/20 border-dashed flex items-center justify-center"
        animate={{
          x: currentScene === 0 ? '-20vw' : currentScene === 1 ? '70vw' : currentScene === 2 ? '50vw' : currentScene === 3 ? '10vw' : currentScene === 4 ? '44vw' : '-20vw',
          y: currentScene === 0 ? '10vh' : currentScene === 1 ? '20vh' : currentScene === 2 ? '50vh' : currentScene === 3 ? '60vh' : currentScene === 4 ? '40vh' : '10vh',
          scale: currentScene === 2 ? 2 : currentScene === 4 ? 1.5 : 1,
          opacity: currentScene === 5 ? 0 : 0.3,
          rotate: currentScene * 45
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-[10vw] h-[10vw] rounded-full bg-accent/10" />
      </motion.div>
    </>
  );
}
