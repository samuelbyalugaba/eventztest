import { X, Copy, Eye, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';

interface StreamSettingsModalProps {
  showSettings: boolean;
  onClose: () => void;
  activeSettingsTab: 'settings' | 'monetization' | 'analytics';
  onTabChange: (tab: 'settings' | 'monetization' | 'analytics') => void;
  streamMethod: 'webcam' | 'obs';
  onStreamMethodChange: (method: 'webcam' | 'obs') => void;
  streamTitle: string;
  onStreamTitleChange: (title: string) => void;
  streamCategory: string;
  onStreamCategoryChange: (category: string) => void;
  visibility: 'public' | 'ticket' | 'followers';
  onVisibilityChange: (v: 'public' | 'ticket' | 'followers') => void;
  monetizationEnabled: boolean;
  onMonetizationChange: (v: boolean) => void;
  virtualPrice: string | number | null;
  rtmpUrl: string;
  streamKey: string;
  showKey: boolean;
  onToggleShowKey: () => void;
  onCopy: (text: string, label: string) => void;
  isLoadingAnalytics: boolean;
  viewerCount: number;
  peakViewersRef: React.MutableRefObject<number>;
  likes: number;
  totalRevenue: number;
  children?: ReactNode;
}

export function StreamSettingsModal({
  showSettings,
  onClose,
  activeSettingsTab,
  onTabChange,
  streamMethod,
  onStreamMethodChange,
  streamTitle,
  onStreamTitleChange,
  streamCategory,
  onStreamCategoryChange,
  visibility,
  onVisibilityChange,
  monetizationEnabled,
  onMonetizationChange,
  virtualPrice,
  rtmpUrl,
  streamKey,
  showKey,
  onToggleShowKey,
  onCopy,
  isLoadingAnalytics,
  viewerCount,
  peakViewersRef,
  likes,
  totalRevenue,
}: StreamSettingsModalProps) {
  if (!showSettings) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-t-3xl md:rounded-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex min-w-0 flex-1 rounded-2xl bg-white/5 p-1">
            {(['settings', 'monetization', 'analytics'] as const).map((tab) => (
              <button key={tab} onClick={() => onTabChange(tab)} className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeSettingsTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/60 hover:text-white'}`}>
                {tab === 'settings' ? 'Settings' : tab === 'monetization' ? 'Monetize' : 'Analytics'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"><X className="w-4 h-4" /></button>
        </div>

        {activeSettingsTab === 'settings' && (
          <div className="space-y-4">
            <div className="relative w-full bg-white/10 rounded-full p-1">
              <div className={`absolute top-1 bottom-1 w-1/2 bg-primary rounded-full transition-transform ${streamMethod === 'webcam' ? 'translate-x-0' : 'translate-x-full'}`} />
              <div className="relative z-10 flex">
                <button onClick={() => onStreamMethodChange('webcam')} className={`w-1/2 py-2 rounded-full text-sm ${streamMethod === 'webcam' ? 'text-white font-bold' : 'text-white/50'}`}>Webcam</button>
                <button onClick={() => onStreamMethodChange('obs')} className={`w-1/2 py-2 rounded-full text-sm ${streamMethod === 'obs' ? 'text-white font-bold' : 'text-white/50'}`}>OBS / RTMP</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-white/60 text-xs">Title</label>
              <input value={streamTitle} onChange={(e) => onStreamTitleChange(e.target.value)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-white/60 text-xs">Category</label>
              <select value={streamCategory} onChange={(e) => onStreamCategoryChange(e.target.value)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm">
                <option>General</option><option>Music</option><option>Sports</option><option>Gaming</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-white/60 text-xs">Visibility</label>
              <select value={visibility} onChange={(e) => onVisibilityChange(e.target.value as any)} className="w-full bg-white/5 text-white rounded-xl px-3 py-2.5 border border-white/10 text-sm">
                <option value="public">Public</option><option value="ticket">Ticket holders</option><option value="followers">Followers</option>
              </select>
            </div>
            {streamMethod === 'obs' && (
              <div className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">Stream URL</label>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <input type="text" value={rtmpUrl} readOnly className="bg-transparent text-white/70 text-xs flex-1 outline-none" />
                    <button onClick={() => onCopy(rtmpUrl, 'URL')} className="text-white/50 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/60 text-xs">Stream Key</label>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <input type={showKey ? 'text' : 'password'} value={streamKey} readOnly className="bg-transparent text-white/70 text-xs flex-1 outline-none" />
                    <button onClick={onToggleShowKey} className="text-white/50 hover:text-white">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => onCopy(streamKey, 'Key')} className="text-white/50 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSettingsTab === 'monetization' && (
          <div className="space-y-4 text-white/80">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable monetization</span>
              <button onClick={() => onMonetizationChange(!monetizationEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${monetizationEnabled ? 'bg-green-500' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${monetizationEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            {virtualPrice && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-sm font-semibold">Virtual Ticket: {virtualPrice}</span>
              </div>
            )}
          </div>
        )}

        {activeSettingsTab === 'analytics' && (
          <div className="space-y-4">
            {isLoadingAnalytics ? (
              <p className="text-white/50 text-sm">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-white/50 text-2xs uppercase">Viewers</span>
                  <p className="text-white text-lg font-bold">{viewerCount.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-white/50 text-2xs uppercase">Peak</span>
                  <p className="text-white text-lg font-bold">{peakViewersRef.current}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-white/50 text-2xs uppercase">Likes</span>
                  <p className="text-white text-lg font-bold">{likes}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-white/50 text-2xs uppercase">Revenue</span>
                  <p className="text-white text-lg font-bold">TZS {totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
