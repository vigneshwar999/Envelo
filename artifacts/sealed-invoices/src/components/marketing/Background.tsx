import React from 'react';

export function Background() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
      <div 
        className="absolute inset-0 opacity-[0.15] mix-blend-screen"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)'
        }}
      >
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white blur-[70px] md:blur-[120px] animate-slow-drift" />
        <div className="hidden md:block absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white blur-[100px] animate-slow-drift-reverse" />
      </div>
    </div>
  );
}
