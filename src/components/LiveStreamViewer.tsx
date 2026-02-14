import { useState, useEffect, useRef } from 'react';
import { X, Heart, Share2, Send, Users, MoreVertical, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause, Gift, BadgeCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getStreamMessages, sendStreamMessage, subscribeToStreamMessages } from '../utils/supabase/api';
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
  };
  onClose: () => void;
}

export function LiveStreamViewer({ stream, onClose }: LiveStreamViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ user: string; text: string; avatar?: string }[]>([]);
  const [likes, setLikes] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [reactions, setReactions] = useState<number[]>([]);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Agora State
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const client = useRef(AgoraRTC.createClient({ mode: 'live', codec: 'vp8' }));

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
        const token = await getAgoraToken(channelName, 0, 'subscriber'); // 0 for random UID
        
        // Add event listeners
        client.current.on("user-published", async (user, mediaType) => {
          await client.current.subscribe(user, mediaType);
          
          if (mediaType === "video") {
            setRemoteUsers(prev => [...prev, user]);
            // Play video (needs to happen after state update renders the div)
            // But state update is async.
            // Better to handle play in a separate effect or immediately if div exists.
            // We'll rely on a separate effect to play/attach tracks when remoteUsers changes.
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.current.on("user-unpublished", (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        await client.current.setClientRole('audience');
        await client.current.join(AGORA_APP_ID, channelName, token, null);

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
    };
  }, [stream.id]);

  // Play Remote Video Tracks
  useEffect(() => {
    remoteUsers.forEach(user => {
      const playerContainer = document.getElementById(`remote-player-${user.uid}`);
      if (playerContainer && user.videoTrack) {
        user.videoTrack.play(playerContainer);
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

  // Hide controls on idle
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(timeout);
    };
  }, []);

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

  const handleLike = () => {
    setLikes(prev => prev + 1);
    setReactions(prev => [...prev, Date.now()]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  const toggleFollow = () => {
    setIsFollowing(f => !f);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row">
      {/* Video Player Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden" onDoubleClick={handleLike}>
        {/* Main Video */}
        {remoteUsers.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            {remoteUsers.map(user => (
              <div 
                key={user.uid}
                id={`remote-player-${user.uid}`}
                className="w-full h-full" // Adjust for multiple users if needed, currently assumes 1 host
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0">
            <ImageWithFallback
              src={stream.thumbnail}
              alt={stream.title}
              className="w-full h-full object-cover opacity-50 blur-sm"
            />
             <div className="absolute inset-0 flex items-center justify-center flex-col">
                {videoError ? (
                  <>
                    <p className="text-red-400 mb-2">{videoError}</p>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        // Retry logic would involve re-joining
                        window.location.reload(); // Simple retry for now
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                     <p className="text-white text-xl font-bold mb-2">Waiting for host to join...</p>
                     <p className="text-white/70 animate-pulse">Connecting to live stream...</p>
                  </div>
                )}
             </div>
          </div>
        )}

        <div className={`absolute inset-0 transition-opacity duration-300 flex flex-col justify-between p-4 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent pt-2 pb-12 px-2 -mx-2 -mt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center">
                <span className="font-bold">{(stream.host || 'U').charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-white font-semibold text-sm">{stream.host}</button>
                <BadgeCheck className="w-4 h-4 text-blue-400" />
                <span className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold">LIVE</span>
                <span className="flex items-center gap-1 text-white/80 text-xs">
                  <Users className="w-4 h-4" />
                  {stream.viewers?.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={toggleFollow} className={`px-3 py-1.5 rounded-full text-xs ${isFollowing ? 'bg-green-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button onClick={onClose} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Bar (Video Controls) */}
          <div className="flex items-center justify-between text-white pb-2 px-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="hover:text-purple-400 transition-colors p-1"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
              </button>
              
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="hover:text-purple-400 transition-colors p-1"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={toggleFullscreen} 
                className="hover:text-purple-400 transition-colors p-1"
              >
                {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
              </button>
            </div>
          </div>
          <div className="pointer-events-none flex-1" />
          <div className="bg-gradient-to-t from-black via-black/60 to-transparent px-4 py-6">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsPlaying(p => !p)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button onClick={() => setIsMuted(m => !m)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={toggleFullscreen} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                </button>
                <button onClick={handleLike} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
                <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
          <div className="absolute right-4 top-24 flex flex-col gap-3">
            <button onClick={handleLike} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Heart className="w-6 h-6" />
            </button>
            <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Gift className="w-6 h-6" />
            </button>
            <button onClick={() => setShowEventInfo(s => !s)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <MoreVertical className="w-6 h-6" />
            </button>
            <button onClick={() => setShowChatDrawer(true)} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-0">
            {reactions.map(r => (
              <div key={r} className="absolute bottom-24 right-8 animate-bounce">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
            ))}
          </div>
        </div>
        {showEventInfo && (
          <div className="absolute left-0 top-0 bottom-0 w-[80%] md:w-[360px] bg-black/70 backdrop-blur-md border-r border-white/10">
            <div className="p-4 space-y-3">
              <div className="text-white font-bold text-lg">{stream.title}</div>
              <div className="text-white/80 text-sm">Host: {stream.host}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEventInfo(false)} className="px-3 py-2 rounded-full bg-white/10 text-white text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showChatDrawer && (
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-black/70 backdrop-blur-md border-t border-white/10">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3">
              <div className="text-white font-semibold text-sm">Live Chat</div>
              <button onClick={() => setShowChatDrawer(false)} className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-xs">
                    <span>{(m.user || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white/80 text-xs">{m.user || 'User'}</div>
                    <div className="text-white text-sm">{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 outline-none"
                  placeholder="Message"
                />
                <button type="submit" className="px-4 py-2 rounded-full bg-purple-600 text-white">Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
