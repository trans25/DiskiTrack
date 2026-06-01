import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import YouTubePlayer, { parseYouTubeId } from './YouTubePlayer.jsx';

// A source is treated as YouTube only when we can extract a video id from it.
// Anything else (e.g. /uploads/videos/abc.mp4 or a direct .mp4 URL) plays in a
// native HTML5 <video> element, which supports seeking via currentTime.
export function isYouTubeSource(url) {
  return !!parseYouTubeId(url);
}

/**
 * Unified match video player for video-assisted tagging.
 * Exposes the same imperative API regardless of source type:
 *   ref.current.getCurrentTime() -> seconds
 *   ref.current.seekTo(seconds)
 */
const MatchVideoPlayer = forwardRef(function MatchVideoPlayer({ src }, ref) {
  const ytRef = useRef(null);
  const videoRef = useRef(null);
  const isYouTube = isYouTubeSource(src);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      if (isYouTube) return ytRef.current?.getCurrentTime?.() ?? 0;
      try {
        return Math.floor(videoRef.current?.currentTime ?? 0);
      } catch {
        return 0;
      }
    },
    seekTo: (seconds) => {
      if (isYouTube) {
        ytRef.current?.seekTo?.(seconds);
        return;
      }
      try {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, seconds);
          videoRef.current.play?.();
        }
      } catch {
        /* ignore */
      }
    },
  }));

  if (!src) {
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
          Add a YouTube link or upload a video to enable video-assisted tagging.
        </Typography>
      </Box>
    );
  }

  if (isYouTube) {
    return <YouTubePlayer ref={ytRef} videoId={parseYouTubeId(src)} />;
  }

  return (
    <Box sx={{ aspectRatio: '16 / 9', bgcolor: '#000', borderRadius: 1, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </Box>
  );
});

export default MatchVideoPlayer;
