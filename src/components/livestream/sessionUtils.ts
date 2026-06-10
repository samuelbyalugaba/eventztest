import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

type AgoraRTCFactory = typeof import('agora-rtc-sdk-ng').default;

const loadAgoraRTC = async (): Promise<AgoraRTCFactory> => {
  const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
  return AgoraRTC;
};

const getCameraFacing = (camera: MediaDeviceInfo) => {
  const label = camera.label || '';
  if (/(front|user|facetime|selfie)/i.test(label)) return 'front';
  if (/(back|rear|environment)/i.test(label)) return 'back';
  return 'unknown';
};

const isAuxiliaryBackCamera = (camera: MediaDeviceInfo) => {
  const label = camera.label || '';
  return /(ultra|wide|tele|macro|zoom|depth|dual|triple|0\.5x|2x|3x)/i.test(label);
};

const uniqueCameras = (cameras: MediaDeviceInfo[]) => {
  const seen = new Set<string>();
  return cameras.filter((camera) => {
    const key = camera.deviceId || camera.groupId || camera.label;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getPreferredCameraPair = (cameras: MediaDeviceInfo[]) => {
  const unique = uniqueCameras(cameras);
  if (unique.length <= 2) return unique;

  const frontCamera = unique.find((camera) => getCameraFacing(camera) === 'front');
  const backCameras = unique.filter((camera) => getCameraFacing(camera) === 'back');
  const standardBackCamera =
    backCameras.find((camera) => !isAuxiliaryBackCamera(camera)) ||
    backCameras[0];

  const pair = uniqueCameras([
    ...(frontCamera ? [frontCamera] : []),
    ...(standardBackCamera ? [standardBackCamera] : []),
  ]);

  return pair.length >= 2 ? pair : unique.slice(0, 2);
};

export const createStreamClient = async (): Promise<IAgoraRTCClient> => {
  const AgoraRTC = await loadAgoraRTC();
  return AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
};

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

// HD encoder configuration: 1280x720 @ 30fps, ~2.5 Mbps target / 3 Mbps max
// Use a custom config (instead of a preset string) so we get consistent HD quality
// across devices. Agora will gracefully downscale on weak networks via its
// internal adaptation when this is the target.
export const HD_VIDEO_ENCODER_CONFIG = {
  width: { min: 640, ideal: 1280, max: 1920 },
  height: { min: 360, ideal: 720, max: 1080 },
  frameRate: { min: 24, ideal: 30, max: 30 },
  bitrateMin: 1500,
  bitrateMax: 3000,
} as const;

export const HD_AUDIO_ENCODER_CONFIG = 'music_standard' as const; // 48kHz, ~40kbps

export const initializeLocalTracks = async () => {
  const AgoraRTC = await loadAgoraRTC();
  const cameras = getPreferredCameraPair(await AgoraRTC.getCameras());
  const cameraId = cameras[0]?.deviceId;
  const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
    { encoderConfig: HD_AUDIO_ENCODER_CONFIG, AEC: true, ANS: true, AGC: true },
    {
      ...(cameraId ? { cameraId } : {}),
      encoderConfig: HD_VIDEO_ENCODER_CONFIG,
      optimizationMode: 'motion',
    }
  );
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
  const AgoraRTC = await loadAgoraRTC();
  const cameras = getPreferredCameraPair(availableCameras.length ? availableCameras : await AgoraRTC.getCameras());
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
