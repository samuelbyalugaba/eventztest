import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getProfile, uploadImage, checkUsernameUnique, becomeOrganizer } from '../utils/supabase/api';
import { searchNominatim } from '../utils/nominatim';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { SetupHeader } from './organizer-setup/SetupHeader';
import { CategorySelector } from './organizer-setup/CategorySelector';
import { ProfilePhotoUpload } from './organizer-setup/ProfilePhotoUpload';
import { ProfileFormFields } from './organizer-setup/ProfileFormFields';

interface OrganizerProfileSetupProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function OrganizerProfileSetup({ onComplete, onBack }: OrganizerProfileSetupProps) {
  const [organizerName, setOrganizerName] = useState('');
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchLocations = async (query: string) => {
    if (query.length < 3) { setLocationSuggestions([]); return; }
    setLoadingLocations(true);
    try {
      const data = await searchNominatim(query, { limit: 10 });
      setLocationSuggestions(data);
      setShowLocationDropdown(true);
    } catch (error) {
      toast.error('Failed to load location suggestions');
    } finally { setLoadingLocations(false); }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const p = await getProfile(user.id);
      if (p) {
        setOrganizerName(p.full_name || '');
        setUsername(p.username || '');
        setCategory(p.organizer_type || '');
        setCategorySearch(p.organizer_type || '');
        setLocation(p.location || '');
        setBio(p.bio || '');
        setAvatarUrl(p.avatar_url || '');
        if (p.username) setAvailable(true);
      }
    };
    init();
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to upload photo'); return; }
    try {
      const url = await uploadImage(e.target.files[0], 'avatars', `organizers/${user.id}`);
      setAvatarUrl(url);
      toast.success('Photo uploaded');
    } catch (error) {
      console.error('Failed to upload photo:', error);
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
    } finally { setChecking(false); }
  };

  const onSubmit = async () => {
    if (!organizerName || !username || !category) {
      toast.error('Please fill in all required fields', { description: 'Name, username, and category are required' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('You must be logged in'); return; }
    try {
      const ok = await checkUsernameUnique(username, user.id);
      if (!ok) { toast.error('Username not available'); return; }
      await becomeOrganizer({
        full_name: organizerName,
        username,
        organizer_type: category,
        location: location.trim(),
        bio,
        avatar_url: avatarUrl,
        contact_email: user.email || undefined,
      });
      toast.success('Your Creator profile is ready');
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
      onComplete();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save profile');
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <SetupHeader onBack={onBack} />

      <div className="flex-1 px-6 pt-5 pb-28 max-w-lg mx-auto w-full">
        <CategorySelector
          category={category}
          categorySearch={categorySearch}
          onCategoryChange={setCategory}
          onCategorySearchChange={setCategorySearch}
        />

        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Profile details</h2>

          <ProfilePhotoUpload avatarUrl={avatarUrl} onFileChange={onFileChange} />

          <ProfileFormFields
            organizerName={organizerName}
            onOrganizerNameChange={setOrganizerName}
            username={username}
            onUsernameChange={(val) => { setUsername(val.toLowerCase().replace(/[^a-z0-9]/g, '')); setAvailable(null); }}
            checking={checking}
            available={available}
            location={location}
            onLocationChange={(val) => { setLocation(val); searchLocations(val); }}
            showLocationDropdown={showLocationDropdown}
            locationSuggestions={locationSuggestions}
            loadingLocations={loadingLocations}
            onLocationSelect={(displayName) => { setLocation(displayName); setShowLocationDropdown(false); setLocationSuggestions([]); }}
            bio={bio}
            onBioChange={setBio}
          />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-bottom z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onSubmit}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Complete Setup</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
