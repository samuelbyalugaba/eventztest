import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MapPin, Bell } from 'lucide-react';

interface LiveStream {
  id: number;
  title: string;
  thumbnail: string;
  host: string;
  location: string;
  scheduledTime?: string;
}

interface UpcomingStreamCardProps {
  stream: LiveStream;
  isReminderSet: boolean;
  onToggleReminder: (streamId: number) => void;
  onClick: (stream: LiveStream) => void;
}

export function UpcomingStreamCard({ stream, isReminderSet, onToggleReminder, onClick }: UpcomingStreamCardProps) {
  return (
    <div
      onClick={() => onClick(stream)}
      className="group flex items-center gap-4 p-2.5 bg-white rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all duration-300 cursor-pointer"
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-black/5">
        <ImageWithFallback
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          width={100}
          height={100}
          quality={70}
          resize="cover"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <h3 className="text-gray-900 text-[13px] font-semibold mb-0.5 line-clamp-1 group-hover:text-purple-700 transition-colors">
          {stream.title}
        </h3>
        
        <div className="flex items-center gap-1.5 text-purple-600/90 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/30 flex items-center justify-center">
            <span className="w-0.5 h-0.5 rounded-full bg-purple-500"></span>
          </span>
          <span>{stream.scheduledTime?.split(' at ')[1] || stream.scheduledTime}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-400 text-[11px]">
          <MapPin className="w-3 h-3 opacity-70" />
          <span className="line-clamp-1 truncate max-w-[120px]">
            {stream.location || stream.host}
          </span>
        </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleReminder(stream.id);
        }}
        className={`p-2 rounded-xl transition-all active:scale-95 ${
          isReminderSet 
            ? 'bg-purple-100 text-purple-600' 
            : 'bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600'
        }`}
      >
        <Bell className={`w-4.5 h-4.5 ${isReminderSet ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
