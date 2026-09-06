import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

// Deterministic lattice in a 1920x1080 SVG space. Glow is drawn with radial
// gradients and wide low-opacity strokes rather than per-element blur filters:
// filters on ~100 animated SVG nodes starve the renderer and make the export
// lag behind its own scene clock.
const GRID_SIZE = 140;
const CENTER_X = 960;
const CENTER_Y = 540;
const CORE_RADIUS = 120;

const basePositions = [
  // Inner core
  [-1, -1], [1, -1], [-1, 1], [1, 1],
  // Cross
  [0, -2], [2, 0], [0, 2], [-2, 0],
  // Corners
  [-2, -2], [2, -2], [-2, 2], [2, 2],
  // Far edges
  [-3, -1], [-3, 1], [3, -1], [3, 1],
  [-1, -3], [1, -3], [-1, 3], [1, 3],
];

type Node = { id: number; x: number; y: number; driftX: number; driftY: number };

const generateNetwork = () => {
  const nodes: Node[] = basePositions.map((pos, i) => ({
    id: i,
    x: CENTER_X + pos[0] * GRID_SIZE,
    y: CENTER_Y + pos[1] * GRID_SIZE,
    driftX: Math.sin(i * 13.5) * 80, // deterministic jitter
    driftY: Math.cos(i * 21.1) * 80,
  }));

  // Orthogonal neighbours and short diagonals
  const connections: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < GRID_SIZE * 1.5) connections.push([i, j]);
    }
  }

  return { nodes, connections };
};

const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let x = 0; x <= 1920; x += GRID_SIZE) gridLines.push({ x1: x, y1: 0, x2: x, y2: 1080 });
for (let y = 0; y <= 1080; y += GRID_SIZE) gridLines.push({ x1: 0, y1: y, x2: 1920, y2: y });

const MOVE = { duration: 1.5, ease: 'easeInOut' } as const;

function NetworkWord({ text }: { text: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Soft dark backdrop keeps the word legible over the lattice lines */}
      <div
        className="absolute h-[16vw] w-[56vw]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0) 70%)',
        }}
      />
      <span className="relative font-display text-[5.2vw] font-medium tracking-[0.3em] text-transparent silver-gradient-text silver-glow-heavy">
        {text}
      </span>
    </motion.div>
  );
}

