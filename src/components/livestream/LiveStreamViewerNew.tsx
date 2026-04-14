import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import AgoraRTC, { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../../utils/agora';
import {
  getStreamMessages,
  sendStreamMessage,
  subscribeToStreamMessages,
  updateLiveViewerCount,
  toggleLikeEvent,
  getEventLikes,
  hasUserLikedEvent,
  subscribeToEventLikes,
  subscribeToEventStreaming,
  sendGift,
  followUser,
  unfollowUser,
  isFollowing,
  supabase,
} from '../../utils/supabase/api';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useIsMobile } from '../ui/use-mobile';
import { ViewerHeader } from './ViewerHeader';
import { useMessageBuffer } from './FloatingChat';
import { SidebarChat } from './SidebarChat';
import { ViewerActionBar } from './ViewerActionBar';
import { GiftPicker } from './GiftPicker';
import { GiftBannerOverlay } from './GiftBannerOverlay';
import { HeartAnimations, generateHeart } from './HeartAnimations';
import { GIFT_OPTIONS, type LiveStreamData, type FloatingHeart, type GiftBanner, type GiftOption } from './types';

interface LiveStreamViewerProps {
  stream: LiveStreamData;
  onClose: () => void;
  isUnlockedOverride?: boolean;
}

export function LiveStreamViewerNew({ stream, onClose }: LiveStreamViewerProps) {
  const isMobile = useIsMobile();

  // Core state
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ user: string; text: string; avatar?: string; isGift?: boolean }[]>([]);
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
  const viewerCountAdjustedRef = useRef(false);
  const pendingLikeRef = useRef(false); // Track pending like operation
  const likesRef = useRef(0); // Keep likes in sync via ref
  const { addMessage } = useMessageBuffer();

  // Agora
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const client = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const [viewerUid] = useState(() => `viewer-${Math.random().toString(36).slice(2, 11)}`);

  if (!client.current) {
    client.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  }

  // Keep ref in sync
  useEffect(() => { likesRef.current = likes; }, [likes]);

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

  // Real-time viewer count
  useEffect(() => {
    const channel = subscribeToEventStreaming(stream.id, (streaming) => {
      setViewerCount(streaming?.liveViewers ?? 0);
    });
    return () => { channel.unsubscribe(); };
  }, [stream.id]);

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
              user: m.user?.full_name || m.user?.username || 'User',
              text: m.message,
              avatar: m.user?.avatar_url,
              isGift: m.message?.startsWith('🎁'),
            }))
          );
        }
      } catch {}
    };
    loadChat();

    const sub = subscribeToStreamMessages(stream.id, (msg) => {
      const newMsg = {
        user: msg.user?.full_name || (msg.user as any)?.username || 'User',
        text: msg.message,
        avatar: msg.user?.avatar_url,
        isGift: msg.message?.startsWith('🎁'),
      };
      setMessages((prev) => addMessage(prev, newMsg));

      if (msg.message?.startsWith('🎁')) {
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

  // Agora
  useEffect(() => {
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

        try { await updateLiveViewerCount(stream.id, 1); viewerCountAdjustedRef.current = true; } catch {}
      } catch (e: any) { setVideoError(`Failed to join: ${e.message}`); }
    };
    init();

    return () => {
      if (client.current) { client.current.leave(); client.current.removeAllListeners(); }
      if (viewerCountAdjustedRef.current) {
        viewerCountAdjustedRef.current = false;
        updateLiveViewerCount(stream.id, -1).catch(() => {});
      }
    };
  }, [stream.id]);

  // Play remote video
  useEffect(() => {
    remoteUsers.forEach((user) => {
      const el = document.getElementById(`remote-player-${user.uid}`);
      if (el && user.videoTrack) {
        user.videoTrack.play(el, { mirror: false });
        const v = el.querySelector('video') as HTMLVideoElement | null;
        if (v) v.style.transform = 'none';
      }
    });
  }, [remoteUsers]);

  // Mute control
  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.audioTrack) user.audioTrack.setVolume(isMuted ? 0 : 100);
    });
  }, [isMuted, remoteUsers]);

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
      toast.success(`Sent ${gift.emoji} ${gift.name}!`);
      setShowGiftPicker(false);
      const newHearts = Array.from({ length: 6 }, () => generateHeart());
      setHearts((p) => [...p, ...newHearts]);
    } catch { toast.error('Failed to send gift'); }
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
  const renderVideo = (id?: string) => (
    <>
      {remoteUsers.length > 0 ? (
        <div className="w-full h-full">
          {remoteUsers.map((user) => (
            <div key={user.uid} id={id || `remote-player-${user.uid}`} className="w-full h-full" />
          ))}
        </div>
      ) : (
        <div className="absolute inset-0">
          <ImageWithFallback src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            {videoError ? (
              <div className="text-center px-6">
                <p className="text-red-400 mb-3 text-sm">{videoError}</p>
                <button onClick={() => { setVideoError(null); window.location.reload(); }} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold">Retry</button>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="w-12 h-12 mx-auto mb-3 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
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
                likes={likes}
                isLiked={isLiked}
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
            likes={likes}
            isLiked={isLiked}
            isFollowing={isFollowingHost}
            onFollow={handleFollow}
            onClose={onClose}
          />
        </div>
      </div>

      <GiftBannerOverlay banners={giftBanners} />

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
