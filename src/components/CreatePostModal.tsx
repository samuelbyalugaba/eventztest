import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage } from '../utils/supabase/api';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit for videos
        toast.error('File size should be less than 50MB');
        return;
      }
      
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        toast.error('Please select an image or video file');
        return;
      }

      setSelectedFile(file);
      setFileType(isVideo ? 'video' : 'image');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !selectedFile) {
      toast.error('Please add some content or media');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create posts');
        return;
      }

      let mediaUrls: string[] = [];
      let videoUrl: string | undefined;

      if (selectedFile) {
        try {
          // Use 'posts' bucket - api.ts handles fallback to 'events' if needed
          const publicUrl = await uploadImage(selectedFile, 'posts', `user_${user.id}`);
          
          if (fileType === 'video') {
            videoUrl = publicUrl;
            // For videos, we might want to generate a thumbnail later, 
            // but for now we'll leave image_urls empty or maybe put the video url there too if needed by UI
            // The API expects image_urls to be an array of strings
            mediaUrls = []; 
          } else {
            mediaUrls.push(publicUrl);
          }
        } catch (error) {
          console.error('Error uploading media:', error);
          throw new Error('Failed to upload media');
        }
      }

      await createPost({
        user_id: user.id,
        content: content,
        image_urls: mediaUrls,
        video_url: videoUrl,
        hashtags: [], // Parse hashtags from content if needed
      });

      toast.success('Post created successfully! 🎉');
      onPostCreated();
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('postsUpdated'));
      onClose();
      setContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileType(null);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's new with your events?"
            className="w-full h-32 p-3 text-gray-700 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-100 resize-none placeholder:text-gray-400"
          />

          {/* Image/Video Preview */}
          {previewUrl && (
            <div className="relative mt-4 rounded-xl overflow-hidden bg-gray-100">
              {fileType === 'video' ? (
                <video src={previewUrl} controls className="w-full h-48 object-cover" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
              )}
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setFileType(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
              title="Add Media"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !selectedFile)}
            className="flex items-center gap-2 px-4 py-2 bg-[#8A2BE2] text-white rounded-xl font-medium hover:bg-[#7825d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
