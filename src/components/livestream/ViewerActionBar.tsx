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
  const actionButtonClass =
    'inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-0 text-white/80 backdrop-blur-xl transition-all hover:bg-white/10 active:scale-90';

  return (
    <div className="w-full">
      <form onSubmit={onSendMessage}>
        <div className="flex flex-col gap-2">
          {/* Chat input — only on mobile when chat is visible */}
          {!isDesktop && isChatVisible && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 px-3 py-2 flex items-center gap-2 focus-within:border-primary/50 transition-colors">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  placeholder="Chat..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
                  maxLength={200}
                />
                <button
                  type="submit"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:bg-white/10 disabled:text-white/30"
                  disabled={!message.trim()}
                  aria-label="Send stream message"
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
                  className={actionButtonClass}
                  title={isChatVisible ? 'Comments open' : 'Comments closed'}
                >
                  {isChatVisible ? (
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <MessageCircleOff className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onMuteToggle}
                className={actionButtonClass}
              >
                {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>

            {/* Right: gift, share, like */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onGift}
                className={`${actionButtonClass} text-yellow-400 hover:bg-yellow-500/20`}
              >
                <Gift className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={onShare}
                className={actionButtonClass}
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                type="button"
                onClick={onLike}
                className={`inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border p-0 backdrop-blur-xl transition-all active:scale-90 ${
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
