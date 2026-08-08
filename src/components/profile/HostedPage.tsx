import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, PlaySquare, Search, X, MapPin, Download, Trash2 } from 'lucide-react';
import { BackButton } from '../ui/BackButton';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrganizerEvents,
  getProfile,
  getProfileStreamedVideos,
  getStreamDownloadUrl,
  deleteStreamRecord,
  type CloudflareStream,
  type Event as AppEvent,
  type Profile,
} from '../../utils/supabase/api';
import { supabase } from '../../utils/supabase/client';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { streamHasReplay, getStreamPlaybackUrl, getReplayThumbnail, isCloudflareIframeUrl } from '../../utils/streamPlayback';

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

const streamHasPlayback = streamHasReplay;

const streamThumbnailUrl = getReplayThumbnail;

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
      } catch (error) {
        console.error('Failed to load hosted activity:', error);
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

  const backfillTriggered = useRef(false);
  useEffect(() => {
    if (backfillTriggered.current) return;
    if (!targetUserId) return;
    if (streams.length === 0) return;
    const needsBackfill = streams.some((s) => !streamHasReplay(s));
    if (!needsBackfill) return;
    backfillTriggered.current = true;
    const userId = targetUserId;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!baseUrl) return;
        await fetch(`${baseUrl}/functions/v1/cloudflare-stream-backfill`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const refreshed = await getProfileStreamedVideos(userId);
        if (refreshed) setStreams(refreshed);
      } catch { /* ignore */ }
    })();
  }, [streams, targetUserId]);

  const pastEvents = useMemo(() => events.filter(isPastEvent), [events]);

  const playableStreams = useMemo(
    () => streams.filter((s) => s.has_recording || s.playback_url),
    [streams],
  );

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
    if (!query) return playableStreams;
    return playableStreams.filter((stream) => {
      return (
        String(stream.title || stream.event?.title || '').toLowerCase().includes(query) ||
        String(stream.event?.location || '').toLowerCase().includes(query)
      );
    });
  }, [playableStreams, searchQuery]);

  const openEvent = (event: AppEvent) => {
    navigate(`/event/${event.id}`, { state: { backgroundLocation: location } });
  };

  const [selectedStream, setSelectedStream] = useState<CloudflareStream | null>(null);

  const isOwner = Boolean(user && targetUserId && user.id === targetUserId);

  const [deleteConfirmStream, setDeleteConfirmStream] = useState<CloudflareStream | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closePlayer = useCallback(() => setSelectedStream(null), []);

  const handleDownload = useCallback(() => {
    if (!selectedStream) return;
    const url = getStreamDownloadUrl(selectedStream);
    if (!url) {
      toast.info('This recording is only available for streaming, not download.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedStream.title || 'stream'}${/\.mp4$/i.test(url) ? '.mp4' : ''}`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [selectedStream]);

  const handleDeleteStream = useCallback(async () => {
    const stream = deleteConfirmStream;
    if (!stream) return;
    setIsDeleting(true);
    try {
      await deleteStreamRecord(stream);
      setStreams((prev) => prev.filter((s) => s.uid !== stream.uid && s.id !== stream.id));
      if (selectedStream?.uid === stream.uid || selectedStream?.id === stream.id) {
        setSelectedStream(null);
      }
      toast.success('Stream recording deleted');
    } catch (error) {
      toast.error('Failed to delete stream recording');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmStream(null);
    }
  }, [deleteConfirmStream, selectedStream]);

  useEffect(() => {
    if (!selectedStream) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePlayer();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [selectedStream, closePlayer]);

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(2rem+var(--eventz-safe-area-bottom))]">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 pt-[var(--eventz-safe-area-top)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-95 transition" iconClassName="h-4 w-4 text-gray-900" />
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
            className={`h-10 flex-1 rounded-xl px-2.5 text-xs font-bold leading-none transition active:scale-[0.98] ${
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
            className={`h-10 flex-1 rounded-xl px-2.5 text-xs font-bold leading-none transition active:scale-[0.98] ${
              activeView === 'streams'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'bg-white/70 text-gray-500'
            }`}
          >
            {playableStreams.length} <span className="text-gray-500">Streams</span>
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={activeView === 'events' ? 'Search hosted events...' : 'Search streams...'}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <Skeleton className="aspect-[1.75] rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-7 w-64 max-w-full" />
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
                    onOpen={() => setSelectedStream(stream)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {selectedStream && (() => {
        const playbackUrl = getStreamPlaybackUrl(selectedStream);
        const title = selectedStream.title || selectedStream.event?.title || 'Streamed video';
        const dateStr = streamDateLabel(selectedStream.created_at);
        const location = selectedStream.event?.location;

        return (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-black/90 backdrop-blur-sm shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{dateStr}</span>
                  {location && (
                    <>
                      <span className="text-white/20">|</span>
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{location}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedStream(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition"
                aria-label="Close player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isOwner && (
              <div className="flex items-center justify-end gap-2 px-4 pb-3 shrink-0">
                <button
                  onClick={handleDownload}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setDeleteConfirmStream(selectedStream)}
                  disabled={isDeleting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-500/20 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/30 active:scale-95 transition disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}

            {/* Player */}
            <div className="flex-1 flex items-center justify-center bg-black p-2 sm:p-4 min-h-0">
              {playbackUrl ? (
                <div className="w-full max-w-5xl aspect-video overflow-hidden rounded-lg bg-black shadow-2xl">
                  {isCloudflareIframeUrl(playbackUrl) ? (
                    <iframe
                      src={playbackUrl}
                      title={title}
                      className="h-full w-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={playbackUrl}
                      title={title}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    >
                      <p className="p-4 text-center text-sm text-gray-400">Your browser does not support video playback.</p>
                    </video>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-5xl aspect-video flex flex-col items-center justify-center rounded-lg bg-gray-900 text-center px-6">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <PlaySquare className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-white font-semibold text-lg">Recording not available</p>
                  <p className="text-gray-400 text-sm mt-1.5 max-w-xs">
                    This stream does not have a playback URL yet. It may still be processing.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {deleteConfirmStream && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-950">Delete this recording?</h3>
            <p className="mt-1 text-sm text-gray-500">
              The recording will be removed from storage and this hosted list. The associated event will be kept.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => !isDeleting && setDeleteConfirmStream(null)}
                disabled={isDeleting}
                className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStream}
                disabled={isDeleting}
                className="h-10 flex-1 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.55)] cursor-pointer"
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
      className={`overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.55)] ${
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
