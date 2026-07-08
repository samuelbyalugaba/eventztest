import { useState } from 'react';

export type HighlightClip = {
  file: File;
  url: string;
  startTime: number;
  endTime: number;
};

export function useHighlightCreation() {
  const [clips, setClips] = useState<HighlightClip[]>([]);

  return {
    clips,
    setClips,
  };
}
