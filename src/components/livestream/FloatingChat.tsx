import { useRef, useEffect } from 'react';
import { Flag } from 'lucide-react';

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
    <div className="flex max-h-[28vh] flex-col items-start gap-1 overflow-y-auto pr-1 scrollbar-hide">
      {visibleMessages.map((m, i) => (
        <div
          key={m.id ?? `${messages.length - maxVisible + i}-${m.user}-${m.text}`}
          className={`group flex w-fit max-w-[min(82vw,20rem)] items-start gap-2 rounded-2xl px-2.5 py-2 shadow-lg backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            m.isGift
              ? 'bg-yellow-500/15 border border-yellow-500/25'
              : 'bg-black/55 border border-white/10'
          }`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {m.avatar ? (
            <img
              src={m.avatar}
              alt=""
              className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full object-cover ring-1 ring-white/25"
            />
          ) : (
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/60 text-[9px] font-bold text-white ring-1 ring-white/20">
              {(m.user || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="max-w-[9rem] truncate text-[10px] font-bold leading-none text-white/75">
                {m.user}
              </span>
              {m.isGift && (
                <span className="rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-yellow-200">
                  Gift
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-white [overflow-wrap:anywhere]">
              {m.text}
            </p>
          </div>
          {onReportMessage && m.id && (
            <button
              type="button"
              onClick={() => onReportMessage(m)}
              className="mt-0.5 rounded-full p-1 text-white/35 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-white/10 hover:text-red-300"
              aria-label={`Report message from ${m.user}`}
              title="Report message"
            >
              <Flag className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
