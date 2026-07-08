import { type ReactNode } from 'react';
import { Volume2, VolumeX, Maximize, Play } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { isVideoMedia } from '../../utils/media';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "../ui/carousel";

interface PostDetailContentProps {
  post: any;
  isMuted: boolean;
  setIsMuted: (value: boolean) => void;
  mediaAspectRatios: Record<string, number>;
  setMediaAspectRatios: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  updateCarouselHeight: () => void;
  setApi: (api: CarouselApi | undefined) => void;
  current: number;
  carouselHeight: number | null;
  videoProps?: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isVideoPaused: boolean;
    onPlaybackToggle: (e?: React.MouseEvent) => void;
    onFullscreen: (video: HTMLVideoElement | null) => void;
  };
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  instanceId: React.MutableRefObject<string>;
  enterFullscreen: (el: HTMLElement | null) => Promise<boolean>;
  renderUserBadge?: () => ReactNode;
}

function SingleMedia({
  media,
  isMediaVideo,
  posterToUse,
  post,
  isMuted,
  setIsMuted,
  setMediaAspectRatios,
  videoProps,
  localVideoRef,
  instanceId,
  enterFullscreen,
}: {
  media: string;
  isMediaVideo: boolean;
  posterToUse?: string;
  post: any;
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  setMediaAspectRatios: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  videoProps?: PostDetailContentProps['videoProps'];
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  instanceId: React.MutableRefObject<string>;
  enterFullscreen: (el: HTMLElement | null) => Promise<boolean>;
}) {
  if (isMediaVideo) {
    return (
      <>
        <video
          id={`video-${instanceId.current}-${post.id}`}
          ref={(videoProps?.videoRef ?? localVideoRef) as React.Ref<HTMLVideoElement>}
          src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
          className="absolute inset-0 w-full h-full object-contain"
          poster={posterToUse}
          controls={false}
          playsInline
          loop
          preload="metadata"
          muted={isMuted}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          onClick={videoProps?.onPlaybackToggle || ((e) => { e.preventDefault(); e.stopPropagation(); })}
          onPlay={() => {
            window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
          }}
          onPause={() => {}}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth > 0 && v.videoHeight > 0) {
              const next = v.videoWidth / v.videoHeight;
              setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
            }
          }}
        />
        {(videoProps?.isVideoPaused ?? false) && (
          <button
            type="button"
            onClick={videoProps?.onPlaybackToggle}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 text-white"
            aria-label="Play video"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/45 pl-1 backdrop-blur-sm">
              <Play className="h-7 w-7 fill-current" />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (videoProps) {
              videoProps.onFullscreen(videoProps.videoRef?.current ?? null);
            } else {
              const videoEl = localVideoRef.current;
              if (videoEl) {
                void enterFullscreen(videoEl).then((didEnter) => {
                  if (didEnter) videoEl.controls = true;
                });
              }
            }
          }}
          className="absolute bottom-4 left-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Open video fullscreen"
        >
          <Maximize className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="absolute bottom-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 md:opacity-0 md:group-hover:opacity-100"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </>
    );
  }

  return (
    <ImageWithFallback
      src={media}
      alt="Post detail"
      className="absolute inset-0 w-full h-full object-contain"
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const next = img.naturalWidth / img.naturalHeight;
          setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
        }
      }}
    />
  );
}

