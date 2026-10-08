import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { StudioHeader } from '../components/StudioHeader';
import { ToolTabs } from '../features/studio/ToolTabs';
import { BlackboardCanvas } from '../features/studio/BlackboardCanvas';
import { GestureStatusPanel } from '../features/studio/GestureStatusPanel';
import { GestureCursor } from '../components/GestureCursor';
import type { StudioTab } from '../types/session';

export const ActiveSessionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('blackboard');

  return (
    <div className="bg-[#FFF7FC] text-[#2F0346] antialiased min-h-screen overflow-hidden relative">
      {/* Visible Gesture Reticle Cursor */}
      <GestureCursor />

      {/* Left Icon Rail Sidebar */}
      <Sidebar variant="rail" />

      {/* Main Viewport */}
      <div className="pl-20">
        {/* Top Header with Live Session Timer */}
        <StudioHeader showTimer={true} roomInfo="Room 402 • Grade 8 Physics" />

        {/* Content Container */}
        <main className="w-full pt-20 px-6 pb-6 bg-[#FFF7FC] h-screen flex flex-col gap-3">
          {/* Mode Switcher Tabs */}
          <ToolTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Active Session Split: Blackboard Area on Left & Gesture Status on Right */}
          <div className="flex-1 flex gap-5 min-h-0">
            {/* Blackboard Area with Floating Lesson Toolbar */}
            <BlackboardCanvas />

            {/* Right-Hand Webcam & Gesture Status Panel */}
            <GestureStatusPanel />
          </div>
        </main>
      </div>
    </div>
  );
};
