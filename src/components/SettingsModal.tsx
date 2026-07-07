import { X, User, Shield, HelpCircle, ChevronRight, Mail } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase, getProfile, updateProfile, checkUsernameUnique } from '../utils/supabase/api';
import { searchNominatim } from '../utils/nominatim';
import { Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription } from "./ui/sheet";
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PRIVACY_SETTINGS, mapUserProfileToSettingsForm, uploadProfileAvatar, validateProfileImageFile } from './settings/profileSettingsShared';
import { dispatchProfileUpdated } from '../utils/profileUpdates';
import { DEFAULT_EMAIL_PREFERENCES, getEmailPreferences, updateEmailPreferences, type EmailPreferenceUpdate } from '../utils/email';
import { ProfileSettingsForm, type ProfileData } from './settings/ProfileSettingsForm';
import { EmailPreferencesView } from './settings/EmailPreferencesView';
import { PrivacySettingsView } from './settings/PrivacySettingsView';
import { HelpSupportView } from './settings/HelpSupportView';

type SettingsView = 'main' | 'profile' | 'email' | 'privacy' | 'help';

interface SettingsModalProps {
  onClose: () => void;
  initialView?: SettingsView;
}

export function SettingsModal({ onClose, initialView = 'main' }: SettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>(initialView);
  const [isOpen, setIsOpen] = useState(true);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setTimeout(onClose, 300);
  };

  const [profileData, setProfileData] = useState<ProfileData>({
    username: '', name: '', email: '', phone: '', bio: '', birthdate: '', avatarUrl: '', location: '', category: '',
  });
  const [isCreatorProfile, setIsCreatorProfile] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.length) return;
      const file = event.target.files[0];
      const err = validateProfileImageFile(file);
      if (err) { toast.error(err); return; }
      if (!user) { toast.error('You must be logged in to update your profile photo'); return; }
      const publicUrl = await uploadProfileAvatar({ file, userId: user.id, scope: 'users' });
      setProfileData(prev => ({ ...prev, avatarUrl: publicUrl }));
      await updateProfile(user.id, { avatar_url: publicUrl });
      await refreshProfile();
      toast.success('Profile photo updated successfully');
      dispatchProfileUpdated({ userId: user.id, fields: ['avatar_url'], avatar_url: publicUrl });
    } catch (error: any) { toast.error(error.message || 'Error uploading avatar'); }
  };

  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY_SETTINGS);
  const [emailPreferences, setEmailPreferences] = useState(DEFAULT_EMAIL_PREFERENCES);
  const [isSavingEmailPreferences, setIsSavingEmailPreferences] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (user) {
          const currentProfile = profile || await getProfile(user.id);
          if (currentProfile) {
            setIsCreatorProfile(!!currentProfile.is_organizer);
            const localProfile = localStorage.getItem('eventz-user-profile');
            let profileUpdates: any = {};
            let hasUpdates = false;
            if (localProfile && !currentProfile.full_name && !currentProfile.phone) {
              const parsed = JSON.parse(localProfile);
              setProfileData(parsed);
              profileUpdates = { full_name: parsed.name, contact_email: parsed.email, phone: parsed.phone, location: parsed.location, bio: parsed.bio };
              hasUpdates = true;
              localStorage.removeItem('eventz-user-profile');
            } else {
              setProfileData(mapUserProfileToSettingsForm(currentProfile, user.email || ''));
              setCategorySearch(currentProfile.organizer_type || '');
              if (localProfile) localStorage.removeItem('eventz-user-profile');
            }
            const localPrivacy = localStorage.getItem('eventz-privacy');
            if (currentProfile.privacy_settings) {
              setPrivacy(prev => ({ ...prev, ...currentProfile.privacy_settings }));
              if (localPrivacy) localStorage.removeItem('eventz-privacy');
            } else if (localPrivacy) {
              const parsed = JSON.parse(localPrivacy);
              setPrivacy(parsed);
              profileUpdates.privacy_settings = parsed;
              hasUpdates = true;
              localStorage.removeItem('eventz-privacy');
            }
            try {
              const prefs = await getEmailPreferences(user.id);
              setEmailPreferences({ ...DEFAULT_EMAIL_PREFERENCES, ...prefs });
            } catch (error) {
              console.error('Failed to load email preferences:', error);
              toast.error('Failed to load settings');
              setEmailPreferences(DEFAULT_EMAIL_PREFERENCES);
            }
            if (hasUpdates) await updateProfile(user.id, profileUpdates);
          }
        } else {
          const storedProfile = localStorage.getItem('eventz-user-profile');
          if (storedProfile) setProfileData(JSON.parse(storedProfile));
          const storedPrivacy = localStorage.getItem('eventz-privacy');
          if (storedPrivacy) setPrivacy(JSON.parse(storedPrivacy));
        }
      } catch (error) {}
    };
    loadSettings();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadSettings());
    return () => { subscription.unsubscribe(); };
  }, [profile, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setShowCategoryDropdown(false);
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) setShowLocationDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveProfile = async () => {
    try {
      if (user) {
        const currentProfile = await getProfile(user.id);
        if (profileData.username !== currentProfile?.username) {
          const isUnique = await checkUsernameUnique(profileData.username, user.id);
          if (!isUnique) { toast.error('Username already taken'); return; }
        }
        const nextEmail = (profileData.email || '').trim();
        if (nextEmail && nextEmail !== user.email) {
          const { error: authUpdateError } = await supabase.auth.updateUser({ email: nextEmail });
          if (authUpdateError) throw authUpdateError;
          toast.info('Email change requested. Please check your inbox to confirm.');
        }
        await updateProfile(user.id, {
          username: profileData.username, full_name: profileData.name, phone: profileData.phone,
          bio: profileData.bio, birthdate: profileData.birthdate, avatar_url: profileData.avatarUrl,
          ...(isCreatorProfile ? { location: profileData.location.trim(), organizer_type: profileData.category } : {}),
        });
        await refreshProfile();
      } else {
        localStorage.setItem('eventz-user-profile', JSON.stringify(profileData));
      }
      toast.success('Profile updated successfully');
      dispatchProfileUpdated({ userId: user?.id, fields: ['username','full_name','phone','bio','birthdate','avatar_url', ...(isCreatorProfile ? ['location','organizer_type'] : [])], avatar_url: profileData.avatarUrl || null });
      handleOpenChange(false);
    } catch (error) {
      const message = (error as any)?.message || (error as any)?.error_description || (error as any)?.details || 'Failed to save profile';
      toast.error(message);
    }
  };

  const handleSaveEmailPreferences = async () => {
    if (!user) { toast.error('Please sign in to update email preferences'); return; }
    setIsSavingEmailPreferences(true);
    try { await updateEmailPreferences(user.id, emailPreferences); toast.success('Email preferences updated'); setCurrentView('main'); }
    catch (error: any) { toast.error(error?.message || 'Failed to update email preferences'); }
    finally { setIsSavingEmailPreferences(false); }
  };

  const toggleEmailPreference = (key: keyof EmailPreferenceUpdate) => setEmailPreferences(c => ({ ...c, [key]: !c[key] }));

  const handleSavePrivacy = async () => {
    try {
      if (user) {
        const prof = await getProfile(user.id);
        const currentSettings = prof?.privacy_settings || {};
        await updateProfile(user.id, { privacy_settings: { ...currentSettings, ...privacy, showFollowers: currentSettings.showFollowers ?? true, showStats: currentSettings.showStats ?? true } });
        await refreshProfile();
      } else { localStorage.setItem('eventz-privacy', JSON.stringify(privacy)); }
      toast.success('Privacy settings updated');
      setCurrentView('main');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fields: ['privacy_settings'] } }));
    } catch (error) { toast.error('Failed to save privacy settings'); }
  };

  const handleDeleteAccount = async () => {
    if (!user) { toast.error('You must be logged in to delete your account'); return; }
    if (!window.confirm('Delete your EVENTZ account? This removes your profile and signs you out. This action cannot be undone.')) return;
    if (window.prompt('Type DELETE to permanently delete your account.') !== 'DELETE') { toast.error('Account deletion cancelled'); return; }
    setIsDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST', body: {} });
      if (error) {
        let msg = error.message || 'Failed to delete account';
        const resp = (error as any)?.context;
        if (resp?.json) { try { const b = await resp.json(); msg = b?.error || msg; } catch (e) { console.error(e); } }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      await supabase.auth.signOut();
      localStorage.removeItem('eventz-user-profile');
      localStorage.removeItem('eventz-privacy');
      toast.success('Account deleted');
      handleOpenChange(false);
      window.dispatchEvent(new Event('profileUpdated'));
      window.location.assign('/events');
    } catch (error: any) { toast.error(error?.message || 'Failed to delete account'); }
    finally { setIsDeletingAccount(false); }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" hideDefaultClose className="w-[100vw] sm:w-[450px] p-0 overflow-y-auto bg-white border-l border-gray-100">
        <SheetTitle className="sr-only">Settings</SheetTitle>
        <SheetDescription className="sr-only">Manage your profile, privacy settings, and view help options.</SheetDescription>
        <div className="flex flex-col h-full bg-white">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-6 pb-4 pt-[calc(1rem+var(--eventz-safe-area-top))]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentView !== 'main' && currentView !== 'profile' && (
                  <button onClick={() => setCurrentView('main')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronRight className="w-6 h-6 text-gray-900 rotate-180" />
                  </button>
                )}
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {currentView === 'main' ? 'Settings' : currentView === 'profile' ? 'Edit Profile' : currentView === 'email' ? 'Email' : currentView === 'privacy' ? 'Privacy' : 'Help & Support'}
                </h2>
              </div>
              <SheetClose className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-900" />
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 p-6">
            {currentView === 'main' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {[
                    { icon: User, label: 'Edit Profile', desc: 'Update your personal information', view: 'profile' as const },
                    { icon: Mail, label: 'Email Preferences', desc: 'Choose what Eventz sends to your inbox', view: 'email' as const },
                    { icon: Shield, label: 'Privacy & Security', desc: 'Control your privacy settings', view: 'privacy' as const },
                    { icon: HelpCircle, label: 'Help & Support', desc: 'Get help with your account', view: 'help' as const },
                  ].map(({ icon: Icon, label, desc, view }) => (
                    <button key={view} onClick={() => setCurrentView(view)} className="w-full p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all group text-left">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-bold text-base">{label}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-center text-gray-400 text-xs font-medium">EVENTZ v1.0.0</p>
                </div>
              </div>
            )}

            {currentView === 'profile' && (
              <ProfileSettingsForm
                profileData={profileData}
                setProfileData={setProfileData}
                isCreatorProfile={isCreatorProfile}
                categorySearch={categorySearch}
                setCategorySearch={setCategorySearch}
                showCategoryDropdown={showCategoryDropdown}
                setShowCategoryDropdown={setShowCategoryDropdown}
                categoryRef={categoryRef}
                locationSuggestions={locationSuggestions}
                setLocationSuggestions={setLocationSuggestions}
                loadingLocations={loadingLocations}
                showLocationDropdown={showLocationDropdown}
                setShowLocationDropdown={setShowLocationDropdown}
                locationRef={locationRef}
                searchLocations={searchLocations}
                fileInputRef={fileInputRef}
                handleAvatarClick={handleAvatarClick}
                handleAvatarChange={handleAvatarChange}
                handleSaveProfile={handleSaveProfile}
              />
            )}

            {currentView === 'email' && (
              <EmailPreferencesView
                emailPreferences={emailPreferences}
                toggleEmailPreference={toggleEmailPreference}
                isSavingEmailPreferences={isSavingEmailPreferences}
                handleSaveEmailPreferences={handleSaveEmailPreferences}
              />
            )}

            {currentView === 'privacy' && (
              <PrivacySettingsView
                privacy={privacy}
                setPrivacy={setPrivacy}
                handleSavePrivacy={handleSavePrivacy}
                isDeletingAccount={isDeletingAccount}
                handleDeleteAccount={handleDeleteAccount}
              />
            )}

            {currentView === 'help' && <HelpSupportView />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}