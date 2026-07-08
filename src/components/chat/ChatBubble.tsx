import { Trash2, CheckCheck, Flag } from 'lucide-react';
import { isVideoMedia } from '../../utils/media';
import type { Message } from '../../utils/supabase/api';

const isPlaceholderMediaText = (content?: string) => /^sent an? (image|video|media)$/i.test((content || '').trim());

interface ChatBubbleProps {
  msg: Message;
  isMe: boolean;
  onDelete?: (msg: Message) => void;
  onReport?: (msg: Message) => void;
  onMediaClick?: (url: string) => void;
}

export function ChatBubble({ msg, isMe, onDelete, onReport, onMediaClick }: ChatBubbleProps) {
  const hasMedia = Boolean(msg.image_url);
  const mediaIsVideo = isVideoMedia(msg.image_url);
  const visibleContent = hasMedia && isPlaceholderMediaText(msg.content) ? '' : msg.content;

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div
          className={`${hasMedia && !visibleContent ? 'p-1' : 'px-4 py-3'} min-w-8 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-gray-900 shadow-sm rounded-bl-none border border-gray-100'
          }`}
        >
          {msg.image_url && (
            <div className={visibleContent ? 'mb-2' : ''}>
              <button
                type="button"
                onClick={() => onMediaClick?.(msg.image_url || '')}
                aria-label={mediaIsVideo ? 'Open shared video' : 'Open shared image'}
                className="block overflow-hidden rounded-xl focus:outline-none"
              >
                {mediaIsVideo ? (
                  <video
                    src={`${msg.image_url}#t=0.1`}
                    className="max-h-64 max-w-full bg-black object-contain"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={msg.image_url}
                    alt="Shared media"
                    className="max-h-64 max-w-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            </div>
          )}
          {visibleContent}
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-2xs text-gray-400 font-medium">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <button
              onClick={() => onDelete?.(msg)}
              aria-label="Delete message"
              className="ml-2 text-gray-400 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {isMe && msg.is_read && (
            <CheckCheck className="w-3 h-3 text-blue-500" />
          )}
          {!isMe && (
            <button
              onClick={() => onReport?.(msg)}
              aria-label="Report message"
              className="ml-2 text-gray-400 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Flag className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
