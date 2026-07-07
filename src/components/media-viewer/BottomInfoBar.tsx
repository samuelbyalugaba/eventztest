import { RotateCcw, RotateCw, Play, Pause } from 'lucide-react';
import type { Photo, VideoClip } from './types';

interface BottomInfoBarProps {
  type: 'photo' | 'video';
  media: Photo | VideoClip;
  currentIndex: number;
  total: number;
  isPlaying: boolean;
  isYoutubeVideo: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  progressBarRef: React.RefObject<HTMLDivElement>;
  onProgressMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onProgressTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  formatTime: (seconds: number) => string;
}

export function BottomInfoBar({
  type,
  media,
  currentIndex,
  total,
  isPlaying,
  isYoutubeVideo,
  progress,
  currentTime,
  duration,
  progressBarRef,
  onProgressMouseDown,
  onProgressTouchStart,
  formatTime,
}: BottomInfoBarProps) {
  const eventName = type === 'photo'
    ? (media as Photo).eventName
    : ((media as VideoClip).eventName || 'Highlight');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-24 px-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
      <div className="mb-4">
        <h3 className="text-white font-semibold mb-1 line-clamp-2 drop-shadow-lg">
          {eventName}
        </h3>
        <p className="text-white/70 text-xs drop-shadow-lg">
          {currentIndex + 1} / {total}
        </p>
      </div>

      {type === 'video' && !isYoutubeVideo && (
        <div className="space-y-2">
          <div
            ref={progressBarRef}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer group"
            onMouseDown={onProgressMouseDown}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onProgressTouchStart}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          <div className="flex items-center justify-between text-white/80 text-xs">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-6 text-white/50 text-xs mt-2">
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Tap left -10s
            </span>
            <span className="flex items-center gap-1">
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              Tap center
            </span>
            <span className="flex items-center gap-1">
              <RotateCw className="w-3 h-3" />
              Tap right +10s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
