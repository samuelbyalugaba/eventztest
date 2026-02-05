import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Send, Loader2, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createPost, uploadImage } from '../utils/supabase/api';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  isOrganizer?: boolean;
  organizerName?: string;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated, isOrganizer = false, organizerName }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postAsOrganizer, setPostAsOrganizer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const hasVideo = files.some(f => f.type.startsWith('video/'));
    
    // If selecting a video
    if (hasVideo) {
      if (files.length > 1 || selectedFiles.length > 0) {
        toast.error('You can only upload one video at a time');
        return;
      }
      
      const file = files[0];
      if (file.size > 50 * 1024 * 1024) { // 50MB limit for videos
        toast.error('File size should be less than 50MB');
        return;
      }
      
      setSelectedFiles([file]);
      setFileType('video');
      setPreviewUrls([URL.createObjectURL(file)]);
      return;
    }

    // If selecting images
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) {
        toast.error('Please select valid image files');
        return;
    }

    if (fileType === 'video') {
      toast.error('Cannot mix video and images. Remove the video first.');
      return;
    }

    const newPreviewUrls = validImages.map(f => URL.createObjectURL(f));
    
    setSelectedFiles(prev => [...prev, ...validImages]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setFileType('image');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[index]);
      return newUrls.filter((_, i) => i !== index);
    });
    
    if (selectedFiles.length === 1) {
      setFileType(null);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) {
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

      if (selectedFiles.length > 0) {
        try {
          if (fileType === 'video') {
             const publicUrl = await uploadImage(selectedFiles[0], 'posts', `user_${user.id}`);
             videoUrl = publicUrl;
          } else {
             // Upload all images
             const uploadPromises = selectedFiles.map(file => uploadImage(file, 'posts', `user_${user.id}`));
             mediaUrls = await Promise.all(uploadPromises);
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
        posted_as_organizer: postAsOrganizer
      });

      toast.success('Post created successfully! 🎉');
      onPostCreated();
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('postsUpdated'));
      onClose();
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
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
          {previewUrls.length > 0 && (
            <div className="mt-4">
              {fileType === 'video' ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  <video src={previewUrls[0]} controls className="w-full h-48 object-cover" />
                  <button
                    onClick={() => removeFile(0)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative flex-shrink-0 w-48 h-48 rounded-xl overflow-hidden bg-gray-100 snap-center group">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
              title="Add Photo/Video"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
              multiple
            />
          </div>

          <div className="flex items-center gap-3">
            {isOrganizer && (
              <button
                onClick={() => setPostAsOrganizer(!postAsOrganizer)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  postAsOrganizer 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {postAsOrganizer ? (
                  <>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{organizerName || 'Organizer'}</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Myself</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0)}
              className="flex items-center gap-2 bg-[#8A2BE2] text-white px-5 py-2 rounded-xl hover:bg-[#7B27CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
