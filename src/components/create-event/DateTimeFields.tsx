import { Calendar, Clock } from 'lucide-react';
import { normalizeDateInput, normalizeTimeInput } from './createEventHelpers';

interface DateTimeFieldsProps {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function DateTimeFields({ date, time, onDateChange, onTimeChange }: DateTimeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0">
        <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Date</label>
        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(normalizeDateInput(e.target.value))}
            onBeforeInput={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (!['Tab', 'Shift', 'Enter', 'Escape', ' '].includes(e.key)) e.preventDefault();
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            className={`native-picker-field h-11 w-full min-w-0 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-0 pr-10 text-sm leading-[44px] outline-none transition ${date ? 'text-gray-900' : 'text-gray-500'}`}
            aria-label="Event date"
          />
          <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>
      <div className="min-w-0">
        <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Time</label>
        <div className="relative">
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(normalizeTimeInput(e.target.value))}
            onBeforeInput={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (!['Tab', 'Shift', 'Enter', 'Escape', ' '].includes(e.key)) e.preventDefault();
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            className={`native-picker-field h-11 w-full min-w-0 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-0 pr-10 text-sm leading-[44px] outline-none transition ${time ? 'text-gray-900' : 'text-gray-500'}`}
            aria-label="Event time"
          />
          <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>
    </div>
  );
}
