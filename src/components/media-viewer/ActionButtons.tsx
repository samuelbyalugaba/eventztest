import { Heart, Share2 } from 'lucide-react';

interface ActionButtonsProps {
  isPost: boolean;
  isLiked: boolean;
  likes: number;
  onLike: () => void;
  onShare: () => void;
}

export function ActionButtons({
  isPost,
  isLiked,
  likes,
  onLike,
  onShare,
}: ActionButtonsProps) {
  return (
    <div className="absolute right-3 bottom-32 flex flex-col items-center gap-6 z-30">
      {isPost && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90"
        >
          <Heart
            className={`w-8 h-8 transition-all drop-shadow-lg ${
              isLiked ? 'fill-[#FF3CAC] text-[#FF3CAC]' : 'text-white'
            }`}
          />
          <span className="text-white text-xs font-bold drop-shadow-lg">{likes}</span>
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="flex flex-col items-center gap-1 transition-transform active:scale-90"
      >
        <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
      </button>
    </div>
  );
}
