# Streaming Integration Guide

This guide covers two approaches to enable live streaming in your Eventz PWA:
1. **Using a Streaming Service** (Recommended - Easier, More Reliable)
2. **Building a WebRTC-to-RTMP Gateway** (Advanced - More Control, More Complex)

---

## Option 1: Using a Streaming Service (Recommended)

### Overview
Streaming services handle the infrastructure, encoding, CDN distribution, and scaling. You just send them a stream and get back a playback URL.

### Popular Services Comparison

| Service | Pros | Cons | Pricing |
|---------|------|------|---------|
| **Mux** | Easy API, great docs, automatic transcoding | More expensive | $0.015/min |
| **AWS IVS** | Very low latency, AWS integration | AWS learning curve | $0.05/hour |
| **Agora** | Real-time, good for interactive | Complex setup | Pay-as-you-go |
| **Cloudflare Stream** | Good CDN, reasonable pricing | Less features | $1/1000 min |
| **Twilio Video** | Good for video calls | Expensive for long streams | $0.004/min |

### Recommended: Mux (Best Developer Experience)

#### Step 1: Sign Up and Get API Keys

1. Go to https://www.mux.com/
2. Sign up for an account
3. Navigate to **Settings → API Access Tokens**
4. Create a new token with **Full Access** permissions
5. Copy your **Token ID** and **Token Secret**

#### Step 2: Install Mux SDK

```bash
npm install @mux/mux-node
```

#### Step 3: Create Supabase Edge Function (Backend)

Since we need to keep API keys secret, create a Supabase Edge Function:

1. **Install Supabase CLI** (if not already):
   ```bash
   npm install -g supabase
   ```

2. **Create Edge Function**:
   ```bash
   supabase functions new create-live-stream
   ```

3. **Navigate to the function directory**:
   ```bash
   cd supabase/functions/create-live-stream
   ```

4. **Create `package.json`**:
   ```json
   {
     "name": "create-live-stream",
     "version": "1.0.0",
     "dependencies": {
       "@mux/mux-node": "^7.0.0"
     }
   }
   ```

