import { X, Search, LocateFixed, Check } from 'lucide-react';

interface LocationOption {
  id: string;
  name: string;
}

interface CountryOption {
  code: string;
  name: string;
  cities: string[];
}

interface CategoryOption {
  id: string;
  name: string;
  chipName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: string[];
}

interface FilterSheetProps {
  showFilters: boolean;
  selectedCountry: { code: string; name: string };
  selectedCountryCode: string;
  showCountryPicker: boolean;
  locationSearch: string;
  detectStatus: string;
  displayedLocations: LocationOption[];
  locationBannerTitle: string;
  locationBannerSub: string;
  isSearchingLocations: boolean;
  categories: CategoryOption[];
  selectedCategory: string;
  upcomingEventCountText: string;
  isInitialEventsLoading: boolean;
  COUNTRY_OPTIONS: CountryOption[];
  onClose: () => void;
  onCountryPickerToggle: () => void;
  onCountryChange: (code: string) => void;
  onLocationSearchChange: (value: string) => void;
  onUseCurrentLocation: () => void;
  onLocationSelect: (locationId: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onClearFilters: () => void;
}

export function FilterSheet({
  showFilters,
  selectedCountry,
  selectedCountryCode,
  showCountryPicker,
  locationSearch,
  detectStatus,
  displayedLocations,
  locationBannerTitle,
  locationBannerSub,
  isSearchingLocations,
  categories,
  selectedCategory,
  upcomingEventCountText,
  isInitialEventsLoading,
  COUNTRY_OPTIONS,
  onClose,
  onCountryPickerToggle,
  onCountryChange,
  onLocationSearchChange,
  onUseCurrentLocation,
  onLocationSelect,
  onCategorySelect,
  onClearFilters,
}: FilterSheetProps) {
  if (!showFilters) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 pt-10 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-none overflow-hidden rounded-t-[24px] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.18)] animate-in slide-in-from-bottom duration-300 sm:max-w-[504px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <h2 className="text-[17px] font-bold tracking-tight text-gray-950">Filter Events</h2>
          <button 
            onClick={onClose}
            type="button"
            aria-label="Close filters"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-5 h-px bg-gray-100" />

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
          <div className="mb-6">
            <div className="mb-3 text-2xs font-bold uppercase tracking-[0.09em] text-gray-400">Location</div>

            <div className="mb-3 rounded-xl border border-primary bg-primary px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">
                    {selectedCountry.code}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{locationBannerTitle}</div>
                    <div className="text-xs font-medium text-white/80">
                      {locationBannerSub}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCountryPickerToggle}
                  className="shrink-0 text-xs font-bold text-white transition-colors hover:text-white/60"
                >
                  {showCountryPicker ? 'Done' : 'Change'}
                </button>
              </div>

              {showCountryPicker && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {COUNTRY_OPTIONS.map((country) => {
                    const active = selectedCountryCode === country.code;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => onCountryChange(country.code)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                          active
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white/70 text-gray-700 hover:border-primary'
                        }`}
                      >
                        <span className="w-6 text-xs font-bold">{country.code}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{country.name}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          <div className="relative mb-3">
              <label htmlFor="event-location-search" className="sr-only">Search city</label>
              <input
                id="event-location-search"
                type="text"
                placeholder="Search city..."
                value={locationSearch}
                onChange={(e) => onLocationSearchChange(e.target.value)}
                className="w-full rounded-[10px] border border-gray-200 bg-gray-100 px-3.5 py-2.5 pr-10 text-sm font-medium text-gray-950 placeholder:text-gray-400 transition-all focus:border-gray-500 focus:bg-white focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left transition-all hover:border-primary hover:bg-primary hover:text-white"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <LocateFixed className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-gray-700">Use my current location</span>
              <span className="shrink-0 text-xs font-medium text-gray-400">{detectStatus}</span>
            </button>

            <div className="mb-2 text-2xs font-bold uppercase tracking-[0.07em] text-gray-400">
              {locationSearch.trim() ? 'Matching cities' : `Popular cities in ${selectedCountry.name}`}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {displayedLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => onLocationSelect(location.id)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === location.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
            {isSearchingLocations && (
              <div className="mt-2 text-xs font-medium text-gray-500">Searching...</div>
            )}
            {!isSearchingLocations && displayedLocations.length === 0 && (
              <div className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-500">
                No matching cities yet.
              </div>
            )}
          </div>

          <div className="mx-0 mb-5 h-px bg-gray-100" />

          <div className="mb-1">
            <div className="mb-3 text-2xs font-bold uppercase tracking-[0.09em] text-gray-400">Category</div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onCategorySelect(category.id)}
                  className={`whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
                    selectedCategory === category.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-5 pb-5 pt-3">
          <button 
            type="button"
            onClick={onClearFilters}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-500 transition-colors hover:border-primary hover:text-primary"
          >
            Clear all
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="flex-[2] rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
          >
            {isInitialEventsLoading ? 'Loading events' : `Show ${upcomingEventCountText}`}
          </button>
        </div>
      </div>
    </div>
  );
}
