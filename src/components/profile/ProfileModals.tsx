import { lazy, Suspense } from 'react';
import { toast } from 'sonner';
import type { Event as AppEvent } from '../../utils/supabase/api';
import type { Ticket } from '../../utils/supabase/api';
import { TicketListModal } from '../TicketListModal';
import { EventListModal } from '../EventListModal';
import { ReportReasonModal } from '../ui/ReportReasonModal';
import { ConfirmDialog } from '../ui/confirm-dialog';

const SettingsModal = lazy(() => import('../SettingsModal').then(m => ({ default: m.SettingsModal })));
const LiveSetupModal = lazy(() => import('../LiveSetupModal').then(m => ({ default: m.LiveSetupModal })));
const EventDetailModal = lazy(() => import('../EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const TicketViewer = lazy(() => import('../TicketViewer').then(m => ({ default: m.TicketViewer })));

type TicketViewerTicket = {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  ticketType: string;
  price: string;
  qrCode: string;
  ticketNumber?: string;
};

interface ProfileModalsProps {
  showSettingsModal: boolean;
  settingsInitialView: 'main' | 'profile';
  onCloseSettings: () => void;
  showLiveSetupModal: boolean;
  onCloseLiveSetup: () => void;
  showTicketViewer: boolean;
  selectedTicket: TicketViewerTicket | null;
  onCloseTicketViewer: () => void;
  selectedEvent: AppEvent | null;
  onCloseEventDetail: () => void;
  showTicketListModal: boolean;
  selectedEventTickets: Ticket[];
  onCloseTicketList: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  showEventListModal: boolean;
  isOrganizer: boolean;
  pastHostedEvents: AppEvent[];
  attendedEvents: AppEvent[];
  streamedVideos: any[];
  onCloseEventList: () => void;
  onEventClickFromList: (event: AppEvent) => void;
  eventPendingDelete: AppEvent | null;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  showReportReason: boolean;
  onReportReasonOpenChange: (open: boolean) => void;
  onReportReasonConfirm: (reason: string) => void;
}

export function ProfileModals({
  showSettingsModal,
  settingsInitialView,
  onCloseSettings,
  showLiveSetupModal,
  onCloseLiveSetup,
  showTicketViewer,
  selectedTicket,
  onCloseTicketViewer,
  selectedEvent,
  onCloseEventDetail,
  showTicketListModal,
  selectedEventTickets,
  onCloseTicketList,
  onSelectTicket,
  showEventListModal,
  isOrganizer,
  pastHostedEvents,
  attendedEvents,
  streamedVideos,
  onCloseEventList,
  onEventClickFromList,
  eventPendingDelete,
  onConfirmDeleteOpenChange,
  onConfirmDelete,
  showReportReason,
  onReportReasonOpenChange,
  onReportReasonConfirm,
}: ProfileModalsProps) {
  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" /></div>}>
        {showSettingsModal && <SettingsModal onClose={onCloseSettings} initialView={settingsInitialView} />}
        {showLiveSetupModal && <LiveSetupModal isOpen={showLiveSetupModal} onClose={onCloseLiveSetup} />}
        {showTicketViewer && selectedTicket && <TicketViewer ticket={selectedTicket} onClose={onCloseTicketViewer} />}
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={onCloseEventDetail}
            onPurchaseTicket={() => toast.info("Please go to Events page to purchase tickets")}
            onPurchaseNormalTicket={() => toast.info("Please go to Events page to purchase tickets")}
          />
        )}
      </Suspense>
      {showTicketListModal && (
        <TicketListModal
          isOpen={showTicketListModal}
          eventName={selectedEventTickets[0]?.event?.title || 'My Tickets'}
          onClose={onCloseTicketList}
          tickets={selectedEventTickets}
          onSelectTicket={(ticket) => {
            onSelectTicket(ticket);
          }}
        />
      )}
      {showEventListModal && (
        <EventListModal
          title={isOrganizer ? "Hosted" : "Attended Events"}
          events={isOrganizer ? pastHostedEvents : (attendedEvents as any)}
          streams={isOrganizer ? streamedVideos : []}
          onClose={onCloseEventList}
          onEventClick={(event) => {
            onEventClickFromList(event);
          }}
        />
      )}
      <ConfirmDialog
        open={eventPendingDelete !== null}
        onOpenChange={onConfirmDeleteOpenChange}
        title="Delete event?"
        description="This removes the event and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirmDelete}
      />
      <ReportReasonModal
        open={showReportReason}
        onOpenChange={onReportReasonOpenChange}
        label="this profile"
        onConfirm={onReportReasonConfirm}
      />
    </>
  );
}
