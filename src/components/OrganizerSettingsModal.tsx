import { X, User, CreditCard, Lock, Video, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getProfile, updateProfile } from '../utils/supabase/api';
import { isSafeUrl } from '../utils/sanitize';
import { CREATOR_CATEGORIES } from '../utils/categories';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PRIVACY_SETTINGS, mapOrganizerProfileToSettingsForm, uploadProfileAvatar, validateProfileImageFile } from './settings/profileSettingsShared';
import { dispatchProfileUpdated } from '../utils/profileUpdates';
import { OrganizerProfileTab } from './organizer-settings/OrganizerProfileTab';
import { OrganizerStreamingTab } from './organizer-settings/OrganizerStreamingTab';
import { OrganizerPaymentsTab } from './organizer-settings/OrganizerPaymentsTab';
import { OrganizerPrivacyTab } from './organizer-settings/OrganizerPrivacyTab';
import { OrganizerAccountTab } from './organizer-settings/OrganizerAccountTab';

interface OrganizerSettingsModalProps { onClose: () => void }

export function OrganizerSettingsModal({ onClose }: OrganizerSettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'streaming' | 'payments' | 'privacy' | 'account'>('profile');

  const [profileData, setProfileData] = useState({ username: '', organizerName: '', organizerType: '', venueSubType: '', email: '', phone: '', location: '', bio: '', website: '', avatarUrl: '', birthdate: '' });
  const [streamingSettings, setStreamingSettings] = useState({ defaultQuality: '1080p', autoRecord: true, chatEnabled: true, reactionsEnabled: true, multiCamera: false, lowLatency: true });
  const [privacySettings, setPrivacySettings] = useState({ ...DEFAULT_PRIVACY_SETTINGS, showFollowers: true, showStats: true });
  const [paymentData, setPaymentData] = useState({ bankName: '', accountNumber: '', accountName: '', mobileMoney: '', paymentMethod: 'bank' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredCategories = CREATOR_CATEGORIES.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.length) return;
      const file = event.target.files[0];
      const validationError = validateProfileImageFile(file);
      if (validationError) { toast.error(validationError); return; }
      if (!user) return;
      const publicUrl = await uploadProfileAvatar({ file, userId: user.id, scope: 'organizers' });
      setProfileData({ ...profileData, avatarUrl: publicUrl });
      try {
        await updateProfile(user.id, { avatar_url: publicUrl });
        await refreshProfile();
        toast.success('Profile photo updated successfully');
        dispatchProfileUpdated({ userId: user.id, fields: ['avatar_url'], avatar_url: publicUrl });
      } catch { toast.success('Photo uploaded. Please click Save to finish setup.'); }
    } catch (error: any) { toast.error(error.message || 'Error uploading avatar'); }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!user) return;
        const currentProfile = profile || await getProfile(user.id);
        if (!currentProfile) return;
        setProfileData(mapOrganizerProfileToSettingsForm(currentProfile, user.email || ''));
        setCategorySearch(currentProfile.organizer_type || '');
        if (currentProfile.streaming_settings) setStreamingSettings(currentProfile.streaming_settings);
        if (currentProfile.privacy_settings) setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...currentProfile.privacy_settings });
        if (currentProfile.payment_settings) setPaymentData(currentProfile.payment_settings);
      } catch { toast.error('Failed to load profile settings'); }
    };
    fetchProfile();
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (profileData.website && !isSafeUrl(profileData.website)) { toast.error('Please enter a valid website URL (starting with http:// or https://)'); return; }
    if (profileData.avatarUrl && !isSafeUrl(profileData.avatarUrl)) { toast.error('Invalid avatar URL'); return; }
    try {
      await updateProfile(user.id, {
        full_name: profileData.organizerName, organizer_type: profileData.organizerType, avatar_url: profileData.avatarUrl,
        bio: profileData.bio, location: profileData.location.trim(), website: profileData.website,
        contact_email: profileData.email, phone: profileData.phone, birthdate: profileData.birthdate, is_organizer: true,
      });
      await refreshProfile();
      toast.success('Profile updated successfully');
      dispatchProfileUpdated({
        userId: user.id, fields: ['full_name', 'organizer_type', 'avatar_url', 'bio', 'location', 'website', 'contact_email', 'phone', 'birthdate'],
        avatar_url: profileData.avatarUrl || null,
      });
    } catch (error: any) { toast.error(`Failed to update profile: ${error.message || 'Failed to update profile'}`); }
  };

  const handleSaveStreaming = async () => {
    if (!user) return;
    try { await updateProfile(user.id, { streaming_settings: streamingSettings }); await refreshProfile(); toast.success('Streaming settings updated'); }
    catch { toast.error('Failed to save streaming settings'); }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    try { await updateProfile(user.id, { privacy_settings: privacySettings }); await refreshProfile(); toast.success('Privacy settings updated'); }
    catch { toast.error('Failed to save privacy settings'); }
  };

  const handleSavePayment = async () => {
    if (paymentData.paymentMethod === 'bank' && (!paymentData.bankName || !paymentData.accountNumber || !paymentData.accountName)) { toast.error('Please fill in all bank details'); return; }
    if (paymentData.paymentMethod === 'mobile' && !paymentData.mobileMoney) { toast.error('Please enter your mobile money number'); return; }
    if (!user) return;
    try { await updateProfile(user.id, { payment_settings: paymentData }); await refreshProfile(); toast.success('Payment information saved securely'); }
    catch { toast.error('Failed to save payment information'); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'streaming', label: 'Streaming', icon: Video },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: Lock },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 text-xl font-semibold">Settings</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <Icon className="w-4 h-4" /><span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-3xl mx-auto">
            {activeTab === 'profile' && (
              <OrganizerProfileTab profileData={profileData} setProfileData={setProfileData}
                categorySearch={categorySearch} setCategorySearch={setCategorySearch}
                showCategoryDropdown={showCategoryDropdown} setShowCategoryDropdown={setShowCategoryDropdown}
                filteredCategories={filteredCategories} categoryRef={categoryRef}
                handleAvatarClick={handleAvatarClick} handleAvatarChange={handleAvatarChange}
                fileInputRef={fileInputRef} handleSaveProfile={handleSaveProfile} onClose={onClose}
              />
            )}
            {activeTab === 'streaming' && (
              <OrganizerStreamingTab streamingSettings={streamingSettings} setStreamingSettings={setStreamingSettings}
                handleSaveStreaming={handleSaveStreaming} onClose={onClose}
              />
            )}
            {activeTab === 'payments' && (
              <OrganizerPaymentsTab paymentData={paymentData} setPaymentData={setPaymentData}
                handleSavePayment={handleSavePayment} onClose={onClose}
              />
            )}
            {activeTab === 'privacy' && (
              <OrganizerPrivacyTab privacySettings={privacySettings} setPrivacySettings={setPrivacySettings}
                handleSavePrivacy={handleSavePrivacy} onClose={onClose}
              />
            )}
            {activeTab === 'account' && <OrganizerAccountTab onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}
