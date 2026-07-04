import { useRef, useEffect, useState } from 'react';
import { Flag, Send, Users } from 'lucide-react';

interface ChatMessage {
  id?: number;
  userId?: string;
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
  onReportMessage?: (message: ChatMessage) => void;
  viewerCount: number;
}

export function SidebarChat({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  onReportMessage,
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
            className={`group flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors ${
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
              <div className="w-6 h-6 rounded-full bg-primary/50 text-white flex items-center justify-center text-2xs font-bold flex-shrink-0 mt-0.5">
                {(m.user || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-primary mr-1.5">{m.user}</span>
              <span className="text-xs text-white/80 break-words">{m.text}</span>
            </div>
            {onReportMessage && m.id && (
              <button
                type="button"
                onClick={() => onReportMessage(m)}
                className="mt-0.5 rounded-full p-1 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-red-300 group-hover:opacity-100"
                aria-label={`Report message from ${m.user}`}
                title="Report message"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}
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
          className="mx-3 mb-1 py-1 text-xs text-center text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
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
            placeholder="Chat..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:bg-white/10 disabled:text-white/30"
            aria-label="Send stream message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
