import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import { supabase } from './supabase/client';

export const AGORA_APP_ID = 'f5ff5998cbc248459a3c536a9997b970';

export const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });

export const AGORA_config = {
  mode: 'live',
  codec: 'vp8',
};

export const getAgoraToken = async (channelName: string, uid: string | number, role: 'publisher' | 'subscriber') => {
  try {
    const { data, error } = await supabase.functions.invoke('agora-rtc-token', {
      body: { channelName, uid, role, expireSeconds: 3600 }
    });
    if (error) {
      console.warn('Failed to get Agora token from Edge Function:', error.message || error);
      return null;
    }
    return (data as any)?.token ?? null;
  } catch (e: any) {
    console.warn('Agora token fetch error:', e?.message || e);
    return null;
  }
};
