import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCw, ImagePlus, ArrowLeft, MapPin, Globe } from 'lucide-react';

/* ---------- Token system ----------
   Subject: KILIFAIR 2026 — minimal camera-first post creation flow:
   take a photo, pick one from the gallery, flip the camera, write a
   caption, optionally drop a location pin, and post it.

   Palette — pulled from the app's own wallet screen (the violet→purple
   balance card and lavender surfaces), not a generic dark-app accent.
   - void     #0E0B1F   base background — deep indigo-violet
   - glass    rgba(255,255,255,0.05)
   - hairline rgba(255,255,255,0.12)
   - violet   #6E4FE0   gradient start, from the wallet card
   - purple   #A35CFF   gradient end, from the wallet card
   - lilac    #C9BCFB   light accent (the wallet's pale highlight circles)
   - ink      #F3F1FC
   - mute     rgba(243,241,252,0.55)

   Type
   - Display/UI: Space Grotesk
   - Body:       Inter

   Signature
   - The shutter: a glowing violet→purple ring, breathing gently —
     the same gradient as the wallet balance card, carried into the
     camera as the one bold element on a quiet, dark screen.
------------------------------------- */

const C = {
  void: '#0E0B1F',
  glass: 'rgba(255,255,255,0.05)',
  glass2: 'rgba(255,255,255,0.09)',
  hairline: 'rgba(255,255,255,0.12)',
  violet: '#6E4FE0',
  purple: '#A35CFF',
  lilac: '#C9BCFB',
  ink: '#F3F1FC',
  mute: 'rgba(243,241,252,0.55)',
};

const GRADIENT = `linear-gradient(135deg, ${C.violet}, ${C.purple})`;
const CHAR_LIMIT = 240;

const AUDIENCES = ['Everyone', 'Exhibitors', 'Ticket holders'];

function GlassButton({ icon, size = 44, onClick, label }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${C.hairline}`,
        background: hover ? C.glass2 : C.glass,
        color: C.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        transition: 'background 0.15s ease, transform 0.15s ease',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {icon}
    </button>
  );
}

function Viewfinder() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 30% 20%, rgba(110,79,224,0.35), transparent 60%),
          radial-gradient(ellipse 70% 50% at 80% 75%, rgba(163,92,255,0.28), transparent 60%),
          linear-gradient(180deg, #18142E 0%, #100D20 60%, #0E0B1F 100%)
        `,
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
        <line x1="33.3%" y1="0" x2="33.3%" y2="100%" stroke="white" strokeWidth="1" />
        <line x1="66.6%" y1="0" x2="66.6%" y2="100%" stroke="white" strokeWidth="1" />
        <line x1="0" y1="33.3%" x2="100%" y2="33.3%" stroke="white" strokeWidth="1" />
        <line x1="0" y1="66.6%" x2="100%" y2="66.6%" stroke="white" strokeWidth="1" />
      </svg>
    </div>
  );
}

function ShutterButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Take photo"
      style={{
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: GRADIENT,
          filter: 'blur(15px)',
          opacity: 0.65,
          animation: 'breathe 2.6s ease-in-out infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: GRADIENT,
          padding: 4,
        }}
      >
        <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: C.void }} />
      </span>
      <span style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: GRADIENT }} />
    </button>
  );
}

function PreviewArt() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse 70% 60% at 25% 15%, rgba(163,92,255,0.45), transparent 55%),
          radial-gradient(ellipse 70% 60% at 80% 85%, rgba(110,79,224,0.5), transparent 55%),
          linear-gradient(160deg, #211A3D 0%, #100D20 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg width="100%" height="60%" viewBox="0 0 390 240" style={{ position: 'absolute', bottom: 0 }} preserveAspectRatio="none">
        <path d="M0 240 L70 90 L130 160 L190 50 L260 150 L330 100 L390 240 Z" fill="#0E0B1F" opacity="0.85" />
        <path d="M190 50 L215 85 L165 85 Z" fill="#F3F1FC" opacity="0.18" />
      </svg>
    </div>
  );
}

