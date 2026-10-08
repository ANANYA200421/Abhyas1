import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { handTracker } from '../gestures/handTracker';
import { gestureRecognizer } from '../gestures/gestureRecognizer';
import { actionMapper } from '../gestures/actionMapper';
import type { RecognizedGesture } from '../gestures/types';

export interface WebcamTelemetry {
  isHandDetected: boolean;
  fps: number;
  currentGesture?: RecognizedGesture;
}

export interface WebcamViewHandle {
  getVideoElement: () => HTMLVideoElement | null;
  getCanvasElement: () => HTMLCanvasElement | null;
}

interface WebcamViewProps {
  onTelemetryUpdate?: (telemetry: WebcamTelemetry) => void;
  className?: string;
  overlayChildren?: React.ReactNode;
  showSkeletonOverlay?: boolean;
}

type CameraErrorType = 'permission_denied' | 'not_found' | 'already_in_use' | 'other' | null;

export const WebcamView = forwardRef<WebcamViewHandle, WebcamViewProps>(({
  onTelemetryUpdate,
  className = '',
  overlayChildren,
  showSkeletonOverlay = true,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorType, setErrorType] = useState<CameraErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Performance telemetry refs to avoid per-frame React re-renders
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(0);
  const lastTelemetryUpdateRef = useRef<number>(0);
  const lastDetectedStateRef = useRef<boolean>(false);

  // Expose video and canvas elements to parent components via ref
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getCanvasElement: () => canvasRef.current,
  }));

  // Cleanly terminate camera tracks and frame loop
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    actionMapper.reset();
  }, []);

  // Frame processing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState >= 2) {
      if (canvas && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const now = performance.now();

      // Calculate real-time FPS
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) {
        currentFpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // 1. Detect Hand with MediaPipe
      const { hasHand, landmarks } = handTracker.detectHand(video, now);

      // 2. Gesture Recognition & Action Mapping
      let gesture: RecognizedGesture;
      if (hasHand && landmarks) {
        gesture = gestureRecognizer.recognize(landmarks, now);
        actionMapper.processGesture(gesture, now);
      } else {
        gesture = { type: 'NONE', confidence: 0, cursor: { x: 0.5, y: 0.5 } };
        actionMapper.processGesture(gesture, now);
      }

      // 3. Draw Landmark Skeleton on Canvas Overlay (if enabled)
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (hasHand && landmarks && showSkeletonOverlay) {
            handTracker.drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
          }
        }
      }

      // 4. Send throttled telemetry update to React UI (~200ms interval)
      if (
        onTelemetryUpdate &&
        (now - lastTelemetryUpdateRef.current >= 200 ||
          hasHand !== lastDetectedStateRef.current)
      ) {
        lastTelemetryUpdateRef.current = now;
        lastDetectedStateRef.current = hasHand;
        onTelemetryUpdate({
          isHandDetected: hasHand,
          fps: currentFpsRef.current || 30,
          currentGesture: gesture,
        });
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [onTelemetryUpdate, showSkeletonOverlay]);

  // Request camera and initialize MediaPipe
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setErrorType(null);
    setErrorMessage('');

    try {
      await handTracker.initialize();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsLoading(false);
            if (animationFrameRef.current === null) {
              animationFrameRef.current = requestAnimationFrame(processFrame);
            }
          }).catch((err) => {
            console.error('Video playback failed:', err);
          });
        };
      }
    } catch (err: unknown) {
      setIsLoading(false);
      console.error('Webcam initialization failed:', err);

      const error = err as { name?: string; message?: string };
      const name = error?.name || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorType('permission_denied');
        setErrorMessage(
          'Camera permission denied. Please allow camera access in your browser settings to enable gesture tracking.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorType('not_found');
        setErrorMessage(
          'No camera found. Please connect a standard webcam to use Abhyas.'
        );
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorType('already_in_use');
        setErrorMessage(
          'Camera is already in use by another application or tab. Please close other camera apps and retry.'
        );
      } else {
        setErrorType('other');
        setErrorMessage(
          error?.message || 'Unable to access webcam. Please check your camera connection.'
        );
      }
    }
  }, [processFrame]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#1E0C29] flex items-center justify-center ${className}`}
    >
      {/* Video Feed (Mirrored) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover scale-x-[-1]"
        style={{ display: errorType ? 'none' : 'block' }}
      />

      {/* Hand skeleton tracking canvas overlay (Mirrored) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1] z-10"
        style={{ display: errorType ? 'none' : 'block' }}
      />

      {/* Loading state */}
      {isLoading && !errorType && (
        <div className="absolute inset-0 bg-[#F5E6F8]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
          <div className="w-10 h-10 rounded-full border-3 border-[#A55FC6] border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold text-[#4A2160]">
            Initializing camera &amp; spatial hand tracking...
          </p>
        </div>
      )}

      {/* Error state message banner */}
      {errorType && (
        <div className="absolute inset-0 bg-[#FFF7FC] flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-14 h-14 rounded-full bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center mb-3 shadow-sm">
            <span className="material-symbols-outlined text-[28px]">
              {errorType === 'permission_denied'
                ? 'videocam_off'
                : errorType === 'not_found'
                ? 'no_photography'
                : 'error'}
            </span>
          </div>

          <h4 className="text-base font-bold text-[#2F0346] mb-1">
            {errorType === 'permission_denied' && 'Camera Permission Denied'}
            {errorType === 'not_found' && 'No Camera Detected'}
            {errorType === 'already_in_use' && 'Camera Already in Use'}
            {errorType === 'other' && 'Camera Unavailable'}
          </h4>

          <p className="text-xs text-[#4D4350] max-w-sm mb-4 leading-relaxed">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={startCamera}
            className="px-5 py-2 rounded-full bg-[#A55FC6] hover:bg-[#7A3A9A] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Camera Access</span>
          </button>
        </div>
      )}

      {/* Custom overlays */}
      {overlayChildren && !errorType && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {overlayChildren}
        </div>
      )}
    </div>
  );
});

WebcamView.displayName = 'WebcamView';
