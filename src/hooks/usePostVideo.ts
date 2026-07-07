import { useState, useEffect, useRef, useCallback } from 'react';
import { useFullscreen } from './useFullscreen';

export function usePostVideo(
  postId: number,
  isLowInternet: boolean,
  isPaused: boolean,
  carouselIndex: number,
  isCurrentMediaVideo: boolean,
  currentVideoSrc: string | undefined
) {
  const [isMuted, setIsMuted] = useState(false);
  const [, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const enterFullscreen = useFullscreen();

  const requestVideoFullscreen = useCallback(
    async (videoEl: HTMLVideoElement) => {
      const isFullscreen = () =>
        document.fullscreenElement === videoEl ||
        (document as any).webkitFullscreenElement === videoEl ||
        (document as any).msFullscreenElement === videoEl;

      const disableControls = () => {
        videoEl.controls = false;
      };

      videoEl.controls = false;
      videoEl.addEventListener('webkitendfullscreen', disableControls, { once: true } as any);

      const didEnter = await enterFullscreen(videoEl);
      if (!didEnter) return;

      if (isFullscreen() || (videoEl as any).webkitDisplayingFullscreen) {
        videoEl.controls = true;
      }
    },
    [enterFullscreen]
  );

  const markVideoReady = useCallback(() => {
    setIsVideoLoading(false);
  }, []);

  const toggleVideoMute = useCallback(
    (videoEl?: HTMLVideoElement | null) => {
      const target = videoEl || videoRef.current;
      const nextMuted = !isMuted;

      setIsMuted(nextMuted);

      if (!target) return;

      target.muted = nextMuted;

      if (!nextMuted && target.paused) {
        const playPromise = target.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            target.muted = true;
            setIsMuted(true);
            setIsPlaying(false);
          });
        }
      }
    },
    [isMuted]
  );

  useEffect(() => {
    setIsVideoLoading(isCurrentMediaVideo);
    setVideoError(null);
  }, [currentVideoSrc, isCurrentMediaVideo]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => {
        if (
          document.fullscreenElement === v ||
          (document as any).webkitFullscreenElement === v ||
          (document as any).msFullscreenElement === v
        ) {
          v.controls = true;
        } else {
          v.controls = false;
        }
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleOtherVideoPlay = (e: CustomEvent) => {
      const otherId = e.detail.id || e.detail.postId;
      if (otherId !== postId && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('video-play', handleOtherVideoPlay as EventListener);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            const canAutoplay = !isLowInternet || entry.intersectionRatio >= 0.8;
            if (
              entry.isIntersecting &&
              entry.intersectionRatio >= 0.5 &&
              !isPaused &&
              canAutoplay
            ) {
              if (videoRef.current.paused) {
                videoRef.current.muted = isMuted;

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      setIsPlaying(true);
                      window.dispatchEvent(
                        new CustomEvent('video-play', { detail: { postId } })
                      );
                    })
                    .catch(() => {
                      setIsPlaying(false);
                    });
                }
              }
            } else {
              if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.8, 1] }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    if (isPaused && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    return () => {
      window.removeEventListener('video-play', handleOtherVideoPlay as EventListener);
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [carouselIndex, postId, isLowInternet, isPaused, isMuted]);

  return {
    videoRef,
    isMuted,
    setIsMuted,
    setIsPlaying,
    requestVideoFullscreen,
    toggleVideoMute,
    isVideoLoading,
    setIsVideoLoading,
    videoError,
    setVideoError,
    markVideoReady,
  };
}
