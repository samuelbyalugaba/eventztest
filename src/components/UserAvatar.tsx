import { useState, useMemo } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function UserAvatar({ src, name, className = '', onClick }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  const bgColor = useMemo(() => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [name]);

  if (!src || imageError) {
    const hasRoundedClass = className.includes('rounded-');
    return (
      <div 
        className={`flex items-center justify-center ${hasRoundedClass ? '' : 'rounded-full'} text-white font-medium ${bgColor} ${className}`}
        onClick={onClick}
      >
        {initials}
      </div>
    );
  }

  const hasRoundedClass = className.includes('rounded-');

  return (
    <img 
      src={src} 
      alt={name} 
      className={`${hasRoundedClass ? '' : 'rounded-full'} object-cover ${className}`}
      onError={() => setImageError(true)}
      onClick={onClick}
    />
  );
}
