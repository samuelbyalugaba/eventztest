import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import { isSupabaseConfigured } from './supabase/client';

export const AGORA_APP_ID = 'f5ff5998cbc248459a3c536a9997b970';

export const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });

export const AGORA_config = {
  mode: 'live',
  codec: 'vp8',
};

export const getAgoraToken = async (channelName: string, uid: string | number, role: 'publisher' | 'subscriber') => {
  try {
    if (!isSupabaseConfigured()) {
      console.error('Supabase not configured: check VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env');
      return null;
    }
    const resp = await fetch(`/api/agora-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelName, uid, role, expireSeconds: 3600 }),
    });
    if (!resp.ok) {
      console.warn('Direct fetch to Edge Function failed:', resp.status, await resp.text());
      return null;
    }
    const json = await resp.json();
    return json?.token ?? null;
  } catch (e: any) {
    console.warn('Direct fetch exception:', (e as any)?.message || e);
    return null;
  }
};
