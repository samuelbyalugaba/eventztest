import { X, Settings, SwitchCamera, Video, VideoOff, Mic, MicOff, Radio } from 'lucide-react';

interface StreamSetupPanelProps {
  cameraEnabled: boolean;
  micEnabled: boolean;
  isClientReady: boolean;
  isStarting: boolean;
  countdown: number;
  streamTitle: string;
  streamCategory: string;
  visibility: 'public' | 'ticket' | 'followers';
  onToggleCamera: () => void;
  onToggleCameraDevice: () => void;
  onToggleMic: () => void;
  onGoLive: () => void;
  onRequestClose: () => void;
  onOpenSettings: () => void;
  onStreamTitleChange: (title: string) => void;
}

const setupIconButtonClass =
  'inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 p-0 text-white backdrop-blur-xl transition-transform active:scale-90';

const studioControlButtonClass =
  'inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-2xl border border-white/10 p-0 backdrop-blur-xl transition-all active:scale-90';

export function StreamSetupPanel({
  cameraEnabled,
  micEnabled,
  isClientReady,
  isStarting,
  countdown,
  streamTitle,
  streamCategory,
  visibility,
  onToggleCamera,
  onToggleCameraDevice,
  onToggleMic,
  onGoLive,
  onRequestClose,
  onOpenSettings,
  onStreamTitleChange,
}: StreamSetupPanelProps) {
  return (
    <div className="fixed inset-0 bg-black z-[80] overflow-hidden">
      {/* Camera preview */}
      <div className="absolute inset-0">
        <div id="local-player" className={`w-full h-full ${!cameraEnabled ? 'hidden' : ''}`} />
        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center text-white/50">
              <VideoOff className="w-16 h-16 mb-3" />
              <span className="text-sm">Camera is off</span>
            </div>
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pb-4 pt-[calc(3rem+var(--eventz-safe-area-top))]">
        <div className="flex items-center justify-between">
          <button onClick={onRequestClose} className={setupIconButtonClass}>
            <X className="w-5 h-5" />
          </button>
          <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
            <span className="text-white text-sm font-bold">Studio</span>
          </div>
          <button onClick={onOpenSettings} className={setupIconButtonClass}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center controls */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <button onClick={onToggleCameraDevice} className={`${studioControlButtonClass} bg-white/10 text-white`} aria-label="Switch camera">
            <SwitchCamera className="w-6 h-6" />
          </button>
          <button onClick={onToggleCamera} className={`${studioControlButtonClass} ${cameraEnabled ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
            {cameraEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          <button onClick={onToggleMic} className={`${studioControlButtonClass} ${micEnabled ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
            {micEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Bottom: Stream info & Go Live */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-[calc(2rem+var(--eventz-safe-area-bottom))]">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mb-4">
          <input
            value={streamTitle}
            onChange={(e) => onStreamTitleChange(e.target.value)}
            placeholder="Stream title..."
            className="w-full bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/30 mb-2"
          />
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs px-2 py-1 rounded-lg bg-white/5">{streamCategory}</span>
            <span className="text-white/50 text-xs px-2 py-1 rounded-lg bg-white/5 capitalize">{visibility}</span>
          </div>
        </div>

        <button
          onClick={onGoLive}
          disabled={isStarting || !isClientReady}
          className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-base shadow-2xl shadow-red-600/30 hover:shadow-red-600/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Radio className="w-5 h-5" />
          {!isClientReady ? 'Preparing studio...' : isStarting ? `Going live in ${countdown}...` : 'Go Live'}
        </button>
      </div>
    </div>
  );
}
