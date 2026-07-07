import { useState, useEffect, useMemo } from 'react';
import type { Event as ApiEvent } from '../utils/supabase/api';
import { searchNominatim, extractCityName, normalizePlaceName } from '../utils/nominatim';

type LocationOption = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

type CountryOption = {
  code: string;
  name: string;
  cities: string[];
  timeZones?: string[];
};

type CategoryOption = {
  id: string;
  name: string;
  chipName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: string[];
};

export type TimeFilterId = 'all' | 'today' | 'tomorrow' | 'weekend' | 'month';

type TimeFilterOption = {
  id: TimeFilterId;
  name: string;
};

export const categories: CategoryOption[] = [
  { id: 'all', name: 'All' },
  { id: 'entertainment', name: 'Entertainment', icon: Music2, subcategories: ['Concerts', 'Club Nights', 'Live Performances', 'Nightlife (Bars/Lounges)', 'Themed Parties'] },
  { id: 'business & tech', name: 'Business & Tech', icon: BriefcaseBusiness, subcategories: ['Startup Events', 'Networking', 'Conferences', 'Tech Talks'] },
  { id: 'sports & fitness', name: 'Sports & Fitness', chipName: 'Sports', icon: Dumbbell, subcategories: ['Fitness Classes', 'Competitions', 'Sports Events'] },
  { id: 'fashion', name: 'Fashion', icon: Shirt, subcategories: ['Runway Shows', 'Pop-Up Markets', 'Style and Beauty', 'Brand Launches', 'Fashion Weeks'] },
  { id: 'culture', name: 'Culture', icon: Palette, subcategories: ['Festivals', 'Arts', 'Theater', 'Food & Drink', 'Local Traditions', 'Fashion Events'] },
  { id: 'education', name: 'Education', icon: GraduationCap, subcategories: ['Workshops', 'Seminars', 'Webinars'] },
  { id: 'religion', name: 'Religion', icon: Landmark, subcategories: ['Worship Services', 'Religious Gatherings', 'Spiritual Events'] },
];

