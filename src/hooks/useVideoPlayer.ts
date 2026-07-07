import { useState, useEffect, useRef, useCallback } from 'react';

export function useVideoPlayer(currentIndex: number, type: 'photo' | 'video') {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'rewind' | 'forward' | 'play' | 'pause' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const percentage = (video.currentTime / video.duration) * 100;
      setProgress(percentage);
      setCurrentTime(video.currentTime);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);
    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [currentIndex]);

  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
    }
  }, [currentIndex, type]);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(null), 500);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  useEffect(() => {
    if (isDragging) {
      const handleProgressMouseMove = (e: MouseEvent) => {
        if (!videoRef.current || type !== 'video' || !progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
      };

      const handleProgressMouseUp = () => {
        setIsDragging(false);
      };

      const handleProgressTouchMove = (e: TouchEvent) => {
        if (!videoRef.current || type !== 'video' || !progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
      };

      const handleProgressTouchEnd = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      window.addEventListener('touchmove', handleProgressTouchMove);
      window.addEventListener('touchend', handleProgressTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleProgressMouseMove);
        window.removeEventListener('mouseup', handleProgressMouseUp);
        window.removeEventListener('touchmove', handleProgressTouchMove);
        window.removeEventListener('touchend', handleProgressTouchEnd);
      };
    }
  }, [isDragging, type]);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setShowFeedback('pause');
      } else {
        videoRef.current.play();
        setShowFeedback('play');
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const rewind = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setShowFeedback('rewind');
    }
  }, []);

  const forward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      setShowFeedback('forward');
    }
  }, []);

  const handleVideoTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (type !== 'video') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      rewind();
    } else if (x > (2 * width) / 3) {
      forward();
    } else {
      togglePlayPause();
    }
  }, [type, rewind, forward, togglePlayPause]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || type !== 'video') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  }, [type]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (type !== 'video') return;
    e.stopPropagation();
    setIsDragging(true);
    handleProgressClick(e);
  }, [type, handleProgressClick]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (type !== 'video' || !videoRef.current) return;
    e.stopPropagation();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  }, [type]);

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    videoRef,
    progressBarRef,
    isPlaying,
    isMuted,
    progress,
    currentTime,
    duration,
    showFeedback,
    isBuffering,
    setIsBuffering,
    setIsPlaying,
    togglePlayPause,
    toggleMute,
    rewind,
    forward,
    handleVideoTap,
    handleProgressMouseDown,
    handleProgressTouchStart,
    formatTime,
  };
}
