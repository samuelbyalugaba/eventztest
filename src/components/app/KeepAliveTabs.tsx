import { lazy, Suspense } from 'react';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import {
  EventsPageSkeleton,
  FeedPageSkeleton,
  LivePageSkeleton,
  ProfilePageSkeleton,
} from '../skeletons/PageSkeletons';

const EventDetails = lazy(() => import('../EventDetails').then(m => ({ default: m.EventDetails })));
const Feed = lazy(() => import('../Feed').then(m => ({ default: m.Feed })));
const LiveFeed = lazy(() => import('../LiveFeed').then(m => ({ default: m.LiveFeed })));
const Profile = lazy(() => import('../Profile').then(m => ({ default: m.Profile })));

interface KeepAliveTabsProps {
  isEventsTab: boolean;
  isFeedTab: boolean;
  isLiveTab: boolean;
  isOwnProfileTab: boolean;
  shouldMountEventsTab: boolean;
  shouldMountFeedTab: boolean;
  shouldMountLiveTab: boolean;
  shouldMountProfileTab: boolean;
  eventsScrollRef: React.RefObject<HTMLDivElement>;
  liveScrollRef: React.RefObject<HTMLDivElement>;
  profileScrollRef: React.RefObject<HTMLDivElement>;
  conversations: any;
  handleStartConversation: any;
  handleSendMessage: any;
  currentUser: any;
  handleViewPost: (item: any) => void;
  handleLogout: () => Promise<void>;
  handleCreateEvent: () => void;
  handleEditEvent: (event: any) => void;
  handleStartOrganizerSetup: () => void;
  backgroundLocation: any;
}

export default function KeepAliveTabs({
  isEventsTab,
  isFeedTab,
  isLiveTab,
  isOwnProfileTab,
  shouldMountEventsTab,
  shouldMountFeedTab,
  shouldMountLiveTab,
  shouldMountProfileTab,
  eventsScrollRef,
  liveScrollRef,
  profileScrollRef,
  conversations,
  handleStartConversation,
  handleSendMessage,
  currentUser,
  handleViewPost,
  handleLogout,
  handleCreateEvent,
  handleEditEvent,
  handleStartOrganizerSetup,
  backgroundLocation,
}: KeepAliveTabsProps) {
  return (
    <>
      <div
        ref={eventsScrollRef}
        style={{ display: isEventsTab ? 'block' : 'none' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="events"
      >
        {shouldMountEventsTab && (
          <RouteErrorBoundary>
            <Suspense fallback={<EventsPageSkeleton />}>
              <EventDetails
                conversations={conversations}
                onStartConversation={handleStartConversation}
                onSendMessage={handleSendMessage}
              />
            </Suspense>
          </RouteErrorBoundary>
        )}
      </div>
      <div style={{ display: isFeedTab ? 'block' : 'none' }} className="h-[100dvh] overflow-hidden" data-eventz-view="feed">
        {shouldMountFeedTab && (
          <RouteErrorBoundary>
            <Suspense fallback={<FeedPageSkeleton />}>
              <Feed
                conversations={conversations}
                onStartConversation={handleStartConversation}
                currentUser={currentUser}
                onViewPost={handleViewPost}
                isPaused={!isFeedTab || !!backgroundLocation}
              />
            </Suspense>
          </RouteErrorBoundary>
        )}
      </div>
      <div
        ref={liveScrollRef}
        style={{ display: isLiveTab ? 'block' : 'none' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="live"
      >
        {shouldMountLiveTab && (
          <Suspense fallback={<LivePageSkeleton />}>
            <LiveFeed />
          </Suspense>
        )}
      </div>
      <div
        ref={profileScrollRef}
        style={{ display: isOwnProfileTab ? 'block' : 'none' }}
        className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain scrollbar-hide"
        data-eventz-view="profile"
      >
        {shouldMountProfileTab && (
          <RouteErrorBoundary>
            <Suspense fallback={<ProfilePageSkeleton />}>
              <Profile
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
                isPaused={!isOwnProfileTab || !!backgroundLocation}
              />
            </Suspense>
          </RouteErrorBoundary>
        )}
      </div>
    </>
  );
}
