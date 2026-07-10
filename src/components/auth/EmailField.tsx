interface EmailFieldProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label: string;
}

export function EmailField({ id, value, onChange, disabled, label }: EmailFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-800 block text-left">{label}</label>
      <input
        id={id}
        name="email"
        type="email"
        required
        value={value}
        onChange={onChange}
        className="block w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none"
        placeholder="Email"
        disabled={disabled}
        autoComplete="email"
        inputMode="email"
      />
    </div>
  );
}
