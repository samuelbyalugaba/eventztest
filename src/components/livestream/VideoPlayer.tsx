import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import type { LiveStreamData } from './types';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getCloudflareIframeUrl } from '../../hooks/useViewerConnection';

interface VideoPlayerProps {
  stream: LiveStreamData;
  isHlsMode: boolean;
  useIframePlayer: boolean;
  fitMode: 'contain' | 'cover';
  isRotated: boolean;
  isMuted: boolean;
  remoteUsers: IAgoraRTCRemoteUser[];
  hasMedia: boolean;
  videoError: string | null;
  hlsVideoRef: React.RefObject<HTMLVideoElement | null>;
  cloudflareIframeRef: React.RefObject<HTMLIFrameElement | null>;
  onRetry: () => void;
}

export function VideoPlayer({
  stream,
  isHlsMode,
  useIframePlayer,
  fitMode,
  isRotated,
  isMuted,
  remoteUsers,
  hasMedia,
  videoError,
  hlsVideoRef,
  cloudflareIframeRef,
  onRetry,
}: VideoPlayerProps) {
  return (
    <>
      {isHlsMode ? (
        <div className="relative w-full h-full bg-black overflow-hidden">
          {useIframePlayer ? (
            <iframe
              ref={cloudflareIframeRef as React.Ref<HTMLIFrameElement>}
              title={stream.title}
              src={getCloudflareIframeUrl(stream.playback_url)}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <video
              ref={hlsVideoRef as React.Ref<HTMLVideoElement>}
              id="hls-player"
              className={`w-full h-full bg-black transition-transform duration-300 ${
                fitMode === 'cover' ? 'object-cover' : 'object-contain'
              } ${isRotated ? 'rotate-90 scale-[1.78]' : ''}`}
              playsInline
              autoPlay
              muted={isMuted}
              controls={false}
            />
          )}
        </div>
      ) : remoteUsers.length > 0 ? (
        <div className="w-full h-full">
          {remoteUsers.map((user) => (
            <div key={user.uid} id={`remote-player-${user.uid}`} className="w-full h-full" />
          ))}
        </div>
      ) : null}

      {!hasMedia && (
        <div className="absolute inset-0">
          <ImageWithFallback src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            {videoError ? (
              <div className="text-center px-6">
                <p className="text-destructive mb-3 text-sm">{videoError}</p>
                <button onClick={onRetry} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Retry</button>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="w-12 h-12 mx-auto mb-3 border-[3px] border-white/20 border-t-primary rounded-full animate-spin" />
                <p className="text-white text-base font-bold mb-1">Connecting...</p>
                <p className="text-white/50 text-sm">Waiting for host to start streaming</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
