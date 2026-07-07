import { Filter } from 'lucide-react';

interface EventDiscoveryHeaderProps {
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  onOpenFilters: () => void;
}

export function EventDiscoveryHeader({ hasActiveFilters, activeFiltersCount, onOpenFilters }: EventDiscoveryHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-sm pt-[calc(0.75rem+var(--eventz-safe-area-top))] pb-3 -mx-3 px-3 transition-all rounded-b-[24px]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex flex-col">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-gray-900">EVENTZ</h1>
          <p className="text-xs font-medium leading-snug text-gray-600">Discover amazing events happening around you</p>
        </div>
        <button 
          onClick={onOpenFilters}
          className="icon-circle-button relative rounded-full border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 group"
        >
          <Filter className="h-4 w-4 shrink-0 text-gray-600 transition-colors group-hover:text-primary" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-2xs rounded-full flex items-center justify-center shadow-md">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
