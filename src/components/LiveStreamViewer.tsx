import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, Lock, Users, Heart, MessageCircle, Send, Volume2, VolumeX, Maximize, MoreVertical, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShareModal } from './ShareModal';
import { handleShare as shareUtil } from '../utils/share';
import { getStreamMessages, sendStreamMessage, subscribeToStreamMessages, StreamMessage } from '../utils/supabase/api';

interface LiveStreamViewerProps {
  stream: {
    id: number;
    title: string;
    thumbnail: string;
    viewers: number;
    host: string;
    quality: 'HD' | '4K';
    isPaid?: boolean;
    price?: number;
    playback_url?: string;
  };
  onClose: () => void;
  isUnlockedOverride?: boolean;
}

export function LiveStreamViewer({ stream, onClose, isUnlockedOverride }: LiveStreamViewerProps) {
  const [activeStream, setActiveStream] = useState(stream);
  const [isUnlocked, setIsUnlocked] = useState(!stream.isPaid || isUnlockedOverride);
  const [isMuted, setIsMuted] = useState(true);
  const [showChat, setShowChat] = useState(false); // Start with chat hidden
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [reactions, setReactions] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    setActiveStream(stream);
  }, [stream]);

  // Subscribe to real-time updates for viewer count and stream status
  useEffect(() => {
    const channel = supabase
      .channel(`live_stream_updates:${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${stream.id}`
        },
        (payload) => {
          const newData = payload.new;
          if (newData.streaming) {
            setActiveStream(prev => ({
              ...prev,
              viewers: newData.streaming.liveViewers || prev.viewers,
              playback_url: newData.streaming.playback_url,
              // We can also update other fields if needed
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    if (isUnlocked) {
      getStreamMessages(stream.id)
        .then(setMessages)
        .catch(console.error);
    }
  }, [stream.id, isUnlocked]);

  // Subscribe to new messages
  useEffect(() => {
    if (!isUnlocked) return;

    const subscription = subscribeToStreamMessages(stream.id, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [stream.id, isUnlocked]);

  // Play video when unlocked
  useEffect(() => {
    if (isUnlocked && videoRef.current) {
      // Force play on mobile - handle promise properly
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video playing successfully');
            setIsBuffering(false);
          })
          .catch(err => {
            console.log('Video autoplay prevented, user tap required:', err);
            // On mobile, we may need user interaction - add click handler
            const handleFirstPlay = () => {
              if (videoRef.current) {
                videoRef.current.play();
                videoRef.current.removeEventListener('click', handleFirstPlay);
              }
            };
            videoRef.current?.addEventListener('click', handleFirstPlay);
          });
      }
    }
  }, [isUnlocked]);

  // Update video mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Messages are handled by subscription above


  const handleUnlock = () => {
    setIsUnlocked(true);
    toast.success('Stream unlocked! Enjoy the show 🎉');
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !isUnlocked) return;
    
    try {
      await sendStreamMessage(stream.id, chatMessage);
      setChatMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const addReaction = () => {
    if (!isUnlocked) return;
    setReactions(prev => prev + 1);
    setTimeout(() => setReactions(prev => Math.max(0, prev - 1)), 2000);
  };

  const handleShare = async () => {
    const shared = await shareUtil({
      title: activeStream.title,
      text: `Watch ${activeStream.title} live on EVENTZ!\nViewing now: ${activeStream.viewers} people`,
      url: window.location.href,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShowShareModal(true);
    }
  };

  // Get appropriate video URL based on stream content
  const getVideoUrl = () => {
    return activeStream.playback_url || '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm">
              <MoreVertical className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Video Player Container - iPhone 16 Pro Max optimized */}
        <div className="flex-1 flex items-start justify-center relative pt-14">
          <div className="w-full h-full relative bg-black">
            {/* Real Video Player (ALWAYS RENDERED for instant playback) */}
            <video
              ref={videoRef}
              className={`w-full h-full object-contain transition-opacity duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              loop
              playsInline
              muted={isMuted}
              preload="auto"
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
            >
              <source src={getVideoUrl()} type="video/mp4" />
            </video>

            {/* Offline/No Stream Message */}
            {isUnlocked && !getVideoUrl() && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
                    <VolumeX className="w-8 h-8 text-white/50" />
                  </div>
                  <h3 className="text-white text-xl mb-2">Stream Offline</h3>
                  <p className="text-white/60 text-sm">The stream hasn't started or has ended.</p>
                </div>
              </div>
            )}

            {/* Blurred Thumbnail (when locked) */}
            {!isUnlocked && (
              <>
                <ImageWithFallback
                  src={activeStream.thumbnail}
                  alt={activeStream.title}
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-all duration-500"
                />
                {/* Dimmed overlay for locked state */}
                <div className="absolute inset-0 bg-black/60"></div>
              </>
            )}

            {/* Buffering Indicator */}
            {isBuffering && isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            {/* Top overlay - Live indicator, viewers, quality */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                {/* LIVE Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  <span className="text-white text-sm tracking-wide">LIVE</span>
                </div>

                {/* FREE Badge */}
                {!activeStream.isPaid && (
                  <div className="px-3 py-1.5 rounded-full bg-green-500 shadow-lg">
                    <span className="text-white text-sm">FREE</span>
                  </div>
                )}

                {/* Viewers count */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
                  <Users className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">{activeStream.viewers.toLocaleString()}</span>
                </div>
              </div>

              {/* Quality Badge */}
              <div className="px-3 py-1.5 rounded-full bg-purple-600 shadow-lg">
                <span className="text-white text-sm">{activeStream.quality}</span>
              </div>
            </div>

            {/* Locked State - Center */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-6">
                  {/* Lock Icon */}
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Lock className="w-10 h-10 text-white" />
                  </div>

                  {/* Text */}
                  <h3 className="text-white text-2xl mb-2">Unlock to watch live</h3>
                  <p className="text-white/80 text-sm mb-6">Get instant access to this live stream</p>

                  {/* Unlock Button */}
                  <button
                    onClick={handleUnlock}
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    Unlock Stream – TZS {activeStream.price?.toLocaleString()}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom overlay - Title, Host, Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5">
              <div className="flex items-end justify-between">
                <div className="flex-1 pr-4">
                  <h2 className="text-white text-xl mb-1 line-clamp-1">{activeStream.title}</h2>
                  <p className="text-white/80 text-sm">{activeStream.host}</p>
                </div>

                {/* Video Controls */}
                {isUnlocked && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors">
                      <Maximize className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Reactions */}
            {reactions > 0 && (
              <div className="absolute right-4 bottom-24 flex flex-col-reverse gap-2">
                {[...Array(Math.min(reactions, 5))].map((_, i) => (
                  <div
                    key={i}
                    className="animate-float-up"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Panel - Right Side */}
          {showChat && isUnlocked && (
            <div className="absolute right-8 top-0 bottom-0 w-80 bg-white rounded-2xl shadow-2xl flex flex-col">
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="text-gray-900">Live Chat</h3>
                  </div>
                  <button
                    onClick={() => setShowChat(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="text-purple-600 font-medium">
                      {msg.user?.username || msg.user?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-gray-900 ml-2">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={addReaction}
                    className="px-4 py-2 rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
                  >
                    <Heart className="w-4 h-4 text-pink-500" />
                  </button>
                  <span className="text-gray-500 text-xs">Send reactions</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Say something..."
                    className="flex-1 px-4 py-2 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatMessage.trim()}
                    className="w-10 h-10 rounded-full bg-purple-600 disabled:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Toggle (when hidden) */}
          {!showChat && isUnlocked && (
            <button
              onClick={() => setShowChat(true)}
              className="absolute right-6 bottom-32 w-14 h-14 rounded-full bg-[#8A2BE2] hover:bg-[#7B24CC] flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-20"
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Locked Chat Indicator */}
          {!isUnlocked && (
            <div className="absolute right-8 bottom-8 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm">Chat locked</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add CSS for floating animation */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1.2);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={stream.title}
        text={`Watch ${stream.title} live on EVENTZ!\nViewing now: ${stream.viewers} people`}
        url={window.location.href}
      />
    </div>
  );
}