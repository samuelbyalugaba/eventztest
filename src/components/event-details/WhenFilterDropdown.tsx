import { CalendarDays, ChevronDown } from 'lucide-react';

type TimeFilterId = 'all' | 'today' | 'tomorrow' | 'weekend' | 'month';

interface TimeFilterOption {
  id: TimeFilterId;
  name: string;
}

interface WhenFilterDropdownProps {
  showWhenMenu: boolean;
  selectedTimeFilter: TimeFilterId;
  selectedTimeFilterName: string | undefined;
  timeFilters: TimeFilterOption[];
  onToggle: () => void;
  onSelect: (filterId: TimeFilterId) => void;
  onClose: () => void;
}

export function WhenFilterDropdown({ showWhenMenu, selectedTimeFilter, selectedTimeFilterName, timeFilters, onToggle, onSelect, onClose }: WhenFilterDropdownProps) {
  return (
    <div className="relative z-30 flex-shrink-0">
      <button
        type="button"
        aria-expanded={showWhenMenu}
        onClick={onToggle}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all ${
          selectedTimeFilter !== 'all'
            ? 'border-primary bg-primary text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white'
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{selectedTimeFilterName || 'When'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showWhenMenu ? 'rotate-180' : ''}`} />
      </button>

      {showWhenMenu && (
        <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-3 shadow-xl">
          <div className="px-4 pb-2 text-2xs font-bold uppercase text-gray-500">Filter by time</div>
          <div className="space-y-1">
            {timeFilters.map((filter) => {
              const isSelected = selectedTimeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelect(filter.id);
                    onClose();
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filter.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
