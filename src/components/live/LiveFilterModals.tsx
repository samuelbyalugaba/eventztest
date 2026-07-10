import { Search, MapPin } from 'lucide-react';
import type { LocationOption } from '../../utils/locations';

interface FilterModalsProps {
  showFilters: boolean;
  showLocationFilter: boolean;
  selectedCategory: string;
  selectedLocation: string;
  locationSearch: string;
  categories: { id: string; name: string }[];
  displayedLocations: LocationOption[];
  onCategorySelect: (id: string) => void;
  onLocationSelect: (id: string) => void;
  onLocationSearchChange: (value: string) => void;
  onCloseFilters: () => void;
  onCloseLocation: () => void;
}

export function LiveFilterModals({
  showFilters,
  showLocationFilter,
  selectedCategory,
  selectedLocation,
  locationSearch,
  categories,
  displayedLocations,
  onCategorySelect,
  onLocationSelect,
  onLocationSearchChange,
  onCloseFilters,
  onCloseLocation,
}: FilterModalsProps) {
  return (
    <>
      {showFilters && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCloseFilters}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-5 pb-8">
              <h2 className="mb-5 text-[17px] font-bold tracking-tight text-gray-950">Filter Live</h2>

              <div className="mb-6">
                <div className="mb-3 text-2xs font-bold uppercase tracking-[0.1em] text-gray-500">Category</div>
                <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className={`min-h-10 rounded-xl px-3 text-left text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-primary text-white shadow-lg shadow-purple-600/15'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-2xs font-bold uppercase tracking-[0.1em] text-gray-500">Location</div>
                  {selectedLocation !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onLocationSelect('all')}
                      className="text-xs font-semibold text-primary"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => onLocationSearchChange(e.target.value)}
                    placeholder="Search location..."
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {displayedLocations.length > 0 ? (
                    displayedLocations.map((location) => {
                      const isSelected = selectedLocation === location.id;
                      return (
                        <button
                          key={location.id}
                          onClick={() => onLocationSelect(location.id)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-all ${
                            isSelected
                              ? 'bg-primary text-white shadow-lg shadow-purple-600/15'
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {location.icon ? (
                            <location.icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                          ) : (
                            <MapPin className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{location.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">
                      No locations found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLocationFilter && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCloseLocation}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h2 className="text-gray-900 text-lg">Filter by location</h2>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => onLocationSearchChange(e.target.value)}
                  placeholder="Search location..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 outline-none transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {displayedLocations.length > 0 ? (
                  displayedLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => onLocationSelect(location.id)}
                      className={`w-full text-left px-5 py-3.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedLocation === location.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {location.icon ? (
                        <location.icon className={`w-6 h-6 ${selectedLocation === location.id ? 'text-white' : 'text-gray-700'}`} />
                      ) : (
                        <MapPin className={`w-6 h-6 ${selectedLocation === location.id ? 'text-white' : 'text-gray-700'}`} />
                      )}
                      <span>{location.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No locations found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
