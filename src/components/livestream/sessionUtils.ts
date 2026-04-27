import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

export const createStreamClient = () => AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });

export const formatStreamElapsedTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const playLocalPreview = (
  videoTrack: ICameraVideoTrack,
  camera: MediaDeviceInfo | undefined,
  elementId = 'local-player'
) => {
  const isBack = camera ? /(back|rear|environment)/i.test(camera.label || '') : false;
  videoTrack.play(elementId, { fit: 'cover', mirror: !isBack });
  const video = document.getElementById(elementId)?.querySelector('video') as HTMLVideoElement | null;
  if (video && isBack) video.style.transform = 'none';
};

export const initializeLocalTracks = async () => {
  const cameras = await AgoraRTC.getCameras();
  const cameraId = cameras[0]?.deviceId;
  const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({}, cameraId ? { cameraId } : {});
  return {
    cameras,
    audioTrack,
    videoTrack,
    initialCamera: cameras[0],
  };
};

export const switchLocalCamera = async ({
  localVideoTrack,
  availableCameras,
  currentCameraIndex,
  elementId = 'local-player',
}: {
  localVideoTrack: ICameraVideoTrack;
  availableCameras: MediaDeviceInfo[];
  currentCameraIndex: number;
  elementId?: string;
}) => {
  const cameras = availableCameras.length ? availableCameras : await AgoraRTC.getCameras();
  if (cameras.length < 2) {
    throw new Error('No secondary camera');
  }

  const nextIndex = (currentCameraIndex + 1) % cameras.length;
  const nextCamera = cameras[nextIndex];

  await localVideoTrack.setDevice(nextCamera.deviceId);
  localVideoTrack.stop();
  playLocalPreview(localVideoTrack, nextCamera, elementId);

  return {
    cameras,
    nextIndex,
  };
};

export type LocalTracks = {
  audioTrack: IMicrophoneAudioTrack;
  videoTrack: ICameraVideoTrack;
  cameras: MediaDeviceInfo[];
};
