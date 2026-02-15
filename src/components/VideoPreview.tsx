import { useState, useRef } from 'react';
import { Play } from 'lucide-react';

interface VideoPreviewProps {
  src?: string;
  poster?: string;
  alt?: string;
  className?: string;
}

export function VideoPreview({ src, poster, alt, className }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageError, setImageError] = useState(false);

  // Helper to check for YouTube
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = src ? getYoutubeId(src) : null;

  if (!src) {
    return (
      <div className={`relative ${className} bg-gray-200 flex items-center justify-center`}>
        <Play className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (youtubeId) {
    return (
      <div className={`relative ${className} bg-black group overflow-hidden`}>
        <img 
          src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
          alt={alt || "Video thumbnail"}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative ${className} bg-gray-900 group overflow-hidden`}
      onMouseEnter={() => {
        videoRef.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        videoRef.current?.pause();
        if (videoRef.current) videoRef.current.currentTime = 0;
      }}
    >
      <video
        ref={videoRef}
        src={`${src}#t=0.1`}
        poster={!imageError ? poster : undefined}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        muted
        playsInline
        loop
        preload="metadata"
        onError={() => setImageError(true)}
      />
      
      
    </div>
  );
}
