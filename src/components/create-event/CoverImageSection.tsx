import { type ChangeEvent } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface CoverImageSectionProps {
  coverImage: string | null;
  title: string;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function CoverImageSection({ coverImage, title, onImageUpload, onRemoveImage }: CoverImageSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="relative h-40 bg-gradient-to-br from-purple-600 to-violet-900">
        {coverImage && (
          <>
            <ImageWithFallback src={coverImage} alt={title || 'Event cover'} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          </>
        )}
        <label className="absolute bottom-4 left-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/15">
          {coverImage ? <Upload className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {coverImage ? 'Change cover' : 'Add cover image'}
          <input type="file" accept="image/*" onChange={onImageUpload} className="sr-only" />
        </label>
        {coverImage && (
          <button
            type="button"
            onClick={onRemoveImage}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/55"
            aria-label="Remove cover image"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
