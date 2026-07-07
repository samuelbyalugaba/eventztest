import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Photo } from './types';

interface PhotoViewerProps {
  media: Photo;
}

export function PhotoViewer({ media }: PhotoViewerProps) {
  return (
    <ImageWithFallback
      src={media.url}
      fallbackSrc={media.fallbackSrc}
      alt="Full size"
      className="w-full h-full object-contain"
    />
  );
}
