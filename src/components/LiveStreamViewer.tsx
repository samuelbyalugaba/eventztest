import { useState, useEffect, useRef } from 'react';
import { X, Heart, Share2, Send, Users, Volume2, VolumeX, Gift } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  getStreamMessages, 
  sendStreamMessage, 
  subscribeToStreamMessages, 
  updateLiveViewerCount,
  toggleLikeEvent,
  getEventLikes,
  hasUserLikedEvent,
  sendGift,
  followUser,
  unfollowUser,
  isFollowing,
  supabase
} from '../utils/supabase/api';
import { toast } from 'sonner';
import AgoraRTC, { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, getAgoraToken } from '../utils/agora';

interface LiveStreamViewerProps {
  stream: {
    id: number;
    title: string;
    thumbnail: string;
    viewers?: number;
    host: string;
    quality: string;
    playback_url?: string;
    organizer_id: string; // Add organizer_id to props
  };
  onClose: () => void;
  isUnlockedOverride?: boolean;
}

export function LiveStreamViewer({ stream, onClose }: LiveStreamViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ user: string; text: string; avatar?: string }[]>([]);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<number[]>([]);
  const [viewerCount, setViewerCount] = useState(stream.viewers || 0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Agora State
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const client = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  
  // Initialize Agora Client Lazy
  if (!client.current) {
    client.current = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  }

  // Generate a consistent String UID for the viewer to match Host's String UID type
  const [viewerUid] = useState(() => `viewer-${Math.random().toString(36).slice(2, 11)}`);

  // Load initial state (Likes, Follows)
  useEffect(() => {
    const loadState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check Like status
          const liked = await hasUserLikedEvent(stream.id, user.id);
          setIsLiked(liked);
          
          // Check Follow status
          if (stream.organizer_id) {
            const following = await isFollowing(user.id, stream.organizer_id);
            setIsFollowingHost(following);
          }
        }

        // Get total likes
        const totalLikes = await getEventLikes(stream.id);
        setLikes(totalLikes);

      } catch (error) {
        console.error('Failed to load stream state:', error);
      }
    };
    loadState();
  }, [stream.id, stream.organizer_id]);

  // Load chat messages
  useEffect(() => {
    const loadChat = async () => {
      try {
        const msgs = await getStreamMessages(stream.id);
        if (msgs) {
          setMessages(msgs.map((m: any) => ({
            user: m.user?.full_name || m.user?.username || 'User',
            text: m.message,
            avatar: m.user?.avatar_url
          })));
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      }
    };
    loadChat();

    const subscription = subscribeToStreamMessages(stream.id, (msg) => {
      setMessages(prev => [...prev, {
        user: msg.user?.full_name || msg.user?.username || 'User',
        text: msg.message,
        avatar: msg.user?.avatar_url
      }]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [stream.id]);

  // Initialize Agora Client (Audience)
  useEffect(() => {
    let mounted = true;
    const channelName = `event-${stream.id}`;

    const initAgora = async () => {
      try {
        // Use the generated String UID for token generation
        const token = await getAgoraToken(channelName, viewerUid, 'subscriber');
        if (!token) {
          setVideoError("Failed to join stream: missing Agora token");
          console.error("Agora subscriber token retrieval returned null for channel:", channelName);
          return;
        }
        
        // Add event listeners
        client.current.on("user-published", async (user, mediaType) => {
          await client.current.subscribe(user, mediaType);
          
          if (mediaType === "video") {
            setRemoteUsers(prev => {
                // Avoid duplicates
                if (prev.find(u => u.uid === user.uid)) return prev;
                return [...prev, user];
            });
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.current.on("user-unpublished", (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        await client.current.setClientRole('audience');
        // Join with the SAME String UID used for the token
        await client.current.join(AGORA_APP_ID, channelName, token, viewerUid);

        setViewerCount(prev => prev + 1);
        try {
          await updateLiveViewerCount(stream.id, 1);
        } catch (error) {
          console.error('Failed to update live viewer count:', error);
        }

      } catch (error: any) {
        console.error("Agora join error:", error);
        setVideoError(`Failed to join stream: ${error.message}`);
      }
    };

    initAgora();

    return () => {
      mounted = false;
      client.current.leave();
      client.current.removeAllListeners();

      setViewerCount(prev => Math.max(prev - 1, 0));
      (async () => {
        try {
          await updateLiveViewerCount(stream.id, -1);
        } catch (error) {
          console.error('Failed to decrement live viewer count:', error);
        }
      })();
    };
  }, [stream.id]);

  // Play Remote Video Tracks
  useEffect(() => {
    remoteUsers.forEach(user => {
      const playerContainer = document.getElementById(`remote-player-${user.uid}`);
      if (playerContainer && user.videoTrack) {
        user.videoTrack.play(playerContainer, { mirror: false });
        const videoEl = playerContainer.querySelector('video') as HTMLVideoElement | null;
        if (videoEl) {
          videoEl.style.transform = 'none';
        }
      }
    });
  }, [remoteUsers]);

  // Handle Play/Pause (Local Mute/Stop)
  // For Audience, "Pause" usually means stopping the video/audio track playback locally
  useEffect(() => {
     remoteUsers.forEach(user => {
       if (user.videoTrack) {
         if (isPlaying) {
            // If track is playing, do nothing? Or re-play?
            // user.videoTrack.play(...) handles it.
         } else {
            // user.videoTrack.stop(); // This would remove the video element content
         }
       }
     });
  }, [isPlaying, remoteUsers]);

  // Handle Mute
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.audioTrack) {
        user.audioTrack.setVolume(isMuted ? 0 : 100);
      }
    });
  }, [isMuted, remoteUsers]);


  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;

    try {
      await sendStreamMessage(stream.id, message);
      setMessage('');
      // Message will appear via subscription
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const handleLike = async () => {
    // Optimistic update for animation
    setReactions(prev => [...prev, Date.now()]);
    
    // Toggle logic
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await toggleLikeEvent(stream.id, user.id);
      }
    } catch (error) {
      console.error('Like error:', error);
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikes(prev => !newIsLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // Cleanup reactions (remove old hearts from DOM)
  useEffect(() => {
    if (reactions.length === 0) return;
    const timer = setTimeout(() => {
      setReactions(prev => prev.filter(r => Date.now() - r < 1200));
    }, 1200);
    return () => clearTimeout(timer);
  }, [reactions]);

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to follow");
        return;
      }
      
      if (isFollowingHost) {
        await unfollowUser(user.id, stream.organizer_id);
        setIsFollowingHost(false);
        toast.success(`Unfollowed ${stream.host}`);
      } else {
        await followUser(user.id, stream.organizer_id);
        setIsFollowingHost(true);
        toast.success(`Following ${stream.host}`);
      }
    } catch (error) {
      console.error('Follow error:', error);
      toast.error("Failed to update follow status");
    }
  };

  const handleGift = async () => {
    try {
      // For now, send a fixed amount or random amount to simulate
      // In production, this would open a modal to select gift/amount
      const amounts = [1000, 2000, 5000, 10000];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      
      await sendGift(stream.id, amount, 'TZS');
      toast.success(`Sent a gift of TZS ${amount}! 🎁`);
      
      // Trigger a special animation or reaction?
      setReactions(prev => [...prev, Date.now(), Date.now()+100, Date.now()+200]); // Burst of hearts
    } catch (error) {
      console.error('Gift error:', error);
      toast.error("Failed to send gift");
    }
  };

  const visibleMessages = messages;

  const handleShare = async () => {
    const shareData = {
      title: stream.title,
      text: `Watch "${stream.title}" live on Eventz`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Stream link copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-sm md:max-w-md aspect-[9/16] bg-black overflow-hidden rounded-[32px] md:rounded-[40px] border border-white/10 shadow-xl"
      >
        <div className="relative w-full h-full" onDoubleClick={handleLike}>
          {remoteUsers.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              {remoteUsers.map(user => (
                <div
                  key={user.uid}
                  id={`remote-player-${user.uid}`}
                  className="w-full h-full"
                />
              ))}
            </div>
          ) : (
            <div className="absolute inset-0">
              <ImageWithFallback
                src={stream.thumbnail}
                alt={stream.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/40">
                {videoError ? (
                  <>
                    <p className="text-red-400 mb-2 text-sm text-center px-4">{videoError}</p>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        window.location.reload();
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <div className="text-center px-6">
                    <p className="text-white text-lg font-semibold mb-1">Waiting for host to join…</p>
                    <p className="text-white/70 text-sm animate-pulse">Connecting to live stream…</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm">
                  <span>{(stream.host || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-white text-sm font-semibold">{stream.host}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/70">
                    <span className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-600 text-[9px] font-bold tracking-wide">
                        LIVE
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {(viewerCount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleFollow}
                  className={`px-3 py-1.5 rounded-full text-xs backdrop-blur-md transition-colors ${
                    isFollowingHost 
                      ? 'bg-white/20 text-white font-medium' 
                      : 'bg-purple-600 text-white font-semibold hover:bg-purple-700'
                  }`}
                >
                  {isFollowingHost ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="absolute bottom-16 left-2 right-20 max-h-24 overflow-y-auto scrollbar-hide space-y-1">
                {visibleMessages.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-black/40 backdrop-blur-md rounded-2xl px-2 py-1.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px]">
                      <span>{(m.user || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-white/70">{m.user || 'User'}</div>
                      <div className="text-[12px] text-white leading-snug">{m.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="absolute bottom-16 right-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleGift}
                  className="p-2 rounded-full bg-black/60 text-white border border-white/10 hover:bg-black/80 active:scale-95 transition-all"
                  title="Send Gift"
                >
                  <Gift className="w-5 h-5 text-yellow-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(m => !m)}
                  className="p-2 rounded-full bg-black/60 text-white border border-white/10"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {reactions.map(r => (
                  <div
                    key={r}
                    className="absolute bottom-24 right-6 animate-[floatUp_1.2s_ease-out_forwards]"
                    style={{ animationDelay: '0s' }}
                  >
                    <Heart className="w-5 h-5 text-pink-500 fill-pink-500 drop-shadow" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1 pb-1">
              <form onSubmit={handleSendMessage}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/60 backdrop-blur-md rounded-full border border-white/15 px-3 py-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Say something nice…"
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/60"
                    />
                    <button type="submit" className="text-purple-400 hover:text-purple-300">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-full bg-black/60 border border-white/10 text-white"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLike}
                    className={`p-2 rounded-full transition-colors ${
                      isLiked ? 'bg-pink-600 text-white' : 'bg-black/60 border border-white/10 text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
