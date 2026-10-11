import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Creates a valid 21-point MediaPipe hand landmark skeleton.
 */
export function build21Landmarks(overrides: Partial<Record<number, { x: number; y: number; z?: number }>> = {}): NormalizedLandmark[] {
  // Base relaxed hand skeleton layout
  const base: NormalizedLandmark[] = [
    { x: 0.50, y: 0.80, z: 0, visibility: 1 }, // 0: Wrist
    { x: 0.45, y: 0.74, z: 0, visibility: 1 }, // 1: Thumb CMC
    { x: 0.42, y: 0.68, z: 0, visibility: 1 }, // 2: Thumb MCP
    { x: 0.39, y: 0.63, z: 0, visibility: 1 }, // 3: Thumb IP
    { x: 0.36, y: 0.58, z: 0, visibility: 1 }, // 4: Thumb Tip
    { x: 0.46, y: 0.58, z: 0, visibility: 1 }, // 5: Index MCP
    { x: 0.46, y: 0.48, z: 0, visibility: 1 }, // 6: Index PIP
    { x: 0.46, y: 0.38, z: 0, visibility: 1 }, // 7: Index DIP
    { x: 0.46, y: 0.26, z: 0, visibility: 1 }, // 8: Index Tip
    { x: 0.50, y: 0.58, z: 0, visibility: 1 }, // 9: Middle MCP
    { x: 0.50, y: 0.46, z: 0, visibility: 1 }, // 10: Middle PIP
    { x: 0.50, y: 0.36, z: 0, visibility: 1 }, // 11: Middle DIP
    { x: 0.50, y: 0.24, z: 0, visibility: 1 }, // 12: Middle Tip
    { x: 0.54, y: 0.59, z: 0, visibility: 1 }, // 13: Ring MCP
    { x: 0.54, y: 0.48, z: 0, visibility: 1 }, // 14: Ring PIP
    { x: 0.54, y: 0.38, z: 0, visibility: 1 }, // 15: Ring DIP
    { x: 0.54, y: 0.28, z: 0, visibility: 1 }, // 16: Ring Tip
    { x: 0.58, y: 0.62, z: 0, visibility: 1 }, // 17: Pinky MCP
    { x: 0.58, y: 0.53, z: 0, visibility: 1 }, // 18: Pinky PIP
    { x: 0.58, y: 0.45, z: 0, visibility: 1 }, // 19: Pinky DIP
    { x: 0.58, y: 0.36, z: 0, visibility: 1 }, // 20: Pinky Tip
  ];

  return base.map((pt, i) => {
    if (overrides[i]) {
      return {
        x: overrides[i]!.x,
        y: overrides[i]!.y,
        z: overrides[i]!.z ?? pt.z,
        visibility: 1,
      };
    }
    return { ...pt };
  });
}

/**
 * INDEX_POINT: Index extended; Middle, Ring, Pinky curled into palm; Thumb relaxed.
 */
export function makeIndexPointLandmarks(): NormalizedLandmark[] {
  return build21Landmarks({
    // Index extended straight up
    5: { x: 0.46, y: 0.58 },
    6: { x: 0.46, y: 0.46 },
    7: { x: 0.46, y: 0.36 },
    8: { x: 0.46, y: 0.25 },
    // Middle curled into palm
    9: { x: 0.50, y: 0.58 },
    10: { x: 0.50, y: 0.50 },
    11: { x: 0.50, y: 0.56 },
    12: { x: 0.50, y: 0.60 },
    // Ring curled into palm
    13: { x: 0.54, y: 0.59 },
    14: { x: 0.54, y: 0.50 },
    15: { x: 0.54, y: 0.56 },
    16: { x: 0.54, y: 0.60 },
    // Pinky curled into palm
    17: { x: 0.58, y: 0.62 },
    18: { x: 0.58, y: 0.53 },
    19: { x: 0.58, y: 0.58 },
    20: { x: 0.58, y: 0.62 },
    // Thumb open/relaxed, far from index tip
    4: { x: 0.36, y: 0.58 },
  });
}

