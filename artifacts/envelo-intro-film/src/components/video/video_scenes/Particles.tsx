import { motion } from 'framer-motion';
import { useMemo } from 'react';

export function Particles({ count = 30, className = "" }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * -10,
      opacity: Math.random() * 0.4 + 0.1
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px rgba(250,250,250,0.5)`
          }}
          animate={{
            y: ['-10vh', '10vh'],
            x: ['-5vw', '5vw'],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'linear',
            delay: p.delay
          }}
        />
      ))}
    </div>
  );
}
