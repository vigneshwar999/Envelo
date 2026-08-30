import { useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence } from 'framer-motion';

import { useVideoPlayer, VideoPausedContext } from '@/lib/video';

import { Scene1Seal } from './video_scenes/Scene1Seal';
import { Scene2Anchor } from './video_scenes/Scene2Anchor';
import { Scene3Pay } from './video_scenes/Scene3Pay';
import { Scene4Share } from './video_scenes/Scene4Share';
import { Scene5Verify } from './video_scenes/Scene5Verify';
import { Scene6Outro } from './video_scenes/Scene6Outro';
import { PersistentElements } from './video_scenes/PersistentElements';

export const SCENE_DURATIONS: Record<string, number> = {
  seal: 10000,
  anchor: 10000,
  pay: 10000,
  share: 10000,
  verify: 10000,
  outro: 10000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  seal: Scene1Seal,
  anchor: Scene2Anchor,
  pay: Scene3Pay,
  share: Scene4Share,
  verify: Scene5Verify,
  outro: Scene6Outro,
};

// Canonical start offset (in seconds) of each scene, for audio sync.
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

// Background music sits at MUSIC_VOLUME and ducks to MUSIC_VOLUME_DUCKED
// while a narration clip is audible, so the spoken line stays intelligible.
const MUSIC_VOLUME = 0.45;
const MUSIC_VOLUME_DUCKED = 0.25;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  audioMode = 'composite',
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  /**
   * 'composite': one pre-mixed track (music + narration, ducking baked in).
   * The DEFAULT, because a bare <VideoTemplate /> is what the export
   * recorder captures, and per-scene <audio src> swaps are the one surface
   * that can drift in recorded exports. 'layers' keeps the live two-element
   * mix (music + per-scene VO with dynamic ducking) for the interactive
   * iframe preview, where scene jumps and scene-lock replays need
   * independent narration restarts.
   */
  audioMode?: 'composite' | 'layers';
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  // Scene-lock uses _r1/_r2 suffixed keys; strip them to resolve the scene.
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voRef = useRef<HTMLAudioElement | null>(null);
  // Seek only on scene transitions -- resuming from pause must continue from
  // the frozen timestamp, not snap back to the scene start.
  const lastSceneKeyRef = useRef<string | null>(null);
  const lastVoSceneKeyRef = useRef<string | null>(null);
  // True while a narration clip is audibly playing; ducks the music bed.
  const [narrationPlaying, setNarrationPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // The composite is already mixed at final levels; only the layered mode
    // runs music at bed volume with live ducking under narration.
    audio.volume =
      audioMode === 'composite' ? 1 : narrationPlaying ? MUSIC_VOLUME_DUCKED : MUSIC_VOLUME;
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
    audio.play().catch((err) => {
      // On the export surface a failed play means a silent recording - make
      // it visible in the console. AbortError is the benign interrupted-by-
      // pause/new-load case; in the iframe preview, autoplay blocks before
      // the first user gesture are expected and stay quiet.
      if (audioMode === 'composite' && (err as DOMException)?.name !== 'AbortError') {
        console.error('[video] composite audio play failed:', err);
      }
    });
  }, [currentSceneKey, baseSceneKey, muted, paused, narrationPlaying, audioMode]);

  // Narration is cut per scene (public/audio/vo/<scene>.mp3), so every scene
  // transition -- including scene-lock _r1/_r2 replays -- restarts the clip.
  // Resuming from pause continues from the frozen timestamp instead.
  useEffect(() => {
    const vo = voRef.current;
    if (!vo) return;
    if (paused) {
      vo.pause();
      return;
    }
    if (lastVoSceneKeyRef.current !== currentSceneKey) {
      lastVoSceneKeyRef.current = currentSceneKey;
      // A replay of the same scene keeps the same src, so rewind explicitly;
      // a real scene change swaps src, which resets the clip on its own.
      vo.currentTime = 0;
    }
    vo.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <div
        className="w-full h-screen overflow-hidden relative"
        style={{ backgroundColor: 'var(--color-bg-light)' }}
      >
        <PersistentElements currentScene={sceneIndex} />

        {/* mode="popLayout" = new snaps in while old animates out */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>

        <div className="absolute bottom-4 right-6 text-[1vw] text-text-muted font-mono opacity-60 z-50">
          Arc testnet - test USDC, not real money
        </div>

        {/* Composite mode: ONE element, ONE src for the whole runtime - no
            src swaps for the export recorder to mistime. The seek-on-scene-
            change effect above still applies (the 60s composite mirrors the
            scene timeline), so loops and direct-load scene jumps stay
            aligned. */}
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/${audioMode === 'composite' ? 'composite_audio.mp3' : 'bg_music.mp3'}`}
          preload="auto"
          autoPlay
          muted={muted}
        />

        {/* Per-scene voice-over (layered preview only): clips are cut per
            scene so narration can never drift more than one scene from the
            visuals, and scene-lock replays restart their own line. */}
        {audioMode === 'layers' && (
          <audio
            ref={voRef}
            src={`${import.meta.env.BASE_URL}audio/vo/${baseSceneKey}.mp3`}
            preload="auto"
            autoPlay
            muted={muted}
            onPlay={() => setNarrationPlaying(true)}
            onPause={() => setNarrationPlaying(false)}
            onEnded={() => setNarrationPlaying(false)}
            onError={() => setNarrationPlaying(false)}
          />
        )}
      </div>
    </VideoPausedContext.Provider>
  );
}