/**
 * OPEN_PALM: All 5 fingers extended outward.
 */
export function makeOpenPalmLandmarks(): NormalizedLandmark[] {
  return build21Landmarks({
    // Index extended
    6: { x: 0.46, y: 0.46 },
    7: { x: 0.46, y: 0.35 },
    8: { x: 0.46, y: 0.24 },
    // Middle extended
    10: { x: 0.50, y: 0.44 },
    11: { x: 0.50, y: 0.33 },
    12: { x: 0.50, y: 0.22 },
    // Ring extended
    14: { x: 0.54, y: 0.46 },
    15: { x: 0.54, y: 0.36 },
    16: { x: 0.54, y: 0.25 },
    // Pinky extended
    18: { x: 0.58, y: 0.50 },
    19: { x: 0.58, y: 0.42 },
    20: { x: 0.58, y: 0.34 },
    // Thumb extended outward
    4: { x: 0.34, y: 0.54 },
  });
}

/**
 * FIST: All 4 fingers curled into palm, thumb folded over.
 */
export function makeFistLandmarks(): NormalizedLandmark[] {
  return build21Landmarks({
    // Index curled
    5: { x: 0.46, y: 0.58 },
    6: { x: 0.46, y: 0.50 },
    7: { x: 0.46, y: 0.56 },
    8: { x: 0.46, y: 0.60 },
    // Middle curled
    9: { x: 0.50, y: 0.58 },
    10: { x: 0.50, y: 0.50 },
    11: { x: 0.50, y: 0.56 },
    12: { x: 0.50, y: 0.60 },
    // Ring curled
    13: { x: 0.54, y: 0.59 },
    14: { x: 0.54, y: 0.50 },
    15: { x: 0.54, y: 0.56 },
    16: { x: 0.54, y: 0.60 },
    // Pinky curled
    17: { x: 0.58, y: 0.62 },
    18: { x: 0.58, y: 0.53 },
    19: { x: 0.58, y: 0.58 },
    20: { x: 0.58, y: 0.62 },
    // Thumb curled over fingers
    4: { x: 0.48, y: 0.58 },
  });
}

/**
 * TWO_FINGERS: Index & Middle extended, Ring & Pinky curled into palm.
 */
export function makeTwoFingersLandmarks(): NormalizedLandmark[] {
  return build21Landmarks({
    // Index extended
    6: { x: 0.46, y: 0.46 },
    7: { x: 0.46, y: 0.35 },
    8: { x: 0.46, y: 0.25 },
    // Middle extended
    10: { x: 0.50, y: 0.45 },
    11: { x: 0.50, y: 0.34 },
    12: { x: 0.50, y: 0.24 },
    // Ring curled
    14: { x: 0.54, y: 0.50 },
    15: { x: 0.54, y: 0.56 },
    16: { x: 0.54, y: 0.60 },
    // Pinky curled
    18: { x: 0.58, y: 0.53 },
    19: { x: 0.58, y: 0.58 },
    20: { x: 0.58, y: 0.62 },
    // Thumb relaxed
    4: { x: 0.40, y: 0.65 },
  });
}

/**
 * PINCH: Thumb tip and index tip touching (distance < threshold), other fingers open or relaxed.
 */
export function makePinchLandmarks(pinchOffset = 0.02): NormalizedLandmark[] {
  return build21Landmarks({
    // Index positioned for pinch
    5: { x: 0.46, y: 0.58 },
    6: { x: 0.46, y: 0.46 },
    7: { x: 0.45, y: 0.38 },
    8: { x: 0.44, y: 0.32 },
    // Thumb touching index tip
    3: { x: 0.40, y: 0.42 },
    4: { x: 0.44 + pinchOffset, y: 0.32 },
    // Middle, Ring, Pinky open or relaxed (not a fist)
    10: { x: 0.50, y: 0.45 },
    11: { x: 0.50, y: 0.35 },
    12: { x: 0.50, y: 0.26 },
    14: { x: 0.54, y: 0.47 },
    15: { x: 0.54, y: 0.38 },
    16: { x: 0.54, y: 0.30 },
  });
}
