import React from 'react';
import { Heart, Volume2, VolumeX, Maximize } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Skeleton } from '../ui/skeleton';
import { isVideoMedia } from '../../utils/media';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';

interface PostCardMediaProps {
  postId: number;
  hasMedia: boolean;
  isCarousel: boolean;
  carouselIndex: number;
  carouselHeight: number | null;
  setApi: (api: any) => void;
  mediaItems: string[];
  currentMedia: string | undefined;
  isCurrentMediaVideo: boolean;
  videoPoster: string | undefined;
  currentVideoSrc: string | undefined;
  getMediaFrameStyle: (media?: string) => React.CSSProperties;
  videoRef: React.RefObject<HTMLVideoElement>;
  isMuted: boolean;
  setIsPlaying: (playing: boolean) => void;
  toggleVideoMute: (videoEl?: HTMLVideoElement | null) => void;
  requestVideoFullscreen: (videoEl: HTMLVideoElement) => Promise<void>;
  isVideoLoading: boolean;
  videoError: string | null;
  isLowInternet: boolean;
  showLikeAnimation: boolean;
  handleDoubleTap: (e: React.MouseEvent | React.TouchEvent) => void;
  markVideoReady: () => void;
  setVideoError: (error: string | null) => void;
  updateCarouselHeight: () => void;
  setMediaAspectRatios: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onViewPost?: (startTime?: number, isMuted?: boolean) => void;
  mediaControlButtonClass: string;
  mediaControlIconClass: string;
}

