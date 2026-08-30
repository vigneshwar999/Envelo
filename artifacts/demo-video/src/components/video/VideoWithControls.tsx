import { useEffect, useRef, useState } from 'react';

/**
 * Export-surface readiness gate. The recording pipeline starts the moment
 * VideoTemplate mounts (useVideoPlayer calls window.startRecording in its
 * mount effect - hooks.ts must not be modified), so on a direct load we
 * hold the mount until the composite audio track is actually playable.
 * Otherwise a slow first fetch starts the scene clock ahead of the audio,
 * and the first scene-boundary resync would cut off scene 1's narration.
 * Bounded by a timeout: a missing/broken audio file degrades to a silent
 * video (loudly logged) instead of blocking the export forever.
 */
function useCompositeAudioReady(enabled: boolean): boolean {
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    const probe = new Audio();
    probe.preload = 'auto';
    probe.src = `${import.meta.env.BASE_URL}audio/composite_audio.mp3`;
    let done = false;
    let timer = 0;
    const finish = (why: string, ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (!ok) {
        console.error(`[video] composite audio not ready (${why}); starting visuals without audio guarantee`);
      }
      setReady(true);
    };
    timer = window.setTimeout(() => finish('timeout after 8s', false), 8000);
    probe.addEventListener('canplaythrough', () => finish('ok', true), { once: true });
    probe.addEventListener('error', () => finish('load error', false), { once: true });
    probe.load();
    return () => {
      done = true;
      window.clearTimeout(timer);
      probe.src = '';
    };
  }, [enabled]);
  return ready;
}
import {
  ChevronDown,
  ChevronUp,
  Lock,
  LockOpen,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  seal: {
    title: 'Seal',
    filePath: 'src/components/video/video_scenes/Scene1Seal.tsx',
  },
  anchor: {
    title: 'Anchor',
    filePath: 'src/components/video/video_scenes/Scene2Anchor.tsx',
  },
  pay: {
    title: 'Pay',
    filePath: 'src/components/video/video_scenes/Scene3Pay.tsx',
  },
  share: {
    title: 'Share',
    filePath: 'src/components/video/video_scenes/Scene4Share.tsx',
  },
  verify: {
    title: 'Verify',
    filePath: 'src/components/video/video_scenes/Scene5Verify.tsx',
  },
  outro: {
    title: 'Outro',
    filePath: 'src/components/video/video_scenes/Scene6Outro.tsx',
  },
};

/**
 * Tell the workspace which scene the user picked so "edit this scene"
 * requests can be routed to the right file. Only called for explicit user
 * clicks, never for automatic playback rotation.
 */
