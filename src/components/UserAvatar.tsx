import { useMemo, useState } from 'react';
import { getOptimizedImageUrl } from '../utils/supabaseImage';
import verifiedBadge from '../assets/verified-badge.png';
interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  verified?: boolean;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function UserAvatar({ src, name, size = 'md', verified, className = '', onClick }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const safeName = name || '';

  const sizeClasses = {
    'xs': 'w-6 h-6 text-[10px]',
    'sm': 'w-8 h-8 text-[12px]',
    'md': 'w-10 h-10 text-[14px]',
    'lg': 'w-12 h-12 text-[16px]',
    'xl': 'w-14 h-14 text-[18px]',
    '2xl': 'w-16 h-16 text-[20px]',
    '3xl': 'w-20 h-20 text-[24px]',
  };

  const sizePx: Record<string, number> = {
    'xs': 24, 'sm': 32, 'md': 40, 'lg': 48, 'xl': 56, '2xl': 64, '3xl': 80,
  };

  const optimizedSrc = useMemo(() => {
    if (!src || src.trim() === '' || src === 'null') return src;
    return getOptimizedImageUrl(src, { width: sizePx[size] || 40, quality: 80 });
  }, [src, size]);

  const initials = useMemo(() => {
    if (!safeName) return '';
    return safeName
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [safeName]);

  const bgColor = useMemo(() => {
    if (!safeName) return 'bg-gray-200';
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [safeName]);

  // Always use circle shape for avatars
  const shapeClass = 'rounded-full';

  const renderAvatar = () => {
    const hasImage = src && src.trim() !== '' && src !== 'null';
    if (!hasImage || imageError) {
      return (
        <div 
          className={`flex items-center justify-center ${shapeClass} text-white font-medium ${bgColor} ${sizeClasses[size]} ${className}`}
          onClick={onClick}
        >
          {initials}
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden ${shapeClass} ${sizeClasses[size]} ${className}`} onClick={onClick}>
        <div className={`absolute inset-0 z-0 flex items-center justify-center ${shapeClass} ${bgColor}`} aria-hidden="true">
          <span className="text-white font-medium">{initials}</span>
        </div>
        <img 
          src={optimizedSrc || src} 
          alt={safeName || 'User'} 
          className={`relative z-10 ${shapeClass} object-cover object-top w-full h-full`}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center ${className.includes('w-full') ? 'w-full' : ''} ${className.includes('h-full') ? 'h-full' : ''}`}>
      {renderAvatar()}
      {verified && (
        <img
          src={verifiedBadge}
          alt="Verified"
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 drop-shadow-sm pointer-events-none select-none"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
