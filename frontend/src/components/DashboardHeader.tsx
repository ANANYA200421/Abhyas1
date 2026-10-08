import React from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between pb-8 pt-1">
      {/* Search Bar */}
      <div className="relative w-80 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8496]">
          <span className="material-symbols-outlined text-[17px]">search</span>
        </div>
        <input
          type="text"
          placeholder="Search lessons, notes..."
          className="w-full pl-10 pr-12 py-2 bg-white/90 border border-[#ECDDEF] rounded-full text-xs text-[#2A1338] placeholder-[#958C9D] focus:outline-none focus:ring-2 focus:ring-[#7E2D96]/20 focus:border-[#7E2D96] shadow-sm transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-[10px] text-[#938A9B] font-mono tracking-tighter bg-[#F5E9F8] px-1.5 py-0.5 rounded border border-[#EBDBEE]/80">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right Actions: Notifications & Go Live */}
      <div className="flex items-center gap-3">
        {/* Notification Button */}
        <button
          type="button"
          title="Notifications"
          className="w-9 h-9 rounded-full bg-white/90 border border-[#ECDDEF] flex items-center justify-center text-[#5C4F66] hover:text-[#210C2D] hover:bg-white shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">notifications</span>
        </button>

        {/* Go Live Button */}
        <button
          type="button"
          onClick={() => navigate('/preview')}
          className="flex items-center gap-2 px-4 py-2 bg-[#7E2D96] hover:bg-[#6C2383] text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">sensors</span>
          <span>Go Live</span>
        </button>
      </div>
    </header>
  );
};
