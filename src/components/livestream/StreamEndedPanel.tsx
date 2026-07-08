import { Award, Clock, TrendingUp, MessageCircle, Users } from 'lucide-react';
import type { StreamStats } from './types';
import { formatStreamElapsedTime } from './sessionUtils';

interface StreamEndedPanelProps {
  endStats: StreamStats;
  onClose: () => void;
}

export function StreamEndedPanel({ endStats, onClose }: StreamEndedPanelProps) {
  const formatTime = formatStreamElapsedTime;

  return (
    <div className="fixed inset-0 bg-black z-[80] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-white text-xl font-bold">Stream Ended</h2>
            <p className="text-white/60 text-sm mt-1">Here's how your stream performed</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-white/50 text-2xs uppercase tracking-wider">Duration</span>
              </div>
              <span className="text-white text-lg font-bold">{formatTime(endStats.duration)}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white/50 text-2xs uppercase tracking-wider">Peak viewers</span>
              </div>
              <span className="text-white text-lg font-bold">{endStats.peakViewers.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-white/50 text-2xs uppercase tracking-wider">Revenue</span>
              </div>
              <span className="text-white text-lg font-bold">TZS {endStats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white/50 text-2xs uppercase tracking-wider">Messages</span>
              </div>
              <span className="text-white text-lg font-bold">{endStats.chatMessages.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3 border border-white/5 mb-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-pink-400 text-lg font-bold">{endStats.totalLikes}</span>
                <p className="text-white/40 text-2xs uppercase">Likes</p>
              </div>
              <div className="text-center">
                <span className="text-yellow-400 text-lg font-bold">{endStats.totalGifts}</span>
                <p className="text-white/40 text-2xs uppercase">Gifts</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