export default function KilifairCreate() {
  const [view, setView] = useState('camera');
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState('Everyone');
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [caption]);

  const remaining = CHAR_LIMIT - caption.length;
  const canPost = caption.trim().length > 0 && remaining >= 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        textarea::placeholder { color: ${C.mute}; }
        @keyframes breathe {
          0%, 100% { opacity: 0.55; transform: scale(0.96); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          width: 390,
          maxWidth: '100%',
          height: 780,
          borderRadius: 40,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 30px 90px -20px rgba(110,79,224,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
          background: C.void,
        }}
      >
        {view === 'camera' ? (
          <CameraView onCapture={() => setView('compose')} />
        ) : (
          <ComposeView
            caption={caption}
            setCaption={setCaption}
            audience={audience}
            setAudience={setAudience}
            audienceOpen={audienceOpen}
            setAudienceOpen={setAudienceOpen}
            locationOn={locationOn}
            setLocationOn={setLocationOn}
            remaining={remaining}
            canPost={canPost}
            onBack={() => setView('camera')}
            textareaRef={textareaRef}
          />
        )}
      </div>
    </div>
  );
}

function CameraView({ onCapture }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Viewfinder />

      {/* Top bar — just close */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 16px', zIndex: 2 }}>
        <GlassButton icon={<X size={18} />} size={38} label="Close" />
      </div>

      {/* Bottom controls */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 28px 30px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Add from gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onCapture}
            aria-label="Add photo from gallery"
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              border: `1.5px solid ${C.hairline}`,
              background: `linear-gradient(160deg, #211A3D, #100D20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: C.mute,
            }}
          >
            <ImagePlus size={20} />
          </button>
          <span style={{ fontSize: 12, color: C.mute }}>Gallery</span>
        </div>

        <ShutterButton onClick={onCapture} />

        {/* Flip camera */}
        <GlassButton icon={<RotateCw size={18} />} size={50} onClick={() => {}} label="Flip camera" />
      </div>
    </div>
  );
}

function ComposeView({
  caption, setCaption, audience, setAudience,
  audienceOpen, setAudienceOpen, locationOn, setLocationOn,
  remaining, canPost, onBack, textareaRef,
}) {
  const over = remaining < 0;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.35s ease' }}>
      <div style={{ flex: '1 1 auto', position: 'relative', minHeight: 0 }}>
        <PreviewArt />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 16px' }}>
          <GlassButton icon={<ArrowLeft size={17} />} size={38} onClick={onBack} label="Back" />
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          background: 'rgba(18,14,32,0.92)',
          backdropFilter: 'blur(18px)',
          borderTop: `1px solid ${C.hairline}`,
          borderRadius: '24px 24px 0 0',
          padding: '18px 18px 22px',
          marginTop: -24,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <textarea
          ref={textareaRef}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Tell people what's happening at the fair..."
          rows={1}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            color: C.ink,
            fontSize: 16,
            lineHeight: 1.5,
            minHeight: 44,
          }}
        />

        {/* Location + audience */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setLocationOn((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: `1px solid ${locationOn ? 'transparent' : C.hairline}`,
              background: locationOn ? GRADIENT : C.glass,
              color: locationOn ? '#0E0B1F' : C.mute,
              fontSize: 13,
              fontWeight: locationOn ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <MapPin size={14} />
            {locationOn ? 'Location added' : 'Add location'}
          </button>

          <button
            onClick={() => setAudienceOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: `1px solid ${C.hairline}`,
              background: C.glass,
              color: C.ink,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            <Globe size={14} />
            {audience}
          </button>

          {audienceOpen && (
            <div
              style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                background: '#1C1733',
                border: `1px solid ${C.hairline}`,
                borderRadius: 12,
                overflow: 'hidden',
                zIndex: 10,
                minWidth: 150,
                boxShadow: '0 12px 30px -10px rgba(0,0,0,0.6)',
              }}
            >
              {AUDIENCES.map((a) => (
                <div
                  key={a}
                  onClick={() => { setAudience(a); setAudienceOpen(false); }}
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: a === audience ? 600 : 400,
                    color: C.ink,
                    background: a === audience ? 'rgba(110,79,224,0.22)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: over ? '#FF6B6B' : C.mute,
              letterSpacing: '0.04em',
            }}
          >
            {remaining < 24 ? `${remaining} LEFT` : 'KILIFAIR 2026 · PUBLIC FEED'}
          </span>

          <button
            disabled={!canPost}
            style={{
              fontWeight: 700,
              fontSize: 14,
              padding: '11px 30px',
              borderRadius: 100,
              border: 'none',
              cursor: canPost ? 'pointer' : 'default',
              color: canPost ? '#0E0B1F' : C.mute,
              background: canPost ? GRADIENT : 'rgba(255,255,255,0.08)',
              boxShadow: canPost ? '0 6px 22px -4px rgba(110,79,224,0.6)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
