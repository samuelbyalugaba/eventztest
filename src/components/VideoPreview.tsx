import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

interface VideoPreviewProps {
  src?: string;
  poster?: string;
  alt?: string;
  className?: string;
}

export function VideoPreview({ src, poster, alt, className }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLowInternet, setIsLowInternet] = useState(false);

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateConnection = () => {
        setIsLowInternet(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.saveData);
      };
      connection.addEventListener('change', updateConnection);
      updateConnection();
      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);

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
        setIsHovering(true);
        videoRef.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setIsHovering(false);
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
        preload={isLowInternet ? "none" : "metadata"}
        onError={() => setImageError(true)}
      />
      
      
    </div>
  );
}
