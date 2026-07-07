import { Globe, Lock } from 'lucide-react';

interface OrganizerPrivacyTabProps {
  privacySettings: any;
  setPrivacySettings: (s: any) => void;
  handleSavePrivacy: () => void;
  onClose: () => void;
}

export function OrganizerPrivacyTab({
  privacySettings,
  setPrivacySettings,
  handleSavePrivacy,
  onClose,
}: OrganizerPrivacyTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-gray-900 font-medium mb-4">Profile Visibility</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPrivacySettings({ ...privacySettings, profileVisibility: 'public' })}
            className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
              privacySettings.profileVisibility === 'public'
                ? 'border-primary bg-purple-50 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="w-5 h-5 mx-auto mb-2" />
            Public
          </button>
          <button
            onClick={() => setPrivacySettings({ ...privacySettings, profileVisibility: 'private' })}
            className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
              privacySettings.profileVisibility === 'private'
                ? 'border-primary bg-purple-50 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lock className="w-5 h-5 mx-auto mb-2" />
            Private
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {([
          { key: 'showEmail', title: 'Show Email', desc: 'Display email on profile' },
          { key: 'showPhone', title: 'Show Phone', desc: 'Display phone number' },
          { key: 'allowMessages', title: 'Allow Messages', desc: 'Let users message you' },
          { key: 'showFollowers', title: 'Show Followers', desc: 'Display follower count' },
          { key: 'showStats', title: 'Show Statistics', desc: 'Display event stats' },
        ] as const).map((item) => {
          const isEnabled = privacySettings[item.key as keyof typeof privacySettings];
          return (
            <div key={item.key} className="p-5 flex items-center justify-between">
              <div>
                <h5 className="text-gray-900 font-medium text-sm">{item.title}</h5>
                <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setPrivacySettings({ ...privacySettings, [item.key]: !isEnabled })}
                className={`relative w-11 h-6 rounded-full ${isEnabled ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSavePrivacy} className="px-5 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
          Save Privacy Settings
        </button>
      </div>
    </div>
  );
}
