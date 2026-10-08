import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebcamView, type WebcamTelemetry } from '../../components/WebcamView';

export const CameraPreviewCard: React.FC = () => {
  const navigate = useNavigate();
  const [telemetry, setTelemetry] = useState<WebcamTelemetry>({
    isHandDetected: false,
    fps: 0,
  });

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-6 gap-6">
      {/* Aspect Video Camera Preview Card with Live Webcam and 21-Landmark Overlay */}
      <div className="w-full relative aspect-video rounded-2xl bg-[#FBE8FF] border border-[#D0C2D1]/40 shadow-sm overflow-hidden flex flex-col items-center justify-center group">
        {/* Reusable Webcam & Hand Tracker View */}
        <WebcamView
          className="w-full h-full"
          onTelemetryUpdate={setTelemetry}
          overlayChildren={
            <div className="w-full h-full p-4 flex flex-col justify-between pointer-events-none">
              {/* Top Bar Over Video */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        telemetry.isHandDetected
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                    ></span>
                    <span>
                      {telemetry.isHandDetected ? 'Hand Detected' : 'Searching for Hand'}
                    </span>
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[11px] font-mono">
                    {telemetry.fps > 0 ? `${telemetry.fps} FPS` : '640x480'}
                  </span>
                </div>

                <button
                  type="button"
                  title="Camera Settings"
                  className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-all pointer-events-auto cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </button>
              </div>

              {/* Bottom Guidance Prompt Banner */}
              <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-white">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#D988ED]">
                    front_hand
                  </span>
                  <div className="text-left">
                    <div className="text-xs font-bold leading-tight">
                      Camera &amp; Spatial Tracking Ready
                    </div>
                    <div className="text-[11px] text-white/75">
                      Raise your hand in front of the camera to initialize gesture controls
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono bg-white/15 px-2.5 py-1 rounded-full">
                  <span>Front Cam</span>
                  <span className="text-[#D988ED]">• Mirrored</span>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* Prominent Launch Studio Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/session')}
          className="px-8 py-3.5 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white font-semibold text-base flex items-center gap-2.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
          <span>Launch Studio</span>
        </button>
      </div>
    </div>
  );
};
