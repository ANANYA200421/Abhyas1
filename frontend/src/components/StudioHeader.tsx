import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface StudioHeaderProps {
  showTimer?: boolean;
  roomInfo?: string;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  showTimer = false,
  roomInfo = 'Room 402 • Grade 8 Physics',
}) => {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(24 * 60 + 18);

  useEffect(() => {
    if (!showTimer) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer]);

  const formatTimer = (totalSec: number) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <header className="fixed top-0 left-20 right-0 h-16 bg-[#FFF7FC]/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(74,33,96,0.04)] border-b border-[#EDDCEF]/60 z-40 flex items-center justify-between px-6">
      {/* Left side: Live Session indicator & Room Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FBE8FF] rounded-full border border-[#F6D9FF]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] animate-pulse"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F0346]">
            Live Session
          </span>
        </div>

        <div className="flex items-center gap-2 text-[#4D4350] text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px] text-[#813DA2]">
            cast_for_education
          </span>
          <span>{roomInfo}</span>
        </div>

        {showTimer && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#EDDCEF] text-xs font-mono font-bold text-[#7A3A9A] shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-[#A55FC6]">
              schedule
            </span>
            <span>{formatTimer(seconds)}</span>
          </div>
        )}
      </div>

      {/* Right side: Telemetry & Session Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-[#FEEFFF] rounded-full p-1 gap-1 border border-[#EDDCEF]">
          <div className="px-3 py-1 rounded-full text-xs font-medium text-[#2F0346] flex items-center gap-1.5 bg-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gestures Active</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            title="End current session and return to dashboard"
            className="px-3 py-1 rounded-full text-xs font-bold bg-[#ba1a1a] hover:bg-[#93000a] text-white hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">call_end</span>
            <span>End Session</span>
          </button>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#813da2] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#F7D8FF]">
          <span className="material-symbols-outlined text-white text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
};
