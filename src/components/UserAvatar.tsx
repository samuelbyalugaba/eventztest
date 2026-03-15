import { useMemo, useState } from 'react';

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

  const renderAvatar = () => {
    const hasImage = src && src.trim() !== '' && src !== 'null';
    if (!hasImage || imageError) {
      const hasRoundedClass = className.includes('rounded-');
      return (
        <div 
          className={`flex items-center justify-center ${hasRoundedClass ? '' : 'rounded-full'} text-white font-medium ${bgColor} ${sizeClasses[size]} ${className}`}
          onClick={onClick}
        >
          {initials}
        </div>
      );
    }

    const hasRoundedClass = className.includes('rounded-');

    return (
      <div className={`relative overflow-hidden ${hasRoundedClass ? '' : 'rounded-full'} ${sizeClasses[size]} ${className}`} onClick={onClick}>
        <div className={`absolute inset-0 z-0 flex items-center justify-center ${hasRoundedClass ? '' : 'rounded-full'} ${bgColor}`} aria-hidden="true">
          <span className="text-white font-medium">{initials}</span>
        </div>
        <img 
          src={src} 
          alt={safeName || 'User'} 
          className={`relative z-10 ${hasRoundedClass ? '' : 'rounded-full'} object-cover object-top w-full h-full`}
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center ${className.includes('w-full') ? 'w-full' : ''} ${className.includes('h-full') ? 'h-full' : ''}`}>
      {renderAvatar()}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
          <div className="bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
