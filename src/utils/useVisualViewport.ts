import { useEffect, useState } from 'react';

type VisualViewportOffsets = {
  offsetTop: number;
  offsetBottom: number;
  height: number;
};

export function useVisualViewport(): VisualViewportOffsets {
  const [state, setState] = useState<VisualViewportOffsets>(() => ({
    offsetTop: 0,
    offsetBottom: 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const offsetTop = vv.offsetTop || 0;
      const height = vv.height || window.innerHeight;
      const offsetBottom = Math.max(0, window.innerHeight - height - offsetTop);
      setState({ offsetTop, offsetBottom, height });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}