5. **Create `index.ts`**:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import Mux from "npm:@mux/mux-node@^7.0.0"

   const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")
   const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")

   serve(async (req) => {
     // CORS headers
     const corsHeaders = {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     }

     // Handle CORS preflight
     if (req.method === "OPTIONS") {
       return new Response("ok", { headers: corsHeaders })
     }

     try {
       const { eventId, title } = await req.json()

       if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
         throw new Error("Mux credentials not configured")
       }

       const mux = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET)

       // Create a live stream
       const liveStream = await mux.video.liveStreams.create({
         playback_policy: "public", // or "signed" for private streams
         new_asset_settings: {
           playback_policy: "public",
           mp4_support: "standard",
         },
         reconnect_window: 10, // seconds
         reduced_latency: true,
       })

       // Return stream credentials
       return new Response(
         JSON.stringify({
           streamKey: liveStream.stream_key,
           rtmpUrl: liveStream.rtmp_url,
           playbackUrl: liveStream.playback_ids?.[0]?.id 
             ? `https://stream.mux.com/${liveStream.playback_ids[0].id}.m3u8`
             : null,
           streamId: liveStream.id,
         }),
         {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 200,
         }
       )
     } catch (error) {
       console.error("Error creating live stream:", error)
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

6. **Deploy the function**:
   ```bash
   supabase functions deploy create-live-stream
   ```

7. **Set environment variables** in Supabase Dashboard:
   - Go to **Project Settings → Edge Functions → Secrets**
   - Add `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`

#### Step 4: Update Your API to Use Mux

Update `src/utils/supabase/api.ts`:

```typescript
export const generateStreamKeys = async (eventId: number) => {
  // Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('create-live-stream', {
    body: { eventId, title: `Event ${eventId}` }
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
    mux_stream_id: streamId, // Store for later reference
    quality: 'HD',
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({ streaming: newStreaming })
    .eq('id', eventId)

  if (updateError) throw updateError

  return { streamKey, ingestUrl: rtmpUrl, playbackUrl }
}
```

#### Step 5: Update StreamManager to Use Real RTMP URL

The `StreamManager` component already displays the RTMP URL and stream key. Users can copy these and use them in OBS or other streaming software.

#### Step 6: Handle Stream Lifecycle

Create another Edge Function to stop streams:

**`supabase/functions/stop-live-stream/index.ts`**:
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

    // Disconnect the live stream
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

Update `updateEventStreamingStatus` in `api.ts`:
```typescript
export const updateEventStreamingStatus = async (eventId: number, isLive: boolean) => {
  const { data: currentEvent } = await supabase
    .from('events')
    .select('streaming')
    .eq('id', eventId)
    .single()

  const currentStreaming = currentEvent?.streaming || {}

  // If stopping stream, disconnect from Mux
  if (!isLive && currentStreaming.mux_stream_id) {
    try {
      await supabase.functions.invoke('stop-live-stream', {
        body: { streamId: currentStreaming.mux_stream_id }
      })
    } catch (error) {
      console.error('Failed to disconnect stream:', error)
    }
  }

  const updates: any = {
    streaming: {
      ...currentStreaming,
      isLive,
      available: true,
      liveViewers: isLive ? 0 : undefined,
      startedAt: isLive ? new Date().toISOString() : undefined,
    }
  }

  // If going live, ensure we have stream keys
  if (isLive && !currentStreaming.stream_key) {
    const keys = await generateStreamKeys(eventId)
    updates.streaming.stream_key = keys.streamKey
    updates.streaming.ingest_url = keys.ingestUrl
    updates.streaming.playback_url = keys.playbackUrl
  }

  const newStreaming = { ...currentStreaming, ...updates.streaming }

  const { data, error } = await supabase
    .from('events')
    .update({ streaming: newStreaming })
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

## Option 2: Building a WebRTC-to-RTMP Gateway

### Overview
This approach allows users to stream directly from their browser without external software like OBS. More complex but gives full control.

### Architecture

```
Browser (WebRTC) → Node.js Server (Media Server) → RTMP Server → CDN
```

### Step 1: Choose a Media Server

**Option A: Node Media Server (Recommended for RTMP)**
- Handles RTMP ingestion
- Lightweight
- Good documentation

**Option B: Kurento Media Server**
- More features
- WebRTC support
- More complex setup

**Option C: Janus Gateway**
- Very powerful
- Complex configuration
- Good for advanced use cases

### Step 2: Set Up Node Media Server

#### 2.1 Create Backend Service

Create a new directory for your media server:

```bash
mkdir streaming-server
cd streaming-server
npm init -y
```

#### 2.2 Install Dependencies

```bash
npm install node-media-server express cors dotenv
npm install -D @types/node typescript ts-node nodemon
```

#### 2.3 Create `server.ts`

```typescript
import NodeMediaServer from 'node-media-server'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media',
  },
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg', // Path to ffmpeg
    tasks: []
  }
}

const nms = new NodeMediaServer(config)

nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`)
})

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`)
})

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  
  // Verify stream key here
  const streamKey = StreamPath.split('/').pop()
  
  // TODO: Verify stream key against database
  // If invalid, reject:
  // const session = nms.getSession(id)
  // session.reject()
})

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  
  // Stream is now live, update database
  // TODO: Update event streaming status in database
})

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`)
  
  // Stream ended, update database
  // TODO: Update event streaming status in database
})

nms.run()

// Express API for getting stream info
app.get('/api/streams', (req, res) => {
  const sessions = nms.getSessions()
  res.json({ sessions })
})

app.listen(3000, () => {
  console.log('API server running on port 3000')
})
```

#### 2.4 Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### Step 3: Build WebRTC-to-RTMP Bridge

This is the complex part. You need to:

1. Capture WebRTC stream in browser
2. Send to Node.js server
3. Convert to RTMP format
4. Push to RTMP server

#### 3.1 Install WebRTC Libraries

```bash
npm install socket.io socket.io-client
npm install @types/socket.io
```

#### 3.2 Create WebRTC Bridge Server

