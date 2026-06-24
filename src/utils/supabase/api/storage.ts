import { supabase } from './client';

export const deleteFile = async (bucket: 'events' | 'avatars' | 'posts', url: string) => {
  try {
    const path = url.split(`${bucket}/`).pop();
    if (!path) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
    }
  } catch (err) {
  }
};

export const uploadImage = async (file: File, bucket: 'events' | 'avatars' | 'posts', path?: string) => {
  const getFileExtension = (name: string) => {
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 && dotIndex < name.length - 1 ? name.slice(dotIndex + 1).toLowerCase() : '';
  };
  const fileExt = getFileExtension(file.name);
  const contentTypeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    qt: 'video/quicktime',
    m4v: 'video/x-m4v',
    hevc: 'video/hevc',
    '3gp': 'video/3gpp',
    '3gpp': 'video/3gpp',
  };
  const extensionByContentType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/hevc': 'hevc',
    'video/heif': 'heif',
    'video/3gpp': '3gp',
  };
  const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-m4v',
    'video/hevc',
    'video/heif',
    'video/3gpp',
  ]);
  const declaredContentType = file.type || '';
  const inferredContentType = contentTypeByExtension[fileExt] || '';
  const contentType = allowedTypes.has(declaredContentType) ? declaredContentType : inferredContentType;

  if (!allowedTypes.has(contentType)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, WebP, GIF, MP4, WebM, MOV, M4V, 3GP, or OGG.');
  }

  const isVideo = contentType.startsWith('video/');
  const uploadFile = !isVideo && file.type !== contentType ? new File([file], file.name, { type: contentType }) : file;
  let optimizedFile = uploadFile;
  if (!isVideo) {
    const { optimizeForUpload } = await import('../../imageOptimize');
    optimizedFile = await optimizeForUpload(uploadFile);
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (optimizedFile.size > maxSize) {
    throw new Error(`File size too large. Maximum size is ${isVideo ? '100MB' : '10MB'}.`);
  }

  const optimizedFileExt = (getFileExtension(optimizedFile.name) || fileExt || extensionByContentType[contentType] || 'bin').toLowerCase();
  const fileName = `${crypto.randomUUID()}_${Date.now()}.${optimizedFileExt}`;
  const filePath = path ? `${path}/${fileName}` : fileName;
  const isNativeLikeMobile =
    typeof window !== 'undefined' &&
    (
      !!(window as any).Capacitor ||
      /Capacitor|iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    );
  let arrayBufferBody: ArrayBuffer | null = null;
  const getUploadBody = async (forceArrayBuffer: boolean) => {
    if (!isVideo || (!forceArrayBuffer && !isNativeLikeMobile)) return optimizedFile;
    arrayBufferBody = arrayBufferBody || await optimizedFile.arrayBuffer();
    return arrayBufferBody;
  };

  const tryUpload = async (targetBucket: 'events' | 'avatars' | 'posts') => {
    let uploadError: any = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const forceArrayBuffer = isVideo && (isNativeLikeMobile || attempt > 1);
      const uploadBody = await getUploadBody(forceArrayBuffer);
      const { error } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, uploadBody, {
          contentType,
          cacheControl: '31536000',
          upsert: false
        });

      uploadError = error;
      if (!uploadError) break;
      const message = String(uploadError.message || '').toLowerCase();
      const mayRecover =
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('load failed') ||
        message.includes('abort') ||
        (isVideo && !forceArrayBuffer);
      if (!mayRecover) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  try {
    return await tryUpload(bucket);
  } catch (error: any) {
    if (
      (bucket === 'posts' || bucket === 'events' || bucket === 'avatars') &&
      error &&
      typeof error.message === 'string' &&
      (error.message.toLowerCase().includes('bucket not found') || 
       error.message.toLowerCase().includes('row-level security policy'))
    ) {
      let fallbackBucket: 'events' | 'avatars' | 'posts' = 'events';
      if (bucket === 'events') fallbackBucket = 'posts';
      
      return await tryUpload(fallbackBucket);
    }
    throw error;
  }
};
