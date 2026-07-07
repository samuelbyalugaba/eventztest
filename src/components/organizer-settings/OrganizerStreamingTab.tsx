interface OrganizerStreamingTabProps {
  streamingSettings: {
    defaultQuality: string;
    autoRecord: boolean;
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    multiCamera: boolean;
    lowLatency: boolean;
  };
  setStreamingSettings: (s: any) => void;
  handleSaveStreaming: () => void;
  onClose: () => void;
}

export function OrganizerStreamingTab({
  streamingSettings,
  setStreamingSettings,
  handleSaveStreaming,
  onClose,
}: OrganizerStreamingTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-gray-900 font-medium mb-4">Default Stream Quality</h4>
        <div className="grid grid-cols-3 gap-3">
          {['720p', '1080p', '4K'].map((quality) => (
            <button
              key={quality}
              onClick={() => setStreamingSettings({ ...streamingSettings, defaultQuality: quality })}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-medium ${
                streamingSettings.defaultQuality === quality
                  ? 'border-primary bg-purple-50 text-primary'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {([
          { key: 'autoRecord', title: 'Auto-Record Streams', desc: 'Save streams automatically' },
          { key: 'chatEnabled', title: 'Live Chat', desc: 'Enable chat during streams' },
          { key: 'reactionsEnabled', title: 'Live Reactions', desc: 'Allow live reactions' },
          { key: 'multiCamera', title: 'Multi-Camera', desc: 'Support multiple angles' },
          { key: 'lowLatency', title: 'Low Latency Mode', desc: 'Reduce stream delay' },
        ] as const).map((item) => {
          const isEnabled = streamingSettings[item.key as keyof typeof streamingSettings];
          return (
            <div key={item.key} className="p-5 flex items-center justify-between">
              <div>
                <h5 className="text-gray-900 font-medium text-sm">{item.title}</h5>
                <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setStreamingSettings({ ...streamingSettings, [item.key]: !isEnabled })}
                className={`relative w-11 h-6 rounded-full ${isEnabled ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSaveStreaming} className="px-5 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
          Save Settings
        </button>
      </div>
    </div>
  );
}
