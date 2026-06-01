import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Hls from 'hls.js';
import AgoraRTC, { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../../utils/agora';
import {
  getStreamMessages,
  sendStreamMessage,
  subscribeToStreamMessages,
  toggleLikeEvent,
  getEventLikes,
  hasUserLikedEvent,
  subscribeToEventLikes,
  subscribeToStreamPresence,
  sendGift,
  followUser,
  unfollowUser,
  isFollowing,
  reportContent,
  supabase,
} from '../../utils/supabase/api';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useIsMobile } from '../ui/use-mobile';
import { ViewerHeader } from './ViewerHeader';
import { FloatingChat, useMessageBuffer } from './FloatingChat';
import { SidebarChat } from './SidebarChat';
import { ViewerActionBar } from './ViewerActionBar';
import { GiftPicker } from './GiftPicker';
import { GiftBannerOverlay } from './GiftBannerOverlay';
import { HeartAnimations, generateHeart } from './HeartAnimations';
import { GIFT_OPTIONS, type LiveStreamData, type FloatingHeart, type GiftBanner, type GiftOption } from './types';
import { askForReportReason } from '../../utils/moderation';

interface LiveStreamViewerProps {
  stream: LiveStreamData;
  onClose: () => void;
  isUnlockedOverride?: boolean;
}

