import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { releasePreloadedCamera } from '../../utils/cameraPreloader';


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
  width: { min: 320, ideal: 1280, max: 1920 },
  height: { min: 180, ideal: 720, max: 1080 },
  frameRate: { min: 15, ideal: 30, max: 30 },
  bitrateMin: 800,
  bitrateMax: 3000,
} as const;

export const HD_AUDIO_ENCODER_CONFIG = 'music_standard' as const; // 48kHz, ~40kbps

export const initializeLocalTracks = async () => {
  const AgoraRTC = await loadAgoraRTC();

  // A camera stream may still be held by the post composer preloader (or an
  // earlier session). Release it, otherwise getUserMedia aborts with
  // "Timeout starting video source" on devices that only allow one consumer.
  releasePreloadedCamera();

  const cameras = getPreferredCameraPair(await AgoraRTC.getCameras());
  const cameraId = cameras[0]?.deviceId;

  const videoOptions = {
    encoderConfig: HD_VIDEO_ENCODER_CONFIG,
    optimizationMode: 'motion',
  } as const;

  const sdVideoOptions = {
    encoderConfig: { width: 640, height: 360, frameRate: 24, bitrateMin: 300, bitrateMax: 1000 },
  } as const;

  const audioOptions = { encoderConfig: HD_AUDIO_ENCODER_CONFIG, AEC: true, ANS: true, AGC: true } as const;

  const createTracks = async (videoConfig: object) => {
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(audioOptions, videoConfig);
    return { audioTrack, videoTrack };
  };

  // Try progressively simpler constraints: some devices/browsers fail on a
  // specific deviceId or on HD, but succeed with defaults or SD.
  const attempts: Array<() => Promise<{ audioTrack: IMicrophoneAudioTrack; videoTrack: ICameraVideoTrack }>> = [
    ...(cameraId ? [() => createTracks({ cameraId, ...videoOptions })] : []),
    () => createTracks(videoOptions),
    () => createTracks(sdVideoOptions),
    async () => {
      // Last resort: create the tracks separately so a slow camera doesn't
      // abort the microphone as well.
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioOptions);
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack(sdVideoOptions);
        return { audioTrack, videoTrack };
      } catch (err) {
        audioTrack.close();
        throw err;
      }
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const { audioTrack, videoTrack } = await attempt();
      return { cameras, audioTrack, videoTrack, initialCamera: cameras[0] };
    } catch (err) {
      lastError = err;
      // Give the OS a moment to release the device before retrying.
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not access camera/microphone');
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
