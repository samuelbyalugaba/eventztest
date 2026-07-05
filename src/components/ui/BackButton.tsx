import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  fallbackPath?: string;
}

export function BackButton({ onClick, className, iconClassName, fallbackPath }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (location.key !== 'default') {
      navigate(-1);
    } else if (fallbackPath) {
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className ?? 'flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200'}
      aria-label="Back"
    >
      <ArrowLeft className={iconClassName ?? 'h-5 w-5'} />
    </button>
  );
}
