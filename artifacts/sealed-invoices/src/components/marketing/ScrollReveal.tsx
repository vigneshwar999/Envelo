import { motion, useReducedMotion } from "framer-motion";
import React from "react";

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
  direction = "up"
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "down";
}) {
  const reduceMotion = useReducedMotion();
  const yOffset = direction === "up" ? 30 : direction === "down" ? -30 : 0;
  const xOffset = direction === "left" ? 30 : direction === "right" ? -30 : 0;

  // Fail open: with reduced motion (or when the in-view observer never
  // fires), content must not be trapped at opacity 0.
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, x: xOffset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
