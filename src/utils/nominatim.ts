export type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  address?: Record<string, string | undefined>;
};

type SearchOptions = {
  limit?: number;
  signal?: AbortSignal;
};

const cache = new Map<string, NominatimSearchResult[]>();

export async function searchNominatim(query: string, options: SearchOptions = {}) {
  const q = query.trim();
  if (!q) return [];

  const limit = options.limit ?? 10;
  const key = `${q.toLowerCase()}::${limit}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), { signal: options.signal });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = (await res.json()) as NominatimSearchResult[];
  cache.set(key, data);
  return data;
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizePlaceName(value: string) {
  return stripDiacritics(value).trim().toLowerCase();
}

export function extractCityName(result: NominatimSearchResult) {
  const addr = result.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    result.display_name.split(',')[0];

  return String(city || '').trim();
}

