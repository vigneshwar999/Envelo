import type { CSSProperties, ReactNode } from 'react';

/* Shared geometry for the opening two scenes so the cut between them is invisible. */

export const OPEN_LINES = ['EVERY INVOICE', 'YOU SEND', 'IS OPEN.'] as const;

export const openLineStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '8vw',
  lineHeight: 0.95,
  letterSpacing: '-0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export function OpenStack({ children }: { children: ReactNode }) {
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: '15.4vw', gap: '0.9vw' }}>
      {children}
    </div>
  );
}

export const HUD_LEFT_OPEN = 'INV-2026-014 · PLAINTEXT';
export const HUD_LEFT_SEALED = 'INV-2026-014 · AES-256-GCM';
export const HUD_RIGHT = 'ARC TESTNET · 5042002';
