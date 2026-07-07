import authLogoBlack from '../../assets/auth-logo-black.png';

interface AuthHeaderProps {
  isLogin: boolean;
}

export function AuthHeader({ isLogin }: AuthHeaderProps) {
  return (
    <div className="mb-6 min-h-[7.25rem] text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-visible">
        <img
          src={authLogoBlack}
          alt="Eventz"
          className="h-12 w-12 scale-[1.55] object-contain"
        />
      </div>
      <div className="mt-3 text-2xl font-semibold text-gray-900">
        {isLogin ? 'Sign in' : 'Join Eventz'}
      </div>
      <div className="mt-1 text-sm text-gray-600">
        Discover Events. Live Stream. Get Tickets
      </div>
    </div>
  );
}
