import { X } from 'lucide-react';
import { toast } from 'sonner';

interface PostDetailCaptionEditorProps {
  isEditingCaption: boolean;
  captionDraft: string;
  setCaptionDraft: (value: string) => void;
  isSavingCaption: boolean;
  setIsSavingCaption: (value: boolean) => void;
  onEditCaption?: (id: number, caption: string) => Promise<void> | void;
  post: any;
  onClose: () => void;
}

export function PostDetailCaptionEditor({
  isEditingCaption,
  captionDraft,
  setCaptionDraft,
  isSavingCaption,
  setIsSavingCaption,
  onEditCaption,
  post,
  onClose,
}: PostDetailCaptionEditorProps) {
  if (!isEditingCaption) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => !isSavingCaption && onClose()}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="text-gray-900 font-bold">Edit caption</div>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => !isSavingCaption && onClose()}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            className="w-full min-h-[140px] p-4 bg-gray-50 rounded-2xl border border-gray-100"
            disabled={isSavingCaption}
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              onClick={() => !isSavingCaption && onClose()}
              disabled={isSavingCaption}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-bold text-white transition-colors ${isSavingCaption ? 'bg-purple-300' : 'bg-purple-600 hover:bg-purple-700'}`}
              onClick={async () => {
                if (!onEditCaption) return;
                if (!captionDraft.trim()) { toast.error('Caption cannot be empty'); return; }
                try {
                  setIsSavingCaption(true);
                  await onEditCaption(post.id, captionDraft);
                  toast.success('Caption updated');
                  onClose();
                } catch (e) {
                  toast.error('Failed to update caption');
                } finally {
                  setIsSavingCaption(false);
                }
              }}
              disabled={isSavingCaption}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
