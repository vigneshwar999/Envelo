import React from 'react';
import { motion } from 'framer-motion';

export const Node = ({ 
  icon, 
  title, 
  subtitle, 
  color = 'border-border', 
  textColor = 'text-foreground',
  delay = 0 
}: { 
  icon?: React.ReactNode; 
  title: string; 
  subtitle?: string; 
  color?: string;
  textColor?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    className={`p-4 border ${color} bg-background/80 backdrop-blur-sm rounded-xl flex items-center gap-4`}
  >
    {icon && (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-muted/50 ${textColor}`}>
        {icon}
      </div>
    )}
    <div className="flex flex-col">
      <span className={`text-lg font-medium font-sans ${textColor}`}>{title}</span>
      {subtitle && <span className="text-sm font-mono text-muted-foreground">{subtitle}</span>}
    </div>
  </motion.div>
);

export const ConnectionLine = ({ 
  delay = 0, 
  active = false,
  vertical = false 
}: { 
  delay?: number;
  active?: boolean;
  vertical?: boolean;
}) => (
  <div className={`relative ${vertical ? 'w-px h-16 mx-auto' : 'h-px w-16 my-auto'} bg-border overflow-hidden`}>
    <motion.div
      initial={{ [vertical ? 'height' : 'width']: 0, opacity: 0 }}
      animate={{ 
        [vertical ? 'height' : 'width']: '100%', 
        opacity: active ? [0.5, 1, 0.5] : 0.5 
      }}
      transition={{ 
        duration: active ? 2 : 1, 
        ease: "easeInOut", 
        delay,
        repeat: active ? Infinity : 0
      }}
      className={`absolute top-0 left-0 bg-brand ${vertical ? 'w-full' : 'h-full'}`}
    />
  </div>
);
