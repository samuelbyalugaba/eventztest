import { useRef, useEffect, useState } from 'react';
import { Send, Users } from 'lucide-react';

interface ChatMessage {
  user: string;
  text: string;
  avatar?: string;
  isGift?: boolean;
}

interface SidebarChatProps {
  messages: ChatMessage[];
  message: string;
  onMessageChange: (val: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  viewerCount: number;
}

export function SidebarChat({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  viewerCount,
}: SidebarChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm">Live Chat</h3>
        <div className="flex items-center gap-1.5 text-white/50 text-xs">
          <Users className="w-3.5 h-3.5" />
          <span>{viewerCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors ${
              m.isGift ? 'bg-yellow-500/10' : ''
            }`}
          >
            {m.avatar ? (
              <img
                src={m.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/50 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {(m.user || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-semibold text-primary mr-1.5">{m.user}</span>
              <span className="text-xs text-white/80 break-words">{m.text}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="mx-3 mb-1 py-1 text-[11px] text-center text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
        >
          ↓ New messages
        </button>
      )}

      {/* Input */}
      <form onSubmit={onSendMessage} className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10 focus-within:border-primary/50 transition-colors">
          <input
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="text-primary hover:text-primary/80 disabled:text-white/20 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
