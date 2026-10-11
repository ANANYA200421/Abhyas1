import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { RecognizedGesture, GestureType, Point2D } from './types.ts';

/**
 * Calculates Euclidean distance between two 3D or 2D landmarks.
 */
export function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Evaluates whether a finger is extended outward.
 */
export function isFingerExtended(
  wrist: NormalizedLandmark,
  mcp: NormalizedLandmark,
  pip: NormalizedLandmark,
  dip: NormalizedLandmark,
  tip: NormalizedLandmark
): boolean {
  const dWristTip = distance(wrist, tip);
  const dWristPip = distance(wrist, pip);
  const dWristDip = distance(wrist, dip);
  const dMcpTip = distance(mcp, tip);
  const dMcpPip = distance(mcp, pip);
  return dWristTip > dWristPip * 1.08 && dWristTip > dWristDip && dMcpTip > dMcpPip * 1.1;
}

/**
 * Evaluates whether a finger is curled into the palm.
 */
export function isFingerCurled(
  wrist: NormalizedLandmark,
  mcp: NormalizedLandmark,
  pip: NormalizedLandmark,
  tip: NormalizedLandmark
): boolean {
  const dWristTip = distance(wrist, tip);
  const dWristPip = distance(wrist, pip);
  const dMcpTip = distance(mcp, tip);
  const dMcpPip = distance(mcp, pip);
  return dWristTip < dWristPip * 1.05 || dMcpTip < dMcpPip * 1.05;
}

export class GestureRecognizer {
  // Swipe velocity tracker over a ~300ms window
  private palmHistory: { x: number; y: number; time: number }[] = [];

  // Schmitt-trigger hysteresis state for pinch to prevent edge jitter
  private isPinchingState = false;

  private lastStage2LogTime = 0;
  private lastStage2Gesture: GestureType = 'NONE';

  /**
   * Recognizes gestures from 21 MediaPipe hand landmarks.
   */
  recognize(
    landmarks: NormalizedLandmark[],
    timestamp: number = performance.now()
  ): RecognizedGesture {
    if (
      !landmarks ||
      landmarks.length !== 21 ||
      !landmarks.every((pt) => pt && Number.isFinite(pt.x) && Number.isFinite(pt.y))
    ) {
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
    const indexDip = landmarks[7];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleDip = landmarks[11];
    const middleTip = landmarks[12];
    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringDip = landmarks[15];
    const ringTip = landmarks[16];
    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyDip = landmarks[19];
    const pinkyTip = landmarks[20];

    // Determine extension and curling of each finger
    const isIndexExt = isFingerExtended(wrist, indexMcp, indexPip, indexDip, indexTip);
    const isMiddleExt = isFingerExtended(wrist, middleMcp, middlePip, middleDip, middleTip);
    const isRingExt = isFingerExtended(wrist, ringMcp, ringPip, ringDip, ringTip);
    const isPinkyExt = isFingerExtended(wrist, pinkyMcp, pinkyPip, pinkyDip, pinkyTip);

    const isIndexC = isFingerCurled(wrist, indexMcp, indexPip, indexTip);
    const isMiddleC = isFingerCurled(wrist, middleMcp, middlePip, middleTip);
    const isRingC = isFingerCurled(wrist, ringMcp, ringPip, ringTip);
    const isPinkyC = isFingerCurled(wrist, pinkyMcp, pinkyPip, pinkyTip);

    const allFourCurled = isIndexC && isMiddleC && isRingC && isPinkyC;

    // Pinch distance between thumb tip (4) and index tip (8)
    const pinchDist = distance(thumbTip, indexTip);

    // Hysteresis threshold: tighter threshold to initiate, relaxed to hold
    const isPinchingCandidate = this.isPinchingState
      ? pinchDist < 0.080
      : pinchDist < 0.055;

    let gestureType: GestureType = 'NONE';
    let confidence = 0.95;

    // Classification decision hierarchy:
    // 1. FIST: when all 4 fingers are tightly curled into the palm.
    //    Guarantees closed fist will never accidentally trigger a pinch click.
    if (allFourCurled) {
      gestureType = 'FIST';
      confidence = 0.96;
      this.isPinchingState = false;
    } else if (isPinchingCandidate) {
      // 2. PINCH: thumb and index tips are together (and fingers are not in a closed fist)
      gestureType = 'PINCH';
      this.isPinchingState = true;
      confidence = Math.max(0.7, Math.min(0.99, 1 - pinchDist / 0.1));
    } else {
      this.isPinchingState = false;

      // 3. OPEN_PALM: all four fingers extended outward
      if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
        gestureType = 'OPEN_PALM';
        confidence = 0.97;
      }
      // 4. TWO_FINGERS: index and middle extended; ring and pinky not extended
      else if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
        gestureType = 'TWO_FINGERS';
        confidence = 0.95;
      }
      // 5. INDEX_POINT: index extended; middle, ring, pinky not extended
      else if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
        gestureType = 'INDEX_POINT';
        confidence = 0.98;
      }
    }

    if (gestureType !== 'NONE') {
      if (gestureType !== this.lastStage2Gesture || timestamp - this.lastStage2LogTime >= 1000) {
        this.lastStage2LogTime = timestamp;
        this.lastStage2Gesture = gestureType;
        console.log(`[Abhyas:Stage2] Recognized Gesture: ${gestureType} (${confidence.toFixed(2)})`);
      }
    }

    // Determine targeted cursor anchor point based on active gesture
    let rawCursorX = indexTip.x;
    let rawCursorY = indexTip.y;

    if (gestureType === 'PINCH') {
      rawCursorX = (thumbTip.x + indexTip.x) / 2;
      rawCursorY = (thumbTip.y + indexTip.y) / 2;
    } else if (gestureType === 'TWO_FINGERS') {
      rawCursorX = (indexTip.x + middleTip.x) / 2;
      rawCursorY = (indexTip.y + middleTip.y) / 2;
    } else if (gestureType === 'OPEN_PALM') {
      rawCursorX = (wrist.x + indexMcp.x + pinkyMcp.x) / 3;
      rawCursorY = (wrist.y + indexMcp.y + pinkyMcp.y) / 3;
    } else if (gestureType === 'FIST') {
      rawCursorX = (indexMcp.x + middleMcp.x) / 2;
      rawCursorY = (indexMcp.y + middleMcp.y) / 2;
    } else if (gestureType === 'NONE') {
      rawCursorX = isIndexExt ? indexTip.x : (wrist.x + indexMcp.x) / 2;
      rawCursorY = isIndexExt ? indexTip.y : (wrist.y + indexMcp.y) / 2;
    }

    // Mirrored cursor coordinates (horizontal mirror: x -> 1 - rawCursorX)
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
    this.isPinchingState = false;
  }
}

export const gestureRecognizer = new GestureRecognizer();