**`webrtc-bridge.ts`**:
```typescript
import { Server } from 'socket.io'
import { createServer } from 'http'
import { spawn } from 'child_process'
import express from 'express'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Store active streams
const activeStreams = new Map<string, any>()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('start-stream', async (data: { streamKey: string, rtmpUrl: string }) => {
    const { streamKey, rtmpUrl } = data
    
    // Create FFmpeg process to convert WebRTC to RTMP
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'webm',           // Input format (WebRTC sends WebM)
      '-i', 'pipe:0',         // Read from stdin
      '-c:v', 'libx264',      // Video codec
      '-preset', 'veryfast',  // Encoding speed
      '-tune', 'zerolatency', // Low latency
      '-c:a', 'aac',          // Audio codec
      '-f', 'flv',            // Output format (RTMP uses FLV)
      rtmpUrl                 // RTMP server URL
    ])

    activeStreams.set(socket.id, { ffmpeg, streamKey })

    // Handle FFmpeg output
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`)
    })

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`)
      activeStreams.delete(socket.id)
    })

    // Forward WebRTC data to FFmpeg
    socket.on('stream-data', (chunk: Buffer) => {
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(chunk)
      }
    })

    socket.on('stop-stream', () => {
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.end()
      }
      activeStreams.delete(socket.id)
    })
  })

  socket.on('disconnect', () => {
    const stream = activeStreams.get(socket.id)
    if (stream?.ffmpeg) {
      stream.ffmpeg.kill()
    }
    activeStreams.delete(socket.id)
    console.log('Client disconnected:', socket.id)
  })
})

httpServer.listen(3001, () => {
  console.log('WebRTC bridge server running on port 3001')
})
```

#### 3.3 Update StreamManager to Use WebRTC

Add to `StreamManager.tsx`:

```typescript
import io from 'socket.io-client'

// Add state
const [socket, setSocket] = useState<any>(null)
const [isStreaming, setIsStreaming] = useState(false)

// Initialize socket
useEffect(() => {
  const newSocket = io('http://localhost:3001') // Your bridge server URL
  setSocket(newSocket)
  
  return () => newSocket.close()
}, [])

// Modified startWebcam to stream
const startWebcam = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    })
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
    streamRef.current = stream

    // Create MediaRecorder to capture stream
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket) {
        socket.emit('stream-data', event.data)
      }
    }

    mediaRecorder.start(100) // Send data every 100ms

    // Start streaming to server
    if (socket && streamKey && rtmpUrl) {
      socket.emit('start-stream', {
        streamKey,
        rtmpUrl: `${rtmpUrl}/${streamKey}`
      })
      setIsStreaming(true)
    }
  } catch (error) {
    console.error("Error accessing webcam:", error)
    toast.error("Could not access camera/microphone")
  }
}
```

### Step 4: Deploy Your Media Server

#### Option A: VPS (DigitalOcean, Linode, etc.)

1. Set up Ubuntu server
2. Install Node.js, FFmpeg
3. Deploy your code
4. Use PM2 to keep it running:
   ```bash
   npm install -g pm2
   pm2 start server.ts
   pm2 startup
   ```

#### Option B: Docker

**`Dockerfile`**:
```dockerfile
FROM node:18

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 1935 3000 3001
CMD ["npm", "start"]
```

**`docker-compose.yml`**:
```yaml
version: '3.8'
services:
  media-server:
    build: .
    ports:
      - "1935:1935"  # RTMP
      - "3000:3000"  # API
      - "3001:3001"  # WebRTC Bridge
    volumes:
      - ./media:/app/media
```

### Step 5: Security Considerations

1. **Stream Key Validation**: Verify stream keys against database
2. **Rate Limiting**: Prevent abuse
3. **Authentication**: Require user authentication
4. **CORS**: Configure properly
5. **HTTPS/WSS**: Use secure connections in production

---

## Comparison: Service vs Custom Gateway

| Aspect | Streaming Service | Custom Gateway |
|-------|-------------------|----------------|
| **Setup Time** | 1-2 hours | 1-2 weeks |
| **Maintenance** | None | Ongoing |
| **Cost** | Pay per usage | Server costs |
| **Scalability** | Automatic | Manual |
| **Features** | Many built-in | Build yourself |
| **Reliability** | High | Depends on you |
| **Control** | Limited | Full |

## Recommendation

**For most applications**: Use a streaming service (Mux recommended)
- Faster to implement
- More reliable
- Better features
- Scales automatically

**For special requirements**: Build custom gateway
- Need specific features
- Have technical team
- Want full control
- Have budget for infrastructure

---

## Next Steps

1. **Choose your approach** based on your needs
2. **Set up development environment**
3. **Implement step by step**
4. **Test thoroughly**
5. **Deploy to production**

## Additional Resources

- [Mux Documentation](https://docs.mux.com/)
- [Node Media Server](https://github.com/illuspas/Node-Media-Server)
- [WebRTC Samples](https://webrtc.github.io/samples/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
