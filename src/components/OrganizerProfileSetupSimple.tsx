import { useEffect, useRef, useState } from 'react';
import { Building2, Camera, Check, MapPin, AtSign, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getProfile, getOrganizerProfile, upsertOrganizerProfile, uploadImage, updateProfile, checkUsernameUnique } from '../utils/supabase/api';
 
interface OrganizerProfileSetupProps {
  onComplete: () => void;
}
 
export function OrganizerProfileSetup({ onComplete }: OrganizerProfileSetupProps) {
  const [organizerName, setOrganizerName] = useState('');
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  const categories = [
    'Technology & Design',
    'Entertainment',
    'Sports',
    'Business',
    'Organization',
    'Venue',
    'Artist'
  ];
 
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const org = await getOrganizerProfile(user.id);
      if (org) {
        setOrganizerName(org.organizer_name || '');
        setCategory(org.organizer_type || '');
        setLocation(org.location || '');
        setBio(org.bio || '');
        setEmail(org.contact_email || '');
        setPhone(org.phone || '');
        setAvatarUrl(org.organizer_avatar_url || '');
      }
      const p = await getProfile(user.id);
      if (p?.username) {
        setUsername(p.username);
        setAvailable(true);
      }
      if (!email && p?.contact_email) setEmail(p.contact_email);
      if (!phone && p?.phone) setPhone(p.phone);
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
        organizer_avatar_url: avatarUrl,
        contact_email: email,
        phone
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
    <div className="bg-purple-50 min-h-screen pb-24">
      <div className="bg-[#8A2BE2] px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-white text-lg sm:text-2xl font-bold">Create your organizer profile</h1>
              <p className="text-white/90 text-xs sm:text-sm">Provide your details to get started</p>
            </div>
          </div>
        </div>
      </div>
 
      <div className="px-3 py-4 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">✓</div>
              <span className="hidden sm:inline">Become Organizer</span>
            </div>
            <div className="w-12 h-0.5 bg-purple-600"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">2</div>
              <span className="hidden sm:inline font-semibold text-purple-600">Profile Setup</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">3</div>
              <span className="hidden sm:inline">Create Event</span>
            </div>
          </div>
        </div>
 
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-gray-900 text-lg mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Profile Information
          </h2>
 
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Organizer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Photo</div>
                )}
              </div>
              <button
                onClick={onUploadClick}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#8A2BE2] text-white flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>
            <button
              onClick={onUploadClick}
              className="mt-2 text-[#8A2BE2] text-sm font-medium"
            >
              Upload Photo
            </button>
          </div>
 
          <div className="mb-5">
            <label className="block text-gray-900 mb-2">Organizer Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g., Alex Harrison"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Enter your name as it should appear on your profile.</p>
          </div>
 
          <div className="mb-5">
            <label className="block text-gray-900 mb-3">Username <span className="text-red-500">*</span></label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                onBlur={checkHandle}
                placeholder="username"
                className="w-full pl-12 pr-20 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                {checking ? <span className="text-gray-500">Checking...</span> : available === true ? <span className="text-green-600 font-semibold">Available</span> : available === false ? <span className="text-red-600 font-semibold">Taken</span> : null}
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-1">Unique handle for your profile identity.</p>
          </div>
 
          <div className="mb-5">
            <label className="block text-gray-900 mb-3">Category <span className="text-red-500">*</span></label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            >
              <option value="" disabled>Select a category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-gray-500 text-xs mt-1">What category describes you best?</p>
          </div>
 
          <div className="mb-5">
            <label className="block text-gray-900 mb-3">Location <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Used for local community discovery.</p>
          </div>
 
          <div className="mb-5">
            <label className="block text-gray-900 mb-3">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
            />
            <p className="text-gray-500 text-xs mt-1">Briefly describe yourself to the community.</p>
          </div>
 
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@yourorganization.com"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>
 
          <div className="mb-3 sm:mb-5">
            <label className="block text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">Phone</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 123 456 789"
                className="w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
 
        <div className="sticky bottom-4 sm:bottom-20 bg-purple-50 py-2 sm:py-4">
          <button
            onClick={onSubmit}
            className="w-full bg-[#8A2BE2] text-white py-3 sm:py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span className="text-sm sm:text-base font-medium">Confirm</span>
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <p className="text-center text-gray-500 text-[10px] sm:text-xs mt-2 sm:mt-3">
            You can edit this information later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}
