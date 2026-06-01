import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Extract a YouTube video id from common URL shapes (watch, youtu.be, embed, shorts).
export function parseYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1) || null;
    if (host.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // Not a URL — maybe it's already a raw id.
    if (/^[\w-]{11}$/.test(url)) return url;
  }
  return null;
}

// Lazily load the YouTube IFrame API script once for the whole app.
let apiPromise = null;
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/**
 * YouTube player that exposes imperative controls to the parent:
 *   ref.current.getCurrentTime() -> seconds (number)
 *   ref.current.seekTo(seconds)
 * Used by the video-assisted tagging screen to stamp and replay events.
 */
const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId }, ref) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      try {
        return Math.floor(playerRef.current?.getCurrentTime?.() ?? 0);
      } catch {
        return 0;
      }
    },
    seekTo: (seconds) => {
      try {
        playerRef.current?.seekTo?.(Math.max(0, seconds), true);
        playerRef.current?.playVideo?.();
      } catch {
        /* ignore */
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    if (!videoId) return undefined;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      // Tear down any previous player before creating a new one.
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => !cancelled && setReady(true) },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
      }
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <Box
        sx={{
          aspectRatio: '16 / 9',
          bgcolor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Add a YouTube link to enable video-assisted tagging.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', aspectRatio: '16 / 9', '& iframe': { width: '100%', height: '100%', border: 0, borderRadius: 4 } }}>
      <Box ref={hostRef} sx={{ width: '100%', height: '100%' }} />
      {!ready && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">Loading video…</Typography>
        </Box>
      )}
    </Box>
  );
});

export default YouTubePlayer;
