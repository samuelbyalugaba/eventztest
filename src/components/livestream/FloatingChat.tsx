import { useRef, useEffect } from 'react';

interface ChatMessage {
  id?: number;
  userId?: string;
  user: string;
  text: string;
  avatar?: string;
  isGift?: boolean;
}

interface FloatingChatProps {
  messages: ChatMessage[];
  maxVisible?: number;
  onReportMessage?: (message: ChatMessage) => void;
}

const MAX_MESSAGES = 200;

export function useMessageBuffer() {
  const addMessage = (
    prev: ChatMessage[],
    msg: ChatMessage
  ): ChatMessage[] => {
    const next = [...prev, msg];
    if (next.length > MAX_MESSAGES) {
      return next.slice(next.length - MAX_MESSAGES);
    }
    return next;
  };

  return { addMessage };
}

export function FloatingChat({ messages, maxVisible = 6, onReportMessage }: FloatingChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.slice(-maxVisible);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="space-y-1 max-h-[26vh] overflow-y-auto scrollbar-hide">
      {visibleMessages.map((m, i) => (
        <div
          key={m.id ?? `${messages.length - maxVisible + i}-${m.user}-${m.text}`}
          className={`flex items-start gap-1.5 backdrop-blur-xl rounded-xl px-2 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            m.isGift
              ? 'bg-yellow-500/15 border border-yellow-500/25'
              : 'bg-black/40 border border-white/5'
          }`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {m.avatar ? (
            <img
              src={m.avatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/40 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              {(m.user || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-white/60 mr-1">{m.user}</span>
            <span className="text-[11px] text-white leading-snug break-words">{m.text}</span>
          </div>
          {onReportMessage && m.id && (
            <button
              type="button"
              onClick={() => onReportMessage(m)}
              className="mt-0.5 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-red-300"
              aria-label={`Report message from ${m.user}`}
              title="Report message"
            >
              <span className="block h-1.5 w-1.5 rounded-full bg-current" />
            </button>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