function isHlsManifestUrl(url?: string) {
  return Boolean(url && /\.m3u8(?:[?#].*)?$/i.test(url));
}

function isCloudflareStreamUrl(url?: string) {
  return Boolean(url && /(cloudflarestream\.com|videodelivery\.net)/i.test(url));
}

function shouldUseIframePlayer(url?: string) {
  return Boolean(url && (isCloudflareStreamUrl(url) || !isHlsManifestUrl(url)));
}

function getCloudflareIframeUrl(url?: string) {
  const withAutoplayParams = (playerUrl: string) => {
    try {
      const parsed = new URL(playerUrl);
      parsed.searchParams.set('autoplay', 'true');
      parsed.searchParams.set('muted', 'true');
      parsed.searchParams.set('preload', 'auto');
      return parsed.toString();
    } catch {
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
  } catch {}

  return withAutoplayParams(url);
}

export function LiveStreamViewerNew({ stream, onClose }: LiveStreamViewerProps) {
  const isMobile = useIsMobile();

  // Core state — start muted so mobile browsers allow autoplay (no black screen).
  // User can tap the unmute control to enable audio.
  const [isMuted, setIsMuted] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id?: number; userId?: string; user: string; text: string; avatar?: string; isGift?: boolean }[]>([]);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(stream.viewers || 0);
  const [isChatVisible, setIsChatVisible] = useState(true);

  // Gift state
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [giftBanners, setGiftBanners] = useState<GiftBanner[]>([]);

  // Animations
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  // Refs
  const currentUserIdRef = useRef<string | null>(null);
  const pendingLikeRef = useRef(false); // Track pending like operation
  const likesRef = useRef(0); // Keep likes in sync via ref
  const isMutedRef = useRef(isMuted);
  const { addMessage } = useMessageBuffer();

  // Playback mode: HLS (Cloudflare/OBS) when playback_url present, else Agora WebRTC
  const isHlsMode = Boolean(stream.playback_url);

  // Agora (only used when no HLS playback url)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const client = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const [viewerUid] = useState(() => `viewer-${Math.random().toString(36).slice(2, 11)}`);

  // HLS
  const hlsVideoRef = useRef<HTMLVideoElement | null>(null);
  const cloudflareIframeRef = useRef<HTMLIFrameElement | null>(null);
  const cloudflarePlayerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hlsReady, setHlsReady] = useState(false);
  const [useIframePlayer, setUseIframePlayer] = useState(() => shouldUseIframePlayer(stream.playback_url));
  const [isLandscapeSource, setIsLandscapeSource] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    setUseIframePlayer(shouldUseIframePlayer(stream.playback_url));
    setHlsReady(false);
    setVideoError(null);
  }, [stream.playback_url, stream.id]);

  // Detect landscape video & auto-fit on mobile
  useEffect(() => {
    const v = hlsVideoRef.current;
    if (!v) return;
    const onMeta = () => {
      const landscape = v.videoWidth > v.videoHeight;
      setIsLandscapeSource(landscape);
      // On mobile portrait, default landscape video to "cover" so it fills the
      // screen (cropped) instead of showing a tiny letterboxed strip that
      // looks like a black screen. User can tap "Fit" to letterbox.
      if (landscape && isMobile) setFitMode('cover');
    };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [hlsReady, isMobile]);

  const handleRotate = async () => {
    const container = hlsVideoRef.current?.parentElement?.parentElement;
    try {
      if (!document.fullscreenElement && container?.requestFullscreen) {
        await container.requestFullscreen();
      }
      // Try native orientation lock (Android Chrome)
      const orientation: any = (screen as any).orientation;
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => {});
        setIsRotated(false);
        return;
      }
      // Fallback: CSS rotate (iOS Safari has no orientation lock API)
      setIsRotated((r) => !r);
    } catch {
      setIsRotated((r) => !r);
    }
  };

  if (!isHlsMode && !client.current) {
    client.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  }

  // Keep ref in sync
  useEffect(() => { likesRef.current = likes; }, [likes]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentUserIdRef.current = user.id;
          const liked = await hasUserLikedEvent(stream.id, user.id);
          setIsLiked(liked);
          if (stream.organizer_id) {
            const following = await isFollowing(user.id, stream.organizer_id);
            setIsFollowingHost(following);
          }
        }
        const totalLikes = await getEventLikes(stream.id);
        setLikes(totalLikes);
      } catch {}
    };
    loadState();
  }, [stream.id, stream.organizer_id]);

  // Real-time viewer count via Supabase Presence (instant + accurate, no DB writes)
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof subscribeToStreamPresence> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const userId = user?.id || `anon-${viewerUid}`;
      channel = subscribeToStreamPresence(stream.id, { userId, role: 'viewer' }, (count) => {
        setViewerCount(count);
      });
    })();
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [stream.id, viewerUid]);

  // Real-time likes — ignore events during pending like operation
  useEffect(() => {
    const channel = subscribeToEventLikes(stream.id, ({ delta }) => {
      if (pendingLikeRef.current) return; // Skip during our own pending operation
      setLikes((p) => Math.max(0, p + delta));
      if (delta > 0) {
        setHearts((p) => [...p, generateHeart()]);
      }
    });
    return () => { channel.unsubscribe(); };
  }, [stream.id]);

  // Chat
  useEffect(() => {
    const loadChat = async () => {
      try {
        const msgs = await getStreamMessages(stream.id);
        if (msgs) {
          setMessages(
            msgs.slice(-200).map((m: any) => ({
              id: m.id,
              userId: m.user_id,
              user: m.user?.full_name || m.user?.username || 'User',
              text: m.message,
              avatar: m.user?.avatar_url,
              isGift: m.message?.startsWith('[Gift]'),
            }))
          );
        }
      } catch {}
    };
    loadChat();

    const sub = subscribeToStreamMessages(stream.id, (msg) => {
      const newMsg = {
        id: msg.id,
        userId: msg.user_id,
        user: msg.user?.full_name || (msg.user as any)?.username || 'User',
        text: msg.message,
        avatar: msg.user?.avatar_url,
        isGift: msg.message?.startsWith('[Gift]'),
      };
      setMessages((prev) => addMessage(prev, newMsg));

      if (msg.message?.startsWith('[Gift]')) {
        const giftMatch = GIFT_OPTIONS.find((g) => msg.message.includes(g.amount.toString()));
        if (giftMatch) {
          setGiftBanners((prev) => [
            ...prev.slice(-2),
            { id: Date.now(), senderName: msg.user?.full_name || 'Someone', gift: giftMatch, timestamp: Date.now() },
          ]);
        }
      }
    });

    const giftSub = supabase
      .channel(`viewer-gifts:${stream.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `event_id=eq.${stream.id}` }, (payload: any) => {
        if (payload.new?.metadata?.type === 'gift') {
          const giftAmount = payload.new.amount;
          const giftMatch = GIFT_OPTIONS.find((g) => g.amount === giftAmount);
          if (giftMatch) {
            const newHearts = Array.from({ length: 5 }, () => generateHeart());
            setHearts((p) => [...p, ...newHearts]);
          }
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); giftSub.unsubscribe(); };
  }, [stream.id]);

  const handleReportStreamMessage = async (chatMessage: { id?: number; userId?: string; user: string; text: string }) => {
    if (!chatMessage.id) return;
    if (chatMessage.userId && chatMessage.userId === currentUserIdRef.current) {
      toast.error('You cannot report your own message');
      return;
    }

    const reason = askForReportReason('this live chat message');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'stream',
        contentId: chatMessage.id,
        reason,
        details: chatMessage.text,
        reportedUserId: chatMessage.userId,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  // Agora (skipped when streaming via Cloudflare HLS / OBS)
  useEffect(() => {
    if (isHlsMode) return;
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
  }, [stream.id, isHlsMode]);

  // Play remote Agora video tracks
  useEffect(() => {
    if (isHlsMode) return;
    remoteUsers.forEach((user) => {
      const el = document.getElementById(`remote-player-${user.uid}`);
      if (el && user.videoTrack) {
        // Mirror the remote video so viewers see the same orientation as the
        // streamer's selfie preview (left/right matches what the host sees).
        user.videoTrack.play(el, { mirror: true });
      }
    });
  }, [remoteUsers, isHlsMode]);

  // Agora mute control
  useEffect(() => {
    if (isHlsMode) return;
    remoteUsers.forEach((user) => {
      if (user.audioTrack) user.audioTrack.setVolume(isMuted ? 0 : 100);
    });
  }, [isMuted, remoteUsers, isHlsMode]);

  // ─── HLS playback (Cloudflare Stream / OBS) ─────────────
  useEffect(() => {
    if (!isHlsMode || !stream.playback_url || useIframePlayer) return;
    const video = hlsVideoRef.current;
    if (!video) return;

    setHlsReady(true);
    setVideoError(null);

    let hls: Hls | null = null;
    const url = stream.playback_url;
    // Detect Cloudflare LL-HLS endpoint to enable low-latency only when supported
    const isLowLatency = /lowLatency=true|\/manifest\/video\.ll\.m3u8/i.test(url);

    // Mark "ready" as early as possible so the spinner doesn't get stuck on mobile
    // when autoplay-with-sound is blocked and the `playing` event never fires.
    const markReady = () => setHlsReady(true);
    const markHasFrames = () => {
      setHlsReady(true);
      setVideoError(null);
    };
    video.addEventListener('loadedmetadata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('loadeddata', markHasFrames);
    video.addEventListener('playing', markHasFrames);

    // Required for inline mobile playback + autoplay
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
          // Autoplay with sound blocked → fall back to muted autoplay so the
          // user sees the live video immediately. They can tap the unmute
          // button to enable audio.
          if (!video.muted) {
            video.muted = true;
            video.play().catch(() => { /* user gesture required */ });
          }
        });
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        // Smooth playback tuned for Cloudflare standard HLS. Only enable
        // lowLatencyMode for the dedicated LL-HLS manifest — using it on a
        // standard HLS feed causes stalls and constant "buffering".
        lowLatencyMode: isLowLatency,
        liveSyncDurationCount: isLowLatency ? 2 : 3,
        liveMaxLatencyDurationCount: isLowLatency ? 4 : 8,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        enableWorker: true,
        // ABR: start conservatively so video appears fast on cellular
        startLevel: -1,
        capLevelToPlayerSize: false,
        abrEwmaDefaultEstimate: 800_000, // 800 kbps initial guess
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(url);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        setUseIframePlayer(true);
        // Try to recover from transient network/media errors before failing
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            try { hls?.startLoad(); } catch {}
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            try { hls?.recoverMediaError(); } catch {}
            break;
          default:
            setVideoError(`Stream error: ${data.details}`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari / iOS)
      video.src = url;
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
    } else {
      setVideoError('HLS playback not supported in this browser');
      return;
    }

    tryPlay();

    return () => {
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
      } catch {
        // Cloudflare still shows its native play overlay when autoplay is blocked.
      }
    };

    const timer = window.setTimeout(start, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cloudflarePlayerRef.current = null;
    };
  }, [isHlsMode, useIframePlayer, stream.playback_url]);

  // HLS mute control — also kicks playback when user unmutes (after autoplay fallback)
  useEffect(() => {
    if (!isHlsMode) return;

    if (useIframePlayer) {
      const player = cloudflarePlayerRef.current;
      if (!player) return;
      try {
        player.muted = isMuted;
        if (!isMuted) player.volume = 1;
        player.play?.().catch?.(() => {});
      } catch {}
      return;
    }

    const video = hlsVideoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted && video.paused) video.play().catch(() => {});
  }, [isMuted, isHlsMode, useIframePlayer]);

  // Cleanup hearts
  useEffect(() => {
    if (hearts.length === 0) return;
    const timer = setTimeout(() => {
      setHearts((p) => p.filter((h) => Date.now() - h.id < 2000));
    }, 2000);
    return () => clearTimeout(timer);
  }, [hearts]);

  // Cleanup gift banners
  useEffect(() => {
    if (giftBanners.length === 0) return;
    const timer = setTimeout(() => {
      setGiftBanners((p) => p.filter((b) => Date.now() - b.timestamp < 5000));
    }, 5000);
    return () => clearTimeout(timer);
  }, [giftBanners]);

  // Handlers
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    try {
      await sendStreamMessage(stream.id, message);
      setMessage('');
    } catch { toast.error('Failed to send message'); }
  };

  const handleLike = async () => {
    setHearts((p) => [...p, generateHeart(), generateHeart()]);
    pendingLikeRef.current = true; // Block subscription updates
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes((p) => newIsLiked ? p + 1 : Math.max(0, p - 1));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await toggleLikeEvent(stream.id, user.id);
    } catch {
      setIsLiked(!newIsLiked);
      setLikes((p) => !newIsLiked ? p + 1 : Math.max(0, p - 1));
    } finally {
      // Unblock after a short delay to let the realtime event pass
      setTimeout(() => { pendingLikeRef.current = false; }, 3000);
    }
  };

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please login to follow'); return; }
      if (isFollowingHost) {
        await unfollowUser(user.id, stream.organizer_id);
        setIsFollowingHost(false);
        toast.success(`Unfollowed ${stream.host}`);
      } else {
        await followUser(user.id, stream.organizer_id);
        setIsFollowingHost(true);
        toast.success(`Following ${stream.host}`);
      }
      window.dispatchEvent(new Event('profileUpdated'));
    } catch { toast.error('Failed to update follow'); }
  };

  const handleGift = async (gift: GiftOption) => {
    setIsSendingGift(true);
    try {
      await sendGift(stream.id, gift.amount, 'TZS');
      toast.success(`Sent ${gift.name}`);
      setShowGiftPicker(false);
      const newHearts = Array.from({ length: 6 }, () => generateHeart());
      setHearts((p) => [...p, ...newHearts]);
    } catch (err: any) {
      const msg = err?.message || 'Failed to send gift';
      if (msg.includes('Insufficient balance')) {
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    }
    finally { setIsSendingGift(false); }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/live/${stream.id}`;
    const shareData = { title: stream.title, text: `Watch "${stream.title}" live on Eventz`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Stream link copied!');
      }
    } catch {}
  };

  // ─── Video content (shared between layouts) ─────────────
  const hasMedia = isHlsMode ? Boolean(stream.playback_url) : remoteUsers.length > 0;

  const renderVideo = (id?: string) => (
    <>
      {isHlsMode ? (
        <div className="relative w-full h-full bg-black overflow-hidden">
          {useIframePlayer ? (
            <iframe
              ref={cloudflareIframeRef}
              title={stream.title}
              src={getCloudflareIframeUrl(stream.playback_url)}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          ) : (
            <video
              ref={hlsVideoRef}
              id={id || 'hls-player'}
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
            <div key={user.uid} id={id || `remote-player-${user.uid}`} className="w-full h-full" />
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
                <button onClick={() => { setVideoError(null); window.location.reload(); }} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Retry</button>
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

  // ─── DESKTOP LAYOUT ─────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex">
        {/* Video area */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative" onDoubleClick={handleLike}>
            {renderVideo()}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />

            <div className="absolute top-0 left-0 right-0 p-4">
              <ViewerHeader
                host={stream.host}
                hostAvatar={stream.host_avatar}
                isLive={true}
                viewerCount={viewerCount}
                isFollowing={isFollowingHost}
                onFollow={handleFollow}
                onClose={onClose}
              />
            </div>

            <div className="absolute left-4 top-20">
              <GiftBannerOverlay banners={giftBanners} />
            </div>

            <HeartAnimations hearts={hearts} />
          </div>

          <div className="p-3 bg-[#0f0f0f] border-t border-white/10">
            <ViewerActionBar
              message={message}
              onMessageChange={setMessage}
              onSendMessage={handleSendMessage}
              onShare={handleShare}
              onLike={handleLike}
              onGift={() => setShowGiftPicker(true)}
              onMuteToggle={() => setIsMuted((m) => !m)}
              onToggleChat={() => setIsChatVisible((v) => !v)}
              isLiked={isLiked}
              isMuted={isMuted}
              isChatVisible={isChatVisible}
              isDesktop={true}
            />
          </div>
        </div>

        {/* Sidebar chat — YouTube style */}
        {isChatVisible && (
          <div className="w-[340px] flex-shrink-0">
            <SidebarChat
              messages={messages}
              message={message}
              onMessageChange={setMessage}
              onSendMessage={handleSendMessage}
              onReportMessage={handleReportStreamMessage}
              viewerCount={viewerCount}
            />
          </div>
        )}

        <GiftPicker isOpen={showGiftPicker} onClose={() => setShowGiftPicker(false)} onSendGift={handleGift} isSending={isSendingGift} />
      </div>
    );
  }

  // ─── MOBILE LAYOUT ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black h-[100dvh] overflow-hidden overscroll-none">
      <div className="absolute inset-0 h-full" onDoubleClick={handleLike}>
        {renderVideo()}
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60" />

      {/* Fixed header overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
        <div className="pointer-events-auto">
          <ViewerHeader
            host={stream.host}
            hostAvatar={stream.host_avatar}
            isLive={true}
            viewerCount={viewerCount}
            isFollowing={isFollowingHost}
            onFollow={handleFollow}
            onClose={onClose}
          />
        </div>
      </div>

      <GiftBannerOverlay banners={giftBanners} />

      {/* Floating chat overlay above the action bar (mobile) */}
      {isChatVisible && (
        <div className="absolute left-3 right-3 bottom-20 pointer-events-none">
          <div className="pointer-events-auto">
            <FloatingChat messages={messages} maxVisible={5} onReportMessage={handleReportStreamMessage} />
          </div>
        </div>
      )}

      {/* Fixed bottom overlay - always at bottom, never pushes video */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <ViewerActionBar
            message={message}
            onMessageChange={setMessage}
            onSendMessage={handleSendMessage}
            onShare={handleShare}
            onLike={handleLike}
            onGift={() => setShowGiftPicker(true)}
            onMuteToggle={() => setIsMuted((m) => !m)}
            onToggleChat={() => setIsChatVisible((v) => !v)}
            onToggleFit={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
            onRotate={handleRotate}
            fitMode={fitMode}
            showVideoControls={isHlsMode && isLandscapeSource && hlsReady}
            isLiked={isLiked}
            isMuted={isMuted}
            isChatVisible={isChatVisible}
            isDesktop={false}
          />
      </div>

      <HeartAnimations hearts={hearts} />
      <GiftPicker isOpen={showGiftPicker} onClose={() => setShowGiftPicker(false)} onSendGift={handleGift} isSending={isSendingGift} />
    </div>
  );
}
