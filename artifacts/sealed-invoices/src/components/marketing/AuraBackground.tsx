import { useEffect } from 'react';

/**
 * TEMPORARY background experiment — aura.build component 48BBD67
 * (UnicornStudio WebGL scene). Swap back to <Background /> to restore
 * the Nebula grid/dots background.
 */
const PROJECT_ID = 'uFY4IYPs2LU8fWm96Im2';
const SCRIPT_SRC =
  'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init: () => void;
      destroy?: () => void;
    };
  }
}

export function AuraBackground() {
  useEffect(() => {
    const boot = () => {
      try {
        window.UnicornStudio?.init();
        if (window.UnicornStudio) window.UnicornStudio.isInitialized = true;
      } catch {
        // scene init failed — background simply stays dark
      }
    };

    if (window.UnicornStudio) {
      boot();
    } else {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = boot;
      document.head.appendChild(script);
    }

    return () => {
      try {
        window.UnicornStudio?.destroy?.();
      } catch {
        // ignore teardown errors
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background"
      data-testid="aura-background"
    >
      <div data-us-project={PROJECT_ID} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