export function Scene1Network() {
  const [phase, setPhase] = useState(0);
  const [wordPhase, setWordPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000), // snap to lattice
      setTimeout(() => setPhase(2), 6000), // draw connections
      setTimeout(() => setPhase(3), 9000), // core forms
      setTimeout(() => setPhase(4), 10000), // lattice contracts onto the core
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Beats land at 10s / 13s / 16s overall (scene starts at 7s)
    const wordTimers = [
      setTimeout(() => setWordPhase(1), 3000), // PRIVACY in
      setTimeout(() => setWordPhase(2), 5200), // PRIVACY out
      setTimeout(() => setWordPhase(3), 6000), // SECURITY in
      setTimeout(() => setWordPhase(4), 8200), // SECURITY out
      setTimeout(() => setWordPhase(5), 9000), // CONTROL in
      setTimeout(() => setWordPhase(6), 11200), // CONTROL out
    ];
    return () => wordTimers.forEach(clearTimeout);
  }, []);

  const { nodes, connections } = useMemo(() => generateNetwork(), []);

  const getPos = (n: Node) => {
    if (phase >= 4) {
      const angle = (n.id / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return { x: CENTER_X + Math.cos(angle) * CORE_RADIUS, y: CENTER_Y + Math.sin(angle) * CORE_RADIUS };
    }
    if (phase === 0) return { x: n.x + n.driftX, y: n.y + n.driftY };
    return { x: n.x, y: n.y };
  };

  const linesVisible = phase >= 2 && phase < 4;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ perspective: '1500px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 1.2 }}
    >
      {/* Horizon carried over from the opening: the line the grid unfolds from */}
      <motion.div
        className="absolute inset-x-0 top-1/2 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2.6, ease: 'easeInOut' }}
      >
        <div
          className="absolute h-[5px] w-[92vw] rounded-full"
          style={{ background: 'rgba(250,250,250,0.35)', filter: 'blur(6px)' }}
        />
        <div
          className="absolute h-[1.5px] w-[92vw] rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(226,225,225,0) 0%, rgba(226,225,225,0.85) 18%, #FAFAFA 50%, rgba(226,225,225,0.85) 82%, rgba(226,225,225,0) 100%)',
          }}
        />
      </motion.div>

      {/* 3D stage: one continuous gentle push-in and drift */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ rotateX: 35, rotateY: -5, rotateZ: 0, scale: 0.9, z: -400 }}
        animate={{ rotateX: 45, rotateY: 5, rotateZ: phase >= 3 ? 0 : 5, scale: 1.1, z: 200 }}
        transition={{ duration: 12, ease: 'linear' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Far grid */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(-300px)' }}>
          <svg viewBox="0 0 1920 1080" className="w-full h-full">
            {gridLines.map((l, i) => (
              <line key={`far-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#E2E1E1" strokeWidth="1" opacity={0.1} />
            ))}
          </svg>
        </div>

        {/* Ground grid */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(0px)' }}>
          <svg viewBox="0 0 1920 1080" className="w-full h-full">
            {gridLines.map((l, i) => (
              <line key={`base-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#E2E1E1" strokeWidth="1" opacity={0.2} />
            ))}
          </svg>
        </div>

        {/* Network layer */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(100px)' }}>
          <svg viewBox="0 0 1920 1080" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id="nodeGlow">
                <stop offset="0%" stopColor="#FAFAFA" stopOpacity="0.9" />
                <stop offset="35%" stopColor="#FAFAFA" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#FAFAFA" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="coreGlow">
                <stop offset="0%" stopColor="#FAFAFA" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#FAFAFA" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FAFAFA" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Connections */}
            {connections.map(([n1, n2], i) => {
              const p1 = getPos(nodes[n1]);
              const p2 = getPos(nodes[n2]);
              const coords = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
              const pulsing = i % 3 === 0;
              return (
                <g key={`conn-${i}`}>
                  {/* Soft bloom: wide, faint stroke */}
                  <motion.line
                    {...coords}
                    stroke="#FAFAFA"
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={{ opacity: 0, ...coords }}
                    animate={{ opacity: linesVisible ? 0.12 : 0, ...coords }}
                    transition={MOVE}
                  />
                  <motion.line
                    {...coords}
                    stroke="#FAFAFA"
                    strokeWidth="1"
                    initial={{ opacity: 0, ...coords }}
                    animate={{ opacity: linesVisible ? 0.45 : 0, ...coords }}
                    transition={MOVE}
                  />
                  {pulsing && (
                    <motion.line
                      {...coords}
                      stroke="#FAFAFA"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, pathOffset: 0, opacity: 0, ...coords }}
                      animate={{
                        pathLength: linesVisible ? 0.25 : 0,
                        pathOffset: linesVisible ? 1 : 0,
                        opacity: linesVisible ? 0.9 : 0,
                        ...coords,
                      }}
                      transition={{
                        pathOffset: { duration: 1.6, repeat: Infinity, ease: 'linear', delay: (i % 5) * 0.25 },
                        opacity: { duration: 0.5 },
                        default: MOVE,
                      }}
                    />
                  )}
                </g>
              );
            })}

            {/* Core: forms on the CONTROL beat and stays for the contraction */}
            <motion.circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={CORE_RADIUS * 2.2}
              fill="url(#coreGlow)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <motion.circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={CORE_RADIUS}
              fill="none"
              stroke="#FAFAFA"
              strokeWidth="10"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: phase >= 3 ? 0.14 : 0, scale: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <motion.circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={CORE_RADIUS}
              fill="none"
              stroke="#FAFAFA"
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: phase >= 3 ? 0.85 : 0, scale: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />

            {/* Nodes */}
            {nodes.map((n) => {
              const pos = getPos(n);
              return (
                <g key={`node-${n.id}`}>
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="18"
                    fill="url(#nodeGlow)"
                    initial={{ opacity: 0, cx: pos.x, cy: pos.y }}
                    animate={{ opacity: 0.7, cx: pos.x, cy: pos.y }}
                    transition={MOVE}
                  />
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3.5"
                    fill="#FAFAFA"
                    initial={{ opacity: 0, cx: pos.x, cy: pos.y }}
                    animate={{ opacity: 0.95, cx: pos.x, cy: pos.y }}
                    transition={MOVE}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Near foreground: a few soft parallax points */}
        <div className="absolute inset-0" style={{ transform: 'translateZ(300px)' }}>
          <svg viewBox="0 0 1920 1080" className="w-full h-full overflow-visible">
            {nodes.slice(0, 4).map((n) => {
              const pos = getPos(n);
              return (
                <motion.circle
                  key={`fg-${n.id}`}
                  cx={pos.x + 250}
                  cy={pos.y + 150}
                  r="22"
                  fill="url(#nodeGlow)"
                  initial={{ opacity: 0, cx: pos.x + 250, cy: pos.y + 150 }}
                  animate={{ opacity: phase >= 4 ? 0 : 0.45, cx: pos.x + 250, cy: pos.y + 150 }}
                  transition={MOVE}
                />
              );
            })}
          </svg>
        </div>
      </motion.div>

      {/* Screen-space words */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {wordPhase === 1 && <NetworkWord key="W1" text="PRIVACY" />}
          {wordPhase === 3 && <NetworkWord key="W2" text="SECURITY" />}
          {wordPhase === 5 && <NetworkWord key="W3" text="CONTROL" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
