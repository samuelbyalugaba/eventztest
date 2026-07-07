import { RotateCcw, RotateCw, Play, Pause } from 'lucide-react';
import type { VideoClip } from './types';

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  media: VideoClip;
  isMuted: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  showFeedback: 'rewind' | 'forward' | 'play' | 'pause' | null;
  onBufferingChange: (v: boolean) => void;
  onPlayingChange: (v: boolean) => void;
  onVideoTap: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function VideoPlayer({
  videoRef,
  media,
  isMuted,
  isPlaying,
  isBuffering,
  showFeedback,
  onBufferingChange,
  onPlayingChange,
  onVideoTap,
}: VideoPlayerProps) {
  const isYoutube = media.videoUrl.includes('youtube.com') || media.videoUrl.includes('youtu.be');

  return (
    <div className="w-full h-full relative" onClick={onVideoTap}>
      {isYoutube ? (
        <iframe
          src={`${media.videoUrl}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&playsinline=1&loop=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 'none' }}
        />
      ) : (
        <video
          ref={videoRef}
          src={media.videoUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          disableRemotePlayback
          poster={media.thumbnail}
          onWaiting={() => onBufferingChange(true)}
          onPlaying={() => {
            onBufferingChange(false);
            onPlayingChange(true);
          }}
          onCanPlay={() => onBufferingChange(false)}
          onPause={() => onPlayingChange(false)}
          className="w-full h-full object-cover"
        />
      )}

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {showFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 animate-feedback">
            {showFeedback === 'rewind' && <RotateCcw className="w-6 h-6 text-white" />}
            {showFeedback === 'forward' && <RotateCw className="w-6 h-6 text-white" />}
            {showFeedback === 'play' && <Play className="w-6 h-6 text-white fill-white" />}
            {showFeedback === 'pause' && <Pause className="w-6 h-6 text-white fill-white" />}
          </div>
        </div>
      )}

      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-2xl">
            <Play className="w-10 h-10 text-gray-900 fill-gray-900 ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
