import { useRef, useEffect } from 'react';

interface ChatMessage {
  user: string;
  text: string;
  avatar?: string;
  isGift?: boolean;
}

interface FloatingChatProps {
  messages: ChatMessage[];
  maxVisible?: number;
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

export function FloatingChat({ messages, maxVisible = 6 }: FloatingChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.slice(-maxVisible);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="space-y-1.5 max-h-[30vh] overflow-y-auto scrollbar-hide">
      {visibleMessages.map((m, i) => (
        <div
          key={messages.length - maxVisible + i}
          className={`flex items-start gap-2 backdrop-blur-xl rounded-2xl px-2.5 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
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
              className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/40 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {(m.user || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-white/60 mr-1.5">{m.user}</span>
            <span className="text-[12px] text-white leading-snug break-words">{m.text}</span>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
