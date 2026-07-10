interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DescriptionField({ value, onChange }: DescriptionFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Description</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell guests what to expect..."
        rows={4}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition"
      />
    </div>
  );
}
