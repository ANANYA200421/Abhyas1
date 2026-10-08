import type { Point2D } from './types';

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

export class DrawingEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private currentStroke: Stroke | null = null;
  private strokes: Stroke[] = [];
  private redoStack: Stroke[] = [];

  // Active tool settings
  private tool: StrokeTool = 'pen';
  private color = '#FFFFFF'; // Chalk white default
  private size = 5; // Medium stroke

  setCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.redrawAll();
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

  /**
   * Begins a new stroke from normalized or canvas coordinates.
   */
  startStroke(point: Point2D, isNormalized = true): void {
    if (!this.canvas || !this.ctx) return;

    const actualPoint = this.toCanvasPoint(point, isNormalized);

    this.currentStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: this.tool,
      color: this.color,
      size: this.size,
      points: [actualPoint],
    };

    // Draw single dot
    this.renderPoint(actualPoint, this.tool, this.color, this.size);
  }

  /**
   * Continues the current stroke with bezier quadratic curve smoothing.
   */
  addPoint(point: Point2D, isNormalized = true): void {
    if (!this.canvas || !this.ctx || !this.currentStroke) return;

    const actualPoint = this.toCanvasPoint(point, isNormalized);
    const pts = this.currentStroke.points;

    // Filter tiny redundant movements (< 2px) to keep path light
    const lastPt = pts[pts.length - 1];
    if (Math.hypot(actualPoint.x - lastPt.x, actualPoint.y - lastPt.y) < 2) {
      return;
    }

    pts.push(actualPoint);

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

  /**
   * Finalizes the current stroke and saves it to history.
   */
  endStroke(): void {
    if (!this.currentStroke) return;
    if (this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.redoStack = []; // Reset redo history on new action
    }
    this.currentStroke = null;
  }

  /**
   * Erases content within radius of given point.
   */
  eraseAt(point: Point2D, radius = 30, isNormalized = true): void {
    if (!this.canvas || !this.ctx) return;
    const actualPoint = this.toCanvasPoint(point, isNormalized);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(actualPoint.x, actualPoint.y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Undo last stroke.
   */
  undo(): void {
    if (this.strokes.length === 0) return;
    const popped = this.strokes.pop();
    if (popped) {
      this.redoStack.push(popped);
      this.redrawAll();
    }
  }

  /**
   * Redo previously undone stroke.
   */
  redo(): void {
    if (this.redoStack.length === 0) return;
    const restored = this.redoStack.pop();
    if (restored) {
      this.strokes.push(restored);
      this.redrawAll();
    }
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
    this.strokes = [...strokes];
    this.redoStack = [];
    this.currentStroke = null;
    this.redrawAll();
  }

  /**
   * Clears all strokes on the blackboard.
   */
  clear(): void {
    this.strokes = [];
    this.redoStack = [];
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

export const drawingEngine = new DrawingEngine();
