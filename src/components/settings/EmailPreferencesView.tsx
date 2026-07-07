import { Mail, Save, Loader2 } from 'lucide-react';
import type { EmailPreferenceUpdate } from '../../utils/email';

interface EmailPreferencesViewProps {
  emailPreferences: Record<string, boolean>;
  toggleEmailPreference: (key: keyof EmailPreferenceUpdate) => void;
  isSavingEmailPreferences: boolean;
  handleSaveEmailPreferences: () => Promise<void>;
}

export function EmailPreferencesView({
  emailPreferences,
  toggleEmailPreference,
  isSavingEmailPreferences,
  handleSaveEmailPreferences,
}: EmailPreferencesViewProps) {
  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-purple-600" />
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-900">Inbox controls</p>
            <p className="text-sm leading-5 text-gray-600">Account security, email verification, password reset, and ticket emails are always sent when needed.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          {
            key: 'product_updates' as const,
            title: 'Product updates',
            desc: 'New features, release notes, and platform changes.',
          },
          {
            key: 'event_reminders' as const,
            title: 'Event reminders',
            desc: 'Upcoming event and live stream reminders.',
          },
          {
            key: 'social_notifications' as const,
            title: 'Social notifications',
            desc: 'Likes, comments, follows, and community activity.',
          },
          {
            key: 'marketing' as const,
            title: 'Marketing emails',
            desc: 'Promotions, highlights, and occasional recommendations.',
          },
        ].map((item) => (
          <div key={item.key} className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-purple-200">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs leading-5 text-gray-500">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleEmailPreference(item.key)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  emailPreferences[item.key] ? 'bg-primary' : 'bg-gray-300'
                }`}
                aria-pressed={emailPreferences[item.key]}
                aria-label={`Toggle ${item.title}`}
              >
                <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  emailPreferences[item.key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveEmailPreferences}
        disabled={isSavingEmailPreferences}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
      >
        {isSavingEmailPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>Save Email Preferences</span>
      </button>
    </div>
  );
}
