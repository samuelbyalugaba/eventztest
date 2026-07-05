import { X, Calendar, MapPin, PlaySquare, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import type { CloudflareStream, Event as AppEvent } from '../utils/supabase/api';

interface EventListModalProps {
  title: string;
  events: AppEvent[];
  streams?: CloudflareStream[];
  onClose: () => void;
  onEventClick: (event: AppEvent) => void;
}

export function EventListModal({ title, events, streams = [], onClose, onEventClick }: EventListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.toLowerCase();
  const filteredEvents = events.filter((event) => {
    const title = String(event.title || '').toLowerCase();
    const location = String(event.location || '').toLowerCase();
    return title.includes(normalizedQuery) || location.includes(normalizedQuery);
  });
  const filteredStreams = streams.filter((stream) => {
    const title = String(stream.title || stream.event?.title || '').toLowerCase();
    const location = String(stream.event?.location || '').toLowerCase();
    return title.includes(normalizedQuery) || location.includes(normalizedQuery);
  });
  const hasResults = filteredEvents.length > 0 || filteredStreams.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 bg-white p-4 pt-[calc(1rem+var(--eventz-safe-area-top))] flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-3">
          {!hasResults ? (
            <div className="text-center py-12 text-gray-500">
              <p>{title === 'Hosted' ? 'No hosted activity found' : 'No events found'}</p>
            </div>
          ) : (
            <>
              {filteredEvents.map((event) => (
                <div
                  key={`event-${event.id}`}
                  onClick={() => onEventClick(event)}
                  className="flex gap-4 p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 shadow-sm">
                    <ImageWithFallback
                      src={event.image_url || (event as any).coverImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-gray-900 font-semibold text-base line-clamp-1 mb-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredStreams.map((stream) => (
                <div
                  key={`stream-${stream.uid || stream.id}`}
                  onClick={() => stream.event && onEventClick(stream.event)}
                  className={`flex gap-4 p-3 bg-gray-50 rounded-2xl transition-colors group ${
                    stream.event ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 shadow-sm">
                    <ImageWithFallback
                      src={stream.thumbnail_url || stream.event?.image_url}
                      alt={stream.title || stream.event?.title || 'Streamed video'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <PlaySquare className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-gray-900 font-semibold text-base line-clamp-1 mb-1">
                      {stream.title || stream.event?.title || 'Streamed video'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <PlaySquare className="w-3.5 h-3.5" />
                      <span>Streamed</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{new Date(stream.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
