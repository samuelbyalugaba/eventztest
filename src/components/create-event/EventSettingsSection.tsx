import { Phone, Settings } from 'lucide-react';
import { formatMoney } from './createEventHelpers';

interface EventSettings {
  liveStream: boolean;
  virtualTickets: boolean;
  externalTicketing: boolean;
  idVerification: boolean;
}

interface EventSettingsSectionProps {
  settings: EventSettings;
  currency: string;
  externalTicketingPhone: string;
  streaming: {
    virtualPrice: string;
    virtualPriceNumeric: number;
    quality: 'HD' | '4K' | 'SD';
  };
  onSettingChange: (field: keyof EventSettings, value: boolean) => void;
  onExternalTicketingPhoneChange: (value: string) => void;
  onVirtualPriceChange: (amount: number) => void;
}

const SETTING_ITEMS: { key: keyof EventSettings; label: string; sub: string }[] = [
  { key: 'liveStream', label: 'Live stream', sub: 'Broadcast this event on EVENTZ' },
  { key: 'virtualTickets', label: 'Virtual tickets', sub: 'Sell online access globally' },
  { key: 'externalTicketing', label: 'Use external ticketing', sub: 'Display price only - buyers will contact you for ticketing' },
  { key: 'idVerification', label: 'ID verification', sub: 'Require ID at entry' },
];

export function EventSettingsSection({
  settings,
  currency,
  externalTicketingPhone,
  streaming,
  onSettingChange,
  onExternalTicketingPhoneChange,
  onVirtualPriceChange,
}: EventSettingsSectionProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        <Settings className="h-4 w-4 text-purple-600" />
        Event settings
      </div>
      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-3 shadow-sm">
        {SETTING_ITEMS.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{setting.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{setting.sub}</p>
            </div>
            <button
              type="button"
              onClick={() => onSettingChange(setting.key, !settings[setting.key])}
              className={`eventz-switch shrink-0 transition ${settings[setting.key] ? 'bg-purple-600' : 'bg-gray-200'}`}
              aria-pressed={settings[setting.key]}
              aria-label={`Toggle ${setting.label}`}
            >
              <span className={`eventz-switch-thumb ${settings[setting.key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>

      {settings.virtualTickets && (
        <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 p-3">
          <label className="mb-2 block text-2xs font-bold uppercase tracking-wide text-purple-700">Virtual ticket price ({currency})</label>
          <input
            type="number"
            min="0"
            value={Number.isNaN(streaming.virtualPriceNumeric) ? '' : streaming.virtualPriceNumeric}
            onChange={(e) => {
              const amount = Math.max(0, Number(e.target.value) || 0);
              onVirtualPriceChange(amount);
            }}
            className="h-10 w-full rounded-xl border border-purple-100 bg-white px-3 text-sm outline-none focus:border-gray-400"
          />
        </div>
      )}

      {settings.externalTicketing && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <label className="mb-2 block text-2xs font-bold uppercase tracking-wide text-gray-500">Ticketing contact phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={externalTicketingPhone}
              onChange={(e) => onExternalTicketingPhoneChange(e.target.value)}
              placeholder="+255 7XX XXX XXX"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
