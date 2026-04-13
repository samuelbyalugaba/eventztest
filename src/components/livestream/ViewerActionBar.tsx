import { Send, Share2, Heart, Gift, Volume2, VolumeX } from 'lucide-react';

interface ViewerActionBarProps {
  message: string;
  onMessageChange: (val: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onShare: () => void;
  onLike: () => void;
  onGift: () => void;
  onMuteToggle: () => void;
  isLiked: boolean;
  isMuted: boolean;
}

export function ViewerActionBar({
  message,
  onMessageChange,
  onSendMessage,
  onShare,
  onLike,
  onGift,
  onMuteToggle,
  isLiked,
  isMuted,
}: ViewerActionBarProps) {
  return (
    <div className="w-full">
      <form onSubmit={onSendMessage}>
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

          {/* Action buttons - vertical on mobile right rail */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={onGift}
              className="p-2.5 rounded-xl bg-black/50 backdrop-blur-xl text-yellow-400 border border-white/10 hover:bg-yellow-500/20 active:scale-90 transition-all"
            >
              <Gift className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onMuteToggle}
              className="p-2.5 rounded-xl bg-black/50 backdrop-blur-xl text-white/80 border border-white/10 hover:bg-white/10 transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="p-2.5 rounded-xl bg-black/50 backdrop-blur-xl text-white/80 border border-white/10 hover:bg-white/10 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onLike}
              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all active:scale-90 ${
                isLiked
                  ? 'bg-pink-600/80 text-white border-pink-500/50 shadow-lg shadow-pink-500/20'
                  : 'bg-black/50 text-white/80 border-white/10 hover:bg-pink-500/20'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
