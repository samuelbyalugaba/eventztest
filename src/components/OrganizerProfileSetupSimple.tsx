import { useEffect, useRef, useState } from 'react';
import { Building2, Camera, Check, MapPin, AtSign, User, Search, ChevronDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getProfile, getOrganizerProfile, upsertOrganizerProfile, uploadImage, updateProfile, checkUsernameUnique } from '../utils/supabase/api';

interface OrganizerProfileSetupProps {
  onComplete: () => void;
}

const CREATOR_CATEGORIES = [
  'Art Gallery', 'Artist', 'Bar', 'Band', 'Blogger', 'Book Store', 'Brand',
  'Business', 'Cafe', 'Charity', 'Church', 'Club', 'Coach', 'Comedy Club',
  'Community', 'Concert Venue', 'Conference', 'Content Creator', 'Corporate',
  'DJ', 'Dance Studio', 'Digital Creator', 'Education', 'Entrepreneur',
  'Event Planner', 'Exhibition', 'Fashion', 'Festival', 'Fitness Trainer',
  'Government', 'Gym', 'Health/Beauty', 'Hotel', 'Influencer', 'Library',
  'Lounge', 'Media', 'Mosque', 'Museum', 'Music Venue', 'Musician',
  'Networking Group', 'Nightclub', 'Non-Profit', 'Organization', 'Park',
  'Party Planner', 'Performing Arts', 'Personal Blog', 'Photographer',
  'Podcast', 'Promoter', 'Public Figure', 'Radio Station',
  'Religious Organization', 'Resort', 'Restaurant', 'Retail', 'School',
  'Shopping', 'Social Club', 'Speaker', 'Sports Team', 'Startup',
  'Student Organization', 'Synagogue', 'Tech Community', 'Theater',
  'University', 'Venue', 'Video Creator', 'Wedding Planner', 'Workshop',
  'Writer', 'Yoga Studio', 'Youth Organization'
].sort();

export function OrganizerProfileSetup({ onComplete }: OrganizerProfileSetupProps) {
  const [organizerName, setOrganizerName] = useState('');
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = CREATOR_CATEGORIES.filter(c => 
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    setLoadingLocations(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setLocationSuggestions(data);
      setShowLocationDropdown(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (location && !showLocationDropdown && location !== organizerName) { // Simple check to avoid searching when selecting
        // Only search if user is actually typing
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const org = await getOrganizerProfile(user.id);
      if (org) {
        setOrganizerName(org.organizer_name || '');
        setCategory(org.organizer_type || '');
        setCategorySearch(org.organizer_type || '');
        setLocation(org.location || '');
        setBio(org.bio || '');
        setAvatarUrl(org.organizer_avatar_url || '');
      }
      const p = await getProfile(user.id);
      if (p?.username) {
        setUsername(p.username);
        setAvailable(true);
      }
    };
    init();
  }, []);
 
  const onUploadClick = () => fileInputRef.current?.click();
 
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sign in to upload photo');
      return;
    }
    try {
      const url = await uploadImage(e.target.files[0], 'avatars', `organizers/${user.id}`);
      setAvatarUrl(url);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };
 
  const checkHandle = async () => {
    if (!username) return;
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ok = await checkUsernameUnique(username, user?.id);
      setAvailable(ok);
    } finally {
      setChecking(false);
    }
  };
 
  const onSubmit = async () => {
    if (!organizerName || !username || !category || !location) {
      toast.error('Please fill in all required fields', {
        description: 'Name, username, category, and location are required',
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    try {
      await upsertOrganizerProfile({
        id: user.id,
        organizer_name: organizerName,
        organizer_type: category,
        bio,
        location,
        organizer_avatar_url: avatarUrl
      });
      const ok = await checkUsernameUnique(username, user.id);
      if (!ok) {
        toast.error('Username not available');
        return;
      }
      await updateProfile(user.id, { username });
      toast.success('Profile saved');
      onComplete();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save profile');
    }
  };
 
  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <div className="bg-gradient-to-br from-[#8A2BE2] via-[#9333ea] to-[#7928ca] px-6 py-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-900/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-inner border border-white/30">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-white text-2xl sm:text-4xl font-black tracking-tight mb-2">Create your organizer profile</h1>
              <p className="text-purple-100 text-sm sm:text-lg font-medium opacity-90">Provide your details to get started with Eventz</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-purple-50 p-6 sm:p-10 mb-6">
          <h2 className="text-gray-900 text-xl font-bold mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-[#8A2BE2] rounded-full"></div>
            Profile Information
          </h2>

          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg group-hover:shadow-purple-200 transition-all duration-300">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Organizer" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <button
                onClick={onUploadClick}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#8A2BE2] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>
            <button
              onClick={onUploadClick}
              className="mt-4 text-[#8A2BE2] text-sm font-bold hover:underline"
            >
              Update Profile Photo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-2">
              <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Organizer Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g., Alex Harrison"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Username <span className="text-red-500">*</span></label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    setAvailable(null);
                  }}
                  onBlur={checkHandle}
                  placeholder="username"
                  className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                  {checking ? (
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  ) : available === true ? (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-green-600 font-bold text-[10px] uppercase tracking-wider">Available</span>
                    </div>
                  ) : available === false ? (
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                      <X className="w-3 h-3 text-red-600" />
                      <span className="text-red-600 font-bold text-[10px] uppercase tracking-wider">Taken</span>
                    </div>
                  ) : username && (
                    <button 
                      onClick={checkHandle}
                      className="text-[#8A2BE2] text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Check
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-2 relative" ref={categoryRef}>
              <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Category <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                    if (category && e.target.value !== category) setCategory('');
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Search categories..."
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
                <ChevronDown className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </div>
              
              {showCategoryDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in duration-200">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          setCategorySearch(c);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-6 py-3 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${category === c ? 'text-[#8A2BE2] font-bold bg-purple-50/50' : 'text-slate-600 font-medium'}`}
                      >
                        {c}
                        {category === c && <Check className="w-4 h-4" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-sm text-slate-400 italic">No categories found</div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-2 relative" ref={locationRef}>
              <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Location <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    searchLocations(e.target.value);
                  }}
                  onFocus={() => location.length >= 3 && setShowLocationDropdown(true)}
                  placeholder="City, Country"
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
                {loadingLocations && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-600 animate-spin" />
                )}
              </div>
              
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto py-2 animate-in fade-in zoom-in duration-200">
                  {locationSuggestions.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLocation(loc.display_name);
                        setShowLocationDropdown(false);
                        setLocationSuggestions([]);
                      }}
                      className="w-full text-left px-6 py-3 text-sm text-slate-600 hover:bg-purple-50 transition-colors font-medium border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                        <span className="line-clamp-2">{loc.display_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-gray-700 font-bold mb-2 text-sm ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-medium resize-none"
            />
            <p className="text-slate-400 text-[10px] mt-2 ml-2 font-medium">Briefly describe yourself to the community.</p>
          </div>
        </div>

        <div className="sticky bottom-4 sm:bottom-10 bg-slate-50/80 backdrop-blur-md py-4 px-2 rounded-3xl">
          <button
            onClick={onSubmit}
            className="w-full bg-[#8A2BE2] text-white py-5 rounded-[2rem] hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-xl flex items-center justify-center gap-3 group"
          >
            <span className="text-lg font-black tracking-tight">Confirm Profile</span>
            <Check className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </button>
          <p className="text-center text-slate-400 text-[10px] font-bold mt-4 uppercase tracking-widest">
            You can edit this information later in settings
          </p>
        </div>
      </div>
    </div>
  );
}
