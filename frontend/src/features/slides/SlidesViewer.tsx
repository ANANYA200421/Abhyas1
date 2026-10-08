import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { actionMapper } from '../../gestures/actionMapper';
import { drawingEngine, type Stroke, type StrokeTool } from '../../gestures/drawingEngine';
import type { ActionPayload } from '../../gestures/types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure pdfjs worker to unpkg CDN matching installed version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Built-in default rich presentation slides for immediate teaching
interface DefaultSlide {
  title: string;
  subtitle: string;
  badge: string;
  points: { icon: string; title: string; desc: string }[];
  callout: { formula: string; explanation: string };
  footerNote: string;
}

const DEFAULT_SLIDES: DefaultSlide[] = [
  {
    title: "Newton's Laws of Motion",
    subtitle: 'Module 4: Classical Mechanics & Force Dynamics',
    badge: 'Slide 1 • Overview',
    points: [
      {
        icon: 'explore',
        title: 'Fundamental Axiom',
        desc: 'Motion of macroscopic bodies under mutual gravitational and applied forces.',
      },
      {
        icon: 'cyclone',
        title: 'Inertial Reference Frames',
        desc: 'Newtonian mechanics assumes acceleration is measured relative to non-accelerating frames.',
      },
      {
        icon: 'fitness_center',
        title: 'Vectorial Sum of Forces',
        desc: 'Net force is the vector resultant: ΣF = F₁ + F₂ + ... + Fₙ.',
      },
    ],
    callout: {
      formula: 'ΣF = 0 ⟹ dv/dt = 0',
      explanation: 'Static equilibrium holds when resultant net force equals zero vector.',
    },
    footerNote: 'Tip: Use Index Finger to annotate key formulas, or Swipe Left to advance.',
  },
  {
    title: "First Law: The Law of Inertia",
    subtitle: 'Galilean Principle of Relativistic Constancy',
    badge: 'Slide 2 • First Law',
    points: [
      {
        icon: 'motion_photos_paused',
        title: 'State of Rest',
        desc: 'A stationary object remains at rest unless disturbed by an unbalanced external force.',
      },
      {
        icon: 'speed',
        title: 'Uniform Linear Motion',
        desc: 'An object in motion continues with constant velocity along a straight rectilinear path.',
      },
      {
        icon: 'scale',
        title: 'Inertia & Mass',
        desc: 'Mass is the quantitative measure of an object’s resistance to directional change.',
      },
    ],
    callout: {
      formula: 'p = m · v  (Conservation of Momentum)',
      explanation: 'In the absence of external impulse, total linear momentum is conserved.',
    },
    footerNote: 'Draw free-body diagrams directly over the slide using your index finger!',
  },
  {
    title: "Second Law: Force & Acceleration",
    subtitle: 'Quantitative Dynamics: Rate of Change of Momentum',
    badge: 'Slide 3 • Second Law',
    points: [
      {
        icon: 'trending_up',
        title: 'Direct Proportionality',
        desc: 'Acceleration is directly proportional to applied net force: a ∝ F_net.',
      },
      {
        icon: 'line_weight',
        title: 'Inverse Mass Ratio',
        desc: 'Acceleration is inversely proportional to inertial mass: a ∝ 1/m.',
      },
      {
        icon: 'electric_meter',
        title: 'Standard SI Units',
        desc: '1 Newton [N] = 1 kg·m/s² — force required to accelerate 1 kg by 1 m/s².',
      },
    ],
    callout: {
      formula: 'F_net = m · a = d(mv)/dt',
      explanation: 'Standard foundational equation for classical dynamic systems.',
    },
    footerNote: 'Use Highlighter (semi-transparent) to underline key terms.',
  },
  {
    title: "Third Law: Action & Reaction",
    subtitle: 'Mutual Interaction Pairs & Symmetrical Forces',
    badge: 'Slide 4 • Third Law',
    points: [
      {
        icon: 'swap_horiz',
        title: 'Equal & Opposite',
        desc: 'When body A exerts a force on body B, body B exerts an equal and opposite force on body A.',
      },
      {
        icon: 'rocket_launch',
        title: 'Rocket Propulsion',
        desc: 'Exhaust gases expelled backwards create an equal forward reaction thrust.',
      },
      {
        icon: 'sync_alt',
        title: 'Different Bodies',
        desc: 'Action and reaction forces act on DIFFERENT objects and never cancel each other.',
      },
    ],
    callout: {
      formula: 'F_{A ➔ B} = -F_{B ➔ A}',
      explanation: 'Interaction pairs always occur simultaneously with identical magnitude.',
    },
    footerNote: 'Practice Problem: Air draw a rocket thrust diagram on the right side.',
  },
];

