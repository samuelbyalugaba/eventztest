import {
  User,
  Camera,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '../UserAvatar';
import { supabase } from '../../utils/supabase/api';

interface OrganizerProfileTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  categorySearch: string;
  setCategorySearch: (s: string) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (v: boolean) => void;
  filteredCategories: string[];
  categoryRef: React.RefObject<HTMLDivElement>;
  handleAvatarClick: () => void;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSaveProfile: () => void;
  onClose: () => void;
}

export function OrganizerProfileTab({
  profileData,
  setProfileData,
  categorySearch,
  setCategorySearch,
  showCategoryDropdown,
  setShowCategoryDropdown,
  filteredCategories,
  categoryRef,
  handleAvatarClick,
  handleAvatarChange,
  fileInputRef,
  handleSaveProfile,
  onClose,
}: OrganizerProfileTabProps) {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col items-center mb-10">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-xl shadow-purple-100 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
            <UserAvatar
              src={profileData.avatarUrl}
              name={profileData.organizerName || 'Organizer'}
              className="w-full h-full"
            />
          </div>
          <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-4 border-white transform transition-transform group-hover:scale-110">
            <Camera className="w-4 h-4" />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500">Tap to upload photo</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900 ml-1">Organizer Name</label>
          <div className="relative">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profileData.organizerName}
              onChange={(e) => setProfileData({ ...profileData, organizerName: e.target.value })}
              className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-gray-400/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="space-y-2" ref={categoryRef}>
          <label className="text-sm font-semibold text-gray-900 ml-1">Category</label>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => {
                setCategorySearch(e.target.value);
                setShowCategoryDropdown(true);
                if (profileData.organizerType && e.target.value !== profileData.organizerType) {
                  setProfileData((prev: any) => ({ ...prev, organizerType: '' }));
                }
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              placeholder="Select category"
              className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-100 focus:border-gray-400/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
            />
            <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />

            {showCategoryDropdown && (
              <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide py-2 animate-in fade-in zoom-in duration-200">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setProfileData((prev: any) => ({ ...prev, organizerType: c }));
                        setCategorySearch(c);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3.5 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${profileData.organizerType === c ? 'text-primary font-bold bg-purple-50/50' : 'text-gray-600 font-medium'}`}
                    >
                      {c}
                      {profileData.organizerType === c && <Check className="w-4 h-4" />}
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-4 text-sm text-gray-400 text-center italic">No categories found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                placeholder="City, Country"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Website</label>
            <div className="relative">
              <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-gray-400/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 ml-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-100 focus:border-gray-400/20 focus:bg-white rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm"
                placeholder="+255 XXX XXX XXX"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900 ml-1">Date of Birth</label>
          <div className="flex items-center gap-3 w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 font-medium outline-none transition-all shadow-sm focus-within:border-gray-400/20 focus-within:bg-white">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={profileData.birthdate}
              onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-gray-900 font-medium outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900 ml-1">Bio</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            placeholder="Tell your story..."
            rows={4}
            maxLength={500}
            className="w-full px-5 py-4 bg-white border-2 border-gray-100 focus:border-gray-400/20 focus:bg-white rounded-2xl text-gray-900 placeholder-gray-400 font-medium outline-none transition-all resize-none shadow-sm"
          />
          <p className="text-gray-500 text-xs mt-2 text-right">{profileData.bio.length}/500</p>
        </div>
      </div>

      <div className="pt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveProfile}
          className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-all flex items-center gap-2 shadow-sm active:scale-95"
        >
          <span>Save Changes</span>
        </button>
      </div>

      <div className="border-t border-gray-200 pt-10 mt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-red-50/50 rounded-3xl p-6 border border-red-100">
          <div>
            <h5 className="text-gray-900 font-bold text-lg">Switch to Personal Account</h5>
            <p className="text-gray-500 text-sm mt-1 max-w-sm leading-relaxed">
              Downgrading removes organizer features. Your events will remain but you won't be able to manage them.
            </p>
          </div>
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to downgrade to a personal account? This will hide your organizer profile and you will lose access to organizer features.')) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { error } = await supabase.rpc('downgrade_to_personal_account');
                    if (error) throw error;
                    toast.success('Account downgraded successfully');
                    window.location.reload();
                  }
                } catch (error: any) {
                  if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
                    toast.error('Session expired. Please sign in again.');
                    await supabase.auth.signOut();
                    window.location.reload();
                    return;
                  }
                  toast.error(`Failed to downgrade account: ${error?.message || 'Unknown error'}`);
                }
              }
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all shadow-sm whitespace-nowrap"
          >
            Downgrade Account
          </button>
        </div>
      </div>
    </div>
  );
}
