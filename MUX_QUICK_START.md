# Mux Integration Quick Start

This is a simplified, ready-to-use implementation guide for integrating Mux streaming.

## Prerequisites

- Supabase project set up
- Supabase CLI installed
- Mux account (sign up at https://www.mux.com/)

## Step 1: Get Mux Credentials

1. Log in to Mux Dashboard
2. Go to **Settings → API Access Tokens**
3. Click **Generate new token**
4. Copy **Token ID** and **Token Secret**

## Step 2: Create Supabase Edge Function

```bash
# Initialize Supabase (if not done)
supabase init

# Create the function
supabase functions new create-mux-stream
```

## Step 3: Function Code

**File: `supabase/functions/create-mux-stream/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Mux from "npm:@mux/mux-node@^7.0.0"

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { eventId, title } = await req.json()

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error("Mux credentials not configured")
    }

    const mux = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET)

    const liveStream = await mux.video.liveStreams.create({
      playback_policy: "public",
      new_asset_settings: {
        playback_policy: "public",
        mp4_support: "standard",
      },
      reconnect_window: 10,
      reduced_latency: true,
    })

    const playbackUrl = liveStream.playback_ids?.[0]?.id 
      ? `https://stream.mux.com/${liveStream.playback_ids[0].id}.m3u8`
      : null

    return new Response(
      JSON.stringify({
        streamKey: liveStream.stream_key,
        rtmpUrl: liveStream.rtmp_url,
        playbackUrl,
        streamId: liveStream.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
```

## Step 4: Deploy Function

```bash
# Deploy
supabase functions deploy create-mux-stream

# Set secrets (replace with your actual values)
supabase secrets set MUX_TOKEN_ID=your_token_id
supabase secrets set MUX_TOKEN_SECRET=your_token_secret
```

## Step 5: Update Your API

**File: `src/utils/supabase/api.ts`**

Replace the `generateStreamKeys` function:

```typescript
export const generateStreamKeys = async (eventId: number) => {
  try {
    // Get event title for better stream naming
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single()

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-mux-stream', {
      body: { 
        eventId, 
        title: event?.title || `Event ${eventId}` 
      }
    })

    if (error) throw error

    const { streamKey, rtmpUrl, playbackUrl, streamId } = data

    // Save to database
    const { data: currentEvent } = await supabase
      .from('events')
      .select('streaming')
      .eq('id', eventId)
      .single()

    const currentStreaming = currentEvent?.streaming || {}
    const newStreaming = {
      ...currentStreaming,
      stream_key: streamKey,
      ingest_url: rtmpUrl,
      playback_url: playbackUrl,
      mux_stream_id: streamId,
      quality: 'HD',
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ streaming: newStreaming })
      .eq('id', eventId)

    if (updateError) throw updateError

    return { streamKey, ingestUrl: rtmpUrl, playbackUrl }
  } catch (error) {
    console.error('Failed to generate stream keys:', error)
    throw error
  }
}
```

## Step 6: Test It

1. Open your app
2. Go to an event in Organizer Dashboard
3. Click "Go Live"
4. Copy the RTMP URL and Stream Key
5. Open OBS Studio
6. Go to Settings → Stream
7. Service: Custom
8. Server: Paste RTMP URL
9. Stream Key: Paste Stream Key
10. Click OK and Start Streaming
11. Check the LiveFeed page - your stream should appear!

## Step 7: Optional - Stop Stream Function

Create `supabase/functions/stop-mux-stream/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Mux from "npm:@mux/mux-node@^7.0.0"

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { streamId } = await req.json()

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      throw new Error("Mux credentials not configured")
    }

    const mux = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET)
    await mux.video.liveStreams.disconnect(streamId)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
```

Deploy:
```bash
supabase functions deploy stop-mux-stream
```

Update `updateEventStreamingStatus` to call this when stopping:

```typescript
// In updateEventStreamingStatus function, before updating database:
if (!isLive && currentStreaming.mux_stream_id) {
  try {
    await supabase.functions.invoke('stop-mux-stream', {
      body: { streamId: currentStreaming.mux_stream_id }
    })
  } catch (error) {
    console.error('Failed to disconnect stream:', error)
    // Continue anyway - stream might already be stopped
  }
}
```

## Troubleshooting

### Function not found
- Make sure you deployed: `supabase functions deploy create-mux-stream`
- Check function name matches exactly

### Authentication error
- Verify secrets are set: `supabase secrets list`
- Check token ID and secret are correct

### Stream not appearing
- Check Mux dashboard for stream status
- Verify RTMP URL and stream key are correct
- Make sure OBS is actually streaming (check status in OBS)

### CORS errors
- The function includes CORS headers, but if issues persist, check your Supabase project CORS settings

## Next Steps

- Add stream analytics
- Implement viewer count updates
- Add stream recording/playback
- Set up webhooks for stream events
