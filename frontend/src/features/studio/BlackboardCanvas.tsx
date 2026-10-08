import React, { useState, useRef, useEffect } from 'react';
import type { BlackboardTool } from '../../types/session';

export const BlackboardCanvas: React.FC = () => {
  const [activeTool, setActiveTool] = useState<BlackboardTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#FFFFFF');
  const [slideNumber, setSlideNumber] = useState<number>(1);
  const totalSlides = 3;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions according to container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Initial hint text on blank canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (activeTool === 'eraser') {
      ctx.strokeStyle = '#1F1428';
      ctx.lineWidth = 28;
    } else if (activeTool === 'highlighter') {
      ctx.strokeStyle = 'rgba(217, 136, 237, 0.4)';
      ctx.lineWidth = 18;
    } else {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3;
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const colors = [
    { label: 'White Chalk', hex: '#FFFFFF' },
    { label: 'Lavender Chalk', hex: '#D988ED' },
    { label: 'Yellow Chalk', hex: '#FDE047' },
    { label: 'Cyan Chalk', hex: '#38BDF8' },
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-8.5rem)] relative rounded-2xl overflow-hidden bg-[#1F1428] border border-[#7A3A9A]/30 shadow-lg select-none">
      {/* Blackboard Slate Background Texture & Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      ></div>

      {/* Top Blackboard Header / Topic Badge */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-semibold tracking-wide border border-white/10">
            Physics: Electrostatics &amp; Gauss's Law
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#A55FC6]/30 text-[#D988ED] text-[11px] font-mono border border-[#A55FC6]/40">
            Air-Writing Slate
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs font-mono">
            Slide {slideNumber} / {totalSlides}
          </span>
        </div>
      </div>

      {/* Hardcoded Pedagogical Chalk Diagram & Formulas */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-center px-12 z-0">
        <div className="max-w-2xl text-white/80 space-y-4">
          {/* Formula 1 */}
          <div className="inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-sm font-mono text-[#D988ED] font-bold block mb-1">
              Gauss's Flux Theorem:
            </span>
            <div className="text-2xl font-serif tracking-wider text-white flex items-center gap-2">
              <span>Φ<sub>E</sub> = ∮ </span>
              <span className="text-[#FDE047]">E</span>
              <span> · d</span>
              <span className="text-[#38BDF8]">A</span>
              <span> = </span>
              <span className="inline-flex flex-col items-center text-sm leading-tight">
                <span className="border-b border-white px-1">Q<sub>enc</sub></span>
                <span>ε₀</span>
              </span>
            </div>
          </div>

          {/* Diagram Illustration */}
          <div className="flex items-center gap-6 pt-2">
            <svg
              className="w-48 h-32 opacity-70"
              viewBox="0 0 200 120"
              fill="none"
              stroke="currentColor"
            >
              {/* Gaussian Surface Sphere */}
              <ellipse
                cx="90"
                cy="60"
                rx="60"
                ry="45"
                stroke="#D988ED"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle cx="90" cy="60" r="10" fill="#FDE047" stroke="#FFFFFF" strokeWidth="1.5" />
              <text x="86" y="64" fill="#1F1428" fontSize="12" fontWeight="bold">
                +q
              </text>
              {/* Vector Lines */}
              <path d="M90 50 L90 15" stroke="#38BDF8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M100 60 L140 60" stroke="#38BDF8" strokeWidth="2" />
              <path d="M80 60 L40 60" stroke="#38BDF8" strokeWidth="2" />
              <path d="M90 70 L90 105" stroke="#38BDF8" strokeWidth="2" />
              <text x="145" y="64" fill="#38BDF8" fontSize="11" fontFamily="monospace">
                E-Field
              </text>
            </svg>

            <div className="text-xs text-white/60 space-y-1 font-mono">
              <p>• Electric flux through a closed surface</p>
              <p>• Proportional to enclosed charge Q<sub>enc</sub></p>
              <p>• Symmetry simplifies field calculation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Freehand Chalk Canvas for Teacher */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="w-full h-full cursor-crosshair z-10"
        title="Click & drag to write on blackboard"
      />

      {/* Floating Lesson Toolbar Dock (From DESIGN.md) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-2xl border border-[#EDDCEF]">
        {/* Pen Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          title="Chalk Pen"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'pen'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">edit</span>
          <span>Pen</span>
        </button>

        {/* Highlighter Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('highlighter')}
          title="Highlighter"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'highlighter'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">ink_highlighter</span>
          <span>Highlight</span>
        </button>

        {/* Eraser Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          title="Slate Eraser"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">ink_eraser</span>
          <span>Eraser</span>
        </button>

        {/* Vertical divider */}
        <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

        {/* Chalk Color Swatches */}
        <div className="flex items-center gap-1.5 px-1">
          {colors.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                setActiveColor(c.hex);
                setActiveTool('pen');
              }}
              title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                activeColor === c.hex && activeTool === 'pen'
                  ? 'scale-125 border-[#813DA2] ring-2 ring-[#F7D8FF]'
                  : 'border-white/80 hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

        {/* Clear Slate Button */}
        <button
          type="button"
          onClick={clearCanvas}
          title="Clear Slate"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#BA1A1A] hover:bg-red-50 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
          <span>Clear</span>
        </button>

        {/* Slide navigation controls */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={() => setSlideNumber((s) => Math.max(1, s - 1))}
            disabled={slideNumber === 1}
            title="Previous Page"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <span className="text-[11px] font-mono font-bold text-[#7A3A9A]">
            {slideNumber}/{totalSlides}
          </span>
          <button
            type="button"
            onClick={() => setSlideNumber((s) => Math.min(totalSlides, s + 1))}
            disabled={slideNumber === totalSlides}
            title="Next Page"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};
