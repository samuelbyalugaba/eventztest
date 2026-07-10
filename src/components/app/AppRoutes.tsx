import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import {
  CreatePageSkeleton,
  DashboardPageSkeleton,
  DetailPageSkeleton,
  ListPageSkeleton,
  LivePageSkeleton,
  MessagesPageSkeleton,
  ProfilePageSkeleton,
  GenericPageSkeleton,
} from '../skeletons/PageSkeletons';

const Profile = lazy(() => import('../Profile').then(m => ({ default: m.Profile })));
const ProfileListPage = lazy(() => import('../profile/ProfileListPage').then(m => ({ default: m.ProfileListPage })));
const HostedPage = lazy(() => import('../profile/HostedPage').then(m => ({ default: m.HostedPage })));
const CreateEventWrapper = lazy(() => import('../CreateEventWrapper').then(m => ({ default: m.CreateEventWrapper })));
const PostDetailWrapper = lazy(() => import('../PostDetailWrapper').then(m => ({ default: m.PostDetailWrapper })));
const ProfileModalWrapper = lazy(() => import('../ProfileModalWrapper').then(m => ({ default: m.ProfileModalWrapper })));
const EventDetailWrapper = lazy(() => import('../EventDetailWrapper').then(m => ({ default: m.EventDetailWrapper })));
const LiveStreamPage = lazy(() => import('../LiveStreamPage').then(m => ({ default: m.LiveStreamPage })));
const CreatePostPage = lazy(() => import('../CreatePostPage'));
const MessagesPage = lazy(() => import('../MessagesPage'));
const DashboardPage = lazy(() => import('../DashboardPage').then(m => ({ default: m.DashboardPage })));
const SearchPage = lazy(() => import('../SearchPage').then(m => ({ default: m.SearchPage })));
const WalletPage = lazy(() => import('../WalletPage').then(m => ({ default: m.WalletPage })));
const LegalPage = lazy(() => import('../legal/LegalPage').then(m => ({ default: m.LegalPage })));
const DeleteAccountPage = lazy(() => import('../legal/DeleteAccountPage').then(m => ({ default: m.DeleteAccountPage })));
const SupportPage = lazy(() => import('../support/SupportPage').then(m => ({ default: m.SupportPage })));
const AuthCallbackPage = lazy(() => import('../AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

interface AppRoutesProps {
  location: any;
  backgroundLocation: any;
  handleLogout: () => Promise<void>;
  handleCreateEvent: () => void;
  handleEditEvent: (event: any) => void;
  handleStartOrganizerSetup: () => void;
  handleStartConversation: any;
  handleViewPost: (item: any) => void;
}

export default function AppRoutes({
  location,
  backgroundLocation,
  handleLogout,
  handleCreateEvent,
  handleEditEvent,
  handleStartOrganizerSetup,
  handleStartConversation,
  handleViewPost,
}: AppRoutesProps) {
  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={null} />
        <Route path="/feed" element={null} />
        <Route path="/live" element={null} />
        <Route path="/profile" element={null} />
        <Route path="/hosted" element={
          <Suspense fallback={<ListPageSkeleton />}><HostedPage /></Suspense>
        } />
        <Route path="/followers" element={
          <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="followers" /></Suspense>
        } />
        <Route path="/following" element={
          <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="following" /></Suspense>
        } />
        <Route path="/profile/:userId" element={
          <RouteErrorBoundary>
            <Suspense fallback={<ProfilePageSkeleton />}>
              <Profile
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
                isPaused={!!backgroundLocation}
              />
            </Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/profile/:userId/hosted" element={
          <Suspense fallback={<ListPageSkeleton />}><HostedPage /></Suspense>
        } />
        <Route path="/profile/:userId/followers" element={
          <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="followers" /></Suspense>
        } />
        <Route path="/profile/:userId/following" element={
          <Suspense fallback={<ListPageSkeleton />}><ProfileListPage type="following" /></Suspense>
        } />
        <Route path="/create" element={
          <RouteErrorBoundary>
            <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/edit-event/:id" element={
          <RouteErrorBoundary>
            <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/post/:id" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DetailPageSkeleton />}><PostDetailWrapper /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/event/:id" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DetailPageSkeleton />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/live/:id" element={
          <RouteErrorBoundary>
            <Suspense fallback={<LivePageSkeleton />}><LiveStreamPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/search" element={
          <RouteErrorBoundary>
            <Suspense fallback={<GenericPageSkeleton />}>
              <SearchPage />
            </Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/messages" element={
          <RouteErrorBoundary>
            <Suspense fallback={<MessagesPageSkeleton />}><MessagesPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/messages/:conversationId" element={
          <RouteErrorBoundary>
            <Suspense fallback={<MessagesPageSkeleton />}><MessagesPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/dashboard" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/dashboard/events" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/dashboard/live" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/dashboard/notify" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/dashboard/payouts" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/wallet" element={
          <RouteErrorBoundary>
            <Suspense fallback={<DashboardPageSkeleton />}><WalletPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/compose/post" element={
          <RouteErrorBoundary>
            <Suspense fallback={<CreatePageSkeleton />}><CreatePostPage /></Suspense>
          </RouteErrorBoundary>
        } />
        <Route path="/privacy" element={
          <Suspense fallback={<GenericPageSkeleton />}><LegalPage type="privacy" /></Suspense>
        } />
        <Route path="/terms" element={
          <Suspense fallback={<GenericPageSkeleton />}><LegalPage type="terms" /></Suspense>
        } />
        <Route path="/support" element={
          <Suspense fallback={<GenericPageSkeleton />}><SupportPage /></Suspense>
        } />
        <Route path="/delete-account" element={
          <Suspense fallback={<GenericPageSkeleton />}><DeleteAccountPage /></Suspense>
        } />
        <Route path="/auth/callback" element={
          <Suspense fallback={<GenericPageSkeleton />}><AuthCallbackPage /></Suspense>
        } />
        <Route path="*" element={
          <div className="flex h-[100dvh] flex-col items-center justify-center bg-background p-4">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
            <a href="/events" className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90">Go to Events</a>
          </div>
        } />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/post/:id" element={
            <Suspense fallback={<DetailPageSkeleton />}><PostDetailWrapper /></Suspense>
          } />
          <Route path="/event/:id" element={
            <Suspense fallback={<DetailPageSkeleton />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
          <Route path="/profile/:userId" element={
            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfileModalWrapper
                onLogout={handleLogout}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onStartOrganizerSetup={handleStartOrganizerSetup}
                onStartConversation={handleStartConversation}
                onViewPost={handleViewPost}
              />
            </Suspense>
          } />
        </Routes>
      )}
    </>
  );
}
