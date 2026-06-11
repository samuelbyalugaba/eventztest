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

type HostedRouteState = {
  initialProfile?: Partial<Profile> | null;
  initialHostedCount?: number;
  initialHostedEvents?: AppEvent[];
  initialHostedStreams?: CloudflareStream[];
};

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
  return stream.has_recording !== false && Boolean(stream.playback_url || (stream.source !== 'event' && stream.uid));
};

const streamThumbnailUrl = (stream: CloudflareStream) => {
  if (stream.thumbnail_url) return stream.thumbnail_url;
  if (stream.uid && !String(stream.uid).startsWith('event-')) {
    return `https://videodelivery.net/${stream.uid}/thumbnails/thumbnail.jpg`;
  }
  return stream.event?.image_url || '';
};

export function HostedPage() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const targetUserId = userId || user?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const initialState = location.state as HostedRouteState | null;
  const initialEvents = Array.isArray(initialState?.initialHostedEvents) ? initialState.initialHostedEvents : [];
  const initialStreams = Array.isArray(initialState?.initialHostedStreams) ? initialState.initialHostedStreams : [];
  const hasInstantState = Boolean(
    initialState?.initialProfile ||
    typeof initialState?.initialHostedCount === 'number' ||
    initialEvents.length > 0 ||
    initialStreams.length > 0
  );

  const [profile, setProfile] = useState<Profile | null>(() => (initialState?.initialProfile ? initialState.initialProfile as Profile : null));
  const [events, setEvents] = useState<AppEvent[]>(initialEvents);
  const [streams, setStreams] = useState<CloudflareStream[]>(initialStreams);
  const [activeView, setActiveView] = useState<HostedView>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(!hasInstantState);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!targetUserId) return;
      if (!hasInstantState) setIsLoading(true);
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
  }, [hasInstantState, targetUserId]);

  const pastEvents = useMemo(() => events.filter(isPastEvent), [events]);

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
    <div className="min-h-screen bg-gray-50 pb-[calc(2rem+var(--eventz-safe-area-bottom))]">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 pt-[var(--eventz-safe-area-top)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-gray-950">Hosted</h1>
              {profile?.full_name && (
                <p className="truncate text-xs text-gray-500">{profile.full_name}</p>
              )}
            </div>
          </div>
          <div className="rounded-full bg-purple-100 px-3 py-1.5 text-sm font-bold text-purple-700">
            {pastEvents.length} {pastEvents.length === 1 ? 'event' : 'events'}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveView('events')}
            className={`h-10 flex-1 rounded-xl px-2.5 text-[12px] font-bold leading-none transition active:scale-[0.98] ${
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
            className={`h-10 flex-1 rounded-xl px-2.5 text-[12px] font-bold leading-none transition active:scale-[0.98] ${
              activeView === 'streams'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'bg-white/70 text-gray-500'
            }`}
          >
            {streams.length} <span className="text-gray-500">Streams</span>
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={activeView === 'events' ? 'Search hosted events...' : 'Search streams...'}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl bg-white shadow-sm">
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
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Past Events</h2>
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
                    onOpen={() => openEvent(event)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Streams</h2>
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
  onOpen,
}: {
  event: AppEvent;
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
      className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.55)] cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="relative aspect-[1.75] overflow-hidden bg-gradient-to-br from-purple-950 via-purple-700 to-indigo-600">
        <ImageWithFallback
          src={event.image_url || (event as any).coverImage}
          alt={event.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/15" />
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-purple-700">
            {eventDateLabel(event.date)}
          </p>
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-gray-950">{event.title}</h3>
        </div>
        <span className="flex-shrink-0 text-sm font-bold text-purple-700">Details ›</span>
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
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.55)] focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
        canOpen ? 'cursor-pointer' : ''
      }`}
    >
      <div className="relative aspect-[1.75] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-800 to-purple-700">
        <ImageWithFallback
          src={streamThumbnailUrl(stream)}
          alt={title}
          className="h-full w-full object-cover"
          fallbackType="video"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
            <PlaySquare className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-xs font-bold text-white ${
          hasPlayback ? 'bg-purple-600/85' : 'bg-black/35'
        }`}>
          {hasPlayback ? 'Playback ready' : 'No playback'}
        </div>
      </div>
      <div className="p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-purple-700">
          <Calendar className="h-3.5 w-3.5" />
          {streamDateLabel(stream.created_at)}
        </p>
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-gray-950">{title}</h3>
        {stream.event?.location && (
          <p className="mt-1.5 truncate text-xs text-gray-500">{stream.event.location}</p>
        )}
      </div>
    </article>
  );
}

function EmptyHostedState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
        <PlaySquare className="h-6 w-6 text-purple-500" />
      </div>
      <p className="font-semibold text-gray-950">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-gray-500">{body}</p>
    </div>
  );
}
