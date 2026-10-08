import React, { useState } from 'react';
import { MOCK_TELEMETRY } from '../../types/mockData';
import { WebcamView, type WebcamTelemetry } from '../../components/WebcamView';

export const GestureStatusPanel: React.FC = () => {
  const [telemetry, setTelemetry] = useState<WebcamTelemetry>({
    isHandDetected: false,
    fps: 0,
  });

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col gap-4 h-[calc(100vh-8.5rem)] overflow-y-auto pr-1 scrollbar-none">
      {/* 1. Webcam Video Preview Card with Live Webcam & Hand Tracking */}
      <div className="bg-white rounded-2xl border border-[#EDDCEF] shadow-sm p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2F0346]">
            <span className="material-symbols-outlined text-[17px] text-[#813DA2]">
              videocam
            </span>
            <span>Teacher Webcam Feed</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        </div>

        {/* Live Reusable WebcamView with Canvas Overlay for 21 Landmarks */}
        <div className="relative aspect-video rounded-xl overflow-hidden border border-[#7A3A9A]/30">
          <WebcamView
            className="w-full h-full"
            onTelemetryUpdate={setTelemetry}
            overlayChildren={
              <div className="w-full h-full p-2 flex flex-col justify-between pointer-events-none">
                {/* Top overlay badges */}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-mono text-white/90">
                    {telemetry.isHandDetected ? (
                      <span className="text-emerald-400 font-bold">● 21 KEYPOINTS</span>
                    ) : (
                      <span className="text-amber-400">WAITING FOR HAND</span>
                    )}
                  </span>

                  <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-mono text-emerald-400">
                    {MOCK_TELEMETRY.confidence}% CONF
                  </span>
                </div>

                {/* Bottom telemetry overlay: Real FPS */}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-mono text-white/90">
                    {telemetry.fps > 0 ? telemetry.fps : 30} FPS • {MOCK_TELEMETRY.latencyMs}ms
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-mono text-white/70">
                    GPU DELEGATE
                  </span>
                </div>
              </div>
            }
          />
        </div>

        {/* Hardware input specification */}
        <div className="flex items-center justify-between text-[11px] text-[#7A6F83] pt-0.5">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-[#813DA2]">laptop</span>
            {MOCK_TELEMETRY.webcamSource}
          </span>
          <span className="text-[10px] text-[#A55FC6] font-semibold">Front (640x480)</span>
        </div>
      </div>

      {/* 2. Real-Time Telemetry with Real Values (Hand Detected & FPS) */}
      <div className="bg-white rounded-2xl border border-[#EDDCEF] shadow-sm p-3.5 space-y-2">
        <h3 className="text-xs font-bold text-[#2F0346] flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-[#813DA2]">
              vital_signs
            </span>
            <span>Hand Tracking Status</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-[#7A3A9A] bg-[#FBE8FF] px-2 py-0.5 rounded-full">
            REAL-TIME
          </span>
        </h3>

        {/* Real Hand Detected Status */}
        <div className="p-2.5 rounded-xl bg-[#FEEFFF] border border-[#F6D9FF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white ${
                telemetry.isHandDetected ? 'bg-[#813DA2]' : 'bg-[#736B79]'
              }`}
            >
              {telemetry.isHandDetected ? '✋' : '⏳'}
            </span>
            <div>
              <div className="text-[11px] font-bold text-[#2F0346]">
                Hand Detected: {telemetry.isHandDetected ? 'TRUE' : 'FALSE'}
              </div>
              <div className="text-[10px] text-[#7A3A9A]">
                {telemetry.isHandDetected
                  ? 'Right Hand: Index Pointing (Draw Mode)'
                  : 'Place hand in view of camera'}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              telemetry.isHandDetected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {telemetry.isHandDetected ? 'DETECTED' : 'SEARCHING'}
          </span>
        </div>

        {/* Real FPS & System Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-xl bg-[#FFF7FC] border border-[#EDDCEF]">
            <div className="text-[10px] text-[#7A6F83]">Detection FPS</div>
            <div className="text-sm font-bold font-mono text-[#813DA2]">
              {telemetry.fps > 0 ? telemetry.fps : '--'} <span className="text-[10px] font-normal">fps</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-[#FFF7FC] border border-[#EDDCEF]">
            <div className="text-[10px] text-[#7A6F83]">Gesture Conf.</div>
            <div className="text-sm font-bold font-mono text-[#2F0346]">
              {MOCK_TELEMETRY.confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spatial Calibration Target (From DESIGN.md) */}
      <div className="bg-white rounded-2xl border border-[#EDDCEF] shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#2F0346] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-[#813DA2]">
              target
            </span>
            <span>Spatial Calibration Target</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-[#813DA2] bg-[#FBE8FF] px-2 py-0.5 rounded-full">
            {telemetry.isHandDetected ? 'LOCKED' : 'READY'}
          </span>
        </div>

        {/* Dual-ring calibration target as specified in DESIGN.md */}
        <div className="flex items-center justify-center py-2">
          <div className="relative w-24 h-24 rounded-full border-2 border-[#A55FC6]/30 flex items-center justify-center">
            {/* Outer animated ripple when hand is detected */}
            <div
              className={`absolute inset-0 rounded-full border border-[#A55FC6] ${
                telemetry.isHandDetected ? 'animate-ping opacity-35' : 'opacity-15'
              }`}
            ></div>
            {/* Mid ring */}
            <div className="w-16 h-16 rounded-full border-2 border-[#A55FC6] flex items-center justify-center bg-[#FBE8FF]/40">
              {/* Inner pulsing circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md ${
                  telemetry.isHandDetected ? 'bg-[#10B981]' : 'bg-[#813DA2] animate-pulse'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">front_hand</span>
              </div>
            </div>
            {/* Target reticle crosshairs */}
            <div className="absolute top-0 bottom-0 w-[1px] bg-[#A55FC6]/20 pointer-events-none"></div>
            <div className="absolute left-0 right-0 h-[1px] bg-[#A55FC6]/20 pointer-events-none"></div>
          </div>
        </div>

        <p className="text-[11px] text-center text-[#7A6F83]">
          Dual-ring hand distance lock. Stand 0.5m – 1.8m from webcam.
        </p>
      </div>

      {/* 4. Gesture Quick-Reference Cheat Sheet (Mock Actions/Gestures) */}
      <div className="bg-white rounded-2xl border border-[#EDDCEF] shadow-sm p-3.5">
        <h3 className="text-xs font-bold text-[#2F0346] flex items-center gap-1.5 mb-2.5">
          <span className="material-symbols-outlined text-[17px] text-[#813DA2]">
            auto_stories
          </span>
          <span>Recognized Gestures Guide</span>
        </h3>

        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="p-2 rounded-xl bg-[#FAF4FC] border border-[#EDDCEF]/60">
            <div className="text-base mb-0.5">☝️</div>
            <div className="text-[11px] font-bold text-[#2F0346]">Index Point</div>
            <div className="text-[10px] text-[#7A6F83]">Draw on slate</div>
          </div>

          <div className="p-2 rounded-xl bg-[#FAF4FC] border border-[#EDDCEF]/60">
            <div className="text-base mb-0.5">✊</div>
            <div className="text-[11px] font-bold text-[#2F0346]">Closed Fist</div>
            <div className="text-[10px] text-[#7A6F83]">Chalk eraser</div>
          </div>

          <div className="p-2 rounded-xl bg-[#FAF4FC] border border-[#EDDCEF]/60">
            <div className="text-base mb-0.5">🖐️</div>
            <div className="text-[11px] font-bold text-[#2F0346]">Open Palm</div>
            <div className="text-[10px] text-[#7A6F83]">Pan slate</div>
          </div>

          <div className="p-2 rounded-xl bg-[#FAF4FC] border border-[#EDDCEF]/60">
            <div className="text-base mb-0.5">✌️</div>
            <div className="text-[11px] font-bold text-[#2F0346]">Peace / V</div>
            <div className="text-[10px] text-[#7A6F83]">Select / Zoom</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
