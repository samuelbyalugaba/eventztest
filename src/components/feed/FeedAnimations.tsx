import { Heart } from 'lucide-react';

export function LikeAnimation({ show, x, y }: { show: boolean; x: number; y: number }) {
  if (!show) return null;
  return (
    <div
      className="fixed pointer-events-none z-[100]"
      style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="animate-likePopup">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-4 shadow-2xl">
          <Heart className="w-10 h-10 text-white fill-white" />
        </div>
      </div>
    </div>
  );
}

export function FeedAnimationStyles() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes slideLeft {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; max-height: 0; transform: translateY(-10px); }
        to { opacity: 1; max-height: 1000px; transform: translateY(0); }
      }
      @keyframes likePopup {
        0% { opacity: 0; transform: scale(0.3) translateY(0) rotate(-10deg); }
        50% { opacity: 1; transform: scale(1.2) translateY(-20px) rotate(10deg); }
        100% { opacity: 0; transform: scale(0.8) translateY(-60px) rotate(0deg); }
      }
      @keyframes rewindPulse {
        0% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0; transform: scale(0.8); }
      }
      .animate-slideLeft { animation: slideLeft 0.3s ease-out forwards; }
      .animate-likePopup { animation: likePopup 1s ease-out forwards; }
      .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      .animate-rewindPulse { animation: rewindPulse 0.8s ease-out forwards; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `}} />
  );
}
