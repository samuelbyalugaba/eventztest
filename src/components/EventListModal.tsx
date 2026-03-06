import { X, Calendar, MapPin, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import type { Event as AppEvent } from '../utils/supabase/api';

interface EventListModalProps {
  title: string;
  events: AppEvent[];
  onClose: () => void;
  onEventClick: (event: AppEvent) => void;
}

export function EventListModal({ title, events, onClose, onEventClick }: EventListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 bg-white">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No events found</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group"
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <ImageWithFallback
                    src={event.image_url || (event as any).coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-gray-900 font-medium text-sm line-clamp-1 mb-0.5">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
