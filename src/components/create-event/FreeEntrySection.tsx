import { Check, Info, Plus } from 'lucide-react';

interface FreeEntrySectionProps {
  expectedGuests: number;
  requireRegistration: boolean;
  freePerks: string[];
  freePerkDraft: string;
  onExpectedGuestsChange: (value: number) => void;
  onRequireRegistrationChange: (value: boolean) => void;
  onTogglePerk: (perk: string) => void;
  onPerkDraftChange: (value: string) => void;
  onAddPerk: () => void;
  onPerkDraftKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const FREE_PERK_OPTIONS = ['Free entry', 'Refreshments', 'Networking', 'Certificate'];

export function FreeEntrySection({
  expectedGuests,
  requireRegistration,
  freePerks,
  freePerkDraft,
  onExpectedGuestsChange,
  onRequireRegistrationChange,
  onTogglePerk,
  onPerkDraftChange,
  onAddPerk,
  onPerkDraftKeyDown,
}: FreeEntrySectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
        <div>
          <p className="text-sm font-semibold">Expected guests</p>
          <p className="mt-0.5 text-xs text-gray-500">Approximate number attending</p>
        </div>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={expectedGuests > 0 ? expectedGuests : ''}
          onChange={(e) => onExpectedGuestsChange(Math.max(0, Number(e.target.value) || 0))}
          placeholder="0"
          className="h-10 w-24 rounded-lg border border-gray-200 bg-gray-50 px-3 text-center text-sm outline-none focus:border-gray-400"
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
        <div>
          <p className="text-sm font-semibold">Require registration</p>
          <p className="mt-0.5 text-xs text-gray-500">Guests confirm their spot in advance</p>
        </div>
        <button
          type="button"
          onClick={() => onRequireRegistrationChange(!requireRegistration)}
          className={`eventz-switch transition ${requireRegistration ? 'bg-purple-600' : 'bg-gray-200'}`}
          aria-pressed={requireRegistration}
          aria-label="Toggle registration requirement"
        >
          <span className={`eventz-switch-thumb ${requireRegistration ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="pt-3">
        <label className="mb-2 block text-2xs font-bold uppercase tracking-wide text-gray-500">What's included</label>
        <div className="flex flex-wrap gap-2">
          {FREE_PERK_OPTIONS.map((perk) => {
            const active = freePerks.includes(perk);
            return (
              <button
                key={perk}
                type="button"
                onClick={() => onTogglePerk(perk)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium ${
                  active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                {active && <Check className="h-3 w-3" />}
                {perk}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={freePerkDraft}
            onChange={(e) => onPerkDraftChange(e.target.value)}
            onKeyDown={onPerkDraftKeyDown}
            placeholder="Custom inclusion"
            className="h-9 min-w-0 flex-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs outline-none focus:border-gray-400"
          />
          <button
            type="button"
            onClick={onAddPerk}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-purple-300 text-purple-600"
            aria-label="Add custom inclusion"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-purple-50 p-3 text-xs leading-5 text-purple-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
        <p>Guests receive a free EVENTZ confirmation. Payment is skipped, and registration can stay optional.</p>
      </div>
    </div>
  );
}
