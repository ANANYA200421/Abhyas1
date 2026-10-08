import type { ActionHandler, ActionPayload, Point2D, RecognizedGesture } from './types';
import { PointSmoother } from './filter';
import { gestureRecognizer } from './gestureRecognizer';

export class ActionMapper {
  private listeners: Set<ActionHandler> = new Set();
  private smoother = new PointSmoother();

  private isDrawing = false;
  private fistHoldStart: number | null = null;
  private hasFistCleared = false;
  private wasPinching = false;
  private activeContainerRect: DOMRect | null = null;

  /**
   * Optional reference rect to translate normalized (0-1) coordinates to client pixels
   */
  setContainerRect(rect: DOMRect | null): void {
    this.activeContainerRect = rect;
  }

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

    // Always emit HOVER so UI can show the visible cursor dot
    this.dispatch({
      type: 'HOVER',
      point: smoothedCursor,
    });

    // 1. PINCH (Toolbar button click / selection)
    if (gesture.type === 'PINCH') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      if (!this.wasPinching) {
        this.wasPinching = true;
        this.dispatch({
          type: 'PINCH',
          point: smoothedCursor,
        });

        // Trigger pinch click on hovering target
        this.triggerPinchClick(smoothedCursor);
      }
      return;
    } else {
      if (this.wasPinching) {
        this.wasPinching = false;
        this.dispatch({
          type: 'PINCH_RELEASE',
          point: smoothedCursor,
        });
      }
    }

    // 2. FIST HANDLING (Hold for ~1 second to clear board)
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
        this.dispatch({
          type: 'HOVER',
          point: smoothedCursor,
          holdProgress: progress,
        });
      }
      return;
    } else {
      this.fistHoldStart = null;
      this.hasFistCleared = false;
    }

    // 3. TWO_FINGERS (Eraser under fingertip)
    if (gesture.type === 'TWO_FINGERS') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      this.dispatch({
        type: 'ERASE',
        point: smoothedCursor,
        pressure: 35,
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

    // 5. OPEN_PALM (Stop drawing / Swipe navigation)
    if (gesture.type === 'OPEN_PALM') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({
          type: 'DRAW_END',
          point: smoothedCursor,
        });
      }

      // Check palm swipe velocity over ~300ms window
      const swipe = gestureRecognizer.checkSwipe();
      if (swipe === 'LEFT') {
        this.dispatch({ type: 'SWIPE_LEFT', point: smoothedCursor });
      } else if (swipe === 'RIGHT') {
        this.dispatch({ type: 'SWIPE_RIGHT', point: smoothedCursor });
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

  /**
   * Virtual click on element currently underneath the fingertip cursor
   */
  private triggerPinchClick(point: Point2D): void {
    let clientX = point.x * window.innerWidth;
    let clientY = point.y * window.innerHeight;

    if (this.activeContainerRect) {
      clientX = this.activeContainerRect.left + point.x * this.activeContainerRect.width;
      clientY = this.activeContainerRect.top + point.y * this.activeContainerRect.height;
    }

    const el = document.elementFromPoint(clientX, clientY);
    if (el) {
      const target = el.closest('button, [data-gesture-target], a, input') as HTMLElement | null;
      if (target) {
        target.click();

        // Visual click feedback effect
        target.classList.add('ring-4', 'ring-[#D988ED]', 'scale-110');
        setTimeout(() => {
          target.classList.remove('ring-4', 'ring-[#D988ED]', 'scale-110');
        }, 300);
      }
    }
  }

  reset(): void {
    this.isDrawing = false;
    this.fistHoldStart = null;
    this.hasFistCleared = false;
    this.wasPinching = false;
    this.smoother.reset();
  }
}

export const actionMapper = new ActionMapper();
