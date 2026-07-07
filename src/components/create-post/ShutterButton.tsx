import { useRef } from 'react';
import { C, GRADIENT, GRADIENT_FALLBACK, LONG_PRESS_MS } from './constants';

export function ShutterButton({ isRecording, onTap, onStartRecording, onStopRecording }: {
  isRecording: boolean;
  onTap: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = () => {
    if (isRecording) {
      onStopRecording();
      return;
    }
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onStartRecording();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!isLongPress.current && !isRecording) {
      onTap();
    }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (pressTimer.current) {
          clearTimeout(pressTimer.current);
          pressTimer.current = null;
        }
      }}
      aria-label={isRecording ? 'Stop recording' : 'Take photo'}
      style={{
        position: 'relative', width: 80, height: 80,
        borderRadius: '50%', border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
      }}
    >
      {isRecording ? (
        <>
          <span style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: '3px solid #FF3B30', opacity: 0.6,
          }} />
          <span style={{
            position: 'relative', width: 32, height: 32, borderRadius: 6,
            background: '#FF3B30',
          }} />
        </>
      ) : (
        <>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: GRADIENT_FALLBACK,
            backgroundImage: GRADIENT, filter: 'blur(15px)', opacity: 0.65,
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: GRADIENT_FALLBACK,
            backgroundImage: GRADIENT, padding: 4,
          }}>
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: C.void }} />
          </span>
          <span style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', backgroundColor: GRADIENT_FALLBACK, backgroundImage: GRADIENT }} />
        </>
      )}
    </button>
  );
}
