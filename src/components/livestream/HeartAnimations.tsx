import { Heart } from 'lucide-react';
import { type FloatingHeart } from './types';

interface HeartAnimationsProps {
  hearts: FloatingHeart[];
}

const HEART_COLORS = [
  '#FF6B6B', '#FF6EB4', '#FF69B4', '#FF1493',
  '#FFD700', '#FF4500', '#8A2BE2', '#00D4FF',
];

export function generateHeart(): FloatingHeart {
  return {
    id: Date.now() + Math.random(),
    x: 70 + Math.random() * 25, // right side, 70-95%
    size: 14 + Math.random() * 12,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    delay: Math.random() * 0.3,
  };
}

export function HeartAnimations({ hearts }: HeartAnimationsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute animate-[heartFloat_1.8s_ease-out_forwards]"
          style={{
            bottom: '15%',
            left: `${heart.x}%`,
            animationDelay: `${heart.delay}s`,
          }}
        >
          <Heart
            className="drop-shadow-lg"
            style={{
              width: heart.size,
              height: heart.size,
              color: heart.color,
              fill: heart.color,
            }}
          />
        </div>
      ))}
    </div>
  );
}
