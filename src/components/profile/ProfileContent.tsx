import { Play, Image as ImageIcon, GalleryHorizontal, Bookmark, Calendar, Ticket as TicketIcon, PlaySquare, Radio } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { EventCard } from '../EventCard';
import type { ProfileTab } from './ProfileTabs';
import type { ApiPost, Ticket, Event as AppEvent, CloudflareStream } from '../../utils/supabase/api';

interface ProfileContentProps {
  activeTab: ProfileTab;
  isOwnProfile: boolean;
  isPaused: boolean;
  // Posts
  isLoadingPosts: boolean;
  userPosts: ApiPost[];
  hasMorePosts: boolean;
  isLoadingMorePosts: boolean;
  onLoadMorePosts: () => void;
  onOpenPost: (post: ApiPost) => void;
  // Saved
  isLoadingSavedEvents: boolean;
  savedEvents: (AppEvent & { isSaved: boolean; hasReminder: boolean })[];
  savedPosts: ApiPost[];
  onEventClick: (event: AppEvent) => void;
  onOpenSavedPost: (post: ApiPost) => void;
  currentUserId?: string;
  onEditEvent?: (event: any) => void;
  onDeleteEvent: (event: AppEvent) => void;
  // Upcoming
  isLoadingOrganizerEvents: boolean;
  publishedEvents: any[];
  onCreateEvent?: () => void;
  // Tickets
  isLoadingTickets: boolean;
  uniqueTicketGroups: Ticket[][];
  onTicketGroupClick: (tickets: Ticket[]) => void;
  // Streamed
  isLoadingStreamedVideos: boolean;
  streamedVideos: CloudflareStream[];
}

export function ProfileContent({
  activeTab,
  isOwnProfile,
  isPaused,
  isLoadingPosts,
  userPosts,
  hasMorePosts,
  isLoadingMorePosts,
  onLoadMorePosts,
  onOpenPost,
  isLoadingSavedEvents,
  savedEvents,
  savedPosts,
  onEventClick,
  onOpenSavedPost,
  currentUserId,
  onEditEvent,
  onDeleteEvent,
  isLoadingOrganizerEvents,
  publishedEvents,
  onCreateEvent,
  isLoadingTickets,
  uniqueTicketGroups,
  onTicketGroupClick,
  isLoadingStreamedVideos,
  streamedVideos,
}: ProfileContentProps) {
  return (
    <div>
      {activeTab === 'media' && (
        <MediaTab
          isLoading={isLoadingPosts}
          posts={userPosts}
          hasMore={hasMorePosts}
          isLoadingMore={isLoadingMorePosts}
          onLoadMore={onLoadMorePosts}
          onOpenPost={onOpenPost}
          isOwnProfile={isOwnProfile}
          isPaused={isPaused}
        />
      )}

      {activeTab === 'saved' && (
        <SavedTab
          isLoading={isLoadingSavedEvents}
          events={savedEvents}
          posts={savedPosts}
          onEventClick={onEventClick}
          onOpenPost={onOpenSavedPost}
          currentUserId={currentUserId}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
          isPaused={isPaused}
        />
      )}

      {activeTab === 'upcoming' && (
        <UpcomingTab
          isLoading={isLoadingOrganizerEvents}
          events={publishedEvents}
          onEventClick={onEventClick}
          currentUserId={currentUserId}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
          onCreateEvent={onCreateEvent}
          canManageEvents={isOwnProfile}
        />
      )}

      {activeTab === 'tickets' && (
        <TicketsTab
          isLoading={isLoadingTickets}
          groups={uniqueTicketGroups}
          onGroupClick={onTicketGroupClick}
        />
      )}

      {activeTab === 'streamed' && (
        <StreamedTab
          isLoading={isLoadingStreamedVideos}
          streams={streamedVideos}
        />
      )}
    </div>
  );
}

function formatDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getStreamPlaybackUrl(stream: CloudflareStream) {
  if (stream.playback_url) return stream.playback_url;
  return `https://iframe.videodelivery.net/${stream.uid}`;
}

function hasPlayableRecording(stream: CloudflareStream) {
  return stream.has_recording !== false && Boolean(stream.playback_url || (stream.source !== 'event' && stream.uid));
}

