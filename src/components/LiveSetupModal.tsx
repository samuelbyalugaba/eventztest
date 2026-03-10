import { useEffect, useState, useRef } from 'react';
import { X, Radio, Calendar, MapPin, Tv, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getOrganizerEvents, updateEventStreamingStatus, uploadImage } from '../utils/supabase/api';
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
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      
      // Upload immediately for preview URL usage
      try {
        const url = await uploadImage(file, 'event-covers');
        setImageUrl(url);
      } catch (error) {
        console.error('Thumbnail upload failed:', error);
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
        const list = await getOrganizerEvents(user.id);
        setEvents(list || []);
      } catch (e) {
        console.warn('Failed to load events', e);
      }
    };
    load();
  }, [isOpen]);

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
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl sm:shadow-xl sm:border sm:border-gray-200">
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

            {tab === 'instant' && (
              <div className="px-4 py-4 space-y-4">
                {/* Thumbnail Upload */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group"
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
              <div className="px-4 py-4">
                {events.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Tv className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium">No events found</p>
                    <p className="text-gray-600 text-sm">Create an event then go live from it</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium text-sm">{ev.title}</p>
                            <p className="text-gray-600 text-xs flex items-center gap-2">
                              <span>{ev.date}</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {ev.location || 'Virtual'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  console.error('Failed to update streaming status', e);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
