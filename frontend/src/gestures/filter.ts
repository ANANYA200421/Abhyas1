import type { Point2D } from './types';

/**
 * Velocity-adaptive Exponential Moving Average filter for smooth, jitter-free cursor tracking.
 * When speed is low, it heavily filters micro-tremors.
 * When speed increases, it responsively increases the filter weight to prevent latency.
 */
export class PointSmoother {
  private prevPoint: Point2D | null = null;
  private lastTimestamp = 0;

  private minAlpha: number;
  private maxAlpha: number;
  private speedThreshold: number;

  constructor(minAlpha = 0.28, maxAlpha = 0.75, speedThreshold = 0.003) {
    this.minAlpha = minAlpha;
    this.maxAlpha = maxAlpha;
    this.speedThreshold = speedThreshold;
  }

  filter(point: Point2D, timestamp: number = performance.now()): Point2D {
    if (!this.prevPoint) {
      this.prevPoint = { ...point };
      this.lastTimestamp = timestamp;
      return { ...point };
    }

    const dt = Math.max(1, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    const dx = point.x - this.prevPoint.x;
    const dy = point.y - this.prevPoint.y;
    const distance = Math.hypot(dx, dy);
    const speed = distance / dt;

    // Adapt alpha based on movement speed
    const factor = Math.min(1, speed / this.speedThreshold);
    const alpha = this.minAlpha + factor * (this.maxAlpha - this.minAlpha);

    const smoothedX = this.prevPoint.x + alpha * dx;
    const smoothedY = this.prevPoint.y + alpha * dy;

    this.prevPoint = { x: smoothedX, y: smoothedY };
    return { x: smoothedX, y: smoothedY };
  }

  reset(): void {
    this.prevPoint = null;
    this.lastTimestamp = 0;
  }
}