function StreamedTab({ isLoading, streams }: { isLoading: boolean; streams: CloudflareStream[] }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-gray-100 rounded-2xl animate-pulse" />
        <div className="aspect-video bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <PlaySquare className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-900 font-medium mb-1">Stream Recordings</p>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">Recordings saved to this profile will appear here for playback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {streams.map((stream) => {
        const duration = formatDuration(typeof stream.duration === 'number' ? stream.duration : null);
        const canPlay = hasPlayableRecording(stream);
        return (
          <article key={stream.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="aspect-video bg-black">
              {canPlay ? (
                <iframe
                  src={getStreamPlaybackUrl(stream)}
                  title={stream.title || 'Streamed video'}
                  className="w-full h-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              ) : (
                <div className="relative h-full w-full overflow-hidden">
                  <ImageWithFallback
                    src={stream.thumbnail_url || stream.event?.image_url}
                    alt={stream.title || stream.event?.title || 'Streamed video'}
                    className="h-full w-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-center px-4">
                    <Radio className="w-8 h-8 text-white/90 mb-2" />
                    <p className="text-white text-sm font-semibold">Stream ended</p>
                    <p className="text-white/70 text-xs mt-1">Recording playback is not available for this session.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-gray-900 font-semibold line-clamp-2">{stream.title || stream.event?.title || 'Streamed video'}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {stream.event?.title && <span>{stream.event.title}</span>}
                {duration && <span>{duration}</span>}
                {stream.created_at && <span>{new Date(stream.created_at).toLocaleDateString()}</span>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MediaTab({ isLoading, posts, hasMore, isLoadingMore, onLoadMore, onOpenPost, isOwnProfile, isPaused }: {
  isLoading: boolean; posts: ApiPost[]; hasMore: boolean; isLoadingMore: boolean;
  onLoadMore: () => void; onOpenPost: (p: ApiPost) => void; isOwnProfile: boolean; isPaused: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-900 font-medium mb-1">No posts yet</p>
        {isOwnProfile && <p className="text-gray-500 text-sm max-w-xs mx-auto">Share event photos and videos</p>}
      </div>
    );
  }

  const isMediaVideo = (url?: string) => !!url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.toLowerCase().includes('video') || url.toLowerCase().includes('highlight'));

  return (
    <>
      <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
        {posts.map((post) => {
          const firstImage = post.image_urls?.[0];
          const videoSrc = post.video_url || (isMediaVideo(firstImage) ? firstImage : undefined);
          const isVideo = !!videoSrc;
          const videoThumbnail = isVideo ? (post.video_url && firstImage && !isMediaVideo(firstImage) ? firstImage : post.image_urls?.find((u: string) => !!u && !isMediaVideo(u))) : undefined;
          const isCarousel = (post.image_urls?.length || 0) > 1;
          return (
            <div
              id={`profile-post-${post.id}`}
              key={post.id}
              onClick={() => onOpenPost(post)}
              className="relative aspect-square cursor-pointer group bg-gray-100 overflow-hidden"
            >
              {isVideo ? (
                <video
                  src={`${videoSrc!}${videoSrc!.includes('#') ? '' : '#t=0.1'}`}
                  poster={videoThumbnail}
                  className="w-full h-full object-cover"
                  muted playsInline loop
                  preload={videoThumbnail ? 'none' : 'auto'}
                  onLoadedData={(e) => { e.currentTarget.pause(); }}
                  onMouseOver={(e) => !isPaused && e.currentTarget.play()}
                  onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : (
                <ImageWithFallback src={firstImage} alt={`Post ${post.id}`} className="w-full h-full object-cover" />
              )}
              {isVideo && (
                <div className="absolute top-2 right-2 p-0.5 bg-black/50 rounded text-white">
                  <Play className="w-2.5 h-2.5" />
                </div>
              )}
              {!isVideo && isCarousel && (
                <div className="absolute top-2 right-2 p-0.5 bg-black/50 rounded text-white">
                  <GalleryHorizontal className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}

function SavedTab({ isLoading, events, posts, onEventClick, onOpenPost, currentUserId, onEditEvent, onDeleteEvent, isPaused }: {
  isLoading: boolean; events: (AppEvent & { isSaved: boolean; hasReminder: boolean })[]; posts: ApiPost[];
  onEventClick: (e: AppEvent) => void; onOpenPost: (p: ApiPost) => void; currentUserId?: string; onEditEvent?: (e: any) => void; onDeleteEvent: (e: AppEvent) => void; isPaused: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (events.length === 0 && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Bookmark className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-gray-900 mb-2">No Saved Items Yet</h3>
        <p className="text-gray-600 text-center text-sm max-w-xs leading-relaxed">
          Save posts and events to find them here later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Saved Posts</h3>
          <MediaTab
            isLoading={false}
            posts={posts}
            hasMore={false}
            isLoadingMore={false}
            onLoadMore={() => {}}
            onOpenPost={onOpenPost}
            isOwnProfile={false}
            isPaused={isPaused}
          />
        </section>
      )}

      {events.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Saved Events</h3>
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={(e) => onEventClick(e)}
                currentUserId={currentUserId}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                className="border border-gray-100 hover:shadow-md transition-all"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UpcomingTab({ isLoading, events, onEventClick, currentUserId, onEditEvent, onDeleteEvent, onCreateEvent, canManageEvents }: {
  isLoading: boolean; events: any[]; onEventClick: (e: AppEvent) => void;
  currentUserId?: string; onEditEvent?: (e: any) => void; onDeleteEvent: (e: AppEvent) => void; onCreateEvent?: () => void; canManageEvents: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const upcoming = events.filter(e => new Date(e.date) >= new Date());

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-900 font-medium mb-1">No upcoming events</p>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">Create an event to see it here</p>
        <button
          onClick={onCreateEvent}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Create Event
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={(e) => onEventClick(e)}
          currentUserId={currentUserId}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
          showOwnerActions={canManageEvents && (!!onEditEvent || !!onDeleteEvent)}
          className="border border-gray-100 hover:shadow-md transition-all"
        />
      ))}
    </div>
  );
}

function TicketsTab({ isLoading, groups, onGroupClick }: { isLoading: boolean; groups: Ticket[][]; onGroupClick: (ts: Ticket[]) => void }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />)}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <TicketIcon className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-900 font-medium mb-1">No tickets yet</p>
        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">You haven't purchased any tickets yet. Explore events to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {groups.map((tickets) => {
        const ticket = tickets[0];
        return (
          <div
            key={ticket.event_id}
            onClick={() => onGroupClick(tickets)}
            className="relative aspect-square cursor-pointer group"
          >
            <ImageWithFallback
              src={ticket.event?.image_url}
              alt={`Event ${ticket.event?.title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
              {tickets.length} Ticket{tickets.length > 1 ? 's' : ''}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-[10px] line-clamp-1 font-medium">{ticket.event?.title}</p>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                <TicketIcon className="w-5 h-5 text-purple-600 fill-purple-600 ml-0.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
