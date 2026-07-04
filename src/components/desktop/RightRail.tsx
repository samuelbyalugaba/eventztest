import { useLocation, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Sparkles, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { getEvents } from '../../utils/supabase/api';

interface TrendingEvent {
  id: string;
  title: string;
  date?: string;
  location?: string;
  image_url?: string;
}

export function RightRail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [trending, setTrending] = useState<TrendingEvent[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const events = await getEvents({ limit: 5 });
        if (!cancelled) setTrending((events || []).slice(0, 5));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const sectionTitle = (() => {
    if (pathname.startsWith('/feed')) return 'Trending in your feed';
    if (pathname.startsWith('/live')) return 'Suggested live';
    if (pathname.startsWith('/profile')) return 'Discover events';
    return 'Trending events';
  })();

  return (
    <aside className="hidden xl:flex fixed top-0 right-0 h-screen w-80 flex-col border-l border-gray-200/70 bg-[#FAFAFA]/60 backdrop-blur-xl z-20 overflow-y-auto">
      <div className="p-5 space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search events, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]/20 focus:border-[#8A2BE2]/40 transition"
          />
        </div>

        <section className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm">
          <header className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#8A2BE2]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">{sectionTitle}</h3>
          </header>
          {trending.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {trending.map(ev => (
                <li key={ev.id}>
                  <button
                    onClick={() => navigate(`/event/${ev.id}`)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {ev.image_url ? (
                        <img src={ev.image_url} alt={ev.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Calendar className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate group-hover:text-[#8A2BE2] transition-colors">
                        {ev.title}
                      </p>
                      {ev.location && (
                        <p className="text-xs text-gray-500 truncate">{ev.location}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm">
          <header className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#8A2BE2]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Tip</h3>
          </header>
          <p className="text-xs text-gray-500 leading-relaxed">
            Save events you like to keep them in your wallet, and follow organizers to see their drops first.
          </p>
        </section>

        <p className="text-xs text-gray-400 px-1">© Eventz · Built for nightlife</p>
      </div>
    </aside>
  );
}
