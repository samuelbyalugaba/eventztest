import { Loader2 } from 'lucide-react';
import appleIcon from '../../assets/apple-icon.png';

interface OAuthButtonsProps {
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  isOAuthSubmitting: boolean;
  isGoogleSubmitting: boolean;
  isAppleSubmitting: boolean;
  isSubmitting?: boolean;
  isConfigured: boolean;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.658 29.264 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.027 12 24 12c3.059 0 5.842 1.154 7.964 3.036l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.354 4.327-17.694 10.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.243 0-9.623-3.319-11.273-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.215-2.262 4.087-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z" />
    </svg>
  );
}

export function OAuthButtons({
  onGoogleSignIn,
  onAppleSignIn,
  isOAuthSubmitting,
  isGoogleSubmitting,
  isAppleSubmitting,
  isSubmitting = false,
  isConfigured,
}: OAuthButtonsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onAppleSignIn}
        disabled={isOAuthSubmitting || isSubmitting || !isConfigured}
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-2 text-center text-sm font-semibold leading-tight text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAppleSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <img src={appleIcon} alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 object-contain brightness-0" />
        )}
        <span className="min-w-0 truncate">Apple</span>
      </button>
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isOAuthSubmitting || isSubmitting || !isConfigured}
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-2 text-center text-sm font-semibold leading-tight text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGoogleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        <span className="min-w-0 truncate">Google</span>
      </button>
    </div>
  );
}
