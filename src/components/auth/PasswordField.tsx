import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoComplete: string;
  placeholder: string;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  label: string;
  labelAction?: React.ReactNode;
}

export function PasswordField({
  id,
  value,
  onChange,
  disabled,
  autoComplete,
  placeholder,
  showPassword,
  onToggleShowPassword,
  label,
  labelAction,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-gray-800 block text-left">{label}</label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          value={value}
          onChange={onChange}
          className="block w-full h-11 pl-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShowPassword}
          className="absolute top-0 bottom-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
