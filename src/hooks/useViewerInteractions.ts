import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  supabase,
  subscribeToStreamPresence,
  toggleLikeEvent,
  getEventLikes,
  hasUserLikedEvent,
  subscribeToEventLikes,
  followUser,
  unfollowUser,
  isFollowing,
  sendGift,
} from '../utils/supabase/api';
import type { LiveStreamData, FloatingHeart, GiftOption } from '../components/livestream/types';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { GIFT_OPTIONS } from '../components/livestream/types';
import { generateHeart } from '../components/livestream/HeartAnimations';

export function useViewerInteractions(stream: LiveStreamData) {
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [viewerCount, setViewerCount] = useState(stream.viewers || 0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const pendingLikeRef = useRef(false);
  const likesRef = useRef(0);
  const [viewerUid] = useState(() => `viewer-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => { likesRef.current = likes; }, [likes]);

  useEffect(() => {
    const loadState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentUserIdRef.current = user.id;
          setCurrentUserId(user.id);
          const liked = await hasUserLikedEvent(stream.id, user.id);
          setIsLiked(liked);
          if (stream.organizer_id) {
            const following = await isFollowing(user.id, stream.organizer_id);
            setIsFollowingHost(following);
          }
        }
        const totalLikes = await getEventLikes(stream.id);
        setLikes(totalLikes);
      } catch (error) {
        console.warn('Failed to load initial stream state', error);
      }
    };
    loadState();
  }, [stream.id, stream.organizer_id]);

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

  useEffect(() => {
    const channel = subscribeToEventLikes(stream.id, ({ delta, userId }) => {
      if (pendingLikeRef.current && userId === currentUserIdRef.current) return;
      setLikes((p) => Math.max(0, p + delta));
      if (delta > 0) {
        setHearts((p) => [...p, generateHeart()]);
      }
    });
    return () => { channel.unsubscribe(); };
  }, [stream.id]);

  useEffect(() => {
    const giftSub = supabase
      .channel(`viewer-gifts:${stream.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `event_id=eq.${stream.id}` }, (payload: any) => {
        if (payload.new?.metadata?.type === 'gift') {
          const giftAmount = payload.new.amount;
          const giftMatch = GIFT_OPTIONS.find((g: { amount: number }) => g.amount === giftAmount);
          if (giftMatch) {
            const newHearts = Array.from({ length: 5 }, () => generateHeart());
            setHearts((p) => [...p, ...newHearts]);
          }
        }
      })
      .subscribe();

    return () => { giftSub.unsubscribe(); };
  }, [stream.id]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const timer = setTimeout(() => {
      setHearts((p) => p.filter((h) => Date.now() - h.id < 2000));
    }, 2000);
    return () => clearTimeout(timer);
  }, [hearts]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to like');
      return;
    }
    setHearts((p) => [...p, generateHeart(), generateHeart()]);
    pendingLikeRef.current = true;
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes((p) => newIsLiked ? p + 1 : Math.max(0, p - 1));
    try {
      await toggleLikeEvent(stream.id, user.id);
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikes((p) => !newIsLiked ? p + 1 : Math.max(0, p - 1));
      console.warn('Failed to toggle like', error);
    } finally {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
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
      toast.error(msg);
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
    } catch (error) {
      console.warn('Failed to share stream link', error);
    }
  };

  return {
    likes,
    isLiked,
    isFollowingHost,
    viewerCount,
    hearts,
    showGiftPicker,
    setShowGiftPicker,
    isSendingGift,
    setIsSendingGift,
    currentUserId,
    handleLike,
    handleFollow,
    handleGift,
    handleShare,
  };
}
