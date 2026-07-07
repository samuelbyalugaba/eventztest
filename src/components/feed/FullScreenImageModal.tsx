import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { deletePost } from '../../utils/supabase/api';
import { toast } from 'sonner';
import { Post } from '../../types';

interface FullScreenImageModalProps {
  images: string[];
  currentIndex: number;
  postId: number;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onClose: () => void;
}

export function FullScreenImageModal({ images, currentIndex: initialIndex, postId, posts, setPosts, onClose }: FullScreenImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          className="p-2 bg-white/10 hover:bg-red-500/50 rounded-full transition-colors"
          title="Delete"
          onClick={async (e) => {
            e.stopPropagation();
            const confirmed = window.confirm('Delete this post?');
            if (!confirmed) return;
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const post = posts.find(p => p.id === postId);
              if (!user || !post || user.id !== post.user.id) {
                toast.error('Not authorized to delete this post');
                return;
              }
              await deletePost(postId);
              toast.success('Post deleted');
              onClose();
              setPosts(prev => prev.filter(p => p.id !== postId));
            } catch (error) {
              toast.error('Failed to delete post');
            }
          }}
        >
          <Trash2 className="w-6 h-6 text-white" />
        </button>
        <button
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="absolute top-6 left-6 bg-primary/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium z-20">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      <div
        className="relative w-full h-full flex items-center justify-center px-4 select-none"
        onTouchStart={(e) => { setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY }); }}
        onTouchEnd={(e) => {
          if (!touchStart) return;
          const deltaX = e.changedTouches[0].clientX - touchStart.x;
          const deltaY = e.changedTouches[0].clientY - touchStart.y;
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            e.preventDefault();
            e.stopPropagation();
            if (deltaX > 0 && currentIndex > 0) setCurrentIndex(currentIndex - 1);
            else if (deltaX < 0 && currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
          }
          setTouchStart(null);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={images[currentIndex]} alt="Full size" className="max-w-full max-h-full object-contain pointer-events-none" />

        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex - 1); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            {currentIndex < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex + 1); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all z-10"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {images.map((_, index) => (
            <div
              key={index}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
