import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface HandTrackerResult {
  hasHand: boolean;
  landmarks: NormalizedLandmark[] | null;
}

// 21-point hand connections defined by MediaPipe
export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

class HandTrackerService {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private lastVideoTime = -1;

  /**
   * Initializes MediaPipe HandLandmarker with GPU delegate and video running mode.
   * If GPU is unavailable on the machine, falls back gracefully to CPU.
   */
  async initialize(): Promise<void> {
    if (this.handLandmarker) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed or unsupported, falling back to CPU:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      }
    } catch (err) {
      console.error('Failed to initialize MediaPipe HandLandmarker:', err);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Detects hand landmarks from the given video element in real-time.
   */
  detectHand(video: HTMLVideoElement, timestamp: number): HandTrackerResult {
    if (!this.handLandmarker) {
      return { hasHand: false, landmarks: null };
    }

    // Video must have valid dimensions and frame ready
    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return { hasHand: false, landmarks: null };
    }

    // Process only when new frame is available or timestamp advanced
    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      try {
        const result: HandLandmarkerResult = this.handLandmarker.detectForVideo(
          video,
          timestamp
        );

        if (result.landmarks && result.landmarks.length > 0) {
          return {
            hasHand: true,
            landmarks: result.landmarks[0],
          };
        }
      } catch (err) {
        console.warn('Error during hand landmark detection:', err);
      }
    }

    return { hasHand: false, landmarks: null };
  }

  /**
   * Draws the 21 hand landmarks and connection lines onto a canvas overlay.
   */
  drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ): void {
    if (!landmarks || landmarks.length !== 21) return;

    // Draw skeletal connector lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D988ED'; // Gesture affirmation lavender from DESIGN.md
    ctx.shadowColor = 'rgba(165, 95, 198, 0.6)';
    ctx.shadowBlur = 6;

    for (const connection of HAND_CONNECTIONS) {
      const startPoint = landmarks[connection.start];
      const endPoint = landmarks[connection.end];

      if (!startPoint || !endPoint) continue;

      const startX = startPoint.x * width;
      const startY = startPoint.y * height;
      const endX = endPoint.x * width;
      const endY = endPoint.y * height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Reset shadow blur for individual landmark circles
    ctx.shadowBlur = 0;

    // Draw the 21 individual landmark joints
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * width;
      const y = landmark.y * height;

      // Highlight fingertips (Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20)
      const isFingertip = [4, 8, 12, 16, 20].includes(index);
      const isIndexTip = index === 8; // Primary drawing index pointer

      ctx.beginPath();
      if (isIndexTip) {
        // Prominent emerald green highlight on index tip for drawing gesture
        ctx.arc(x, y, 6.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      } else if (isFingertip) {
        // Fingertip points in vibrant primary purple
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#A55FC6';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      } else {
        // Standard joint nodes
        ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#7A3A9A';
        ctx.stroke();
      }
    });
  }

  /**
   * Disposes of the model instance when no longer needed.
   */
  dispose(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}

export const handTracker = new HandTrackerService();
