import { X, Users, Activity, Mic, MicOff, Video, VideoOff, Radio, Settings, SwitchCamera, Heart, MessageCircle, MessageCircleOff, Send } from 'lucide-react';
import { FloatingChat } from './FloatingChat';
import { SidebarChat } from './SidebarChat';
import { HeartAnimations } from './HeartAnimations';
import type { FloatingHeart } from './types';
import { formatStreamElapsedTime } from './sessionUtils';

interface ChatMessageItem {
  id?: number;
  userId?: string;
  user: string;
  text: string;
  avatar?: string;
  isGift?: boolean;
}

interface StreamActiveOverlayProps {
  cameraEnabled: boolean;
  micEnabled: boolean;
  streamHealth: 'good' | 'poor' | 'offline';
  isMobile: boolean;
  countdown: number;
  streamTitle: string;
  totalRevenue: number;
  elapsedTime: number;
  viewerCount: number;
  likes: number;
  chatMessages: ChatMessageItem[];
  chatMessage: string;
  likesAnimation: FloatingHeart[];
  isChatVisible: boolean;
  onToggleCamera: () => void;
  onToggleCameraDevice: () => void;
  onToggleMic: () => void;
  onToggleLive: () => void;
  onChatMessageChange: (msg: string) => void;
  onSendChatMessage: (e?: React.FormEvent) => void;
  onReportMessage: (msg: ChatMessageItem) => void;
  onToggleChatVisibility: () => void;
  onRequestClose: () => void;
  onOpenSettings: () => void;
}

const setupIconButtonClass =
  'inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 p-0 text-white backdrop-blur-xl transition-transform active:scale-90';

const liveRailButtonClass =
  'inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 p-0 backdrop-blur-xl transition-all active:scale-90';

export function StreamActiveOverlay({
  cameraEnabled,
  micEnabled,
  streamHealth,
  isMobile,
  countdown,
  streamTitle,
  totalRevenue,
  elapsedTime,
  viewerCount,
  likes,
  chatMessages,
  chatMessage,
  likesAnimation,
  isChatVisible,
  onToggleCamera,
  onToggleCameraDevice,
  onToggleMic,
  onToggleLive,
  onChatMessageChange,
  onSendChatMessage,
  onReportMessage,
  onToggleChatVisibility,
  onRequestClose,
  onOpenSettings,
}: StreamActiveOverlayProps) {
  const formatTime = formatStreamElapsedTime;

  return (
    <div className="fixed inset-0 bg-black z-[80] overflow-hidden flex">
      {/* Video + HUD area */}
      <div className="flex-1 relative min-h-0">
        {/* Video — fill entire area, no extra wrapper */}
        <div id="local-player" className={`absolute inset-0 w-full h-full [&>div]:!w-full [&>div]:!h-full [&>div]:!position-relative [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover ${!cameraEnabled ? 'invisible' : ''}`} />
        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center text-white/50">
              <VideoOff className="w-12 h-12 mb-3" />
              <span>Camera off</span>
            </div>
          </div>
        )}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="text-white text-7xl font-black animate-pulse">{countdown}</div>
          </div>
        )}

        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {/* Top gradient */}
          <div className="bg-gradient-to-b from-black/80 via-black/30 to-transparent h-32 pointer-events-auto">
            <div className="px-4 pt-[calc(3rem+var(--eventz-safe-area-top))] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onRequestClose} className={setupIconButtonClass}>
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-white font-bold text-sm max-w-[140px] truncate">{streamTitle}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-200 text-2xs font-black tracking-[0.15em]">LIVE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/15 border border-yellow-500/25 px-3 py-1.5 rounded-xl backdrop-blur-xl">
                  <span className="text-yellow-400 font-bold text-sm">TZS {totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating HUD pill */}
          <div className="absolute left-1/2 -translate-x-1/2 top-28 flex items-center gap-3 bg-black/50 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
            <span className="text-white text-xs font-bold">{formatTime(elapsedTime)}</span>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-white/60" />
              <span className="text-white text-xs font-bold">{viewerCount.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-white text-xs font-bold">{likes.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className={`flex items-center gap-1 text-2xs font-bold ${streamHealth === 'good' ? 'text-green-400' : streamHealth === 'poor' ? 'text-yellow-400' : 'text-red-400'}`}>
              <Activity className="w-3.5 h-3.5" />
              <span>{streamHealth === 'good' ? 'GOOD' : streamHealth === 'poor' ? 'POOR' : 'BAD'}</span>
            </div>
          </div>

          {/* Right action rail */}
          <div className="absolute bottom-32 right-4 flex flex-col items-center gap-3 pointer-events-auto">
            <button onClick={onToggleCameraDevice} className={`${liveRailButtonClass} bg-black/40 text-white`} aria-label="Switch camera">
              <SwitchCamera className="w-5 h-5" />
            </button>
            <button onClick={onToggleCamera} className={`${liveRailButtonClass} ${cameraEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'}`}>
              {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={onToggleMic} className={`${liveRailButtonClass} ${micEnabled ? 'bg-black/40 text-white' : 'bg-white text-black'}`}>
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={onToggleChatVisibility}
              title={isChatVisible ? 'Comments open' : 'Comments closed'}
              className={`${liveRailButtonClass} ${isChatVisible ? 'bg-black/40 text-white' : 'bg-white text-black'}`}
            >
              {isChatVisible ? <MessageCircle className="w-5 h-5" /> : <MessageCircleOff className="w-5 h-5" />}
            </button>
            <button onClick={onOpenSettings} className={`${liveRailButtonClass} bg-black/40 text-white`}>
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onToggleLive} className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 bg-white text-red-600 active:scale-90 transition-all">
              <Radio className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile: Floating chat overlay */}
        {isMobile && isChatVisible && (
          <div className="absolute bottom-24 left-3 w-[min(78vw,18rem)] z-20 pointer-events-auto">
            <FloatingChat messages={chatMessages} maxVisible={3} onReportMessage={onReportMessage} />
          </div>
        )}

        {isMobile && isChatVisible && (
          <form
            onSubmit={onSendChatMessage}
            className="absolute bottom-[calc(0.75rem+var(--eventz-safe-area-bottom))] left-3 right-3 z-30 pointer-events-auto"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
              <input
                value={chatMessage}
                onChange={(event) => onChatMessageChange(event.target.value)}
                placeholder="Chat..."
                maxLength={200}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/45"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-all active:scale-95 disabled:bg-white/10 disabled:text-white/30"
                aria-label="Send stream message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* Hearts */}
        <HeartAnimations hearts={likesAnimation} />
      </div>

      {/* Desktop: Sidebar chat */}
      {!isMobile && isChatVisible && (
        <div className="w-[340px] flex-shrink-0">
          <SidebarChat
            messages={chatMessages}
            message={chatMessage}
            onMessageChange={onChatMessageChange}
            onSendMessage={onSendChatMessage}
            onReportMessage={onReportMessage}
            viewerCount={viewerCount}
          />
        </div>
      )}
    </div>
  );
}
