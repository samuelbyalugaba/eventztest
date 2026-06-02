import { useState } from 'react';
import { X, Play, ArrowLeft, Eye, Volume2, VolumeX } from 'lucide-react';
import { HighlightClip } from '../../types';

interface VideoPlayerOverlayProps {
  playingVideo: { postId: number; clipIndex: number; clips: HighlightClip[] };
  onClose: () => void;
}

export function VideoPlayerOverlay({ playingVideo, onClose }: VideoPlayerOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVideoTap, setLastVideoTap] = useState(0);
  const [rewindAnimation, setRewindAnimation] = useState<{ show: boolean; direction: 'left' | 'right' } | null>(null);
  const [videoTouchStart, setVideoTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(playingVideo.clipIndex);

  const currentClip = playingVideo.clips[currentClipIndex];

  return (
    <div className="fixed inset-0 bg-black z-[60]">
      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 pb-6 pt-[calc(3rem+var(--eventz-safe-area-top))] transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => { onClose(); }}
            className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          setVideoTouchStart({ x: touch.clientX, y: touch.clientY });
        }}
        onTouchEnd={(e) => {
          if (!videoTouchStart) return;
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - videoTouchStart.x;
          const deltaY = touch.clientY - videoTouchStart.y;
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && playingVideo.clips.length > 1) {
            if (deltaX > 0) {
              setCurrentClipIndex(currentClipIndex > 0 ? currentClipIndex - 1 : playingVideo.clips.length - 1);
            } else {
              setCurrentClipIndex(currentClipIndex < playingVideo.clips.length - 1 ? currentClipIndex + 1 : 0);
            }
          }
          setVideoTouchStart(null);
        }}
        onClick={(e) => {
          const currentTime = Date.now();
          const tapLength = currentTime - lastVideoTap;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const width = rect.width;

          if (tapLength < 300 && tapLength > 0) {
            const video = document.getElementById('highlight-video') as HTMLVideoElement;
            if (video) {
              if (clickX < width * 0.5) {
                video.currentTime = Math.max(0, video.currentTime - 10);
                setRewindAnimation({ show: true, direction: 'left' });
              } else {
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
                setRewindAnimation({ show: true, direction: 'right' });
              }
              setTimeout(() => setRewindAnimation(null), 800);
            }
            setLastVideoTap(0);
            return;
          }
          setLastVideoTap(currentTime);
          setTimeout(() => {
            if (Date.now() - currentTime < 280) return;
            if (playingVideo.clips.length > 1) {
              if (clickX < width * 0.3) {
                setCurrentClipIndex(currentClipIndex > 0 ? currentClipIndex - 1 : playingVideo.clips.length - 1);
                return;
              } else if (clickX > width * 0.7) {
                setCurrentClipIndex(currentClipIndex < playingVideo.clips.length - 1 ? currentClipIndex + 1 : 0);
                return;
              }
            }
            setShowControls(!showControls);
          }, 300);
        }}
      >
        <video
          id="highlight-video"
          src={currentClip.videoUrl}
          autoPlay
          controls={false}
          muted={isMuted}
          playsInline
          loop
          preload="metadata"
          className="w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onCanPlay={(e) => { e.currentTarget.play().catch(() => {}); }}
        />

        {/* Mute Button */}
        <div className={`absolute right-4 top-[calc(1rem+var(--eventz-safe-area-top))] z-20 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
        </div>
        {isMuted && (
          <div className={`absolute left-4 top-[calc(1rem+var(--eventz-safe-area-top))] z-20 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 text-white backdrop-blur-md">Tap to unmute</span>
          </div>
        )}

        {/* Play/Pause */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${showControls && !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Rewind/Forward Animation */}
        {rewindAnimation?.show && (
          <div className={`absolute inset-0 flex items-center ${rewindAnimation.direction === 'left' ? 'justify-start pl-12' : 'justify-end pr-12'} pointer-events-none`}>
            <div className="animate-rewindPulse">
              <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                {rewindAnimation.direction === 'left' ? (
                  <div className="flex items-center">
                    <ArrowLeft className="w-6 h-6 text-white -mr-2" />
                    <ArrowLeft className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Play className="w-6 h-6 text-white fill-white -mr-2 ml-1" />
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                )}
              </div>
              <span className="block text-center text-white text-xs font-bold mt-2 drop-shadow-lg">10s</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-8 pt-20 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">{currentClip.title}</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">
              {currentClip.views >= 1000 ? `${(currentClip.views / 1000).toFixed(1)}K` : currentClip.views}
            </span>
          </div>
          <span className="text-white/60">•</span>
          <span className="text-white text-sm font-medium">{currentClip.duration}</span>
        </div>
      </div>
    </div>
  );
}
