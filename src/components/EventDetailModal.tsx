import { MediaViewer } from './MediaViewer';
import { LiveStreamViewerNew as LiveStreamViewer } from './livestream/LiveStreamViewerNew';
import { ShareModal } from './ShareModal';
import { formatPrice } from '../utils/currencies';
import { useEventDetailModal } from '../hooks/useEventDetailModal';
import { EventDetailCover } from './event-detail/EventDetailCover';
import { EventDetailInfo } from './event-detail/EventDetailInfo';
import { EventDetailTicketSection } from './event-detail/EventDetailTicketSection';
import { EventDetailStreamingSection } from './event-detail/EventDetailStreamingSection';
import { EventDetailHighlights } from './event-detail/EventDetailHighlights';
import { EventDetailGetTickets } from './event-detail/EventDetailGetTickets';
import { EventDetailActionBar } from './event-detail/EventDetailActionBar';
import type { Event as ApiEvent } from '../utils/supabase/api';

export interface EventDetailModalProps {
  event: ApiEvent;
  onClose: () => void;
  onPurchaseTicket: (event: ApiEvent) => void;
  onPurchaseNormalTicket: (event: ApiEvent) => void;
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
  onTierSelect?: (event: ApiEvent, tierName: string) => void;
}

export function EventDetailModal({ event, onClose, onPurchaseTicket, onPurchaseNormalTicket, onTierSelect }: EventDetailModalProps) {
  const {
    isSaved, coverAspectRatio, setCoverAspectRatio,
    hasVirtualAccess, isCheckingVirtualAccess,
    requiresVirtualAccess, externalTicketing, externalTicketingPhone,
    handleExternalTicketing, isEventPast, isFreeEvent,
    organizerDisplayName, displayViews,
    showShareModal, setShowShareModal,
    showMediaViewer, setShowMediaViewer, mediaViewerIndex, setMediaViewerIndex,
    mediaViewerType, setMediaViewerType,
    showLiveStream, setShowLiveStream,
    handleOrganizerProfileClick, photosForViewer, videosForViewer,
    handleToggleSave, handleShareEvent, handleWatchLive, locationMapsUrl,
  } = useEventDetailModal(event, onPurchaseTicket);

  const handleOpenMedia = (_idx: number, mediaType: 'photo' | 'video', videoIndex: number, photoIndex: number) => {
    setMediaViewerIndex(mediaType === 'video' ? videoIndex : photoIndex);
    setMediaViewerType(mediaType);
    setShowMediaViewer(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-right duration-300 flex flex-col">
      {showLiveStream && event.streaming && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => e.stopPropagation()}>
          <LiveStreamViewer
            stream={{
              id: event.id, title: event.title, thumbnail: event.image_url,
              viewers: event.streaming.liveViewers, host: organizerDisplayName,
              quality: event.streaming.quality || 'HD',
              playback_url: event.streaming.playback_url,
              organizer_id: event.organizer_id || event.organizer?.id || 'unknown',
            }}
            onClose={() => setShowLiveStream(false)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative bg-white pb-6">
        <EventDetailCover event={event} coverAspectRatio={coverAspectRatio}
          onCoverLoad={(ratio) => setCoverAspectRatio(ratio)}
          onShare={handleShareEvent} onClose={onClose} />

        <div className="px-6 py-6">
          <EventDetailInfo event={event} isSaved={isSaved}
            organizerDisplayName={organizerDisplayName} locationMapsUrl={locationMapsUrl}
            onToggleSave={handleToggleSave} onOrganizerClick={handleOrganizerProfileClick} />

          <EventDetailHighlights event={event} onOpenMedia={handleOpenMedia} />

          <EventDetailTicketSection event={event} displayViews={displayViews}
            externalTicketing={externalTicketing} onTierSelect={onTierSelect} />

          <EventDetailStreamingSection event={event}
            requiresVirtualAccess={requiresVirtualAccess} hasVirtualAccess={hasVirtualAccess}
            isEventPast={isEventPast} onPurchaseTicket={onPurchaseTicket} />

          <EventDetailGetTickets event={event} isEventPast={isEventPast}
            isFreeEvent={isFreeEvent} externalTicketing={externalTicketing}
            externalTicketingPhone={externalTicketingPhone}
            onExternalTicketing={handleExternalTicketing}
            onPurchaseNormalTicket={onPurchaseNormalTicket}
            onPurchaseTicket={onPurchaseTicket} />

          <div className="h-6"></div>
        </div>
      </div>

      <EventDetailActionBar event={event} isEventPast={isEventPast}
        isFreeEvent={isFreeEvent} isSaved={isSaved}
        isCheckingVirtualAccess={isCheckingVirtualAccess}
        externalTicketing={externalTicketing}
        onWatchLive={handleWatchLive} onExternalTicketing={handleExternalTicketing}
        onPurchaseNormalTicket={onPurchaseNormalTicket}
        onToggleSave={handleToggleSave} />

      {showMediaViewer && event.event_highlights && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
          initialIndex={mediaViewerIndex} onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType} />
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)}
        title={event.title}
        text={`${event.date} at ${event.location}\nPrice: ${formatPrice(event.price_range)}`}
        url={`${window.location.origin}/event/${event.id}`} />
    </div>
  );
}
