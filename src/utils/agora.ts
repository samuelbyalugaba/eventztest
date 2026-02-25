import AgoraRTC, { IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import { supabase } from './supabase/client';

export const AGORA_APP_ID = 'f5ff5998cbc248459a3c536a9997b970';

// Don't export a global client instance to avoid memory leaks
// export const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });

export const AGORA_config = {
  mode: 'live',
  codec: 'vp8',
};

export const getAgoraToken = async (channelName: string, uid: string | number, role: 'publisher' | 'subscriber'): Promise<string> => {
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_KEY as string
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agora-rtc-token`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ channelName, uid, role, expireSeconds: 3600 })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[AgoraToken] HTTP error status:', res.status);
      console.error('[AgoraToken] HTTP error body:', text);
      return null;
    }

    const data = await res.json();

    if (!data || !(data as any).token) {
      console.error('[AgoraToken] Response missing token. Full data:', data);
      return null;
    }

    return (data as any).token;
  } catch (e: any) {
    console.error('[AgoraToken] Unexpected error calling Edge Function:', e);
    console.error('[AgoraToken] error message:', e?.message || e);
    return null;
  }
};
