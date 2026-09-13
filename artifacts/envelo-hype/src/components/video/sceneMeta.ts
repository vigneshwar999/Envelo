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
  open: { title: 'Every invoice is open', filePath: 'src/components/video/video_scenes/Scene1_Open.tsx' },
  encrypt: { title: 'Encrypt', filePath: 'src/components/video/video_scenes/Scene2_Encrypt.tsx' },
  reveal: { title: 'Envelo', filePath: 'src/components/video/video_scenes/Scene3_Reveal.tsx' },
  seal: { title: '01 Seal', filePath: 'src/components/video/video_scenes/Scene4_Seal.tsx' },
  anchor: { title: '02 Anchor', filePath: 'src/components/video/video_scenes/Scene5_Anchor.tsx' },
  pay: { title: '03 Get paid', filePath: 'src/components/video/video_scenes/Scene6_Pay.tsx' },
  verify: { title: '04 Verify', filePath: 'src/components/video/video_scenes/Scene7_Verify.tsx' },
  claim: { title: 'Private by default', filePath: 'src/components/video/video_scenes/Scene8_Claim.tsx' },
  end: { title: 'End card', filePath: 'src/components/video/video_scenes/Scene9_End.tsx' },
};
