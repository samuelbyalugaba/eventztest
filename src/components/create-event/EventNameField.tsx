interface EventNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventNameField({ value, onChange }: EventNameFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Event name</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Nairobi Jazz Night"
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition"
      />
    </div>
  );
}
