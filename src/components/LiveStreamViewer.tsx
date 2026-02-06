import { useState, useEffect, useRef } from 'react';
import { X, Heart, Share2, Send, Users, MoreVertical, Maximize2, Minimize2, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { supabase } from '../utils/supabase/client';
import { getStreamMessages, sendStreamMessage, subscribeToStreamMessages, StreamMessage } from '../utils/supabase/api';
import { toast } from 'sonner';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Handle Play/Pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

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
    // Show floating heart animation logic could go here
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

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row">
      {/* Video Player Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Main Video */}
        {stream.playback_url ? (
          <video
            ref={videoRef}
            src={stream.playback_url}
            className="w-full h-full object-contain"
            autoPlay={isPlaying}
            muted={isMuted}
            loop
            playsInline
          />
        ) : (
          <div className="absolute inset-0">
            <ImageWithFallback
              src={stream.thumbnail}
              alt={stream.title}
              className="w-full h-full object-cover opacity-50 blur-sm"
            />
             <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/70">Stream Preview</p>
             </div>
          </div>
        )}

        {/* Overlays & Controls */}
        <div className={`absolute inset-0 transition-opacity duration-300 flex flex-col justify-between p-4 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* Top Bar */}
          <div className="flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent pt-2 pb-12 px-2 -mx-2 -mt-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-white font-semibold text-lg line-clamp-1">{stream.title}</h2>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs font-bold">
                    LIVE
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {stream.viewers?.toLocaleString()} watching
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white/90 text-sm border border-white/10">
                 {stream.quality}
               </div>
               <button className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                 <MoreVertical className="w-6 h-6" />
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
        </div>
      </div>

      {/* Sidebar (Chat & Interactions) - Hidden on landscape mobile if needed, but we'll keep it simple */}
      <div className="w-full md:w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-[40vh] md:h-full z-10">
        
        {/* Host Info */}
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {stream.host.charAt(0)}
             </div>
             <div>
               <p className="text-white font-medium">{stream.host}</p>
               <p className="text-gray-400 text-xs">Host</p>
             </div>
           </div>
           <button className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full hover:bg-purple-700">
             Follow
           </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center text-gray-500 text-sm my-4">
            Welcome to the live chat! 👋
          </div>
          {messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={msg.avatar} name={msg.user} className="w-full h-full" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-0.5">{msg.user}</p>
                <p className="text-white text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Interaction Bar */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          
          {/* Floating Actions */}
          <div className="flex items-center justify-end gap-3 mb-4">
             <button 
               onClick={handleLike}
               className="p-3 bg-gray-800 rounded-full text-pink-500 hover:bg-gray-700 transition-colors relative group"
             >
               <Heart className={`w-6 h-6 ${likes > 0 ? 'fill-pink-500' : ''}`} />
               <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                 {likes}
               </span>
             </button>
             <button className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors">
               <Share2 className="w-6 h-6" />
             </button>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something..."
              className="w-full bg-gray-800 text-white border-none rounded-full py-3 pl-4 pr-12 focus:ring-2 focus:ring-purple-600 focus:outline-none placeholder-gray-500"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 rounded-full text-white disabled:opacity-50 disabled:bg-gray-700 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
