import { useState, useEffect, useRef } from 'react';
import type Hls from 'hls.js';
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../utils/agora';
import type { LiveStreamData } from '../components/livestream/types';
import { useIsMobile } from '../components/ui/use-mobile';

function isHlsManifestUrl(url?: string) {
  return Boolean(url && /\.m3u8(?:[?#].*)?$/i.test(url));
}

function isCloudflareStreamUrl(url?: string) {
  return Boolean(url && /(cloudflarestream\.com|videodelivery\.net)/i.test(url));
}

function shouldUseIframePlayer(url?: string) {
  return Boolean(url && (isCloudflareStreamUrl(url) || !isHlsManifestUrl(url)));
}

export function getCloudflareIframeUrl(url?: string) {
  const withAutoplayParams = (playerUrl: string) => {
    try {
      const parsed = new URL(playerUrl);
      parsed.searchParams.set('autoplay', 'true');
      parsed.searchParams.set('muted', 'true');
      parsed.searchParams.set('preload', 'auto');
      return parsed.toString();
    } catch (error) {
      console.warn('Failed to parse player URL for autoplay params', error);
      const separator = playerUrl.includes('?') ? '&' : '?';
      return `${playerUrl}${separator}autoplay=true&muted=true&preload=auto`;
    }
  };

  if (!url) return '';
  if (/\/iframe(?:[?#].*)?$/i.test(url) || /iframe\.videodelivery\.net/i.test(url)) {
    return withAutoplayParams(url);
  }

  try {
    const parsed = new URL(url);
    const uid = parsed.pathname.split('/').filter(Boolean)[0];
    if (!uid) return url;

    if (/cloudflarestream\.com$/i.test(parsed.hostname)) {
      return withAutoplayParams(`${parsed.origin}/${uid}/iframe`);
    }

    if (/videodelivery\.net$/i.test(parsed.hostname)) {
      return withAutoplayParams(`https://iframe.videodelivery.net/${uid}`);
    }
  } catch (error) {
    console.warn('Failed to construct Cloudflare iframe URL', error);
  }

  return withAutoplayParams(url);
}

export function useStreamConnection(stream: LiveStreamData) {
  const isMobile = useIsMobile();

  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(isMuted);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isHlsMode = Boolean(stream.playback_url);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const client = useRef<IAgoraRTCClient | null>(null);
  const [agoraReady, setAgoraReady] = useState(false);
  const [viewerUid] = useState(() => `viewer-${Math.random().toString(36).slice(2, 11)}`);

  const hlsVideoRef = useRef<HTMLVideoElement | null>(null);
  const cloudflareIframeRef = useRef<HTMLIFrameElement | null>(null);
  const cloudflarePlayerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hlsReady, setHlsReady] = useState(false);
  const [useIframePlayer, setUseIframePlayer] = useState(() => shouldUseIframePlayer(stream.playback_url));
  const [, setIsLandscapeSource] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isRotated] = useState(false);

  const hasMedia = isHlsMode ? Boolean(stream.playback_url) : remoteUsers.length > 0;

  useEffect(() => {
    setUseIframePlayer(shouldUseIframePlayer(stream.playback_url));
    setHlsReady(false);
    setVideoError(null);
  }, [stream.playback_url, stream.id]);

  useEffect(() => {
    const v = hlsVideoRef.current;
    if (!v) return;
    const onMeta = () => {
      const landscape = v.videoWidth > v.videoHeight;
      setIsLandscapeSource(landscape);
      if (landscape && isMobile) setFitMode('cover');
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [hlsReady, isMobile]);

  useEffect(() => {
    if (isHlsMode) {
      setAgoraReady(false);
      return;
    }

    let cancelled = false;
    setAgoraReady(false);

    const loadClient = async () => {
      try {
        const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
        if (cancelled) return;
        if (!client.current) {
          client.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
        }
        setAgoraReady(true);
      } catch (error) {
        if (!cancelled) setVideoError('Failed to load live player');
        console.warn('Failed to load AgoraRTC', error);
      }
    };

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [isHlsMode]);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    if (isHlsMode || !agoraReady) return;
    const channelName = `event-${stream.id}`;
    const init = async () => {
      try {
        if (!client.current) return;
        const token = await getAgoraToken(channelName, viewerUid, 'subscriber');
        if (!token) { setVideoError('Failed to join: missing token'); return; }

        client.current.on('user-published', async (user, mediaType) => {
          if (!client.current) return;
          await client.current.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers((prev) => prev.find((u) => u.uid === user.uid) ? prev : [...prev, user]);
          }
          if (mediaType === 'audio') user.audioTrack?.play();
        });

        client.current.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        await client.current.setClientRole('audience');
        await client.current.join(AGORA_APP_ID, channelName, token, viewerUid);

      } catch (e: any) { setVideoError(`Failed to join: ${e.message}`); }
    };
    init();

    return () => {
      if (client.current) { client.current.leave(); client.current.removeAllListeners(); }
    };
  }, [stream.id, isHlsMode, agoraReady, viewerUid]);

  useEffect(() => {
    if (isHlsMode) return;
    remoteUsers.forEach((user) => {
      const el = document.getElementById(`remote-player-${user.uid}`);
      if (el && user.videoTrack) {
        user.videoTrack.play(el, { mirror: true });
      }
    });
  }, [remoteUsers, isHlsMode]);

  useEffect(() => {
    if (isHlsMode) return;
    remoteUsers.forEach((user) => {
      if (user.audioTrack) user.audioTrack.setVolume(isMuted ? 0 : 100);
    });
  }, [isMuted, remoteUsers, isHlsMode]);

  useEffect(() => {
    if (!isHlsMode || !stream.playback_url || useIframePlayer) return;
    const video = hlsVideoRef.current;
    if (!video) return;

    setHlsReady(true);
    setVideoError(null);

    let cancelled = false;
    let hls: Hls | null = null;
    const url = stream.playback_url;
    const isLowLatency = /lowLatency=true|\/manifest\/video\.ll\.m3u8/i.test(url);

    const markReady = () => setHlsReady(true);
    const markHasFrames = () => {
      setHlsReady(true);
      setVideoError(null);
    };
    video.addEventListener('loadedmetadata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('loadeddata', markHasFrames);
    video.addEventListener('playing', markHasFrames);

    video.setAttribute('playsinline', 'true');
    (video as any).playsInline = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.autoplay = true;
    video.preload = 'auto';
    video.muted = isMuted;
    video.removeAttribute('src');
    video.load();

    const frameTimeout = window.setTimeout(() => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setUseIframePlayer(true);
      }
    }, 8000);

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (!video.muted) {
            video.muted = true;
            video.play().catch(() => { });
          }
        });
      }
    };

    const startHlsPlayback = async () => {
      try {
        const { default: HlsConstructor } = await import('hls.js');
        if (cancelled) return;

        if (HlsConstructor.isSupported()) {
          hls = new HlsConstructor({
            lowLatencyMode: isLowLatency,
            liveSyncDurationCount: isLowLatency ? 2 : 3,
            liveMaxLatencyDurationCount: isLowLatency ? 4 : 8,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 30,
            enableWorker: true,
            startLevel: -1,
            capLevelToPlayerSize: false,
            abrEwmaDefaultEstimate: 800_000,
          });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.on(HlsConstructor.Events.MEDIA_ATTACHED, () => {
            hls?.loadSource(url);
          });
          hls.on(HlsConstructor.Events.MANIFEST_PARSED, tryPlay);
          hls.on(HlsConstructor.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            setUseIframePlayer(true);
            switch (data.type) {
              case HlsConstructor.ErrorTypes.NETWORK_ERROR:
                try { hls?.startLoad(); } catch (error) { console.warn('Failed to restart HLS load', error); }
                break;
              case HlsConstructor.ErrorTypes.MEDIA_ERROR:
                try { hls?.recoverMediaError(); } catch (error) { console.warn('Failed to recover HLS media error', error); }
                break;
              default:
                setVideoError(`Stream error: ${data.details}`);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', tryPlay, { once: true });
        } else {
          setVideoError('HLS playback not supported in this browser');
          return;
        }

        tryPlay();
      } catch (error) {
        if (!cancelled) setUseIframePlayer(true);
        console.warn('Failed to start HLS playback', error);
      }
    };

    void startHlsPlayback();

    return () => {
      cancelled = true;
      window.clearTimeout(frameTimeout);
      video.removeEventListener('loadedmetadata', markReady);
      video.removeEventListener('canplay', markReady);
      video.removeEventListener('loadeddata', markHasFrames);
      video.removeEventListener('playing', markHasFrames);
      if (hls) { hls.destroy(); hlsRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHlsMode, isMobile, stream.playback_url, stream.id, useIframePlayer]);

  useEffect(() => {
    if (!isHlsMode || !useIframePlayer || !stream.playback_url) return;
    const iframe = cloudflareIframeRef.current;
    if (!iframe) return;

    let cancelled = false;

    const loadSdk = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).Stream) {
          resolve();
          return;
        }

        const existing = document.querySelector<HTMLScriptElement>('script[data-cloudflare-stream-sdk="true"]');
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
        script.async = true;
        script.dataset.cloudflareStreamSdk = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });

    const start = async () => {
      try {
        await loadSdk();
        if (cancelled || !cloudflareIframeRef.current) return;
        const player = (window as any).Stream(cloudflareIframeRef.current);
        cloudflarePlayerRef.current = player;
        player.muted = isMutedRef.current;
        player.autoplay = true;
        await player.play().catch(async () => {
          player.muted = true;
          setIsMuted(true);
          await player.play();
        });
      } catch (error) {
        console.warn('Cloudflare player error (autoplay may be blocked)', error);
      }
    };

    const timer = window.setTimeout(start, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cloudflarePlayerRef.current = null;
    };
  }, [isHlsMode, useIframePlayer, stream.playback_url]);

  useEffect(() => {
    if (!isHlsMode) return;

    if (useIframePlayer) {
      const player = cloudflarePlayerRef.current;
      if (!player) return;
      try {
        player.muted = isMuted;
        if (!isMuted) player.volume = 1;
        player.play?.().catch?.(() => {});
      } catch (error) {
        console.warn('Failed to set Cloudflare player mute state', error);
      }
      return;
    }

    const video = hlsVideoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted && video.paused) video.play().catch(() => {});
  }, [isMuted, isHlsMode, useIframePlayer]);

  return {
    isMuted,
    setIsMuted,
    isMutedRef,
    videoError,
    setVideoError,
    remoteUsers,
    client,
    agoraReady,
    viewerUid,
    hlsVideoRef,
    cloudflareIframeRef,
    cloudflarePlayerRef,
    hlsRef,
    hlsReady,
    useIframePlayer,
    fitMode,
    setFitMode,
    isRotated,
    isHlsMode,
    hasMedia,
  };
}