function announceSceneSelection(sceneKey: string) {
  const detail = SCENE_DETAILS[sceneKey];
  if (!detail) return;
  try {
    window.parent?.postMessage(
      {
        type: 'REPLIT_VIDEO_SCENE_SELECTED',
        sceneId: sceneKey,
        sceneTitle: detail.title,
        filePath: detail.filePath,
      },
      '*',
    );
  } catch {
    // Best effort -- a cross-origin parent must not break playback.
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoWithControls() {
  // Controls only exist inside the workspace preview iframe. A direct page
  // load (the export recorder) gets the bare video with default timing.
  const [inIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);

  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const compositeReady = useCompositeAudioReady(!inIframe);

  // Pause-aware elapsed time within the active scene, for the progress bar.
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const sceneStartRef = useRef(performance.now());
  const frozenElapsedRef = useRef(0);

  useEffect(() => {
    sceneStartRef.current = performance.now();
    frozenElapsedRef.current = 0;
    setSceneElapsed(0);
  }, [tick, mountKey]);

  useEffect(() => {
    if (paused) {
      frozenElapsedRef.current = performance.now() - sceneStartRef.current;
      return;
    }
    sceneStartRef.current = performance.now() - frozenElapsedRef.current;
    let raf = 0;
    const step = () => {
      setSceneElapsed(performance.now() - sceneStartRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, tick, mountKey]);

  // Freeze/resume CSS and Web Animations API animations on pause. Framer
  // Motion timers are handled separately via VideoPausedContext + the
  // player hook stopping scene rotation.
  useEffect(() => {
    if (!paused) {
      document.getAnimations().forEach((animation) => {
        if (animation.playState === 'paused') {
          try {
            animation.play();
          } catch {
            // Animation may have finished; ignore.
          }
        }
      });
      return;
    }
    const freeze = () => {
      document.getAnimations().forEach((animation) => {
        if (animation.playState === 'running') {
          try {
            animation.pause();
          } catch {
            // Transient animations can throw mid-teardown; ignore.
          }
        }
      });
    };
    freeze();
    // Keep catching animations that start after the pause (e.g. delayed).
    const interval = window.setInterval(freeze, 250);
    return () => window.clearInterval(interval);
  }, [paused]);

  const clampedElapsed = Math.min(sceneElapsed, activeDuration);
  const totalElapsed = Math.min(activeStartTime + clampedElapsed, totalDuration);

  const video = (
    <VideoTemplate
      key={mountKey}
      durations={durations}
      loop
      paused={paused}
      muted={muted}
      // Iframe preview keeps the live two-layer mix (independent narration
      // restarts for scene jumps/locks); a direct load - which is exactly
      // what the export recorder captures - plays one continuous pre-mixed
      // track, so the recorder never has to time per-scene source swaps.
      audioMode={inIframe ? 'layers' : 'composite'}
      onSceneChange={onSceneChange}
    />
  );

  if (!inIframe) {
    // Hold a blank frame until the composite can play through, so recording
    // and the scene clock never start ahead of the audio (see the gate hook).
    if (!compositeReady) {
      return (
        <div
          className="w-full h-screen"
          style={{ backgroundColor: 'var(--color-bg-light)' }}
        />
      );
    }
    return video;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {video}

      {/* Hover sensor: bottom quarter of the frame reveals the control bar. */}
      <div
        className="absolute inset-x-0 bottom-0 z-[100]"
        style={{ height: '25%' }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => {
          setVisible(false);
          setCollapsed(false);
        }}
      >
        {visible && collapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              type="button"
              aria-label="Expand controls"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center rounded-full bg-neutral-900/85 text-white/90 shadow-2xl backdrop-blur px-3 py-2 hover:text-white"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        )}

        {visible && !collapsed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full bg-neutral-900/85 text-white shadow-2xl backdrop-blur pl-3 pr-4 py-2">
              <button
                type="button"
                aria-label={paused ? 'Play' : 'Pause'}
                onClick={togglePause}
                className="flex items-center justify-center rounded-full p-1.5 text-white/90 hover:text-white hover:bg-white/10"
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>

              <button
                type="button"
                aria-label={locked ? 'Unlock scene' : 'Lock this scene'}
                title={
                  locked
                    ? 'Resume the full loop'
                    : 'Repeat only the current scene'
                }
                onClick={() => {
                  toggleLock();
                  announceSceneSelection(sceneKeys[activeIndex]);
                }}
                className={`flex items-center justify-center rounded-full p-1.5 hover:bg-white/10 ${
                  locked ? 'text-amber-400' : 'text-white/90 hover:text-white'
                }`}
              >
                {locked ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>

              <button
                type="button"
                aria-label={muted ? 'Unmute music' : 'Mute music'}
                onClick={() => setMuted((m) => !m)}
                className="flex items-center justify-center rounded-full p-1.5 text-white/90 hover:text-white hover:bg-white/10"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <div className="h-4 w-px bg-white/25" />

              <div className="flex items-center gap-1" style={{ width: 220 }}>
                {sceneKeys.map((key, i) => {
                  const fill =
                    i < activeIndex
                      ? 100
                      : i === activeIndex
                        ? activeDuration > 0
                          ? (clampedElapsed / activeDuration) * 100
                          : 0
                        : 0;
                  const dimmed = locked && i !== activeIndex;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`Go to scene ${i + 1}: ${
                        SCENE_DETAILS[key]?.title ?? key
                      }`}
                      title={SCENE_DETAILS[key]?.title ?? key}
                      onClick={() => {
                        jumpTo(i);
                        announceSceneSelection(key);
                      }}
                      className="group relative h-4 flex items-center"
                      style={{ flexGrow: SCENE_DURATIONS[key], minWidth: 12 }}
                    >
                      <span
                        className={`block w-full h-1 rounded-full overflow-hidden ${
                          dimmed ? 'bg-white/10' : 'bg-white/25'
                        } group-hover:h-1.5 transition-all`}
                      >
                        <span
                          className="block h-full bg-amber-400"
                          style={{ width: `${fill}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono tabular-nums text-white/80 whitespace-nowrap">
                {activeIndex + 1} / {sceneKeys.length}
              </span>

              <span className="text-[11px] font-mono tabular-nums text-white/60 whitespace-nowrap">
                {formatTime(totalElapsed)} / {formatTime(totalDuration)}
              </span>

              <button
                type="button"
                aria-label="Collapse controls"
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
