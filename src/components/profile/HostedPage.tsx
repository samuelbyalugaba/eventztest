import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, PlaySquare, Search } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrganizerEvents,
  getProfile,
  getProfileStreamedVideos,
  type CloudflareStream,
  type Event as AppEvent,
  type Profile,
} from '../../utils/supabase/api';
import { ImageWithFallback } from '../figma/ImageWithFallback';

type HostedView = 'events' | 'streams';

const eventDateLabel = (date?: string) => {
  if (!date) return 'DATE TBA';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'DATE TBA';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .replace(',', '')
    .toUpperCase();
};

const streamDateLabel = (date?: string) => {
  if (!date) return 'Streamed';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Streamed';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(parsed)
    .toUpperCase();
};

const isPastEvent = (event: AppEvent) => {
  if (!event.date) return false;
  const parsed = new Date(event.date);
  return !Number.isNaN(parsed.getTime()) && parsed < new Date();
};

const streamHasPlayback = (stream: CloudflareStream) => {
  return stream.has_recording !== false && Boolean(stream.playback_url || stream.uid || stream.preview_url);
};

export function HostedPage() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const targetUserId = userId || user?.id;
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [streams, setStreams] = useState<CloudflareStream[]>([]);
  const [activeView, setActiveView] = useState<HostedView>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      try {
        const [profileData, organizerEvents, streamedVideos] = await Promise.all([
          getProfile(targetUserId),
          getOrganizerEvents(targetUserId),
          getProfileStreamedVideos(targetUserId),
        ]);

        if (!alive) return;
        setProfile(profileData);
        setEvents(organizerEvents || []);
        setStreams(streamedVideos || []);
      } catch {
        if (alive) toast.error('Failed to load hosted activity');
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const pastEvents = useMemo(() => events.filter(isPastEvent), [events]);
  const eventIdsWithStreams = useMemo(() => {
    return new Set(
      streams
        .map((stream) => stream.event_id)
        .filter((id): id is number => typeof id === 'number')
    );
  }, [streams]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pastEvents;
    return pastEvents.filter((event) => {
      return (
        String(event.title || '').toLowerCase().includes(query) ||
        String(event.location || '').toLowerCase().includes(query) ||
        String(event.category || '').toLowerCase().includes(query)
      );
    });
  }, [pastEvents, searchQuery]);

  const filteredStreams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return streams;
    return streams.filter((stream) => {
      return (
        String(stream.title || stream.event?.title || '').toLowerCase().includes(query) ||
        String(stream.event?.location || '').toLowerCase().includes(query)
      );
    });
  }, [streams, searchQuery]);

  const openEvent = (event: AppEvent) => {
    navigate(`/event/${event.id}`, { state: { backgroundLocation: location } });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-gray-950">Hosted</h1>
              {profile?.full_name && (
                <p className="truncate text-sm text-gray-500">{profile.full_name}</p>
              )}
            </div>
          </div>
          <div className="rounded-full bg-purple-100 px-4 py-2 text-base font-bold text-purple-700">
            {pastEvents.length} {pastEvents.length === 1 ? 'event' : 'events'}
          </div>
        </div>
      </header>

      <main className="px-5 py-5">
        <div className="mb-5 flex gap-3">
          <button
            type="button"
            onClick={() => setActiveView('events')}
            className={`h-14 flex-1 rounded-2xl px-4 text-lg font-bold transition active:scale-[0.98] ${
              activeView === 'events'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'bg-white/70 text-gray-500'
            }`}
          >
            {pastEvents.length} <span className="text-gray-500">Events</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('streams')}
            className={`h-14 flex-1 rounded-2xl px-4 text-lg font-bold transition active:scale-[0.98] ${
              activeView === 'streams'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'bg-white/70 text-gray-500'
            }`}
          >
            {streams.length} <span className="text-gray-500">Streams</span>
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={activeView === 'events' ? 'Search hosted events...' : 'Search streams...'}
            className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="aspect-[1.75] bg-gray-100 animate-pulse" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
                  <div className="h-7 w-64 max-w-full rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activeView === 'events' ? (
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-500">Past Events</h2>
            {filteredEvents.length === 0 ? (
              <EmptyHostedState
                title="No past events yet"
                body="Finished hosted events will appear here with their stream availability."
              />
            ) : (
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <HostedEventCard
                    key={event.id}
                    event={event}
                    hasStream={eventIdsWithStreams.has(event.id) || !!event.streaming?.replayAvailable}
                    onOpen={() => openEvent(event)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-500">Streams</h2>
            {filteredStreams.length === 0 ? (
              <EmptyHostedState
                title="No streams yet"
                body="Stream recordings and linked event streams will appear here."
              />
            ) : (
              <div className="space-y-6">
                {filteredStreams.map((stream) => (
                  <HostedStreamCard
                    key={stream.uid || stream.id}
                    stream={stream}
                    onOpen={() => stream.event && openEvent(stream.event)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function HostedEventCard({
  event,
  hasStream,
  onOpen,
}: {
  event: AppEvent;
  hasStream: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') onOpen();
      }}
      className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <div className="relative aspect-[1.75] overflow-hidden bg-gradient-to-br from-purple-950 via-purple-700 to-indigo-600">
        <ImageWithFallback
          src={event.image_url || (event as any).coverImage}
          alt={event.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
            <PlaySquare className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className={`absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-bold text-white ${
          hasStream ? 'bg-purple-600/85' : 'bg-black/35'
        }`}>
          {hasStream ? 'Stream available' : 'No stream'}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.16em] text-purple-700">
            {eventDateLabel(event.date)}
          </p>
          <h3 className="line-clamp-2 text-2xl font-bold leading-tight text-gray-950">{event.title}</h3>
        </div>
        <span className="flex-shrink-0 text-lg font-bold text-purple-700">Details ›</span>
      </div>
    </article>
  );
}

function HostedStreamCard({
  stream,
  onOpen,
}: {
  stream: CloudflareStream;
  onOpen: () => void;
}) {
  const canOpen = !!stream.event;
  const hasPlayback = streamHasPlayback(stream);
  const title = stream.title || stream.event?.title || 'Streamed video';

  return (
    <article
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? onOpen : undefined}
      onKeyDown={(keyboardEvent) => {
        if (canOpen && (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')) onOpen();
      }}
      className={`overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55)] focus:outline-none focus:ring-2 focus:ring-purple-500 ${
        canOpen ? 'cursor-pointer' : ''
      }`}
    >
      <div className="relative aspect-[1.75] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-800 to-purple-700">
        <ImageWithFallback
          src={stream.thumbnail_url || stream.event?.image_url}
          alt={title}
          className="h-full w-full object-cover"
          fallbackType="video"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
            <PlaySquare className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className={`absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-bold text-white ${
          hasPlayback ? 'bg-purple-600/85' : 'bg-black/35'
        }`}>
          {hasPlayback ? 'Playback ready' : 'No playback'}
        </div>
      </div>
      <div className="p-5">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-purple-700">
          <Calendar className="h-4 w-4" />
          {streamDateLabel(stream.created_at)}
        </p>
        <h3 className="line-clamp-2 text-2xl font-bold leading-tight text-gray-950">{title}</h3>
        {stream.event?.location && (
          <p className="mt-2 truncate text-sm text-gray-500">{stream.event.location}</p>
        )}
      </div>
    </article>
  );
}

function EmptyHostedState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
        <PlaySquare className="h-8 w-8 text-purple-500" />
      </div>
      <p className="font-semibold text-gray-950">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}
