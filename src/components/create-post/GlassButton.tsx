import { useState } from 'react';
import { C } from './constants';

export function GlassButton({ icon, size = 44, onClick, label }: {
  icon: React.ReactNode; size?: number; onClick: () => void; label: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `1px solid ${C.hairline}`,
        background: hover ? C.glass2 : C.glass,
        color: C.ink, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        transition: 'background 0.15s ease, transform 0.15s ease',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {icon}
    </button>
  );
}
