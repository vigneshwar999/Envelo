import { motion } from 'framer-motion';
import { useId } from 'react';

// Inline copy of attached_assets/envelo-logo.svg (single path) so the mark can
// carry a clipped light sweep. The geometry is never altered.
export const ENVELO_MARK_PATH =
  'm124 8.5c-9.2-0.2-22.1 4.8-38.4 14.9-3.4 2.1-7.2 4.6-10.7 7h5.7c16.4-10.1 31.9-18.7 44-18.6 4.3 0.1 8.2 1.7 8.3 7.7 0.5 16.8-29.1 48.4-54.9 67.5-22.2 16.6-37.9 23.8-47.8 27.3l-0.3 0.1c-3.3 0.8-6 2.1-11.3 1.7-3.6-0.6-6.7-2.2-6.8-7.2-0.3-8.4 8.9-20.9 14.2-28.7v-5c-6.7 8.4-17.4 22.2-17.4 33 0 6.2 3.5 10.9 12.7 11.3h0.6c7 0 21.2-3.4 41.7-16 30-18.3 72.4-55.2 72.4-83.3 0-5.6-2.9-11.7-12-11.7zm-57.3 85.4 4.9-4h-36.4l27.2-26.6 11.5 9.2 11.7-9.3 8.5 8.3 2.4-2.4-8.2-8.1 27.3-22.7v9.6l3.4-4.8v-10h-90.3v60.8h38zm-34.5-55.6 27.5 22.7-27.5 26.5v-49.2zm41.7 29.7-38.3-31.4h76.9l-38.6 31.4zm41.7-5.8v25.9l-12.7-12.9-2.6 2.3 12.6 12.4h-26.6l-4.7 3.9h37.4v-35.9l-3.4 4.3z';

interface EnveloMarkProps {
  size: string;
  /** Seconds after mount when the light sweep should cross the mark. */
  shineAt?: number;
  className?: string;
}

export function EnveloMark({ size, shineAt, className }: EnveloMarkProps) {
  const id = useId().replace(/:/g, '');
  const gradId = `silver-${id}`;
  const clipId = `clip-${id}`;
  return (
    <svg
      viewBox="0 0 144.7 144.7"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="15.62" x2="124.9" y1="118.2" y2="7.751" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9EA2A3" offset="0" />
          <stop stopColor="#E2E1E1" offset=".5" />
          <stop stopColor="#B3B6B7" offset="1" />
        </linearGradient>
        <linearGradient id={`${gradId}-shine`} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#ffffff" stopOpacity="0" offset="0" />
          <stop stopColor="#ffffff" stopOpacity="0.95" offset="0.5" />
          <stop stopColor="#ffffff" stopOpacity="0" offset="1" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={ENVELO_MARK_PATH} transform="translate(0 8.25)" />
        </clipPath>
      </defs>
      <g transform="translate(0 8.25)">
        <path fill={`url(#${gradId})`} d={ENVELO_MARK_PATH} />
      </g>
      {shineAt !== undefined && (
        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            y={-20}
            width={46}
            height={190}
            fill={`url(#${gradId}-shine)`}
            initial={{ attrX: -70, opacity: 0.9 }}
            animate={{ attrX: 190 }}
            transition={{ delay: shineAt, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            style={{ mixBlendMode: 'screen' }}
          />
        </g>
      )}
    </svg>
  );
}
