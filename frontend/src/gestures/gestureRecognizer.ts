import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { RecognizedGesture, GestureType, Point2D } from './types';

/**
 * Calculates Euclidean distance between two 3D or 2D landmarks.
 */
function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.hypot(dx, dy, dz);
}

export class GestureRecognizer {
  // Swipe velocity tracker over a ~300ms window
  private palmHistory: { x: number; y: number; time: number }[] = [];

  /**
   * Recognizes gestures from 21 MediaPipe hand landmarks.
   */
  recognize(landmarks: NormalizedLandmark[], timestamp: number = performance.now()): RecognizedGesture {
    if (!landmarks || landmarks.length !== 21) {
      return {
        type: 'NONE',
        confidence: 0,
        cursor: { x: 0.5, y: 0.5 },
      };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];
    const middlePip = landmarks[10];
    const middleTip = landmarks[12];
    const ringPip = landmarks[14];
    const ringTip = landmarks[16];
    const pinkyPip = landmarks[18];
    const pinkyTip = landmarks[20];

    // Determine extension of each finger
    const isIndexExtended = distance(wrist, indexTip) > distance(wrist, indexPip) * 1.12;
    const isMiddleExtended = distance(wrist, middleTip) > distance(wrist, middlePip) * 1.12;
    const isRingExtended = distance(wrist, ringTip) > distance(wrist, ringPip) * 1.12;
    const isPinkyExtended = distance(wrist, pinkyTip) > distance(wrist, pinkyPip) * 1.12;

    // Pinch distance between thumb tip (4) and index tip (8)
    const pinchDist = distance(thumbTip, indexTip);
    const isPinching = pinchDist < 0.065;

    // Calculate mirrored cursor point (horizontal mirror: x -> 1 - x)
    const rawCursorX = isIndexExtended ? indexTip.x : (wrist.x + middleTip.x) / 2;
    const rawCursorY = isIndexExtended ? indexTip.y : (wrist.y + middleTip.y) / 2;
    const cursor: Point2D = {
      x: Math.max(0, Math.min(1, 1 - rawCursorX)),
      y: Math.max(0, Math.min(1, rawCursorY)),
    };

    // Track palm position for swipe velocity (using palm center approximation)
    const palmCenter = {
      x: 1 - (wrist.x + indexMcp.x + landmarks[17].x) / 3,
      y: (wrist.y + indexMcp.y + landmarks[17].y) / 3,
      time: timestamp,
    };
    this.palmHistory.push(palmCenter);
    // Keep only last ~350ms
    this.palmHistory = this.palmHistory.filter((p) => timestamp - p.time <= 350);

    let gestureType: GestureType = 'NONE';
    let confidence = 0.95;

    if (isPinching) {
      gestureType = 'PINCH';
      confidence = Math.max(0.7, 1 - pinchDist / 0.08);
    } else if (
      !isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      gestureType = 'FIST';
      confidence = 0.96;
    } else if (
      isIndexExtended &&
      isMiddleExtended &&
      isRingExtended &&
      isPinkyExtended
    ) {
      gestureType = 'OPEN_PALM';
      confidence = 0.97;
    } else if (
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      gestureType = 'TWO_FINGERS';
      confidence = 0.94;
    } else if (
      isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      gestureType = 'INDEX_POINT';
      confidence = 0.98;
    }

    return {
      type: gestureType,
      confidence,
      cursor,
      rawLandmarks: landmarks,
      pinchDistance: pinchDist,
    };
  }

  /**
   * Evaluates horizontal swipe velocity over a ~300ms window.
   * Returns 'LEFT', 'RIGHT', or null.
   */
  checkSwipe(): 'LEFT' | 'RIGHT' | null {
    if (this.palmHistory.length < 4) return null;
    const oldest = this.palmHistory[0];
    const newest = this.palmHistory[this.palmHistory.length - 1];
    const dt = newest.time - oldest.time;
    if (dt < 150) return null; // Need sufficient window

    const dx = newest.x - oldest.x;
    const velocity = dx / dt; // Normalized units per millisecond

    // Threshold for deliberate swipe
    if (velocity > 0.0018 && dx > 0.18) {
      this.palmHistory = []; // Reset after trigger
      return 'RIGHT';
    } else if (velocity < -0.0018 && dx < -0.18) {
      this.palmHistory = []; // Reset after trigger
      return 'LEFT';
    }

    return null;
  }

  reset(): void {
    this.palmHistory = [];
  }
}

export const gestureRecognizer = new GestureRecognizer();
