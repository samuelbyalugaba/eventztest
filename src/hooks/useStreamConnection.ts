import { useBaseConnection, getCloudflareIframeUrl } from './useBaseConnection';
import type { LiveStreamData } from '../components/livestream/types';

export { getCloudflareIframeUrl } from './useBaseConnection';

export function useStreamConnection(stream: LiveStreamData) {
  const base = useBaseConnection(stream);

  return {
    isMuted: base.isMuted,
    setIsMuted: base.setIsMuted,
    isMutedRef: base.isMutedRef,
    videoError: base.videoError,
    setVideoError: base.setVideoError,
    remoteUsers: base.remoteUsers,
    client: base.client,
    agoraReady: base.agoraReady,
    viewerUid: base.viewerUid,
    hlsVideoRef: base.hlsVideoRef,
    cloudflareIframeRef: base.cloudflareIframeRef,
    cloudflarePlayerRef: base.cloudflarePlayerRef,
    hlsRef: base.hlsRef,
    hlsReady: base.hlsReady,
    useIframePlayer: base.useIframePlayer,
    fitMode: base.fitMode,
    setFitMode: base.setFitMode,
    isRotated: base.isRotated,
    isHlsMode: base.isHlsMode,
    hasMedia: base.hasMedia,
  };
}
