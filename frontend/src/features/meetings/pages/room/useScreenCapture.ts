import { useRef, useEffect } from "react";
import { LocalTrackPublication } from "livekit-client";
import apiClient from "@/lib/apiClient";

// ─── SSIM helpers ────────────────────────────────────────────────────────────

function getGrayscale(rgbaData: Uint8ClampedArray): Float32Array {
  const len = rgbaData.length / 4;
  const grayscale = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const r = rgbaData[i * 4];
    const g = rgbaData[i * 4 + 1];
    const b = rgbaData[i * 4 + 2];
    grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return grayscale;
}

function calculateSSIM(img1: Float32Array, img2: Float32Array): number {
  const N = img1.length;
  const C1 = 6.5025;
  const C2 = 58.5225;

  let sumX = 0,
    sumY = 0;
  for (let i = 0; i < N; i++) {
    sumX += img1[i];
    sumY += img2[i];
  }
  const muX = sumX / N;
  const muY = sumY / N;

  let varX = 0,
    varY = 0,
    covXY = 0;
  for (let i = 0; i < N; i++) {
    const diffX = img1[i] - muX;
    const diffY = img2[i] - muY;
    varX += diffX * diffX;
    varY += diffY * diffY;
    covXY += diffX * diffY;
  }
  const sigmaX2 = varX / (N - 1 || 1);
  const sigmaY2 = varY / (N - 1 || 1);
  const sigmaXY = covXY / (N - 1 || 1);

  const numerator = (2 * muX * muY + C1) * (2 * sigmaXY + C2);
  const denominator =
    (muX * muX + muY * muY + C1) * (sigmaX2 + sigmaY2 + C2);

  return numerator / (denominator || 1);
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** SSIM threshold: frame differences below this are considered the same slide */
const SSIM_SIMILARITY_THRESHOLD = 0.95;

/** How often (ms) to check for slide changes — throttled to reduce Gemini API load */
const CAPTURE_INTERVAL_MS = 30_000;

/** Size of the tiny canvas used for SSIM-based change detection */
const CHECK_CANVAS_SIZE = 64;

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseScreenCaptureOptions {
  meetingId: string;
  isRecording: boolean;
  recordingStartTimeRef: React.MutableRefObject<number | null>;
  /** Hidden <video> element that the screen share track is attached to */
  hiddenVideoRef: React.RefObject<HTMLVideoElement>;
  screenShareTrack: LocalTrackPublication | undefined;
  isScreenShareEnabled: boolean;
}

/**
 * Captures screen share frames every `CAPTURE_INTERVAL_MS` and uploads only
 * when SSIM detects a meaningful visual change (i.e. slide change).
 *
 * Requires the caller to:
 * 1. Render a hidden <video ref={hiddenVideoRef} /> element.
 * 2. Keep `hiddenVideoRef` and `screenShareTrack` in sync (attach/detach).
 */
export function useScreenCapture({
  meetingId,
  isRecording,
  recordingStartTimeRef,
  hiddenVideoRef,
  screenShareTrack,
  isScreenShareEnabled,
}: UseScreenCaptureOptions) {
  const prevPixelsRef = useRef<Float32Array | null>(null);

  // Attach/detach the screen share track to the hidden video element
  useEffect(() => {
    const videoEl = hiddenVideoRef.current;
    if (!videoEl || !screenShareTrack?.track) return;

    const track = screenShareTrack.track;
    track.attach(videoEl);

    return () => {
      track.detach(videoEl);
    };
  }, [screenShareTrack, hiddenVideoRef]);

  // Periodic SSIM-based frame diff → upload on slide change
  useEffect(() => {
    if (!isScreenShareEnabled || !screenShareTrack?.track || !isRecording) {
      prevPixelsRef.current = null;
      return;
    }

    const intervalId = setInterval(() => {
      const videoEl = hiddenVideoRef.current;
      if (!videoEl || videoEl.paused || videoEl.ended) return;

      try {
        // 1. Tiny canvas for fast change detection
        const checkCanvas = document.createElement("canvas");
        checkCanvas.width = CHECK_CANVAS_SIZE;
        checkCanvas.height = CHECK_CANVAS_SIZE;
        const checkCtx = checkCanvas.getContext("2d");
        if (!checkCtx) return;

        checkCtx.drawImage(videoEl, 0, 0, CHECK_CANVAS_SIZE, CHECK_CANVAS_SIZE);
        const imgData = checkCtx.getImageData(0, 0, CHECK_CANVAS_SIZE, CHECK_CANVAS_SIZE).data;
        const currentGray = getGrayscale(imgData);

        let hasChanged = false;
        if (!prevPixelsRef.current) {
          hasChanged = true;
        } else {
          const ssim = calculateSSIM(prevPixelsRef.current, currentGray);
          // Small edits (typing 1-2 chars) keep SSIM > threshold → treated as same slide
          if (ssim < SSIM_SIMILARITY_THRESHOLD) {
            hasChanged = true;
          }
        }

        if (!hasChanged) return;

        // Update anchor frame
        prevPixelsRef.current = currentGray;

        // 2. High-res upload canvas (native resolution, JPEG 92%)
        const width = videoEl.videoWidth || 1920;
        const height = videoEl.videoHeight || 1080;

        const uploadCanvas = document.createElement("canvas");
        uploadCanvas.width = width;
        uploadCanvas.height = height;
        const uploadCtx = uploadCanvas.getContext("2d");
        if (!uploadCtx) return;

        uploadCtx.drawImage(videoEl, 0, 0, width, height);
        uploadCanvas.toBlob(
          async (blob) => {
            if (!blob || !meetingId) return;

            const elapsedSeconds = recordingStartTimeRef.current
              ? (Date.now() - recordingStartTimeRef.current) / 1000
              : 0;

            const formData = new FormData();
            formData.append("image", blob, `capture_${Date.now()}.jpg`);
            formData.append("timestamp", String(Math.round(elapsedSeconds)));

            try {
              await apiClient.post(
                `/meetings/${meetingId}/screen-captures`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
              );
            } catch (err) {
              console.error("[ScreenCapture] Failed to upload:", err);
            }
          },
          "image/jpeg",
          0.92,
        );
      } catch (err) {
        console.error("[ScreenCapture] Error capturing frame:", err);
      }
    }, CAPTURE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    isScreenShareEnabled,
    screenShareTrack,
    isRecording,
    meetingId,
    hiddenVideoRef,
    recordingStartTimeRef,
  ]);
}

// Re-export helpers so callers don't need to duplicate them
export { getGrayscale, calculateSSIM };
