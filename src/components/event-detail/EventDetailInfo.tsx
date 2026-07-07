import { MapPin, Bookmark, ExternalLink } from 'lucide-react';
import { formatDateWithWeekday } from '../../utils/format';
import type { Event as ApiEvent } from '../../utils/supabase/api';

interface EventDetailInfoProps {
  event: ApiEvent;
  isSaved: boolean;
  organizerDisplayName: string;
  locationMapsUrl: string;
  onToggleSave: () => void;
  onOrganizerClick: () => void;
}

const locations = [
  { id: 'all', name: 'All Locations' },
  { id: 'atlanta', name: 'Atlanta, USA' },
  { id: 'dar', name: 'Dar es Salaam, Tanzania' },
  { id: 'zanzibar', name: 'Zanzibar, Tanzania' },
  { id: 'newyork', name: 'New York, USA' },
];

function DetailCalendarIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9 flex-shrink-0"
      fill="none"
    >
      <path
        d="M9 12.5C9 9.5 11.5 7 14.5 7h19C36.5 7 39 9.5 39 12.5v22C39 37.5 36.5 40 33.5 40h-19C11.5 40 9 37.5 9 34.5v-22Z"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <path
        d="M9 13C9 9.7 11.7 7 15 7h18c3.3 0 6 2.7 6 6v7H9v-7Z"
        fill="var(--primary)"
      />
      <path d="M16 5v8M32 5v8" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M15 27h5M24 27h5M33 27h2M15 34h5M30 35l-4-4 1.9-1.9 2.1 2.1 5.2-5.2 1.8 1.9L30 35Z" fill="#CBD5E1" />
      <path d="M30 35l-4-4 1.9-1.9 2.1 2.1 5.2-5.2 1.8 1.9L30 35Z" fill="var(--primary)" />
    </svg>
  );
}

export function EventDetailInfo({
  event,
  isSaved,
  organizerDisplayName,
  locationMapsUrl,
  onToggleSave,
  onOrganizerClick,
}: EventDetailInfoProps) {
  return (
    <>
      <div className="mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-snug text-gray-900">{event.title}</h2>
            {(event.organizer || event.organizer_id) && (
              <button
                onClick={onOrganizerClick}
                className="mt-2 text-sm text-gray-600 hover:text-primary transition-colors text-left"
              >
                by <span className="font-semibold text-primary">{organizerDisplayName}</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onToggleSave}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border p-0 transition-all ${
                isSaved
                  ? 'bg-primary border-primary text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              title={isSaved ? 'Unsave event' : 'Save event'}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <DetailCalendarIcon />
          </div>
          <div className="flex-1">
            <p className="text-gray-900">{formatDateWithWeekday(event.date)}</p>
            <p className="text-gray-700 text-sm">{event.time}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-8 h-8 text-primary" strokeWidth={2.2} />
          </div>
          {locationMapsUrl ? (
            <a
              href={locationMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="-m-1 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2 pr-2.5 transition-colors hover:bg-gray-100 active:bg-gray-200"
              aria-label={`Open ${event.location} in maps`}
            >
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-600">Location</p>
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-2xs font-semibold leading-none text-primary">
                  Maps
                  <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
              <p className="break-words font-medium text-primary underline decoration-primary/40 underline-offset-4">{event.location}</p>
              <p className="text-gray-700 text-sm">{locations.find(l => l.id === event.city)?.name}</p>
            </a>
          ) : (
            <div className="flex-1">
              <p className="text-gray-600 text-sm">Location</p>
              <p className="text-gray-900">{event.location}</p>
              <p className="text-gray-700 text-sm">{locations.find(l => l.id === event.city)?.name}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-gray-900 mb-3">About the Event</h2>
        <p className="text-gray-700 leading-relaxed">{event.description}</p>
      </div>
    </>
  );
}
