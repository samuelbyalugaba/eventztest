import { Shield, Check, Save } from 'lucide-react';
import { DeleteAccountSection } from './DeleteAccountSection';

interface PrivacySettings {
  profileVisibility: string;
  showEmail: boolean;
  showPhone: boolean;
  allowMessages: boolean;
  showActivity: boolean;
}

interface PrivacySettingsViewProps {
  privacy: PrivacySettings;
  setPrivacy: React.Dispatch<React.SetStateAction<PrivacySettings>>;
  handleSavePrivacy: () => Promise<void>;
  isDeletingAccount: boolean;
  handleDeleteAccount: () => void;
}

export function PrivacySettingsView({
  privacy,
  setPrivacy,
  handleSavePrivacy,
  isDeletingAccount,
  handleDeleteAccount,
}: PrivacySettingsViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-gray-900 font-medium mb-1">Privacy Controls</p>
            <p className="text-gray-600 text-sm">Manage who can see your information and how you interact with others</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-900 font-medium text-sm mb-3">Profile Visibility</p>
          <div className="space-y-2">
            {['public', 'friends', 'private'].map((option) => (
              <button
                key={option}
                onClick={() => setPrivacy({ ...privacy, profileVisibility: option })}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  privacy.profileVisibility === option
                    ? 'border-primary bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 text-sm font-medium capitalize">{option}</span>
                  {privacy.profileVisibility === option && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm mb-1">Show Email on Profile</p>
              <p className="text-gray-500 text-xs">Let others see your email address</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, showEmail: !privacy.showEmail })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                privacy.showEmail ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                privacy.showEmail ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm mb-1">Show Phone on Profile</p>
              <p className="text-gray-500 text-xs">Let others see your phone number</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, showPhone: !privacy.showPhone })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                privacy.showPhone ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                privacy.showPhone ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm mb-1">Allow Direct Messages</p>
              <p className="text-gray-500 text-xs">Anyone can send you messages</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, allowMessages: !privacy.allowMessages })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                privacy.allowMessages ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                privacy.allowMessages ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm mb-1">Show Activity Status</p>
              <p className="text-gray-500 text-xs">Let others see when you're active</p>
            </div>
            <button
              onClick={() => setPrivacy({ ...privacy, showActivity: !privacy.showActivity })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                privacy.showActivity ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                privacy.showActivity ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      <DeleteAccountSection
        isDeletingAccount={isDeletingAccount}
        handleDeleteAccount={handleDeleteAccount}
      />

      <button
        onClick={handleSavePrivacy}
        className="w-full bg-gradient-to-r from-primary to-[#5B21B6] text-white py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 font-medium"
      >
        <Save className="w-5 h-5" />
        Save Settings
      </button>
    </div>
  );
}
