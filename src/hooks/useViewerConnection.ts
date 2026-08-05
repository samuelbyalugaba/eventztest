import { useBaseConnection } from './useBaseConnection';
import type { LiveStreamData } from '../components/livestream/types';

export { getCloudflareIframeUrl } from './useBaseConnection';

export function useViewerConnection(stream: LiveStreamData) {
  const base = useBaseConnection(stream);

  return {
    isMuted: base.isMuted,
    setIsMuted: base.setIsMuted,
    videoError: base.videoError,
    setVideoError: base.setVideoError,
    isHlsMode: base.isHlsMode,
    remoteUsers: base.remoteUsers,
    hasMedia: base.hasMedia,
    hlsVideoRef: base.hlsVideoRef,
    cloudflareIframeRef: base.cloudflareIframeRef,
    hlsReady: base.hlsReady,
    useIframePlayer: base.useIframePlayer,
    fitMode: base.fitMode,
    setFitMode: base.setFitMode,
    isRotated: base.isRotated,
  };
}