export function PostDetailContent({
  post,
  isMuted,
  setIsMuted,
  mediaAspectRatios,
  setMediaAspectRatios,
  updateCarouselHeight,
  setApi,
  current,
  carouselHeight,
  videoProps,
  localVideoRef,
  instanceId,
  enterFullscreen,
}: PostDetailContentProps) {
  let mediaItems = post.content?.images || post.image_urls || [];
  let videoPoster: string | undefined;
  const highlightVideoUrl = post.isHighlight && post.highlights?.[0]?.videoUrl;

  if (typeof mediaItems === 'string') mediaItems = [mediaItems];

  if (mediaItems.length === 0) {
    if (post.content?.image) mediaItems = [post.content.image];
    else if (post.image) mediaItems = [post.image];
  }

  if (highlightVideoUrl) {
    const posterCandidate = (mediaItems as string[]).find((u: string) => u && !isVideoMedia(u));
    videoPoster = posterCandidate || post.highlights?.[0]?.thumbnail;
    mediaItems = [highlightVideoUrl];
  }

  if (post.video_url) {
    const nonVideoItems = (mediaItems as string[]).filter((u: string) => u && !isVideoMedia(u));
    const videoExists = (mediaItems as string[]).some((url: string) => url === post.video_url);
    if (!videoExists) {
      if ((mediaItems as string[]).length === 1 && nonVideoItems.length === 1) {
        videoPoster = nonVideoItems[0];
        mediaItems = [post.video_url];
      } else {
        mediaItems = [post.video_url, ...(mediaItems as string[])];
      }
    } else if ((mediaItems as string[]).length === 2) {
      const onlyPoster = (mediaItems as string[]).filter((u: string) => u && !isVideoMedia(u) && u !== post.video_url);
      if (onlyPoster.length === 1) {
        videoPoster = onlyPoster[0];
        mediaItems = [post.video_url];
      }
    }
  }

  if (mediaItems.length === 0 && post.highlights && post.highlights.length > 0) {
    const highlight = post.highlights[0];
    if (highlight.videoUrl) mediaItems = [highlight.videoUrl];
  }

  if (mediaItems.length === 0) return null;

  if (mediaItems.length === 1) {
    const media = mediaItems[0];
    const isMediaVideo = isVideoMedia(media) || !!post.video_url || media === highlightVideoUrl;
    const posterToUse = videoPoster;
    const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;

    return (
      <div
        className="relative w-full bg-black overflow-hidden group mx-auto"
        style={{ aspectRatio, maxHeight: '70vh', width: `min(100%, calc(70vh * ${aspectRatio}))` }}
      >
        <SingleMedia
          media={media}
          isMediaVideo={isMediaVideo}
          posterToUse={posterToUse}
          post={post}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          setMediaAspectRatios={setMediaAspectRatios}
          videoProps={videoProps}
          localVideoRef={localVideoRef}
          instanceId={instanceId}
          enterFullscreen={enterFullscreen}
        />
      </div>
    );
  }

  return (
    <Carousel setApi={setApi} className="w-full group">
      <CarouselContent
        className="transition-[height] duration-300"
        style={carouselHeight != null ? { height: `${carouselHeight}px` } : undefined}
      >
        {mediaItems.map((media: string, index: number) => {
          const isMediaVideo = isVideoMedia(media) || media === post.video_url || (post.highlights && post.highlights.some((h: any) => h.videoUrl === media));
          const aspectRatio = mediaAspectRatios[media] ?? 4 / 5;

          return (
            <CarouselItem key={index} className="pl-0">
              <div
                data-media-frame="true"
                className="relative w-full bg-black overflow-hidden group mx-auto"
                style={{ aspectRatio, maxHeight: '70vh', width: `min(100%, calc(70vh * ${aspectRatio}))` }}
              >
                {isMediaVideo ? (
                  <>
                    <video
                      id={`video-${instanceId.current}-${post.id}-${index}`}
                      src={`${media}${media.includes('#') ? '' : '#t=0.1'}`}
                      className="absolute inset-0 w-full h-full object-contain"
                      controls={false}
                      playsInline
                      loop
                      preload="metadata"
                      muted={isMuted}
                      disablePictureInPicture
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onPlay={() => {
                        window.dispatchEvent(new CustomEvent('video-play', { detail: { id: post.id } }));
                      }}
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth > 0 && v.videoHeight > 0) {
                          const next = v.videoWidth / v.videoHeight;
                          setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
                        }
                        requestAnimationFrame(updateCarouselHeight);
                      }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                      className="absolute bottom-4 right-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const videoEl = document.getElementById(`video-${instanceId.current}-${post.id}-${index}`) as HTMLVideoElement;
                        if (videoEl) {
                          void enterFullscreen(videoEl).then((didEnter) => {
                            if (didEnter) videoEl.controls = true;
                          });
                        }
                      }}
                      className="absolute bottom-4 left-4 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <Maximize className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : (
                  <ImageWithFallback
                    src={media}
                    alt={`Slide ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const next = img.naturalWidth / img.naturalHeight;
                        setMediaAspectRatios((prev) => (prev[media] === next ? prev : { ...prev, [media]: next }));
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
        <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
        <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 border-none text-white absolute top-1/2 -translate-y-1/2" />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {mediaItems.map((_: any, idx: number) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === (current - 1) ? 'bg-white w-4' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </Carousel>
  );
}
