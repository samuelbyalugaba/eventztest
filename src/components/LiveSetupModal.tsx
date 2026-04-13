import { useEffect, useState, useRef } from 'react';
import { X, Radio, Calendar, MapPin, Tv, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getOrganizerEvents, subscribeToEventStreaming, updateEventStreamingStatus, uploadImage } from '../utils/supabase/api';
import { StreamManager } from './StreamManager';
import type { Event as ApiEvent } from '../utils/supabase/api';

interface LiveSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveSetupModal({ isOpen, onClose }: LiveSetupModalProps) {
  const [tab, setTab] = useState<'instant' | 'from_event'>('instant');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'ticket'>('public');
  const [virtualPrice, setVirtualPrice] = useState<string>('');
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeLiveEvent, setActiveLiveEvent] = useState<ApiEvent | null>(null);
  
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setThumbnailPreview(URL.createObjectURL(file));
      
      // Upload immediately for preview URL usage
      try {
        const url = await uploadImage(file, 'events', 'event-covers');
        setImageUrl(url);
      } catch (error) {
        toast.error('Failed to upload thumbnail');
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const list = await getOrganizerEvents(user.id, { includeInstant: true });
        setEvents(list || []);
      } catch (e) {
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedEvent) return;

    const liveEvent = events.find((e) => !!e?.streaming?.isLive) || null;
    setActiveLiveEvent(liveEvent);
  }, [events, isOpen, selectedEvent]);

  useEffect(() => {
    if (!isOpen) return;
    if (!activeLiveEvent) return;

    const channel = subscribeToEventStreaming(activeLiveEvent.id, (streaming) => {
      const isStillLive = !!streaming?.isLive;
      if (!isStillLive) {
        setActiveLiveEvent(null);
      } else {
        setActiveLiveEvent((prev) => (prev ? { ...prev, streaming: streaming as any } : prev));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [activeLiveEvent?.id, isOpen]);

  if (!isOpen) return null;

  const createInstantEvent = async () => {
    const finalTitle = title.trim() || 'Live Stream';
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().slice(0, 5);

      const streaming: any = {
        available: true,
        isLive: false,
        isInstant: true,
        visibility,
        virtualPrice: virtualPrice.trim() || null,
        category,
      };

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: finalTitle,
          description: 'Instant live stream',
          date: dateStr,
          time: timeStr,
          location: 'Virtual',
          organizer_id: user.id,
          status: 'published',
          category,
          image_url: imageUrl,
          streaming,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Open stream manager for this new event
      setSelectedEvent(data as ApiEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create stream');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full h-[75vh] sm:h-auto sm:max-w-lg sm:rounded-2xl sm:shadow-xl sm:border sm:border-gray-200 sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-600" />
            <h3 className="text-gray-900 font-semibold">Go Live</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {!selectedEvent ? (
          <>
            {activeLiveEvent ? (
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-4 space-y-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                          <p className="text-red-700 font-semibold text-sm">You’re currently live</p>
                        </div>
                        <p className="text-gray-900 font-bold mt-2 line-clamp-2">
                          {activeLiveEvent.title || 'Live Stream'}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Viewers: {(activeLiveEvent.streaming?.liveViewers || 0).toLocaleString()}
                        </p>
                      </div>
                      {activeLiveEvent.image_url ? (
                        <img
                          src={activeLiveEvent.image_url}
                          alt=""
                          className="w-20 h-12 rounded-lg object-cover border border-red-100"
                        />
                      ) : null}
                    </div>
                    <button
                      onClick={() => setSelectedEvent(activeLiveEvent)}
                      className="w-full mt-4 py-3 rounded-xl text-white font-semibold bg-purple-600 hover:bg-purple-700 transition-all"
                    >
                      Continue Live
                    </button>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-gray-900 font-semibold text-sm">Start a new live stream</p>
                    <p className="text-gray-600 text-xs mt-1">
                      End your current stream before starting another.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                      onClick={() => setTab('instant')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === 'instant' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      Go Live Now
                    </button>
                    <button
                      onClick={() => setTab('from_event')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === 'from_event' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      From Event
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {tab === 'instant' && (
                    <div className="px-4 py-4 space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full aspect-video h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group"
                  >
                    {thumbnailPreview ? (
                      <>
                        <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white font-medium text-sm">Change Thumbnail</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Add Cover Image</p>
                        <p className="text-gray-400 text-xs">Recommended 16:9</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleThumbnailSelect}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      placeholder="Give your livestream a title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option>General</option>
                        <option>Music</option>
                        <option>Entertainment</option>
                        <option>Talk Show</option>
                        <option>Sports</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Visibility</label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="public">Public</option>
                        <option value="followers">Followers</option>
                        <option value="ticket">Ticket Required</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Virtual Ticket Price (optional)</label>
                    <input
                      value={virtualPrice}
                      onChange={(e) => setVirtualPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      placeholder="e.g. TSh 1,000"
                    />
                  </div>
                  <button
                    onClick={createInstantEvent}
                    disabled={isCreating}
                    className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${isCreating ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'}`}
                  >
                    {isCreating ? 'Creating…' : 'Go Live'}
                  </button>
                    </div>
                  )}

                  {tab === 'from_event' && (
                    <div className="px-4 py-4 space-y-4">
                      {events.filter((e) => !(e?.streaming as any)?.isInstant).length === 0 ? (
                    <div className="relative w-full aspect-video h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                        <Tv className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">No events found</p>
                      <p className="text-gray-400 text-xs">Create an event first to go live from it</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events
                        .filter((e) => !(e?.streaming as any)?.isInstant)
                        .map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="relative w-full aspect-video h-48 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden text-left hover:border-gray-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                        >
                          {ev.image_url ? (
                            <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                              <Calendar className="w-8 h-8 text-gray-300 mb-2" />
                              <p className="text-gray-400 text-sm font-medium">No cover image</p>
                            </div>
                          )}

                          <div className="absolute left-3 right-3 bottom-3 rounded-lg bg-white/95 backdrop-blur px-3 py-2 border border-white/60 shadow-sm">
                            <p className="text-gray-900 font-semibold text-sm truncate">{ev.title}</p>
                            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{ev.date}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 min-w-0 max-w-[55%]">
                                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{ev.location || 'Virtual'}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="p-0">
            <StreamManager
              event={selectedEvent}
              onClose={() => {
                setSelectedEvent(null);
                onClose();
              }}
              onUpdateStatus={async (isLive) => {
                try {
                  await updateEventStreamingStatus(selectedEvent.id, isLive);
                } catch (e) {
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
