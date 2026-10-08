import type { ActionHandler, ActionPayload, RecognizedGesture } from './types';
import { PointSmoother } from './filter';

export class ActionMapper {
  private listeners: Set<ActionHandler> = new Set();
  private smoother = new PointSmoother();

  private isDrawing = false;
  private fistHoldStart: number | null = null;
  private hasFistCleared = false;

  /**
   * Subscribe to dispatched gesture actions. Returns unsubscribe function.
   */
  subscribe(handler: ActionHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Dispatches an action to all subscribers.
   */
  dispatch(payload: ActionPayload): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  /**
   * Maps raw recognized gesture to pedagogical actions.
   */
  processGesture(gesture: RecognizedGesture, timestamp: number = performance.now()): void {
    const rawCursor = gesture.cursor;
    const smoothedCursor = this.smoother.filter(rawCursor, timestamp);

    // Always emit HOVER so UI can show custom gesture reticle / cursor
    this.dispatch({
      type: 'HOVER',
      point: smoothedCursor,
    });

    // 1. FIST HANDLING (Hold for ~1 second to clear board)
    if (gesture.type === 'FIST') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      if (this.fistHoldStart === null) {
        this.fistHoldStart = timestamp;
        this.hasFistCleared = false;
      }

      const holdDuration = timestamp - this.fistHoldStart;
      const progress = Math.min(1, holdDuration / 1000); // 1.0s target

      if (progress >= 1 && !this.hasFistCleared) {
        this.hasFistCleared = true;
        this.dispatch({
          type: 'CLEAR',
          point: smoothedCursor,
          holdProgress: 1,
        });
      } else {
        // Broadcast hold progress so UI can render the filling circle/reticle
        this.dispatch({
          type: 'HOVER',
          point: smoothedCursor,
          holdProgress: progress,
        });
      }
      return;
    } else {
      // Reset fist timer when released
      this.fistHoldStart = null;
      this.hasFistCleared = false;
    }

    // 2. TWO_FINGERS (Eraser under fingertip)
    if (gesture.type === 'TWO_FINGERS') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      this.dispatch({
        type: 'ERASE',
        point: smoothedCursor,
        pressure: 35, // Erase radius
      });
      return;
    }

    // 3. PINCH (Toolbar button click / object pick-up)
    if (gesture.type === 'PINCH') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      this.dispatch({
        type: 'PINCH',
        point: smoothedCursor,
      });
      return;
    }

    // 4. INDEX_POINT (Draw following index fingertip)
    if (gesture.type === 'INDEX_POINT') {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.dispatch({
          type: 'DRAW_START',
          point: smoothedCursor,
        });
      } else {
        this.dispatch({
          type: 'DRAW_MOVE',
          point: smoothedCursor,
        });
      }
      return;
    }

    // 5. OPEN_PALM (Stop drawing / navigation)
    if (gesture.type === 'OPEN_PALM') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({
          type: 'DRAW_END',
          point: smoothedCursor,
        });
      }
      return;
    }

    // Default / NONE: Stop drawing if active
    if (this.isDrawing) {
      this.isDrawing = false;
      this.dispatch({
        type: 'DRAW_END',
        point: smoothedCursor,
      });
    }
  }

  reset(): void {
    this.isDrawing = false;
    this.fistHoldStart = null;
    this.hasFistCleared = false;
    this.smoother.reset();
  }
}

export const actionMapper = new ActionMapper();
