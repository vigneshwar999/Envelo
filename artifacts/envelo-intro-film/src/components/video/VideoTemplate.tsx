import { useEffect, useRef, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  VideoCanvas,
  VideoPausedContext,
  useVideoPlayer,
  type VideoAspectRatio,
} from '@/lib/video';

import { Scene0Opening } from './video_scenes/Scene0Opening';
import { Scene1Network } from './video_scenes/Scene1Network';
import { Scene2Reveal } from './video_scenes/Scene2Reveal';
import { Scene3Outro } from './video_scenes/Scene3Outro';
import { Particles } from './video_scenes/Particles';

export const SCENE_DURATIONS = {
  opening: 7000,
  network: 12000,
  reveal: 8000,
  outro: 7000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  opening: Scene0Opening,
  network: Scene1Network,
  reveal: Scene2Reveal,
  outro: Scene3Outro,
};

// Shared ambient layers shift with the scene so cuts read as camera moves
// through one space rather than separate pages.
// The volumetric light is a fixed 60vw disc scaled per scene: animating a
// transform keeps the 120px blur rasterised once instead of on every frame.
const AMBIENT_BY_SCENE: Record<string, { particles: number; lightScale: number; light: number }> = {
  opening: { particles: 0.3, lightScale: 0.5, light: 0 },
  network: { particles: 0.6, lightScale: 0.75, light: 0.3 },
  reveal: { particles: 0.8, lightScale: 1, light: 0.6 },
  outro: { particles: 0.2, lightScale: 0.75, light: 0.4 },
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  // Scene-lock playback repeats one scene under `_r1`/`_r2` keys.
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];
  const ambient = AMBIENT_BY_SCENE[baseSceneKey] ?? AMBIENT_BY_SCENE.network;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Seek only on scene transitions -- resuming from pause must continue from
  // the frozen timestamp, not snap back to the scene start.
  const lastSceneKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        aspectRatio={VIDEO_ASPECT_RATIO}
        style={{ backgroundColor: 'var(--color-bg-dark)' }}
      >
        {/* Persistent ambient layers */}
        <div className="absolute inset-0 bg-noise opacity-50" />

        <motion.div
          className="absolute inset-0"
          animate={{ opacity: ambient.particles }}
          transition={{ duration: 3 }}
        >
          <Particles count={50} />
        </motion.div>

        {/* Volumetric silver light, persists and shifts across scenes */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none"
          initial={{ x: '-50%', y: '-50%', scale: ambient.lightScale, opacity: 0 }}
          animate={{
            x: '-50%',
            y: '-50%',
            scale: ambient.lightScale,
            opacity: ambient.light,
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />

        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>

        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