type SlideSourceType = 'default' | 'images' | 'pdf';

const PALETTE_COLORS = ['#FFFFFF', '#FDE047', '#38BDF8', '#F43F5E', '#10B981'];

export const SlidesViewer: React.FC = () => {
  // Source modes: default presentations, user uploaded images, or user uploaded PDF
  const [sourceType, setSourceType] = useState<SlideSourceType>('default');
  const [imageSlides, setImageSlides] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<string | File | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);

  // Current slide index (1-based for PDF, 0-based for default/images)
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Per-slide annotation storage: key = slide identifier string, value = Stroke[]
  const annotationsMapRef = useRef<Record<string, Stroke[]>>({});

  // Canvas ref for drawing annotations
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slideContainerRef = useRef<HTMLDivElement | null>(null);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<StrokeTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#FFFFFF');
  const [activeSize, setActiveSize] = useState<number>(5);
  const [isDrawingMouse, setIsDrawingMouse] = useState<boolean>(false);
  const [isAnnotationsVisible, setIsAnnotationsVisible] = useState<boolean>(true);

  // Total slides count depending on mode
  const totalSlides =
    sourceType === 'default'
      ? DEFAULT_SLIDES.length
      : sourceType === 'images'
      ? imageSlides.length
      : pdfNumPages;

  // File upload input refs
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  // Helper key for current slide annotation
  const getCurrentSlideKey = useCallback(() => {
    return `${sourceType}-${currentSlideIndex}`;
  }, [sourceType, currentSlideIndex]);

  // Synchronize canvas size with slide viewport container
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = slideContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawingEngine.setCanvas(canvas);
        const currentKey = getCurrentSlideKey();
        const existingStrokes = annotationsMapRef.current[currentKey] || [];
        drawingEngine.setStrokes(existingStrokes);
      }
    }
  }, [getCurrentSlideKey]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Save current slide annotations before switching, and restore target slide annotations
  const switchSlide = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || (totalSlides > 0 && newIndex >= totalSlides)) return;

      // 1. Save current slide annotations to memory
      const currentKey = getCurrentSlideKey();
      annotationsMapRef.current[currentKey] = drawingEngine.getStrokes();

      // 2. Update slide index
      setCurrentSlideIndex(newIndex);

      // 3. Restore target slide annotations from memory
      const nextKey = `${sourceType}-${newIndex}`;
      const savedStrokes = annotationsMapRef.current[nextKey] || [];
      drawingEngine.setStrokes(savedStrokes);
    },
    [getCurrentSlideKey, sourceType, totalSlides]
  );

  const handleNextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) {
      switchSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, totalSlides, switchSlide]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      switchSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, switchSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        drawingEngine.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        drawingEngine.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide]);

  // Gestures subscription: Swiping left/right advances slides; Index point draws; Two fingers erases; Fist clears
  useEffect(() => {
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      if (action.type === 'SWIPE_LEFT') {
        handleNextSlide();
      } else if (action.type === 'SWIPE_RIGHT') {
        handlePrevSlide();
      } else if (action.type === 'DRAW_START') {
        drawingEngine.startStroke(action.point);
      } else if (action.type === 'DRAW_MOVE') {
        drawingEngine.addPoint(action.point);
      } else if (action.type === 'DRAW_END') {
        drawingEngine.endStroke();
      } else if (action.type === 'ERASE') {
        drawingEngine.eraseAt(action.point, 36);
      } else if (action.type === 'CLEAR') {
        drawingEngine.clear();
        const currentKey = getCurrentSlideKey();
        annotationsMapRef.current[currentKey] = [];
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleNextSlide, handlePrevSlide, getCurrentSlideKey]);

  // Tool changes
  const handleSelectTool = (tool: StrokeTool) => {
    setActiveTool(tool);
    drawingEngine.setTool(tool);
  };

  const handleSelectColor = (color: string) => {
    setActiveColor(color);
    drawingEngine.setColor(color);
  };

  const handleSelectSize = (size: number) => {
    setActiveSize(size);
    drawingEngine.setSize(size);
  };

  const handleClearSlideAnnotations = () => {
    drawingEngine.clear();
    const currentKey = getCurrentSlideKey();
    annotationsMapRef.current[currentKey] = [];
  };

  // Mouse drawing handlers on slide canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawingMouse(true);
    if (activeTool === 'eraser') {
      drawingEngine.eraseAt({ x, y }, activeSize * 2.5, false);
    } else {
      drawingEngine.startStroke({ x, y }, false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMouse) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      drawingEngine.eraseAt({ x, y }, activeSize * 2.5, false);
    } else {
      drawingEngine.addPoint({ x, y }, false);
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingMouse) return;
    setIsDrawingMouse(false);
    if (activeTool !== 'eraser') {
      drawingEngine.endStroke();
    }
  };

  // File upload handlers
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Save current annotations before switching
      const currentKey = getCurrentSlideKey();
      annotationsMapRef.current[currentKey] = drawingEngine.getStrokes();

      setPdfFile(file);
      setSourceType('pdf');
      setCurrentSlideIndex(0);
      drawingEngine.clear();
    }
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Save current annotations before switching
      const currentKey = getCurrentSlideKey();
      annotationsMapRef.current[currentKey] = drawingEngine.getStrokes();

      const urls = Array.from(files).map((f) => URL.createObjectURL(f));
      setImageSlides(urls);
      setSourceType('images');
      setCurrentSlideIndex(0);
      drawingEngine.clear();
    }
  };

  const handleSwitchToDefault = () => {
    const currentKey = getCurrentSlideKey();
    annotationsMapRef.current[currentKey] = drawingEngine.getStrokes();

    setSourceType('default');
    setCurrentSlideIndex(0);
    const targetKey = 'default-0';
    drawingEngine.setStrokes(annotationsMapRef.current[targetKey] || []);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#FAF4FC] border border-[#EDDCEF] shadow-lg select-none">
      {/* Hidden File Inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfUpload}
      />
      <input
        ref={imagesInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleImagesUpload}
      />

      {/* Top Controls Header */}
      <div className="h-14 bg-white/95 backdrop-blur-md border-b border-[#EDDCEF] px-5 flex items-center justify-between z-20 shadow-xs">
        {/* Left: Title & Source mode switcher */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-[#2F0346] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#813DA2]">slideshow</span>
            <span>Interactive Slides</span>
          </span>

          <div className="w-[1px] h-5 bg-[#EDDCEF] mx-1"></div>

          {/* Preset / Upload buttons */}
          <button
            type="button"
            onClick={handleSwitchToDefault}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              sourceType === 'default'
                ? 'bg-[#813DA2] text-white border-[#813DA2] shadow-xs'
                : 'bg-[#FAF4FC] text-[#813DA2] border-[#EDDCEF] hover:bg-[#FBE8FF]'
            }`}
          >
            Sample Deck
          </button>

          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              sourceType === 'pdf'
                ? 'bg-[#813DA2] text-white border-[#813DA2] shadow-xs'
                : 'bg-[#FAF4FC] text-[#813DA2] border-[#EDDCEF] hover:bg-[#FBE8FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
            <span>Upload PDF</span>
          </button>

          <button
            type="button"
            onClick={() => imagesInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              sourceType === 'images'
                ? 'bg-[#813DA2] text-white border-[#813DA2] shadow-xs'
                : 'bg-[#FAF4FC] text-[#813DA2] border-[#EDDCEF] hover:bg-[#FBE8FF]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">image</span>
            <span>Upload Images</span>
          </button>
        </div>

        {/* Center: Slide Navigator & Counter */}
        <div className="flex items-center gap-2 bg-[#FEEFFF] px-3 py-1 rounded-full border border-[#F6D9FF]">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={currentSlideIndex <= 0}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#813DA2] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
            title="Previous Slide (Swipe Right / Left Arrow)"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>

          <span className="text-xs font-mono font-bold text-[#2F0346] px-1">
            Slide {totalSlides > 0 ? currentSlideIndex + 1 : 0} of {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={currentSlideIndex >= totalSlides - 1}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#813DA2] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
            title="Next Slide (Swipe Left / Right Arrow)"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Right: Air-Drawing Annotation Controls */}
        <div className="flex items-center gap-2">
          {/* Tool Selector */}
          <div className="flex items-center bg-[#FAF4FC] p-1 rounded-xl border border-[#EDDCEF] gap-1">
            <button
              type="button"
              onClick={() => handleSelectTool('pen')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                activeTool === 'pen' ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83] hover:text-[#2F0346]'
              }`}
              title="Air Pen"
            >
              <span className="material-symbols-outlined text-[16px]">draw</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTool('highlighter')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                activeTool === 'highlighter' ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83] hover:text-[#2F0346]'
              }`}
              title="Air Highlighter"
            >
              <span className="material-symbols-outlined text-[16px]">ink_highlighter</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTool('eraser')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                activeTool === 'eraser' ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83] hover:text-[#2F0346]'
              }`}
              title="Air Eraser"
            >
              <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
            </button>
          </div>

          {/* Color Palette */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-[#FAF4FC] p-1 rounded-xl border border-[#EDDCEF]">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectColor(c)}
                  className={`w-4 h-4 rounded-full border border-black/20 transition-transform cursor-pointer ${
                    activeColor === c ? 'scale-125 ring-2 ring-[#813DA2]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                />
              ))}
            </div>
          )}

          {/* Stroke Size */}
          <div className="flex items-center bg-[#FAF4FC] p-1 rounded-xl border border-[#EDDCEF] gap-1">
            <button
              type="button"
              onClick={() => handleSelectSize(3)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                activeSize === 3 ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83]'
              }`}
              title="Fine Stroke"
            >
              F
            </button>
            <button
              type="button"
              onClick={() => handleSelectSize(6)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                activeSize === 6 ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83]'
              }`}
              title="Medium Stroke"
            >
              M
            </button>
            <button
              type="button"
              onClick={() => handleSelectSize(10)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                activeSize === 10 ? 'bg-[#813DA2] text-white' : 'text-[#7A6F83]'
              }`}
              title="Bold Stroke"
            >
              B
            </button>
          </div>

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => drawingEngine.undo()}
            className="p-1.5 rounded-xl bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
          </button>
          <button
            type="button"
            onClick={() => drawingEngine.redo()}
            className="p-1.5 rounded-xl bg-[#FAF4FC] hover:bg-[#FBE8FF] text-[#813DA2] border border-[#EDDCEF] transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <span className="material-symbols-outlined text-[16px]">redo</span>
          </button>

          {/* Clear Slide Annotations */}
          <button
            type="button"
            onClick={handleClearSlideAnnotations}
            className="p-1.5 rounded-xl bg-[#FAF4FC] hover:bg-red-50 text-red-500 border border-[#EDDCEF] transition-colors cursor-pointer"
            title="Clear Slide Annotations"
          >
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
          </button>

          {/* Toggle Annotations Visibility */}
          <button
            type="button"
            onClick={() => setIsAnnotationsVisible(!isAnnotationsVisible)}
            className={`p-1.5 rounded-xl border border-[#EDDCEF] transition-colors cursor-pointer ${
              isAnnotationsVisible ? 'bg-[#FEEFFF] text-[#813DA2]' : 'bg-gray-100 text-gray-400'
            }`}
            title="Toggle Annotations Layer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isAnnotationsVisible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Large Slide Viewport */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden bg-radial from-[#32174D] via-[#1E0D30] to-[#120520]">
        {/* Floating Slide Navigation Arrows on Canvas Edge */}
        <button
          type="button"
          onClick={handlePrevSlide}
          disabled={currentSlideIndex <= 0}
          className="absolute left-6 z-30 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          title="Previous Slide"
        >
          <span className="material-symbols-outlined text-[28px]">chevron_left</span>
        </button>

        <button
          type="button"
          onClick={handleNextSlide}
          disabled={currentSlideIndex >= totalSlides - 1}
          className="absolute right-6 z-30 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          title="Next Slide"
        >
          <span className="material-symbols-outlined text-[28px]">chevron_right</span>
        </button>

        {/* 16:9 Presentation Stage Container */}
        <div
          ref={slideContainerRef}
          className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-white select-none"
        >
          {/* 1. Slide Content: Mode 1 - Built-in Default Slide Deck */}
          {sourceType === 'default' && (
            <div className="w-full h-full p-10 flex flex-col justify-between bg-gradient-to-br from-[#1E0B36] via-[#2F0E54] to-[#431475] text-white relative overflow-hidden">
              {/* Decorative background grid and flares */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #D988ED 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#813DA2]/30 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <span className="px-3 py-1 rounded-full bg-[#D988ED]/20 text-[#D988ED] text-xs font-mono font-bold tracking-wider uppercase border border-[#D988ED]/30 mb-2 inline-block">
                    {DEFAULT_SLIDES[currentSlideIndex].badge}
                  </span>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    {DEFAULT_SLIDES[currentSlideIndex].title}
                  </h1>
                  <p className="text-sm text-white/70 mt-0.5">
                    {DEFAULT_SLIDES[currentSlideIndex].subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs font-mono text-emerald-300">
                  <span>● Live Air Canvas Active</span>
                </div>
              </div>

              {/* Middle Body: Key Concepts & Callout Formula Box */}
              <div className="relative z-10 grid grid-cols-3 gap-5 my-auto">
                {DEFAULT_SLIDES[currentSlideIndex].points.map((pt, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-[#D988ED]/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#813DA2]/50 flex items-center justify-center text-white mb-3">
                      <span className="material-symbols-outlined text-[20px]">{pt.icon}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{pt.title}</h3>
                    <p className="text-xs text-white/75 leading-relaxed">{pt.desc}</p>
                  </div>
                ))}
              </div>

              {/* Formula & Annotation Callout Box */}
              <div className="relative z-10 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-[#D988ED]/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#D988ED] tracking-wider mb-0.5">
                    Core Mathematical Principle
                  </div>
                  <div className="text-lg font-mono font-bold text-amber-300 tracking-wide">
                    {DEFAULT_SLIDES[currentSlideIndex].callout.formula}
                  </div>
                  <div className="text-xs text-white/70 mt-0.5">
                    {DEFAULT_SLIDES[currentSlideIndex].callout.explanation}
                  </div>
                </div>

                <div className="text-right text-[11px] text-white/60 font-mono">
                  {DEFAULT_SLIDES[currentSlideIndex].footerNote}
                </div>
              </div>
            </div>
          )}

          {/* 1. Slide Content: Mode 2 - Uploaded Images Deck */}
          {sourceType === 'images' && (
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              {imageSlides.length > 0 ? (
                <img
                  src={imageSlides[currentSlideIndex]}
                  alt={`Slide ${currentSlideIndex + 1}`}
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="text-center text-white/60 p-6">
                  <span className="material-symbols-outlined text-4xl mb-2 text-[#D988ED]">
                    photo_library
                  </span>
                  <p className="text-sm">No images uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* 1. Slide Content: Mode 3 - Uploaded PDF Deck */}
          {sourceType === 'pdf' && (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-auto">
              {pdfFile ? (
                <Document
                  file={pdfFile}
                  onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                  loading={
                    <div className="text-white/70 flex items-center gap-2 text-sm font-mono">
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Loading PDF Slides...
                    </div>
                  }
                  error={
                    <div className="text-red-400 text-sm">Failed to load PDF slides.</div>
                  }
                >
                  <Page
                    pageNumber={currentSlideIndex + 1}
                    width={slideContainerRef.current?.clientWidth || 960}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              ) : (
                <div className="text-center text-white/60 p-6">
                  <span className="material-symbols-outlined text-4xl mb-2 text-[#D988ED]">
                    picture_as_pdf
                  </span>
                  <p className="text-sm">No PDF slides loaded.</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Air-Drawing Annotation Transparent Canvas Layer Over Slide */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`absolute inset-0 w-full h-full z-20 cursor-crosshair ${
              isAnnotationsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
        </div>
      </div>

      {/* Bottom Gesture & Slide Guidance Banner */}
      <div className="h-8 bg-black/85 backdrop-blur-md px-5 flex items-center justify-between text-[11px] text-white/80 font-mono z-20">
        <span className="flex items-center gap-2">
          <span>🖐️ Swipe Left / Right: Next / Previous Slide</span>
          <span className="text-[#D988ED]">•</span>
          <span>👆 Index Point: Air Draw</span>
          <span className="text-[#D988ED]">•</span>
          <span>✌️ Two Fingers: Erase</span>
          <span className="text-[#D988ED]">•</span>
          <span>✊ Fist (Hold 1s): Clear Slide</span>
        </span>
        <span className="text-[#D988ED] font-semibold">
          Annotations automatically saved per slide
        </span>
      </div>
    </div>
  );
};