const timeFilters: TimeFilterOption[] = [
  { id: 'all', name: 'All Upcoming Events' },
  { id: 'today', name: 'Today' },
  { id: 'tomorrow', name: 'Tomorrow' },
  { id: 'weekend', name: 'This Weekend' },
  { id: 'month', name: 'This Month' },
];

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'TZ', name: 'Tanzania', cities: ['Dar es Salaam', 'Zanzibar', 'Arusha', 'Mwanza', 'Dodoma', 'Moshi', 'Tanga'], timeZones: ['Africa/Dar_es_Salaam'] },
  { code: 'KE', name: 'Kenya', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi'], timeZones: ['Africa/Nairobi'] },
  { code: 'UG', name: 'Uganda', cities: ['Kampala', 'Entebbe', 'Gulu', 'Jinja', 'Mbarara'], timeZones: ['Africa/Kampala'] },
  { code: 'RW', name: 'Rwanda', cities: ['Kigali', 'Butare', 'Gisenyi', 'Musanze'], timeZones: ['Africa/Kigali'] },
  { code: 'ET', name: 'Ethiopia', cities: ['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa'], timeZones: ['Africa/Addis_Ababa'] },
  { code: 'NG', name: 'Nigeria', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'], timeZones: ['Africa/Lagos'] },
  { code: 'ZA', name: 'South Africa', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Stellenbosch'], timeZones: ['Africa/Johannesburg'] },
  { code: 'GB', name: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds'], timeZones: ['Europe/London'] },
  { code: 'US', name: 'United States', cities: ['New York', 'Los Angeles', 'Atlanta', 'Chicago', 'Houston', 'Miami'], timeZones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver'] },
  { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], timeZones: ['Asia/Dubai'] },
];

import { Music2, GraduationCap, BriefcaseBusiness, Palette, Landmark, Dumbbell, Shirt } from 'lucide-react';

const DEFAULT_COUNTRY_CODE = 'TZ';

const getCountryOption = (code: string) =>
  COUNTRY_OPTIONS.find((country) => country.code === code) || COUNTRY_OPTIONS[0];

const inferDeviceCountryCode = () => {
  if (typeof Intl !== 'undefined') {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = COUNTRY_OPTIONS.find((country) => country.timeZones?.includes(timeZone));
    if (match) return match.code;
  }

  if (typeof navigator !== 'undefined') {
    const locales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const locale of locales) {
      const region = locale.split('-').pop()?.toUpperCase();
      if (region && COUNTRY_OPTIONS.some((country) => country.code === region)) {
        return region;
      }
    }
  }

  return DEFAULT_COUNTRY_CODE;
};

export const eventMatchesLocation = (event: ApiEvent, selectedLocation: string) => {
  if (selectedLocation === 'all') return true;

  const selected = normalizePlaceName(selectedLocation);
  const eventCity = normalizePlaceName(String((event as any)?.city || ''));
  const eventLocation = normalizePlaceName(String((event as any)?.location || ''));
  const eventLocationParts = eventLocation
    .split(',')
    .map((part) => normalizePlaceName(part))
    .filter(Boolean);

  return (
    eventCity === selected ||
    eventCity.includes(selected) ||
    eventLocationParts.some((part) => part === selected || part.includes(selected)) ||
    eventLocation.includes(selected)
  );
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getEventDateTime = (event: ApiEvent) => {
  try {
    const dateStr = event.date;
    const timeStr = event.time ? String(event.time).replace(/\s+/g, '') : '00:00';
    return new Date(`${dateStr} ${timeStr}`);
  } catch (e) {
    return new Date(event.date);
  }
};

export const matchesTimeFilter = (eventDate: Date, filterId: TimeFilterId, now: Date) => {
  if (filterId === 'all') return true;

  const todayStart = startOfDay(now);
  let start = todayStart;
  let end = addDays(todayStart, 1);

  if (filterId === 'tomorrow') {
    start = addDays(todayStart, 1);
    end = addDays(todayStart, 2);
  } else if (filterId === 'weekend') {
    const day = now.getDay();
    const daysUntilSaturday = day === 0 ? -1 : 6 - day;
    start = addDays(todayStart, daysUntilSaturday);
    end = addDays(start, 2);
  } else if (filterId === 'month') {
    start = todayStart;
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return eventDate >= start && eventDate < end;
};

const extractReverseCity = (address: Record<string, string | undefined> = {}) =>
  String(
    address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      ''
  ).trim();

const mergeUniqueById = (items: LocationOption[]) => {
  const seen = new Set<string>();
  const out: LocationOption[] = [];
  for (const item of items) {
    const key = normalizePlaceName(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

export function useEventFilters(events: ApiEvent[]) {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilterId>('all');
  const [showWhenMenu, setShowWhenMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [remoteLocationOptions, setRemoteLocationOptions] = useState<LocationOption[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => inferDeviceCountryCode());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [detectStatus, setDetectStatus] = useState('Ready');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory('');
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const locationMatch = eventMatchesLocation(event, selectedLocation);
      const categoryMatch =
        selectedCategory === 'all' ||
        String((event as any).category || '').toLowerCase() === selectedCategory.toLowerCase();
      const subcategoryMatch =
        selectedSubcategory === '' ||
        String((event as any).subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase();
      return locationMatch && categoryMatch && subcategoryMatch;
    });
  }, [events, selectedLocation, selectedCategory, selectedSubcategory]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter(e => {
        const eventDate = getEventDateTime(e);
        return eventDate >= now && matchesTimeFilter(eventDate, selectedTimeFilter, now);
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
  }, [filteredEvents, selectedTimeFilter]);

  const upcomingEventCountText = `${upcomingEvents.length} ${upcomingEvents.length === 1 ? 'event' : 'events'}`;

  // Location search debounce
  useEffect(() => {
    const q = locationSearch.trim();
    if (q.length < 2) {
      setRemoteLocationOptions([]);
      setIsSearchingLocations(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingLocations(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchNominatim(q, { limit: 10, signal: controller.signal });
        const seen = new Set<string>();
        const next: LocationOption[] = [];

        for (const r of results) {
          const city = extractCityName(r);
          if (!city) continue;
          const key = normalizePlaceName(city);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({ id: city, name: city });
          if (next.length >= 12) break;
        }

        setRemoteLocationOptions(next);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setRemoteLocationOptions([]);
        }
      } finally {
        setIsSearchingLocations(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationSearch]);

  const selectedCountry = getCountryOption(selectedCountryCode);
  const detectedCountryCode = inferDeviceCountryCode();
  const countryCityOptions: LocationOption[] = selectedCountry.cities.map((city) => ({ id: city, name: city }));
  const selectedLocationOption: LocationOption[] =
    selectedLocation !== 'all' &&
    !countryCityOptions.some((location) => normalizePlaceName(location.id) === normalizePlaceName(selectedLocation))
      ? [{ id: selectedLocation, name: selectedLocation }]
      : [];
  const localMatches: LocationOption[] = countryCityOptions.filter((location) =>
    String(location.name || '').toLowerCase().includes(locationSearch.toLowerCase())
  );

  const displayedLocations: LocationOption[] =
    locationSearch.trim() === ''
      ? mergeUniqueById([...selectedLocationOption, ...countryCityOptions])
      : mergeUniqueById([...selectedLocationOption, ...localMatches, ...remoteLocationOptions]);
  const selectedCityIsInCountry = countryCityOptions.some(
    (location) => normalizePlaceName(location.id) === normalizePlaceName(selectedLocation)
  );
  const hasSelectedCity = selectedLocation !== 'all';
  const locationBannerTitle = hasSelectedCity
    ? selectedCityIsInCountry
      ? `${selectedLocation}, ${selectedCountry.name}`
      : selectedLocation
    : selectedCountry.name;
  const locationBannerSub = hasSelectedCity
    ? detectStatus === 'Located'
      ? `Detected from current location in ${selectedCountry.name}`
      : selectedCityIsInCountry
        ? `Selected city in ${selectedCountry.name}`
        : 'Selected city'
    : selectedCountryCode === detectedCountryCode
      ? 'Based on your device'
      : 'Selected country';

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    setShowCountryPicker(false);
    setSelectedLocation('all');
    setLocationSearch('');
    setDetectStatus('Ready');
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(selectedLocation === locationId ? 'all' : locationId);
    setDetectStatus('Ready');
  };

  const clearFilters = () => {
    setSelectedLocation('all');
    setSelectedCategory('all');
    setSelectedSubcategory('');
    setSelectedTimeFilter('all');
    setLocationSearch('');
    setDetectStatus('Ready');
    setShowCountryPicker(false);
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDetectStatus('Unavailable');
      return;
    }

    setDetectStatus('Detecting...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL('https://nominatim.openstreetmap.org/reverse');
          url.searchParams.set('format', 'json');
          url.searchParams.set('lat', String(coords.latitude));
          url.searchParams.set('lon', String(coords.longitude));
          url.searchParams.set('addressdetails', '1');

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error('Location lookup failed');

          const data = await res.json();
          const address = data?.address || {};
          const countryCode = String(address.country_code || '').toUpperCase();
          const nextCountry = COUNTRY_OPTIONS.some((country) => country.code === countryCode)
            ? countryCode
            : selectedCountryCode;
          const city = extractReverseCity(address);

          setSelectedCountryCode(nextCountry);
          setLocationSearch('');
          if (city) {
            setSelectedLocation(city);
            setDetectStatus('Located');
          } else {
            setSelectedLocation('all');
            setDetectStatus('City unavailable');
          }
        } catch (error) {
          setDetectStatus('Lookup failed');
        }
      },
      (error) => {
        setDetectStatus(error.code === error.PERMISSION_DENIED ? 'Permission denied' : 'Unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const hasActiveFilters = selectedLocation !== 'all' || selectedCategory !== 'all' || selectedSubcategory !== '' || selectedTimeFilter !== 'all';
  const activeFiltersCount = (selectedLocation !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + (selectedSubcategory !== '' ? 1 : 0) + (selectedTimeFilter !== 'all' ? 1 : 0);
  const selectedTimeFilterName = selectedTimeFilter === 'all'
    ? undefined
    : timeFilters.find(filter => filter.id === selectedTimeFilter)?.name;

  return {
    selectedLocation, setSelectedLocation,
    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    selectedTimeFilter, setSelectedTimeFilter,
    showWhenMenu, setShowWhenMenu,
    showFilters, setShowFilters,
    locationSearch, setLocationSearch,
    remoteLocationOptions, setRemoteLocationOptions,
    isSearchingLocations, setIsSearchingLocations,
    selectedCountryCode, setSelectedCountryCode,
    showCountryPicker, setShowCountryPicker,
    detectStatus, setDetectStatus,
    handleCategorySelect,
    filteredEvents,
    upcomingEvents,
    upcomingEventCountText,
    selectedCountry,
    detectedCountryCode,
    countryCityOptions,
    displayedLocations,
    selectedCityIsInCountry,
    hasSelectedCity,
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
  };
}
