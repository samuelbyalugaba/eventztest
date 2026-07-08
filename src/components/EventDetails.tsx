import { useState, useEffect } from 'react';
import { EventsPageSkeleton } from './skeletons/PageSkeletons';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteEvent, type Event as ApiEvent } from '../utils/supabase/api';
import { ConfirmDialog } from './ui/confirm-dialog';
import { rememberRecentEvent } from '../utils/recentEvents';
import { PremiumSearchModal } from './PremiumSearchModal';
import { EventDetailModal } from './EventDetailModal';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { MediaViewer } from './MediaViewer';
import { Conversation } from '../types';
import { EventDiscoveryHeader } from './event-details/EventDiscoveryHeader';
import { CategoryChips } from './event-details/CategoryChips';
import { EventListSection } from './event-details/EventListSection';
import { FilterSheet } from './event-details/FilterSheet';
import { MessagePanel } from './event-details/MessagePanel';
import { queryClient } from '../queryClient';
import { useEventsData } from '../hooks/useEventsData';
import { useEventFilters } from '../hooks/useEventFilters';
import { useMessaging } from '../hooks/useMessaging';

interface EventDetailsProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
}

export function EventDetails({ conversations: globalConversations, onStartConversation, onSendMessage }: EventDetailsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const { events, setEvents, currentUserId, isFetching, hasLoadedEvents } = useEventsData();

  const {
    setSelectedLocation,
    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    selectedTimeFilter, setSelectedTimeFilter,
    showWhenMenu, setShowWhenMenu,
    showFilters, setShowFilters,
    locationSearch, setLocationSearch,
    isSearchingLocations,
    selectedCountryCode,
    showCountryPicker, setShowCountryPicker,
    detectStatus, setDetectStatus,
    handleCategorySelect,
    upcomingEvents,
    upcomingEventCountText,
    selectedCountry,
    displayedLocations,
    locationBannerTitle,
    locationBannerSub,
    handleCountryChange,
    handleLocationSelect,
    clearFilters,
    handleUseCurrentLocation,
    hasActiveFilters,
    activeFiltersCount,
    selectedTimeFilterName,
    timeFilters,
    categories,
    COUNTRY_OPTIONS,
  } = useEventFilters(events);

  const {
    showMessages, setShowMessages,
    activeConversation, setActiveConversation,
    messageText, setMessageText,
    handleStartConversationLocal,
    handleSendMessage,
  } = useMessaging({ conversations: globalConversations, onStartConversation, onSendMessage });

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex] = useState(0);
  const [mediaViewerType] = useState<'photo' | 'video'>('photo');
  const [eventPendingDelete, setEventPendingDelete] = useState<ApiEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search') === '1') {
      setShowSearchModal(true);
    }
  }, [location.search]);

  const closeSearchModal = () => {
    setShowSearchModal(false);
    const params = new URLSearchParams(location.search);
    if (params.get('search') !== '1') return;
    params.delete('search');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true, state: location.state },
    );
  };

  const getModalBackgroundLocation = () => {
    const backgroundBase = (location.state as any)?.backgroundLocation || location;
    const params = new URLSearchParams(backgroundBase.search || '');
    params.delete('search');
    return { ...backgroundBase, search: params.toString() ? `?${params.toString()}` : '' };
  };

  const handleEventClick = (event: ApiEvent) => {
    rememberRecentEvent(event);
    const backgroundBase = getModalBackgroundLocation();
    navigate(`/event/${event.id}`, {
      state: { backgroundLocation: backgroundBase, closeTo: backgroundBase, eventSnapshot: event },
    });
  };

  const handleSearchEventSelect = (event: ApiEvent) => {
    rememberRecentEvent(event);
    setShowSearchModal(false);
    navigate(`/event/${event.id}`, { state: { eventSnapshot: event } });
  };

  const handleEditEvent = (event: ApiEvent) => {
    navigate(`/edit-event/${event.id}`);
  };

  const handleDeleteEvent = async (event: ApiEvent) => {
    if (!currentUserId || currentUserId !== event.organizer_id) return;
    setEventPendingDelete(event);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventPendingDelete || !currentUserId || currentUserId !== eventPendingDelete.organizer_id) return;
    const event = eventPendingDelete;
    setEventPendingDelete(null);
    try {
      await deleteEvent(event.id);
      const next = events.filter(e => e.id !== event.id);
      setEvents(next);
      toast.success('Event deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const handleNormalTicketPurchase = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowPurchaseModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const handleTierSelection = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowPurchaseModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const photosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'image').map((highlight, _index) => ({
      id: _index,
      url: highlight.image!,
      eventName: selectedEvent?.title || '',
    })) || []),
  ];

  const videosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'video').map((highlight, _index) => ({
      id: _index + 500,
      thumbnail: highlight.image || selectedEvent.image_url,
      videoUrl: highlight.video || '',
      eventName: selectedEvent?.title || '',
    })) || []),
  ];

  const isInitialEventsLoading = !hasLoadedEvents && isFetching && events.length === 0;

  if (isInitialEventsLoading) {
    return <EventsPageSkeleton />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="event-discovery-page pb-20">
        <div className="px-3 pb-6 pt-0">
          <EventDiscoveryHeader
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            onOpenFilters={() => setShowFilters(true)}
          />

          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            onCategorySelect={handleCategorySelect}
            onSubcategorySelect={(sub) => setSelectedSubcategory(selectedSubcategory === sub ? '' : sub)}
          />

          <EventListSection
            hasActiveFilters={hasActiveFilters}
            showWhenMenu={showWhenMenu}
            selectedTimeFilter={selectedTimeFilter}
            selectedTimeFilterName={selectedTimeFilterName}
            timeFilters={timeFilters}
            upcomingEvents={upcomingEvents}
            upcomingEventCountText={upcomingEventCountText}
            isInitialEventsLoading={isInitialEventsLoading}
            hasLoadedEvents={hasLoadedEvents}
            isFetching={isFetching}
            eventsLength={events.length}
            currentUserId={currentUserId}
            onToggleWhen={() => setShowWhenMenu((open) => !open)}
            onSelectTimeFilter={(id) => setSelectedTimeFilter(id)}
            onCloseWhen={() => setShowWhenMenu(false)}
            onEventClick={handleEventClick}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>
      </div>

      <FilterSheet
        showFilters={showFilters}
        selectedCountry={selectedCountry}
        selectedCountryCode={selectedCountryCode}
        showCountryPicker={showCountryPicker}
        locationSearch={locationSearch}
        detectStatus={detectStatus}
        displayedLocations={displayedLocations}
        locationBannerTitle={locationBannerTitle}
        locationBannerSub={locationBannerSub}
        isSearchingLocations={isSearchingLocations}
        categories={categories}
        selectedCategory={selectedCategory}
        upcomingEventCountText={upcomingEventCountText}
        isInitialEventsLoading={isInitialEventsLoading}
        COUNTRY_OPTIONS={COUNTRY_OPTIONS}
        onClose={() => setShowFilters(false)}
        onCountryPickerToggle={() => setShowCountryPicker((open) => !open)}
        onCountryChange={handleCountryChange}
        onLocationSearchChange={setLocationSearch}
        onUseCurrentLocation={handleUseCurrentLocation}
        onLocationSelect={handleLocationSelect}
        onCategorySelect={handleCategorySelect}
        onClearFilters={clearFilters}
      />

      {showPurchaseModal && eventToPurchase && (
        <SimplifiedTicketModal
          event={{
            id: eventToPurchase.id,
            title: eventToPurchase.title,
            date: eventToPurchase.date,
            location: eventToPurchase.location,
            ticketTiers: eventToPurchase.ticket_tiers,
            price_range: eventToPurchase.price_range,
            image_url: eventToPurchase.image_url
          }}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
        />
      )}

      {showSearchModal && (
        <PremiumSearchModal
          onClose={closeSearchModal}
          events={events}
          onEventSelect={handleSearchEventSelect}
          onPersonSelect={(person) => setSelectedUser(person)}
          onVenueSelect={(venue) => {
            setSelectedLocation(venue.name);
            setSelectedCategory('all');
            setSelectedSubcategory('');
            setDetectStatus('Ready');
          }}
        />
      )}

      {selectedUser && (
        (() => {
          navigate(`/profile/${selectedUser.id}`);
          setSelectedUser(null);
          return null;
        })()
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseTicket={handlePurchaseTicket}
          onPurchaseNormalTicket={handleNormalTicketPurchase}
          onStartConversation={handleStartConversationLocal}
          onTierSelect={handleTierSelection}
        />
      )}

      {showTicketModal && eventToPurchase && (
        <VirtualTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={eventToPurchase}
        />
      )}

      {showMediaViewer && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
          initialIndex={mediaViewerIndex}
          onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType}
        />
      )}

      <MessagePanel
        showMessages={showMessages}
        activeConversation={activeConversation}
        messageText={messageText}
        globalConversations={globalConversations}
        onClose={() => setShowMessages(false)}
        onBackToList={() => setActiveConversation(null)}
        onSelectConversation={(conv) => setActiveConversation(conv)}
        onMessageTextChange={setMessageText}
        onSendMessage={handleSendMessage}
      />

      <ConfirmDialog
        open={eventPendingDelete !== null}
        onOpenChange={(open) => { if (!open) setEventPendingDelete(null); }}
        title="Delete event?"
        description="This removes the event and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDeleteEvent}
      />
    </div>
  );
}
