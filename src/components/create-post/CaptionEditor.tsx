import { C } from './constants';

export function CaptionEditor({
  caption,
  setCaption,
  textareaRef,
}: {
  caption: string;
  setCaption: (caption: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={textareaRef}
      value={caption}
      onChange={(e) => setCaption(e.target.value)}
      placeholder="Tell people what's happening..."
      rows={1}
      style={{
        width: '100%', border: 'none', outline: 'none', resize: 'none',
        background: 'transparent', color: C.ink, fontSize: 16,
        lineHeight: 1.5, minHeight: 44,
      }}
    />
  );
}
