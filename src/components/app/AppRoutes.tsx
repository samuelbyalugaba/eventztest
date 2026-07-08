import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { LegalPage } from '../legal/LegalPage';
import { DeleteAccountPage } from '../legal/DeleteAccountPage';
import { SupportPage } from '../support/SupportPage';
import { HostedPage } from '../profile/HostedPage';
import { AuthCallbackPage } from '../AuthCallbackPage';
import {
  CreatePageSkeleton,
  DashboardPageSkeleton,
  DetailPageSkeleton,
  ListPageSkeleton,
  LivePageSkeleton,
  MessagesPageSkeleton,
  ProfilePageSkeleton,
} from '../skeletons/PageSkeletons';

const Profile = lazy(() => import('../Profile').then(m => ({ default: m.Profile })));
const ProfileListPage = lazy(() => import('../profile/ProfileListPage').then(m => ({ default: m.ProfileListPage })));
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
          <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
        } />
        <Route path="/edit-event/:id" element={
          <Suspense fallback={<CreatePageSkeleton />}><CreateEventWrapper /></Suspense>
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
          <Suspense fallback={<LivePageSkeleton />}><LiveStreamPage /></Suspense>
        } />
        <Route path="/search" element={
          <RouteErrorBoundary>
            <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>}>
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
          <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
        } />
        <Route path="/dashboard/events" element={
          <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
        } />
        <Route path="/dashboard/live" element={
          <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
        } />
        <Route path="/dashboard/notify" element={
          <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
        } />
        <Route path="/dashboard/payouts" element={
          <Suspense fallback={<DashboardPageSkeleton />}><DashboardPage /></Suspense>
        } />
        <Route path="/wallet" element={
          <Suspense fallback={<DashboardPageSkeleton />}><WalletPage /></Suspense>
        } />
        <Route path="/compose/post" element={
          <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>}><CreatePostPage /></Suspense>
        } />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={
          <div className="flex h-[100dvh] flex-col items-center justify-center bg-gray-50 p-4">
            <h1 className="text-6xl font-bold text-purple-600">404</h1>
            <p className="mt-4 text-lg text-gray-600">Page not found</p>
            <a href="/events" className="mt-6 rounded-lg bg-purple-600 px-6 py-2 text-white transition-colors hover:bg-purple-700">Go to Events</a>
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
