import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MOCK_TEACHER } from '../types/mockData';

interface SidebarProps {
  variant?: 'full' | 'rail';
}

export const Sidebar: React.FC<SidebarProps> = ({ variant = 'full' }) => {
  const navigate = useNavigate();

  if (variant === 'rail') {
    return (
      <aside className="fixed left-0 top-0 h-full w-20 bg-[#FEEFFF] shadow-[0_1px_8px_rgba(74,33,96,0.06)] z-50 flex flex-col items-center py-5 border-r border-[#EDDCEF]">
        {/* Top Icon Badge */}
        <div className="mb-6 flex items-center justify-center">
          <div
            onClick={() => navigate('/dashboard')}
            className="w-11 h-11 rounded-full bg-[#813da2] flex items-center justify-center text-white shadow-sm ring-4 ring-[#F7D8FF] cursor-pointer hover:opacity-90 transition-opacity"
            title="Abhyas Spatial Studio"
          >
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
        </div>

        {/* Rail Navigation Links */}
        <nav className="flex-1 flex flex-col items-center gap-3 w-full px-2">
          {/* Active Session / Studio */}
          <NavLink
            to="/session"
            title="Active Session"
            className={({ isActive }) =>
              `group relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                isActive
                  ? 'bg-[#9c57bd] text-white shadow-md'
                  : 'text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346]'
              }`
            }
          >
            <span className="material-symbols-outlined text-[24px]">co_present</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Active Session
            </span>
          </NavLink>

          {/* Camera Preview */}
          <NavLink
            to="/preview"
            title="Studio Preview"
            className={({ isActive }) =>
              `group relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                isActive
                  ? 'bg-[#9c57bd] text-white shadow-md'
                  : 'text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346]'
              }`
            }
          >
            <span className="material-symbols-outlined text-[24px]">sensors</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Studio Preview
            </span>
          </NavLink>

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            title="Dashboard"
            className={({ isActive }) =>
              `group relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                isActive
                  ? 'bg-[#9c57bd] text-white shadow-md'
                  : 'text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346]'
              }`
            }
          >
            <span className="material-symbols-outlined text-[24px]">dashboard</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Dashboard
            </span>
          </NavLink>

          {/* Content Library */}
          <button
            type="button"
            title="Content Library"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346] transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">video_library</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Library
            </span>
          </button>

          {/* Gesture Setup */}
          <button
            type="button"
            title="Gesture Setup"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346] transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">front_hand</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Gesture Setup
            </span>
          </button>
        </nav>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            type="button"
            title="Studio Settings"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full text-[#4d4350] hover:bg-[#f9e0ff] hover:text-[#2f0346] transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">tune</span>
            <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#461d5c] text-[#fdebff] text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
              Studio Settings
            </span>
          </button>
          <div
            className="w-9 h-9 rounded-full bg-[#f9e0ff] flex items-center justify-center text-[#813da2]"
            title="Webcam Sensor Ready"
          >
            <span className="material-symbols-outlined text-[20px]">sensors</span>
          </div>
        </div>
      </aside>
    );
  }

  // Full sidebar as shown in the Dashboard screen
  return (
    <aside className="w-64 bg-[#FAF4FC] flex-shrink-0 flex flex-col justify-between p-4 border-r border-[#EDDCEF]/70 min-h-screen">
      {/* Brand & Main Links */}
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8A33A6] to-[#601B78] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-bold text-[#1F0B2A] tracking-tight">
                Abhyas <span className="font-medium text-[#7A3294] text-[11px]">(Vidyaa)</span>
              </div>
              <div className="text-[9px] font-bold text-[#8C8294] tracking-widest uppercase">
                SPATIAL STUDIO
              </div>
            </div>
          </div>
          <button
            type="button"
            className="text-[#7D7285] hover:text-[#2C133A] p-1 rounded transition-colors"
            title="Toggle menu"
          >
            <span className="material-symbols-outlined text-[19px]">notes</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 mt-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-[13px] transition-all ${
                isActive
                  ? 'bg-[#7E2D96] text-white shadow-sm'
                  : 'text-[#5B5163] hover:text-[#1E0B2A] hover:bg-[#F2E2F6]/70 font-medium'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">dashboard</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/preview"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-[13px] transition-all ${
                isActive
                  ? 'bg-[#7E2D96] text-white shadow-sm'
                  : 'text-[#5B5163] hover:text-[#1E0B2A] hover:bg-[#F2E2F6]/70 font-medium'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">sensors</span>
            <span>Live Studio</span>
          </NavLink>

          <NavLink
            to="/session"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-[13px] transition-all ${
                isActive
                  ? 'bg-[#7E2D96] text-white shadow-sm'
                  : 'text-[#5B5163] hover:text-[#1E0B2A] hover:bg-[#F2E2F6]/70 font-medium'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">co_present</span>
            <span>Active Session</span>
          </NavLink>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#5B5163] hover:text-[#1E0B2A] hover:bg-[#F2E2F6]/70 font-medium text-[13px] transition-all text-left"
          >
            <span className="material-symbols-outlined text-[19px]">grid_view</span>
            <span>Content Library</span>
          </button>
        </nav>
      </div>

      {/* Bottom User Card */}
      <div className="pt-4">
        <div className="bg-white/90 backdrop-blur-sm border border-[#EDDCEF] rounded-xl p-2.5 flex items-center justify-between hover:bg-white cursor-pointer shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#A55FC6] to-[#7A3A9A] text-white flex items-center justify-center font-bold text-xs ring-1 ring-purple-100 flex-shrink-0">
              RS
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-[#230F30] truncate leading-tight">
                {MOCK_TEACHER.name}
              </div>
              <div className="text-[10px] text-[#7F7488] truncate font-medium">
                {MOCK_TEACHER.role}
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined text-[18px] text-[#84788C] ml-1">
            expand_more
          </span>
        </div>
      </div>
    </aside>
  );
};
