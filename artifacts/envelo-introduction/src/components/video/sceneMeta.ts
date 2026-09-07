// Optional scene metadata for Replit workspace integrations. When the
// workspace's scene controls are enabled for this project, a viewer's click on
// a scene segment scopes their next chat request to that scene's source file.
// Fill one entry per SCENE_DURATIONS key in VideoTemplate.tsx only when a
// skill reference asks for it; otherwise leave the map empty. Scenes missing
// from the map still play and can be jumped to.
//
// Example:
//   export const SCENE_DETAILS: Record<string, SceneDetails> = {
//     open: { title: 'Intro', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
//   };

export interface SceneDetails {
  title: string;
  filePath: string;
}

export const SCENE_DETAILS: Record<string, SceneDetails> = {
  problem: { title: 'The problem', filePath: 'src/components/video/video_scenes/Scene1_Problem.tsx' },
  reveal: { title: 'Meet Envelo', filePath: 'src/components/video/video_scenes/Scene2_Reveal.tsx' },
  seal: { title: '01 Seal', filePath: 'src/components/video/video_scenes/Scene3_Seal.tsx' },
  anchor: { title: '02 Anchor', filePath: 'src/components/video/video_scenes/Scene4_Anchor.tsx' },
  pay: { title: '03 Pay', filePath: 'src/components/video/video_scenes/Scene5_Pay.tsx' },
  verify: { title: '04 Grant & Verify', filePath: 'src/components/video/video_scenes/Scene6_GrantVerify.tsx' },
  arc: { title: 'Built on Arc', filePath: 'src/components/video/video_scenes/Scene7_Arc.tsx' },
  end: { title: 'End card', filePath: 'src/components/video/video_scenes/Scene8_End.tsx' },
};
