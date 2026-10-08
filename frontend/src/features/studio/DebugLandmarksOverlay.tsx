import React, { useState } from 'react';
import type { RecognizedGesture } from '../../gestures/types';

interface DebugLandmarksOverlayProps {
  gesture?: RecognizedGesture;
  fps: number;
}

export const DebugLandmarksOverlay: React.FC<DebugLandmarksOverlayProps> = ({
  gesture,
  fps,
}) => {
  const [showDebug, setShowDebug] = useState(false);

  const landmarks = gesture?.rawLandmarks || [];

  return (
    <div className="flex flex-col items-end">
      {/* Debug Toggle Button */}
      <button
        type="button"
        onClick={() => setShowDebug((prev) => !prev)}
        className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
          showDebug
            ? 'bg-[#BA1A1A] text-white ring-2 ring-red-300'
            : 'bg-black/60 text-white/90 hover:bg-black/80 backdrop-blur-md border border-white/20'
        }`}
        title="Toggle MediaPipe Raw Landmarks Debug HUD"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>DEBUG: {showDebug ? 'ON' : 'OFF'}</span>
      </button>

      {/* Floating Coordinates HUD */}
      {showDebug && (
        <div className="mt-2 w-80 max-h-96 overflow-y-auto bg-black/85 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-white font-mono text-[11px] shadow-2xl space-y-2 z-40 scrollbar-none">
          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
            <span className="font-bold text-[#D988ED]">MediaPipe Vision HUD</span>
            <span className="text-emerald-400">{fps} FPS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/60">Gesture: </span>
              <span className="text-[#FDE047] font-bold">{gesture?.type || 'NONE'}</span>
            </div>
            <div>
              <span className="text-white/60">Confidence: </span>
              <span className="text-emerald-400">
                {gesture?.confidence ? `${Math.round(gesture.confidence * 100)}%` : '--'}
              </span>
            </div>
            <div>
              <span className="text-white/60">Cursor X: </span>
              <span>{gesture?.cursor ? gesture.cursor.x.toFixed(3) : '--'}</span>
            </div>
            <div>
              <span className="text-white/60">Cursor Y: </span>
              <span>{gesture?.cursor ? gesture.cursor.y.toFixed(3) : '--'}</span>
            </div>
            {gesture?.pinchDistance !== undefined && (
              <div className="col-span-2">
                <span className="text-white/60">Pinch Distance: </span>
                <span className="text-[#38BDF8]">{gesture.pinchDistance.toFixed(4)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-white/20 pt-1.5">
            <div className="text-[10px] text-white/70 font-bold mb-1">
              Raw 21 Landmark Coordinates (x, y, z):
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {landmarks.length === 21 ? (
                landmarks.map((lm, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-[10px] py-0.5 px-1 rounded bg-white/5 border border-white/5"
                  >
                    <span className="text-[#D988ED] w-6">#{idx}</span>
                    <span className="text-white/90">x:{lm.x.toFixed(3)}</span>
                    <span className="text-white/90">y:{lm.y.toFixed(3)}</span>
                    <span className="text-white/60">z:{(lm.z || 0).toFixed(3)}</span>
                  </div>
                ))
              ) : (
                <div className="text-white/40 italic text-center py-2">
                  No hand landmarks detected
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
