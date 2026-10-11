import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type GestureType =
  | 'INDEX_POINT'
  | 'OPEN_PALM'
  | 'FIST'
  | 'TWO_FINGERS'
  | 'PINCH'
  | 'NONE';

export interface Point2D {
  x: number;
  y: number;
}

export interface RecognizedGesture {
  type: GestureType;
  confidence: number;
  // Normalized coordinates (0 to 1), mirrored for intuitive interaction
  cursor: Point2D;
  rawLandmarks?: NormalizedLandmark[];
  pinchDistance?: number;
}

export type ActionType =
  | 'DRAW_START'
  | 'DRAW_MOVE'
  | 'DRAW_END'
  | 'ERASE'
  | 'CLEAR'
  | 'PINCH'
  | 'PINCH_RELEASE'
  | 'HOVER'
  | 'OPEN_PALM'
  | 'ROTATE'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT'
  | 'TRACKING_LOST';

export interface ActionPayload {
  type: ActionType;
  point: Point2D;
  pressure?: number;
  holdProgress?: number; // 0 to 1 for timed gestures like FIST
}

export type ActionHandler = (payload: ActionPayload) => void;
