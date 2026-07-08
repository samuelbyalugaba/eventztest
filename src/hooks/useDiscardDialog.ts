import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useDiscardDialog({
  view,
  isRecording,
  capturedMedia,
  caption,
  stopRecording,
  setCapturedMedia,
  setCaption,
  setView,
  streamRef,
}: {
  view: 'camera' | 'compose';
  isRecording: boolean;
  capturedMedia: { file: File; url: string; kind: 'image' | 'video' } | null;
  caption: string;
  stopRecording: () => void;
  setCapturedMedia: (media: { file: File; url: string; kind: 'image' | 'video' } | null) => void;
  setCaption: (caption: string) => void;
  setView: (view: 'camera' | 'compose') => void;
  streamRef: React.MutableRefObject<MediaStream | null>;
}) {
  const navigate = useNavigate();

  const isDirty = view === 'compose' && (capturedMedia !== null || caption.trim().length > 0);

  const goBack = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    if (view === 'compose') {
      if (capturedMedia) URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
      setCaption('');
      setView('camera');
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      navigate(-1);
    }
  }, [isRecording, stopRecording, view, capturedMedia, setCapturedMedia, setCaption, setView, streamRef, navigate]);

  return { goBack, isDirty };
}
