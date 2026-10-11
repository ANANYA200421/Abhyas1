import type { Point2D } from './types.ts';

export type StrokeTool = 'pen' | 'highlighter' | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: StrokeTool;
  color: string;
  size: number;
  points: StrokePoint[];
}

export interface ErasedStrokeRecord {
  stroke: Stroke;
  index: number;
}

export type HistoryAction =
  | { type: 'stroke_add'; stroke: Stroke }
  | { type: 'stroke_erase'; erased: ErasedStrokeRecord[] }
  | { type: 'clear'; previousStrokes: Stroke[] };

/**
 * Calculates perpendicular distance from point (cx, cy) to line segment (x1, y1) - (x2, y2).
 */
export function distanceToSegment(
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(cx - x1, cy - y1);
  let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(cx - projX, cy - projY);
}

/**
 * Tests whether an eraser circle at (cx, cy) with radius intersects any point or segment of a stroke.
 */
export function strokeIntersectsCircle(
  stroke: Stroke,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const effectiveRadius = radius + (stroke.size || 5) / 2;
  const pts = stroke.points;
  if (!pts || pts.length === 0) return false;
  if (pts.length === 1) {
    return Math.hypot(pts[0].x - cx, pts[0].y - cy) <= effectiveRadius;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (distanceToSegment(cx, cy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= effectiveRadius) {
      return true;
    }
  }
  return false;
}

export class DrawingEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private currentStroke: Stroke | null = null;
  private strokes: Stroke[] = [];
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  // Active batch of strokes erased in current erase gesture or drag
  private currentErasedBatch: ErasedStrokeRecord[] = [];
  private eraseCommitTimer: ReturnType<typeof setTimeout> | null = null;

  // Active tool settings
  private tool: StrokeTool = 'pen';
  private color = '#FFFFFF'; // Chalk white default
  private size = 5; // Medium stroke

  setCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.redrawAll();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  setTool(tool: StrokeTool): void {
    this.tool = tool;
  }

  getTool(): StrokeTool {
    return this.tool;
  }

  setColor(color: string): void {
    this.color = color;
  }

  getColor(): string {
    return this.color;
  }

  setSize(size: number): void {
    this.size = size;
  }

  getSize(): number {
    return this.size;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 || this.currentErasedBatch.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Commits any active erase batch into the undo stack as a single cohesive action.
   */
  commitCurrentErase(): void {
    if (this.eraseCommitTimer) {
      clearTimeout(this.eraseCommitTimer);
      this.eraseCommitTimer = null;
    }

    if (this.currentErasedBatch.length > 0) {
      this.undoStack.push({
        type: 'stroke_erase',
        erased: [...this.currentErasedBatch],
      });
      this.currentErasedBatch = [];
      this.redoStack = [];
    }
  }

  /**
   * Begins a new stroke from normalized or canvas coordinates.
   */
  startStroke(point: Point2D, isNormalized = true): void {
    this.commitCurrentErase();

    const actualPoint = this.toCanvasPoint(point, isNormalized);

    this.currentStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: this.tool,
      color: this.color,
      size: this.size,
      points: [actualPoint],
    };

    // Draw single dot if canvas context is available
    if (this.ctx) {
      this.renderPoint(actualPoint, this.tool, this.color, this.size);
    }
  }

  /**
   * Continues the current stroke with bezier quadratic curve smoothing.
   */
  addPoint(point: Point2D, isNormalized = true): void {
    if (!this.currentStroke) return;

    const actualPoint = this.toCanvasPoint(point, isNormalized);
    const pts = this.currentStroke.points;

    // Filter tiny redundant movements (< 2px) to keep path light
    const lastPt = pts[pts.length - 1];
    if (Math.hypot(actualPoint.x - lastPt.x, actualPoint.y - lastPt.y) < 2) {
      return;
    }

    pts.push(actualPoint);

    if (this.ctx) {
      // Draw smooth quadratic curve segment between last points
      if (pts.length >= 3) {
        const p0 = pts[pts.length - 3];
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];

        const startMid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const endMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        this.ctx.save();
        this.applyToolStyles(this.currentStroke.tool, this.currentStroke.color, this.currentStroke.size);

        this.ctx.beginPath();
        this.ctx.moveTo(startMid.x, startMid.y);
        this.ctx.quadraticCurveTo(p1.x, p1.y, endMid.x, endMid.y);
        this.ctx.stroke();
        this.ctx.restore();
      } else if (pts.length === 2) {
        this.ctx.save();
        this.applyToolStyles(this.currentStroke.tool, this.currentStroke.color, this.currentStroke.size);
        this.ctx.beginPath();
        this.ctx.moveTo(pts[0].x, pts[0].y);
        this.ctx.lineTo(pts[1].x, pts[1].y);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  /**
   * Finalizes the current stroke or active erase session and saves it to history.
   */
  endStroke(): void {
    this.commitCurrentErase();

    if (!this.currentStroke) return;
    if (this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.undoStack.push({ type: 'stroke_add', stroke: this.currentStroke });
      this.redoStack = []; // Reset redo history on new action
    }
    this.currentStroke = null;
  }

  /**
   * Erases content within radius of given point.
   * Touched strokes are removed from the active canvas and tracked in history for undo/redo.
   */
  eraseAt(point: Point2D, radius = 30, isNormalized = true): void {
    const actualPoint = this.toCanvasPoint(point, isNormalized);
    const cx = actualPoint.x;
    const cy = actualPoint.y;

    // Direct pixel clearing feedback if canvas context is available
    if (this.ctx) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Identify and remove intersected strokes
    let removedAny = false;
    const remainingStrokes: Stroke[] = [];

    for (let i = 0; i < this.strokes.length; i++) {
      const stroke = this.strokes[i];
      if (strokeIntersectsCircle(stroke, cx, cy, radius)) {
        this.currentErasedBatch.push({ stroke, index: i });
        removedAny = true;
      } else {
        remainingStrokes.push(stroke);
      }
    }

    if (removedAny) {
      this.strokes = remainingStrokes;
      this.redrawAll();
    }

    // Debounce commit to group consecutive frames of an erase gesture
    if (this.eraseCommitTimer) {
      clearTimeout(this.eraseCommitTimer);
    }
    this.eraseCommitTimer = setTimeout(() => {
      this.commitCurrentErase();
    }, 300);
  }

  /**
   * Undo last action (stroke addition, erased strokes, or board clear).
   */
  undo(): void {
    this.commitCurrentErase();
    if (this.undoStack.length === 0) return;

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    if (action.type === 'stroke_add') {
      const idx = this.strokes.findIndex((s) => s.id === action.stroke.id);
      if (idx !== -1) {
        this.strokes.splice(idx, 1);
      }
    } else if (action.type === 'stroke_erase') {
      // Restore erased strokes at their original indices
      const sorted = [...action.erased].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        const insertIdx = Math.min(item.index, this.strokes.length);
        this.strokes.splice(insertIdx, 0, item.stroke);
      }
    } else if (action.type === 'clear') {
      this.strokes = [...action.previousStrokes];
    }

    this.redrawAll();
  }

  /**
   * Redo previously undone action.
   */
  redo(): void {
    this.commitCurrentErase();
    if (this.redoStack.length === 0) return;

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    if (action.type === 'stroke_add') {
      this.strokes.push(action.stroke);
    } else if (action.type === 'stroke_erase') {
      const idsToRemove = new Set(action.erased.map((e) => e.stroke.id));
      this.strokes = this.strokes.filter((s) => !idsToRemove.has(s.id));
    } else if (action.type === 'clear') {
      this.strokes = [];
    }

    this.redrawAll();
  }

  /**
   * Returns copy of current strokes list.
   */
  getStrokes(): Stroke[] {
    return [...this.strokes];
  }

  /**
   * Replaces current strokes and redraws.
   */
  setStrokes(strokes: Stroke[]): void {
    this.commitCurrentErase();
    this.strokes = [...strokes];
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.currentErasedBatch = [];
    this.redrawAll();
  }

  /**
   * Clears all strokes on the blackboard (with undo support).
   */
  clear(): void {
    this.commitCurrentErase();
    if (this.strokes.length > 0) {
      this.undoStack.push({
        type: 'clear',
        previousStrokes: [...this.strokes],
      });
      this.redoStack = [];
    }
    this.strokes = [];
    this.currentStroke = null;
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Redraws all recorded strokes onto the canvas.
   */
  redrawAll(): void {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const stroke of this.strokes) {
      const pts = stroke.points;
      if (pts.length === 0) continue;

      this.ctx.save();
      this.applyToolStyles(stroke.tool, stroke.color, stroke.size);

      if (pts.length === 1) {
        this.renderPoint(pts[0], stroke.tool, stroke.color, stroke.size);
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          this.ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }

        const last = pts[pts.length - 1];
        this.ctx.lineTo(last.x, last.y);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  /**
   * Exports composite image combining the video frame and transparent drawing canvas.
   */
  exportCompositePNG(videoElement?: HTMLVideoElement | null): void {
    if (!this.canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // 1. Draw video background frame if provided (mirrored horizontally)
    if (videoElement && videoElement.readyState >= 2) {
      expCtx.save();
      expCtx.translate(exportCanvas.width, 0);
      expCtx.scale(-1, 1);
      expCtx.drawImage(videoElement, 0, 0, exportCanvas.width, exportCanvas.height);
      expCtx.restore();
    } else {
      // Dark chalkboard backdrop fallback
      expCtx.fillStyle = '#1E1428';
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // 2. Draw drawing strokes canvas on top
    expCtx.drawImage(this.canvas, 0, 0);

    // 3. Trigger download
    const link = document.createElement('a');
    link.download = `Abhyas_Blackboard_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  private applyToolStyles(tool: StrokeTool, color: string, size: number): void {
    if (!this.ctx) return;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = size * 3;
    } else if (tool === 'highlighter') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 0.45;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = size * 2.8;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1.0;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = size;
    }
  }

  private renderPoint(pt: StrokePoint, tool: StrokeTool, color: string, size: number): void {
    if (!this.ctx) return;
    this.ctx.save();
    this.applyToolStyles(tool, color, size);
    this.ctx.beginPath();
    this.ctx.arc(pt.x, pt.y, (tool === 'eraser' ? size * 3 : size) / 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.restore();
  }

  private toCanvasPoint(p: Point2D, isNormalized: boolean): StrokePoint {
    if (!this.canvas) return { x: p.x, y: p.y };
    if (!isNormalized) return { x: p.x, y: p.y };
    return {
      x: p.x * this.canvas.width,
      y: p.y * this.canvas.height,
    };
  }
}

// Dedicated independent engine for Virtual Blackboard
export const blackboardDrawingEngine = new DrawingEngine();

// Dedicated independent engine for Slides Viewer
export const slidesDrawingEngine = new DrawingEngine();

// Backward-compatible export alias pointing to blackboardDrawingEngine
export const drawingEngine = blackboardDrawingEngine;
