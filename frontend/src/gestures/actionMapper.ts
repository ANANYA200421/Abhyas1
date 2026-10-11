import type { ActionHandler, ActionPayload, Point2D, RecognizedGesture } from './types.ts';
import { PointSmoother } from './filter.ts';
import { gestureRecognizer } from './gestureRecognizer.ts';

/**
 * Transforms normalized video coordinates to normalized workspace coordinates,
 * taking into account video aspect ratio, workspace container dimensions,
 * and CSS object-cover cropping.
 */
export function mapVideoToWorkspace(
  point: Point2D,
  videoWidth: number,
  videoHeight: number,
  containerRect: DOMRect | { width: number; height: number } | null
): Point2D {
  if (
    !containerRect ||
    containerRect.width <= 0 ||
    containerRect.height <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return { ...point };
  }

  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerRect.width / containerRect.height;

  let x = point.x;
  let y = point.y;

  if (containerAspect > videoAspect) {
    // Container is wider than video (e.g. 16:9 container vs 4:3 video)
    // Video is scaled up to cover container width; top and bottom are cropped equally by object-cover
    const scale = containerAspect / videoAspect;
    y = (point.y - 0.5) * scale + 0.5;
  } else if (containerAspect < videoAspect) {
    // Container is taller than video (e.g. 4:3 container vs 16:9 video)
    // Video is scaled up to cover container height; left and right sides are cropped equally by object-cover
    const scale = videoAspect / containerAspect;
    x = (point.x - 0.5) * scale + 0.5;
  }

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export class ActionMapper {
  private listeners: Set<ActionHandler> = new Set();
  private smoother = new PointSmoother();

  private isDrawing = false;
  private fistHoldStart: number | null = null;
  private hasFistCleared = false;
  private lastSeenFistTime = 0;

  // Pinch click debounce and release tracking
  private wasPinching = false;
  private lastPinchClickTime = 0;
  private pinchReleasedTime = 0;
  private readonly CLICK_COOLDOWN = 400; // Minimum ms between consecutive pinch clicks
  private readonly RELEASE_DEBOUNCE = 120; // Minimum ms pinch must remain released before next click

  // Workspace and camera feed dimensions
  private activeContainerRect: DOMRect | null = null;
  private videoWidth = 640;
  private videoHeight = 480;
  private lastDispatchedPoint: Point2D = { x: 0.5, y: 0.5 };

  /**
   * Reference rect of the active tool container to translate normalized coordinates
   */
  setContainerRect(rect: DOMRect | null): void {
    this.activeContainerRect = rect;
  }

  getContainerRect(): DOMRect | null {
    return this.activeContainerRect;
  }

  /**
   * Updates camera video stream dimensions for aspect-ratio matching
   */
  setVideoDimensions(width: number, height: number): void {
    if (width > 0 && height > 0) {
      this.videoWidth = width;
      this.videoHeight = height;
    }
  }

  /**
   * Translates normalized workspace point to absolute client pixels
   */
  toClientCoords(point: Point2D): { x: number; y: number } {
    if (
      this.activeContainerRect &&
      this.activeContainerRect.width > 0 &&
      this.activeContainerRect.height > 0
    ) {
      return {
        x: this.activeContainerRect.left + point.x * this.activeContainerRect.width,
        y: this.activeContainerRect.top + point.y * this.activeContainerRect.height,
      };
    }
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return {
      x: point.x * winW,
      y: point.y * winH,
    };
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

  private lastStage3LogTime = 0;
  private lastStage3ActionType = '';

  /**
   * Dispatches an action to all subscribers.
   */
  dispatch(payload: ActionPayload): void {
    const now = performance.now();
    if (
      payload.type !== this.lastStage3ActionType ||
      now - this.lastStage3LogTime >= 1000
    ) {
      this.lastStage3LogTime = now;
      this.lastStage3ActionType = payload.type;
      console.log(
        `[Abhyas:Stage3] Action: ${payload.type} at (${payload.point.x.toFixed(2)}, ${payload.point.y.toFixed(2)})`
      );
    }

    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  /**
   * Maps raw recognized gesture to pedagogical actions.
   */
  processGesture(gesture: RecognizedGesture, timestamp: number = performance.now()): void {
    // 1. Transform raw mirrored video coordinates to workspace space accounting for cropping
    const mappedCursor = mapVideoToWorkspace(
      gesture.cursor,
      this.videoWidth,
      this.videoHeight,
      this.activeContainerRect
    );

    // 2. Filter high-frequency tremors
    const smoothedCursor = this.smoother.filter(mappedCursor, timestamp);
    this.lastDispatchedPoint = smoothedCursor;

    // Always emit HOVER so UI can show the visible cursor dot
    this.dispatch({
      type: 'HOVER',
      point: smoothedCursor,
    });

    // 3. PINCH (Toolbar button click / selection with debounce & hysteresis)
    if (gesture.type === 'PINCH') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      const timeSinceLastClick = timestamp - this.lastPinchClickTime;
      const timeSinceRelease = timestamp - this.pinchReleasedTime;
      const canClick =
        !this.wasPinching &&
        timeSinceLastClick >= this.CLICK_COOLDOWN &&
        timeSinceRelease >= this.RELEASE_DEBOUNCE;

      if (canClick) {
        this.wasPinching = true;
        this.lastPinchClickTime = timestamp;
        this.dispatch({
          type: 'PINCH',
          point: smoothedCursor,
        });

        // Trigger pinch click on hovering target
        this.triggerPinchClick(smoothedCursor);
      } else if (!this.wasPinching) {
        // State update without duplicate click during rapid chatter
        this.wasPinching = true;
        this.dispatch({
          type: 'PINCH',
          point: smoothedCursor,
        });
      }
      return;
    } else {
      if (this.wasPinching) {
        this.wasPinching = false;
        this.pinchReleasedTime = timestamp;
        this.dispatch({
          type: 'PINCH_RELEASE',
          point: smoothedCursor,
        });
      }
    }

    // 4. FIST HANDLING (Hold for 1.0s to clear board with single-shot latch)
    if (gesture.type === 'FIST') {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.dispatch({ type: 'DRAW_END', point: smoothedCursor });
      }

      this.lastSeenFistTime = timestamp;

      // If already cleared in this hold session, do NOT clear again while held
      if (this.hasFistCleared) {
        this.dispatch({
          type: 'HOVER',
          point: smoothedCursor,
          holdProgress: 1,
        });
        return;
      }

      if (this.fistHoldStart === null) {
        this.fistHoldStart = timestamp;
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
      // Re-arm clear only when hand explicitly opens or switches to another active gesture
      if (
        gesture.type === 'OPEN_PALM' ||
        gesture.type === 'INDEX_POINT' ||
        gesture.type === 'TWO_FINGERS'
      ) {
        this.fistHoldStart = null;
        this.hasFistCleared = false;
      } else if (gesture.type === 'NONE') {
        if (timestamp - this.lastSeenFistTime > 250) {
          this.fistHoldStart = null;
        }
      }
    }

    // 5. TWO_FINGERS (Eraser under fingertip)
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

    // 6. INDEX_POINT (Draw following index fingertip)
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

    // 7. OPEN_PALM (Stop drawing / Swipe navigation)
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
      } else {
        this.dispatch({ type: 'OPEN_PALM', point: smoothedCursor });
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
   * Safely handles complete loss of hand tracking
   */
  processNoHand(timestamp: number = performance.now()): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.dispatch({
        type: 'DRAW_END',
        point: this.lastDispatchedPoint,
      });
    }

    if (this.wasPinching) {
      this.wasPinching = false;
      this.pinchReleasedTime = timestamp;
      this.dispatch({
        type: 'PINCH_RELEASE',
        point: this.lastDispatchedPoint,
      });
    }

    this.fistHoldStart = null;
    this.smoother.reset();

    this.dispatch({
      type: 'TRACKING_LOST',
      point: this.lastDispatchedPoint,
      holdProgress: 0,
    });
  }

  /**
   * Virtual click on element currently underneath the fingertip cursor
   */
  private triggerPinchClick(point: Point2D): void {
    if (typeof document === 'undefined') return;

    const clientPos = this.toClientCoords(point);
    const el = document.elementFromPoint(clientPos.x, clientPos.y);
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
