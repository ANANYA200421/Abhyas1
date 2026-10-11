import React from 'react';
import type { StrokeTool } from '../../gestures/drawingEngine';
import { COLORS, SIZES, type StrokeSizeType } from './toolbarOptions';
export type { StrokeSizeType } from './toolbarOptions';

interface FloatingToolbarProps {
  activeTool: StrokeTool;
  onToolChange: (tool: StrokeTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  activeSize: StrokeSizeType;
  onSizeChange: (size: StrokeSizeType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSavePNG: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  activeSize,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
  onSavePNG,
  canUndo = true,
  canRedo = true,
}) => {
  return (
    <div
      id="abhyas-floating-toolbar"
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-xl shadow-2xl border border-[#EDDCEF] select-none"
    >
      {/* 1. Main Tools: Pen, Highlighter, Eraser */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-gesture-target="tool-pen"
          onClick={() => onToolChange('pen')}
          title="Chalk Pen (Ctrl+P)"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'pen'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">edit</span>
          <span>Pen</span>
        </button>

        <button
          type="button"
          data-gesture-target="tool-highlighter"
          onClick={() => onToolChange('highlighter')}
          title="Semi-transparent Highlighter"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'highlighter'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">ink_highlighter</span>
          <span>Highlight</span>
        </button>

        <button
          type="button"
          data-gesture-target="tool-eraser"
          onClick={() => onToolChange('eraser')}
          title="Eraser Tool"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#813DA2] text-white shadow-md scale-105'
              : 'text-[#4D4350] hover:bg-[#F9E0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">ink_eraser</span>
          <span>Eraser</span>
        </button>
      </div>

      <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

      {/* 2. 5 Color Swatches */}
      <div className="flex items-center gap-1.5 px-1">
        {COLORS.map((c) => {
          const isSelected = activeColor === c.hex && activeTool !== 'eraser';
          return (
            <button
              key={c.hex}
              type="button"
              data-gesture-target={`color-${c.hex}`}
              onClick={() => onColorChange(c.hex)}
              title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'scale-125 border-[#813DA2] ring-2 ring-[#F7D8FF]'
                  : 'border-white/80 hover:scale-110 shadow-xs'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>

      <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

      {/* 3. Stroke Size (Fine / Medium / Bold) */}
      <div className="flex items-center gap-1">
        {SIZES.map((s) => {
          const isSelected = activeSize === s.id;
          return (
            <button
              key={s.id}
              type="button"
              data-gesture-target={`size-${s.id}`}
              onClick={() => onSizeChange(s.id)}
              title={`${s.label} stroke`}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FBE8FF] text-[#813DA2] border border-[#A55FC6]/40 shadow-xs'
                  : 'text-[#7A6F83] hover:bg-[#FAF4FC]'
              }`}
            >
              <span
                className="rounded-full bg-current inline-block"
                style={{ width: s.iconSize, height: s.iconSize }}
              ></span>
              <span className="text-[11px]">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

      {/* 4. Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          data-gesture-target="action-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">undo</span>
        </button>

        <button
          type="button"
          data-gesture-target="action-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#4D4350] hover:bg-[#F9E0FF] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">redo</span>
        </button>
      </div>

      <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

      {/* 5. Clear Slate */}
      <button
        type="button"
        data-gesture-target="action-clear"
        onClick={onClear}
        title="Clear Blackboard"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-[#BA1A1A] hover:bg-red-50 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
        <span>Clear</span>
      </button>

      <div className="w-[1px] h-6 bg-[#EDDCEF]"></div>

      {/* 6. Save as PNG (Combined drawing + video frame) */}
      <button
        type="button"
        data-gesture-target="action-save-png"
        onClick={onSavePNG}
        title="Download Drawing + Camera Frame as PNG"
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#A55FC6] hover:bg-[#7A3A9A] text-white shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        <span>Save PNG</span>
      </button>
    </div>
  );
};