export function PostCardMedia({
  postId,
  hasMedia,
  isCarousel,
  carouselIndex,
  carouselHeight,
  setApi,
  mediaItems,
  currentMedia,
  isCurrentMediaVideo,
  videoPoster,
  currentVideoSrc,
  getMediaFrameStyle,
  videoRef,
  isMuted,
  setIsPlaying,
  toggleVideoMute,
  requestVideoFullscreen,
  isVideoLoading,
  videoError,
  isLowInternet,
  showLikeAnimation,
  handleDoubleTap,
  markVideoReady,
  setVideoError,
  updateCarouselHeight,
  setMediaAspectRatios,
  onViewPost,
  mediaControlButtonClass,
  mediaControlIconClass,
}: PostCardMediaProps) {
  if (!hasMedia) return null;

  return (
    <div
      className="feed-post-media group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        const startTime = videoRef.current?.currentTime || 0;
        onViewPost?.(startTime, isMuted);
      }}
    >
      {isCarousel ? (
        <div onDoubleClick={handleDoubleTap}>
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              containScroll: 'trimSnaps',
              dragFree: false,
              duration: 22,
            }}
            className="w-full [touch-action:pan-y]"
          >
            <CarouselContent
              className="ml-0 transform-gpu transition-[height] duration-300 ease-out will-change-transform"
              style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}
            >
              {mediaItems.map((media, index) => {
                const isMediaVideo = isVideoMedia(media);
                const isActive = index === carouselIndex;
                const shouldRenderMedia = index === 0 || Math.abs(index - carouselIndex) <= 1;

                return (
                  <CarouselItem
                    key={index}
                    className="pl-0 transform-gpu [backface-visibility:hidden]"
                  >
                    <div
                      data-media-frame="true"
                      className="relative w-full overflow-hidden bg-[#F6F6F6] [contain:layout_paint]"
                      style={getMediaFrameStyle(media)}
                    >
                      {!shouldRenderMedia ? (
                        <div className="absolute inset-0 bg-[#F6F6F6]" />
                      ) : isMediaVideo ? (
                        <div className="absolute inset-0 bg-[#F6F6F6]">
                          {isVideoLoading && isActive && !videoPoster && (
                            <Skeleton className="absolute inset-0 rounded-none z-10" />
                          )}
                          {videoError && isActive && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 px-5 text-center text-xs font-medium text-gray-500">
                              {videoError}
                            </div>
                          )}
                          <video
                            id={`video-card-${postId}-${index}`}
                            ref={isActive ? videoRef : null}
                            src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                            poster={videoPoster}
                            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isVideoLoading && isActive && !videoPoster ? 'opacity-0' : 'opacity-100'}`}
                            loop
                            muted={isMuted}
                            playsInline
                            preload={isLowInternet ? 'none' : 'metadata'}
                            controls={false}
                            disablePictureInPicture
                            controlsList="nodownload noplaybackrate noremoteplayback"
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget;
                              if (v.videoWidth > 0 && v.videoHeight > 0) {
                                const next = v.videoWidth / v.videoHeight;
                                setMediaAspectRatios((prev) =>
                                  prev[media] === next ? prev : { ...prev, [media]: next }
                                );
                              }
                              markVideoReady();
                              requestAnimationFrame(updateCarouselHeight);
                            }}
                            onLoadedData={markVideoReady}
                            onCanPlay={markVideoReady}
                            onPlaying={() => {
                              markVideoReady();
                              setIsPlaying(true);
                            }}
                            onPause={() => setIsPlaying(false)}
                            onError={() => {
                              markVideoReady();
                              setVideoError('This video format cannot play on this device.');
                            }}
                          />
                          {isActive && (
                            <>
                              <div className="absolute bottom-4 left-4 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const videoEl = document.getElementById(
                                      `video-card-${postId}-${index}`
                                    ) as HTMLVideoElement;
                                    if (videoEl) {
                                      requestVideoFullscreen(videoEl);
                                    }
                                  }}
                                  className={mediaControlButtonClass}
                                >
                                  <Maximize className={mediaControlIconClass} />
                                </button>
                              </div>
                              <div className="absolute bottom-4 right-4 z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const videoEl = document.getElementById(
                                      `video-card-${postId}-${index}`
                                    ) as HTMLVideoElement | null;
                                    toggleVideoMute(videoEl);
                                  }}
                                  className={mediaControlButtonClass}
                                >
                                  {isMuted ? (
                                    <VolumeX className={mediaControlIconClass} />
                                  ) : (
                                    <Volume2 className={mediaControlIconClass} />
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <ImageWithFallback
                          src={media}
                          alt={`Post content ${index + 1}`}
                          className="absolute inset-0 h-full w-full"
                          imageClassName="object-cover"
                          fallbackType="image"
                          loading={index === 0 ? 'eager' : 'lazy'}
                          displayWidth={520}
                          quality={78}
                          resize="cover"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                              const next = img.naturalWidth / img.naturalHeight;
                              setMediaAspectRatios((prev) =>
                                prev[media] === next ? prev : { ...prev, [media]: next }
                              );
                            }
                            requestAnimationFrame(updateCarouselHeight);
                          }}
                        />
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {mediaItems.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${
                    idx === carouselIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </Carousel>
        </div>
      ) : (
        <div
          data-media-frame="true"
          className="relative flex w-full items-center justify-center bg-[#F6F6F6]"
          style={getMediaFrameStyle(currentMedia)}
          onDoubleClick={handleDoubleTap}
        >
          {isCurrentMediaVideo ? (
            <div className="relative h-full w-full overflow-hidden bg-[#F6F6F6]">
              {isVideoLoading && !videoPoster && (
                <Skeleton className="absolute inset-0 rounded-none z-10" />
              )}
              {videoError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 px-5 text-center text-xs font-medium text-gray-500">
                  {videoError}
                </div>
              )}
              <video
                id={`video-card-${postId}`}
                ref={videoRef}
                src={currentVideoSrc}
                poster={videoPoster}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isVideoLoading && !videoPoster ? 'opacity-0' : 'opacity-100'}`}
                loop
                muted={isMuted}
                playsInline
                preload={isLowInternet ? 'none' : 'metadata'}
                controls={false}
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                onLoadedMetadata={(e) => {
                  if (!currentMedia) return;
                  const v = e.currentTarget;
                  if (v.videoWidth > 0 && v.videoHeight > 0) {
                    const next = v.videoWidth / v.videoHeight;
                    setMediaAspectRatios((prev) =>
                      prev[currentMedia] === next ? prev : { ...prev, [currentMedia]: next }
                    );
                  }
                  markVideoReady();
                }}
                onLoadedData={markVideoReady}
                onCanPlay={markVideoReady}
                onPlaying={() => {
                  markVideoReady();
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  markVideoReady();
                  setVideoError('This video format cannot play on this device.');
                }}
              />
              <div className="absolute bottom-4 left-4 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const videoEl = document.getElementById(
                      `video-card-${postId}`
                    ) as HTMLVideoElement;
                    if (videoEl) {
                      requestVideoFullscreen(videoEl);
                    }
                  }}
                  className={mediaControlButtonClass}
                >
                  <Maximize className={mediaControlIconClass} />
                </button>
              </div>
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const videoEl = document.getElementById(
                      `video-card-${postId}`
                    ) as HTMLVideoElement | null;
                    toggleVideoMute(videoEl);
                  }}
                  className={mediaControlButtonClass}
                >
                  {isMuted ? (
                    <VolumeX className={mediaControlIconClass} />
                  ) : (
                    <Volume2 className={mediaControlIconClass} />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-[#F6F6F6]">
              <ImageWithFallback
                src={currentMedia}
                alt="Post content"
                className="absolute inset-0 h-full w-full"
                imageClassName="object-cover"
                fallbackType="image"
                loading="lazy"
                displayWidth={800}
                quality={85}
                onLoad={(e) => {
                  if (!currentMedia) return;
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const next = img.naturalWidth / img.naturalHeight;
                    setMediaAspectRatios((prev) =>
                      prev[currentMedia] === next ? prev : { ...prev, [currentMedia]: next }
                    );
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {showLikeAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 duration-300">
          <Heart className="w-24 h-24 text-purple-600 fill-purple-600 drop-shadow-xl animate-bounce" />
        </div>
      )}
    </div>
  );
}
