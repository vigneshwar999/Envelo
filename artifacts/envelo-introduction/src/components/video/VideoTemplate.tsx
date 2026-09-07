import { useEffect, useRef, type ComponentType } from 'react';
import { AnimatePresence } from 'framer-motion';

import { VideoCanvas, VideoPausedContext, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';

import { Atmosphere } from './ui/Atmosphere';
import { Scene1_Problem } from './video_scenes/Scene1_Problem';
import { Scene2_Reveal } from './video_scenes/Scene2_Reveal';
import { Scene3_Seal } from './video_scenes/Scene3_Seal';
import { Scene4_Anchor } from './video_scenes/Scene4_Anchor';
import { Scene5_Pay } from './video_scenes/Scene5_Pay';
import { Scene6_GrantVerify } from './video_scenes/Scene6_GrantVerify';
import { Scene7_Arc } from './video_scenes/Scene7_Arc';
import { Scene8_End } from './video_scenes/Scene8_End';

// The music bed in public/audio is cut to these exact scene starts.
export const SCENE_DURATIONS = {
  problem: 8000,
  reveal: 5000,
  seal: 10000,
  anchor: 9000,
  pay: 10000,
  verify: 8000,
  arc: 4500,
  end: 6000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  problem: Scene1_Problem,
  reveal: Scene2_Reveal,
  seal: Scene3_Seal,
  anchor: Scene4_Anchor,
  pay: Scene5_Pay,
  verify: Scene6_GrantVerify,
  arc: Scene7_Arc,
  end: Scene8_End,
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Seek only on scene transitions: resuming from pause must continue from
  // the frozen timestamp rather than snapping back to the scene start.
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
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#050505' }}>
        <Atmosphere sceneKey={baseSceneKey} />

        <AnimatePresence mode="popLayout">{SceneComponent && <SceneComponent key={currentSceneKey} />}</AnimatePresence>

        <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`} preload="auto" autoPlay muted={muted} />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
