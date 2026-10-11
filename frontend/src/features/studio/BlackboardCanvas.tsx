import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebcamView, type WebcamViewHandle } from '../../components/WebcamView';
import { actionMapper } from '../../gestures/actionMapper';
import { blackboardDrawingEngine, type StrokeTool } from '../../gestures/drawingEngine';
import { FloatingToolbar } from './FloatingToolbar';
import type { StrokeSizeType } from './toolbarOptions';
import type { ActionPayload } from '../../gestures/types';

// Map stroke size strings to pixel numbers
const SIZE_MAP: Record<StrokeSizeType, number> = {
  fine: 3,
  medium: 7,
  bold: 14,
};

export interface BlackboardCanvasProps {
  isActive?: boolean;
}

export const BlackboardCanvas: React.FC<BlackboardCanvasProps> = ({ isActive = true }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webcamRef = useRef<WebcamViewHandle | null>(null);

  // Background style: 'camera' (transparent drawing over webcam) or 'slate' (drawing over chalkboard)
  const [backdropMode, setBackdropMode] = useState<'camera' | 'slate'>('camera');
  const [fistProgress, setFistProgress] = useState<number>(0);
  const [clearedBanner, setClearedBanner] = useState<boolean>(false);
  const [, setHistoryVersion] = useState<number>(0);

  // Toolbar state
  const [activeTool, setActiveTool] = useState<StrokeTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#FFFFFF');
  const [activeSize, setActiveSize] = useState<StrokeSizeType>('medium');

  const handleToolChange = (tool: StrokeTool) => {
    setActiveTool(tool);
    blackboardDrawingEngine.setTool(tool);
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    blackboardDrawingEngine.setColor(color);
    if (activeTool === 'eraser') {
      setActiveTool('pen');
      blackboardDrawingEngine.setTool('pen');
    }
  };

  const handleSizeChange = (size: StrokeSizeType) => {
    setActiveSize(size);
    blackboardDrawingEngine.setSize(SIZE_MAP[size]);
  };

  const handleUndo = useCallback(() => {
    blackboardDrawingEngine.undo();
    setHistoryVersion((v) => v + 1);
  }, []);

  const handleRedo = useCallback(() => {
    blackboardDrawingEngine.redo();
    setHistoryVersion((v) => v + 1);
  }, []);

  const handleClear = useCallback(() => {
    blackboardDrawingEngine.clear();
    setFistProgress(0);
    setClearedBanner(true);
    setHistoryVersion((v) => v + 1);
    setTimeout(() => setClearedBanner(false), 2000);
  }, []);

  const handleSavePNG = useCallback(() => {
    const video = webcamRef.current?.getVideoElement();
    blackboardDrawingEngine.exportCompositePNG(video);
  }, []);

  // Keyboard shortcuts: Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleUndo, handleRedo]);

  // Resize canvases to match container dimensions and sync with actionMapper
  const updateCanvasDimensions = useCallback(() => {
    const container = containerRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const cursorCanvas = cursorCanvasRef.current;

    if (!container || !drawingCanvas || !cursorCanvas) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (isActive) {
        actionMapper.setContainerRect(rect);
      }
      if (drawingCanvas.width !== rect.width || drawingCanvas.height !== rect.height) {
        drawingCanvas.width = rect.width;
        drawingCanvas.height = rect.height;
        cursorCanvas.width = rect.width;
        cursorCanvas.height = rect.height;
        blackboardDrawingEngine.setCanvas(drawingCanvas);
      }
    }
  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;

    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateCanvasDimensions();
      });
      observer.observe(container);
    }

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', updateCanvasDimensions);
      if (isActive) {
        actionMapper.setContainerRect(null);
      }
    };
  }, [updateCanvasDimensions, isActive]);

  // Subscribe to gesture actions from the gesture engine
  useEffect(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      blackboardDrawingEngine.setCanvas(drawingCanvas);
      blackboardDrawingEngine.setTool(activeTool);
      blackboardDrawingEngine.setColor(activeColor);
      blackboardDrawingEngine.setSize(SIZE_MAP[activeSize]);
    }

    let lastStage5LogTime = 0;
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      if (!isActive) {
        setFistProgress((progress) => (progress === 0 ? progress : 0));
        return;
      }

      const cursorCanvas = cursorCanvasRef.current;
      const ctx = cursorCanvas?.getContext('2d');

      // 1. Loss of tracking: clean up immediately
      if (action.type === 'TRACKING_LOST') {
        blackboardDrawingEngine.endStroke();
        setFistProgress(0);
        if (cursorCanvas && ctx) {
          ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
        }
        setHistoryVersion((v) => v + 1);
        return;
      }

      if (['DRAW_START', 'DRAW_MOVE', 'ERASE', 'CLEAR'].includes(action.type)) {
        const now = performance.now();
        if (now - lastStage5LogTime >= 1000 || action.type === 'DRAW_START' || action.type === 'CLEAR') {
          lastStage5LogTime = now;
          console.log(`[Abhyas:Stage5] BlackboardCanvas action: ${action.type} at (${action.point.x.toFixed(2)}, ${action.point.y.toFixed(2)})`);
        }
      }

      // 2. Gesture Actions
      switch (action.type) {
        case 'DRAW_START':
          blackboardDrawingEngine.startStroke(action.point);
          break;

        case 'DRAW_MOVE':
          blackboardDrawingEngine.addPoint(action.point);
          break;

        case 'DRAW_END':
          blackboardDrawingEngine.endStroke();
          setHistoryVersion((v) => v + 1);
          break;

        case 'ERASE':
          blackboardDrawingEngine.eraseAt(action.point, action.pressure || 32);
          setHistoryVersion((v) => v + 1);
          break;

        case 'CLEAR':
          handleClear();
          break;
      }

      // 3. Cursor & Progress Reticle Drawing on Cursor Overlay Canvas
      if (cursorCanvas && ctx) {
        ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

        const x = action.point.x * cursorCanvas.width;
        const y = action.point.y * cursorCanvas.height;

        // FIST 1-second hold timer progress indicator
        if (action.holdProgress !== undefined && action.holdProgress > 0) {
          setFistProgress(action.holdProgress);

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 32, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, 32, -Math.PI / 2, -Math.PI / 2 + action.holdProgress * 2 * Math.PI);
          ctx.strokeStyle = '#BA1A1A';
          ctx.lineWidth = 6;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Hold 1s to Clear', x, y - 40);
          ctx.restore();
        } else {
          setFistProgress(0);
        }

        // Draw cursor reticle based on active action
        if (action.type === 'ERASE') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 30, 0, 2 * Math.PI);
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 2.5;
          ctx.fillStyle = 'rgba(253, 224, 71, 0.2)';
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (action.type === 'DRAW_MOVE' || action.type === 'DRAW_START' || action.type === 'HOVER') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, action.type === 'HOVER' ? 5 : 7, 0, 2 * Math.PI);
          ctx.fillStyle = blackboardDrawingEngine.getColor();
          ctx.shadowColor = '#D988ED';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isActive, activeTool, activeColor, activeSize, handleClear]);

  // Clean up any in-progress stroke when tab becomes inactive
  useEffect(() => {
    if (!isActive) {
      blackboardDrawingEngine.endStroke();
    }
  }, [isActive]);

  // Mouse fallback drawing support
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    if (blackboardDrawingEngine.getTool() === 'eraser') {
      blackboardDrawingEngine.eraseAt(point, 30);
    } else {
      blackboardDrawingEngine.startStroke(point);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    if (blackboardDrawingEngine.getTool() === 'eraser') {
      blackboardDrawingEngine.eraseAt(point, 30);
    } else {
      blackboardDrawingEngine.addPoint(point);
    }
  };

  const handleMouseUp = () => {
    blackboardDrawingEngine.endStroke();
    setHistoryVersion((v) => v + 1);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#1E0C29] border border-[#7A3A9A]/30 shadow-lg select-none"
    >
      {/* 1. Base Layer: Webcam View (Mirrored 640x480) OR Blackboard Slate */}
      {backdropMode === 'camera' ? (
        <div className="absolute inset-0 z-0">
          <WebcamView
            ref={webcamRef}
            className="w-full h-full object-cover"
            showSkeletonOverlay={false}
            enableTracking={false}
          />
          {/* Subtle dark vignette so chalk drawings contrast vividly */}
          <div className="absolute inset-0 bg-[#1E0C29]/35 pointer-events-none"></div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#1F1428] z-0">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          ></div>
        </div>
      )}

      {/* 2. Middle Layer: Transparent Drawing Canvas (Strokes and Bezier curves) */}
      <canvas
        ref={drawingCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        title="Air draw with Index Point or click & drag with mouse"
      />

      {/* 3. Top Overlay Layer: Fingertip Cursor & Gesture Feedback */}
      <canvas
        ref={cursorCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Top Header / Mode Switch Bar */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/95 text-xs font-semibold tracking-wide border border-white/15 shadow-sm">
            Air-Writing Blackboard
          </span>

          <button
            type="button"
            onClick={() => setBackdropMode((m) => (m === 'camera' ? 'slate' : 'camera'))}
            className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white text-xs font-medium border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px] text-[#D988ED]">
              {backdropMode === 'camera' ? 'videocam' : 'blackboard'}
            </span>
            <span>{backdropMode === 'camera' ? 'Camera Backdrop' : 'Slate Backdrop'}</span>
          </button>
        </div>

        {/* Real-time Gesture Guidance Chips & Fist Progress */}
        <div className="flex items-center gap-2">
          {isActive && fistProgress > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 backdrop-blur-md">
              <span className="text-[11px] font-bold text-red-400">Clearing Board...</span>
              <div className="w-16 h-2 bg-red-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-75"
                  style={{ width: `${Math.round(fistProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 text-[11px] font-mono border border-white/10">
            ☝️ Point to Draw • 🖐️ Palm to Stop • ✌️ 2 Fingers Erase • ✊ Hold 1s Fist to Clear
          </span>
        </div>
      </div>

      {/* 4. Full Floating Toolbar */}
      <FloatingToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        activeColor={activeColor}
        onColorChange={handleColorChange}
        activeSize={activeSize}
        onSizeChange={handleSizeChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSavePNG={handleSavePNG}
        canUndo={blackboardDrawingEngine.canUndo()}
        canRedo={blackboardDrawingEngine.canRedo()}
      />

      {/* Flash Banner when FIST clears board */}
      {clearedBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-red-600/90 text-white font-bold text-xs backdrop-blur-md shadow-xl border border-white/20 animate-bounce z-30 pointer-events-none">
          Board Cleared!
        </div>
      )}
    </div>
  );
};
