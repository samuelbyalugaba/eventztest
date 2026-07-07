import { Ticket, Users } from 'lucide-react';
import { createCurrencies } from './createEventHelpers';

type TicketMode = 'tiers' | 'free';

interface TicketModeBarProps {
  ticketMode: TicketMode;
  currency: string;
  onModeChange: (mode: TicketMode) => void;
  onCurrencyChange: (currency: string) => void;
}

export function TicketModeBar({ ticketMode, currency, onModeChange, onCurrencyChange }: TicketModeBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex rounded-full border border-gray-200 bg-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => onModeChange('tiers')}
          className={`create-ticket-mode-button inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition ${
            ticketMode === 'tiers' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          <Ticket className="h-3 w-3" />
          Ticket tiers
        </button>
        <button
          type="button"
          onClick={() => onModeChange('free')}
          className={`create-ticket-mode-button inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition ${
            ticketMode === 'free' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'
          }`}
        >
          <Users className="h-3 w-3" />
          Free entry
        </button>
      </div>

      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="create-currency-select h-7 max-w-[88px] rounded-full border border-gray-200 bg-gray-100 px-2.5 text-xs font-semibold text-gray-700 outline-none focus:border-gray-400"
        aria-label="Currency"
      >
        {createCurrencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}
