import { MapPin } from 'lucide-react';

interface LocationFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationField({ value, onChange }: LocationFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Venue / Location</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Mlimani City Hall, Dar es Salaam"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none transition"
        />
      </div>
    </div>
  );
}
