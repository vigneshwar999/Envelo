import { useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { VideoCanvas, VideoPausedContext, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';

import { Lockup, type LockupState } from './Lockup';
import { CameraRig, ChapterProgress, ImpactFlash, SealWipe, type CutKind } from './Overlays';
import { Atmosphere } from './ui/Atmosphere';
import { paced } from './pace';
import { useBeats } from './ui/useBeats';
import { Scene1_Open } from './video_scenes/Scene1_Open';
import { Scene2_Encrypt } from './video_scenes/Scene2_Encrypt';
import { Scene3_Reveal } from './video_scenes/Scene3_Reveal';
import { Scene4_Seal } from './video_scenes/Scene4_Seal';
import { Scene5_Anchor } from './video_scenes/Scene5_Anchor';
import { Scene6_Pay } from './video_scenes/Scene6_Pay';
import { Scene7_Verify } from './video_scenes/Scene7_Verify';
import { Scene8_Claim } from './video_scenes/Scene8_Claim';
import { Scene9_End } from './video_scenes/Scene9_End';

// Scene lengths are the fast cut's values stretched by PACE (see pace.ts);
// the beats inside each scene stretch the same way through useBeats. The
// music in public/audio is cut so its drop lands exactly on `reveal`
// (9.00 s at PACE 1.5).
export const SCENE_DURATIONS = {
  open: paced(3240),
  encrypt: paced(2760),
  reveal: paced(3870),
  seal: paced(2420),
  anchor: paced(2900),
  pay: paced(2910),
  verify: paced(2640),
  claim: paced(2460),
  end: paced(3800),
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  open: Scene1_Open,
  encrypt: Scene2_Encrypt,
  reveal: Scene3_Reveal,
  seal: Scene4_Seal,
  anchor: Scene5_Anchor,
  pay: Scene6_Pay,
  verify: Scene7_Verify,
  claim: Scene8_Claim,
  end: Scene9_End,
};

// How each scene's opening cut hits, and where the brand sits during it.
const CUT_KIND: Record<string, CutKind> = {
  open: 'none',
  encrypt: 'none',
  reveal: 'drop',
  seal: 'chapter',
  anchor: 'chapter',
  pay: 'chapter',
  verify: 'chapter',
  claim: 'claim',
  end: 'end',
};

const LOCKUP_STATE: Record<string, LockupState> = {
  open: 'hidden',
  encrypt: 'hidden',
  reveal: 'hero',
  seal: 'corner',
  anchor: 'corner',
  pay: 'corner',
  verify: 'corner',
  claim: 'hidden',
  end: 'end',
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
const SYNC_INTERVAL_MS = 200;
const SYNC_HARD_SEEK_SEC = 0.35;
// Quiet opening window (the whole `open` scene) where a snap seek is inaudible.
const SYNC_OPENING_SEC = SCENE_START_SEC.encrypt - 0.05;
const SYNC_OPENING_SEEK_SEC = 0.05;
const SYNC_DEADBAND_SEC = 0.012;
const SYNC_MAX_RATE = 0.06;
const SYNC_GAIN = 0.7;

/** Final fade to black, timed from the end scene's mount. */
function EndFade() {
  // The beat is paced but the 600 ms fade is not, so the picture is fully
  // black 750 ms before the last scene ends and neither the export stop nor
  // the preview loop ever catches the end card mid-fade.
  const beat = useBeats([2900]);
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ background: '#050505', zIndex: 50 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: beat >= 0 ? 1 : 0 }}
      transition={{ duration: 0.6, ease: 'easeIn' }}
    />
  );
}

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
  const cutKind = CUT_KIND[baseSceneKey] ?? 'none';
  const lockupState = LOCKUP_STATE[baseSceneKey] ?? 'hidden';

  // Every scene change is a new cut for the camera, the flash and the wipe.
  const [cutId, setCutId] = useState(0);
  const [shineKey, setShineKey] = useState(0);
  const prevSceneRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSceneRef.current === currentSceneKey) return;
    prevSceneRef.current = currentSceneKey;
    setCutId((n) => n + 1);
    if (lockupState === 'hero' || lockupState === 'end') setShineKey((n) => n + 1);
  }, [currentSceneKey, lockupState]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Seek only on scene transitions: resuming from pause must continue from
  // the frozen timestamp rather than snapping back to the scene start.
  const lastSceneKeyRef = useRef<string | null>(null);
  // Where the music should be, anchored to the moment each scene's effects
  // (and therefore its beat timers) started.
  const syncOriginRef = useRef<{ nominalSec: number; wallMs: number } | null>(null);

  // The preview control bar remounts the whole template on scene jumps, so
  // silence the outgoing element explicitly instead of trusting DOM removal.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.playbackRate = 1;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    audio.preservesPitch = true;
    if (paused) {
      audio.pause();
      syncOriginRef.current = null;
      return;
    }
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
      syncOriginRef.current = { nominalSec: targetTime, wallMs: performance.now() };
    } else {
      // Resumed from pause: keep the music where it froze.
      syncOriginRef.current = { nominalSec: audio.currentTime, wallMs: performance.now() };
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  // Scene cuts are a chain of timers, so the picture slips a few tens of
  // milliseconds behind the music at every cut. Instead of seeking (which
  // repeats or skips a slice of the beat), nudge the playback rate by a few
  // percent until the music is back under the picture. Big errors (scene
  // jumps, stalled loads) still hard-seek.
  useEffect(() => {
    const audio = audioRef.current;
    if (paused || !audio) return;
    let raf = 0;
    let lastCheck = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const origin = syncOriginRef.current;
      if (!origin || audio.paused || audio.readyState < 2 || now - lastCheck < SYNC_INTERVAL_MS) return;
      lastCheck = now;
      const target = origin.nominalSec + (now - origin.wallMs) / 1000;
      const error = audio.currentTime - target; // positive = music ahead of the picture
      // The quiet opening tolerates a seek, so snap a slow audio start there
      // instead of chasing it through the first slams.
      const hardSeek = target < SYNC_OPENING_SEC ? SYNC_OPENING_SEEK_SEC : SYNC_HARD_SEEK_SEC;
      if (Math.abs(error) > hardSeek) {
        audio.currentTime = target;
        audio.playbackRate = 1;
        return;
      }
      const rate = Math.abs(error) < SYNC_DEADBAND_SEC ? 1 : Math.min(1 + SYNC_MAX_RATE, Math.max(1 - SYNC_MAX_RATE, 1 - error * SYNC_GAIN));
      if (Math.abs(audio.playbackRate - rate) > 0.003) audio.playbackRate = rate;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio.playbackRate = 1;
    };
  }, [paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#050505', overflow: 'hidden' }}>
        <CameraRig cutId={cutId} kind={cutKind}>
          <Atmosphere sceneKey={baseSceneKey} />
          <AnimatePresence mode="popLayout">{SceneComponent && <SceneComponent key={currentSceneKey} />}</AnimatePresence>
          <Lockup state={lockupState} shineKey={shineKey} />
          <ChapterProgress sceneKey={baseSceneKey} />
        </CameraRig>

        <SealWipe cutId={cutId} kind={cutKind} />
        <ImpactFlash cutId={cutId} kind={cutKind} />
        {baseSceneKey === 'end' && <EndFade key={currentSceneKey} />}

        <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`} preload="auto" autoPlay muted={muted} />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
