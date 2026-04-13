import { Send, Share2, Heart, Gift, Volume2, VolumeX, MessageCircle, MessageCircleOff } from 'lucide-react';

interface ViewerActionBarProps {
  message: string;
  onMessageChange: (val: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onShare: () => void;
  onLike: () => void;
  onGift: () => void;
  onMuteToggle: () => void;
  onToggleChat?: () => void;
  isLiked: boolean;
  isMuted: boolean;
  isChatVisible?: boolean;
  /** Hide inline chat input on desktop (chat is in sidebar) */
  isDesktop?: boolean;
}

export function ViewerActionBar({
  message,
  onMessageChange,
  onSendMessage,
  onShare,
  onLike,
  onGift,
  onMuteToggle,
  onToggleChat,
  isLiked,
  isMuted,
  isChatVisible = true,
  isDesktop = false,
}: ViewerActionBarProps) {
  return (
    <div className="w-full">
      <form onSubmit={onSendMessage}>
        {/* Mobile: input row + action icons below */}
        {/* Desktop: just action icons (chat is in sidebar) */}
        <div className="flex flex-col gap-2">
          {/* Chat input — only on mobile when chat is visible */}
          {!isDesktop && isChatVisible && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 px-3.5 py-2.5 flex items-center gap-2 focus-within:border-purple-500/50 transition-colors">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder="Say something…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
                  maxLength={200}
                />
                <button
                  type="submit"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={!message.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center justify-between">
            {/* Left: toggle chat */}
            <div className="flex items-center gap-1.5">
              {onToggleChat && (
                <button
                  type="button"
                  onClick={onToggleChat}
                  className="p-2 rounded-xl bg-black/50 backdrop-blur-xl text-white/80 border border-white/10 hover:bg-white/10 transition-all"
                  title={isChatVisible ? 'Hide chat' : 'Show chat'}
                >
                  {isChatVisible ? (
                    <MessageCircleOff className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onMuteToggle}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-xl text-white/80 border border-white/10 hover:bg-white/10 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>

            {/* Right: gift, share, like */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onGift}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-xl text-yellow-400 border border-white/10 hover:bg-yellow-500/20 active:scale-90 transition-all"
              >
                <Gift className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={onShare}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-xl text-white/80 border border-white/10 hover:bg-white/10 transition-all"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={onLike}
                className={`p-2 rounded-xl backdrop-blur-xl border transition-all active:scale-90 ${
                  isLiked
                    ? 'bg-pink-600/80 text-white border-pink-500/50 shadow-lg shadow-pink-500/20'
                    : 'bg-black/50 text-white/80 border-white/10 hover:bg-pink-500/20'
                }`}
              >
                <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
