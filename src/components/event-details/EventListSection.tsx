import { Calendar } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { EventCard } from '../EventCard';
import { EmptyState } from '../ui/EmptyState';
import { EventCardsSkeleton } from '../skeletons/PageSkeletons';
import { WhenFilterDropdown } from './WhenFilterDropdown';
import type { Event as ApiEvent } from '../../utils/supabase/api';

type TimeFilterId = 'all' | 'today' | 'tomorrow' | 'weekend' | 'month';

interface TimeFilterOption {
  id: TimeFilterId;
  name: string;
}

interface EventListSectionProps {
  hasActiveFilters: boolean;
  showWhenMenu: boolean;
  selectedTimeFilter: TimeFilterId;
  selectedTimeFilterName: string | undefined;
  timeFilters: TimeFilterOption[];
  upcomingEvents: ApiEvent[];
  upcomingEventCountText: string;
  isInitialEventsLoading: boolean;
  hasLoadedEvents: boolean;
  isFetching: boolean;
  eventsLength: number;
  currentUserId: string | null;
  onToggleWhen: () => void;
  onSelectTimeFilter: (filterId: TimeFilterId) => void;
  onCloseWhen: () => void;
  onEventClick: (event: ApiEvent) => void;
  onEditEvent: (event: ApiEvent) => void;
  onDeleteEvent: (event: ApiEvent) => void;
}

export function EventListSection({
  hasActiveFilters,
  showWhenMenu,
  selectedTimeFilter,
  selectedTimeFilterName,
  timeFilters,
  upcomingEvents,
  upcomingEventCountText,
  isInitialEventsLoading,
  hasLoadedEvents,
  isFetching,
  eventsLength,
  currentUserId,
  onToggleWhen,
  onSelectTimeFilter,
  onCloseWhen,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
}: EventListSectionProps) {
  return (
    <div className={hasActiveFilters ? "space-y-6 mt-4" : "space-y-6 mt-2"}>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        {showWhenMenu && (
          <button
            type="button"
            aria-label="Close when filter"
            className="fixed inset-0 z-20 cursor-default"
            onClick={onCloseWhen}
          />
        )}
        <div className="min-w-0 pr-1">
          <h3 className="truncate text-sm font-bold leading-tight text-gray-900">Upcoming Events</h3>
          <p className="mt-1 h-4 whitespace-nowrap text-xs font-medium leading-4 text-gray-500 tabular-nums">
            {isInitialEventsLoading ? (
              <Skeleton className="inline-block h-3 w-24 align-middle" aria-label="Loading event count" />
            ) : (
              `${upcomingEventCountText} found`
            )}
          </p>
        </div>
        <WhenFilterDropdown
          showWhenMenu={showWhenMenu}
          selectedTimeFilter={selectedTimeFilter}
          selectedTimeFilterName={selectedTimeFilterName}
          timeFilters={timeFilters}
          onToggle={onToggleWhen}
          onSelect={onSelectTimeFilter}
          onClose={onCloseWhen}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {upcomingEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={onEventClick}
            currentUserId={currentUserId}
            onEditEvent={() => onEditEvent(event)}
            onDeleteEvent={() => onDeleteEvent(event)}
            className="event-card-compact"
            compact
          />
        ))}
      </div>

      {upcomingEvents.length === 0 && hasLoadedEvents && !isFetching && (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="Check back later or try adjusting your filters"
        />
      )}

      {eventsLength === 0 && (!hasLoadedEvents || isFetching) && (
        <EventCardsSkeleton count={6} />
      )}
    </div>
  );
}
