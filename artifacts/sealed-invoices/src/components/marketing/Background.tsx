import React from 'react';

/**
 * Nebula-style ambient background: near-black canvas, faint vertical
 * hairline grid down the center band, and two dotted-matrix patches that
 * drift very slowly. Pure CSS — no images, reduced-motion safe.
 */
export function Background() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
      {/* vertical hairline grid, strongest near the top */}
      <div
        className="absolute inset-x-0 top-0 h-[130vh] mx-auto max-w-7xl nebula-grid"
        style={{
          maskImage:
            'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
        }}
      />

      {/* dotted matrix patch — top right */}
      <div
        className="absolute top-[4%] right-[-6%] w-[46%] h-[52%] nebula-dots opacity-[0.16] animate-slow-drift"
        style={{
          maskImage:
            'radial-gradient(ellipse 65% 55% at 60% 40%, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 65% 55% at 60% 40%, black 0%, transparent 70%)',
        }}
      />

      {/* dotted matrix patch — left, further down */}
      <div
        className="hidden md:block absolute top-[38%] left-[-8%] w-[42%] h-[48%] nebula-dots opacity-[0.11] animate-slow-drift-reverse"
        style={{
          maskImage:
            'radial-gradient(ellipse 60% 50% at 40% 50%, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 50% at 40% 50%, black 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
