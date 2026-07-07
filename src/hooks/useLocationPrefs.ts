import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getProfile, updateProfile } from '../utils/supabase/api';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';
import { locations, type LocationOption } from '../utils/locations';

const STORAGE_KEY = 'eventz-recent-locations';
const DEFAULT_RECENTS = ['Dar es Salaam', 'Dubai', 'New York'];

/**
 * Manages a user's recent location list (synced with profile preferences when signed in,
 * fall back to localStorage otherwise) and an ad-hoc Nominatim search.
 */
export function useLocationPrefs(locationSearch: string) {
  const [recentLocations, setRecentLocations] = useState<string[]>(DEFAULT_RECENTS);
  const [remoteLocationOptions, setRemoteLocationOptions] = useState<LocationOption[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);

  // Load preferences once (and on auth change)
  useEffect(() => {
    let cancelled = false;
    const loadPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          const profile = await getProfile(user.id);
          if (cancelled) return;
          const localStored = localStorage.getItem(STORAGE_KEY);
          if (profile?.preferences?.recentLocations) {
            setRecentLocations(profile.preferences.recentLocations);
            if (localStored) localStorage.removeItem(STORAGE_KEY);
          } else if (localStored) {
            const locs = JSON.parse(localStored);
            setRecentLocations(locs);
            const currentPreferences = profile?.preferences || {};
            await updateProfile(user.id, {
              preferences: { ...currentPreferences, recentLocations: locs },
            });
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setRecentLocations(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load location preferences:', error);
      }
    };
    loadPreferences();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPreferences();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Debounced Nominatim search
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
          next.push({ id: city, name: city, icon: MapPin });
          if (next.length >= 12) break;
        }
        setRemoteLocationOptions(next);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setRemoteLocationOptions([]);
      } finally {
        setIsSearchingLocations(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationSearch]);

  const persistRecents = async (next: string[]) => {
    setRecentLocations(next);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        const currentPreferences = profile?.preferences || {};
        await updateProfile(user.id, {
          preferences: { ...currentPreferences, recentLocations: next },
        });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch (error) {
      console.warn('Failed to persist recent locations:', error);
    }
  };

  const recentLocationOptions: LocationOption[] = recentLocations
    .filter((id) => id !== 'all')
    .map(
      (id) =>
        (locations.find((l) => l.id === id) as any) ||
        ({ id, name: id, icon: MapPin } as LocationOption),
    );

  return {
    recentLocations,
    recentLocationOptions,
    remoteLocationOptions,
    isSearchingLocations,
    persistRecents,
  };
}
