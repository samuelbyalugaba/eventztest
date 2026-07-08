import { useRef } from 'react';
import { Camera, User } from 'lucide-react';

interface ProfilePhotoUploadProps {
  avatarUrl: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfilePhotoUpload({ avatarUrl, onFileChange }: ProfilePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-left active:bg-gray-100 transition-colors"
      >
        <div className="w-14 h-14 rounded-full overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Creator" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Profile photo</p>
          <p className="text-xs text-gray-500 mt-0.5">Add or change photo</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
          <Camera className="w-4 h-4" />
        </div>
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </>
  );
}
