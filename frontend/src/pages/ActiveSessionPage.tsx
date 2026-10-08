import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { StudioHeader } from '../components/StudioHeader';
import { ToolTabs } from '../features/studio/ToolTabs';
import { BlackboardCanvas } from '../features/studio/BlackboardCanvas';
import { GestureStatusPanel } from '../features/studio/GestureStatusPanel';
import { GestureCursor } from '../components/GestureCursor';
import { ModelViewer } from '../features/models/ModelViewer';
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

          {/* Active Session Split: Interactive Pedagogical Tool on Left & Gesture Status on Right */}
          <div className="flex-1 flex gap-5 min-h-0">
            {/* Tab 1: Virtual Blackboard */}
            {activeTab === 'blackboard' && <BlackboardCanvas />}

            {/* Tab 2: 3D Model Viewer */}
            {activeTab === '3d-model' && <ModelViewer />}

            {/* Placeholder for tabs 3, 4, 5 (Circuit Lab, Smart Textbook, Slides) to be implemented in Parts 5, 6, 7 */}
            {activeTab !== 'blackboard' && activeTab !== '3d-model' && (
              <div className="flex-1 flex items-center justify-center rounded-2xl bg-[#FEEFFF] border border-[#EDDCEF] text-[#4A2160] font-semibold">
                Switch to Virtual Blackboard or 3D Model
              </div>
            )}

            {/* Right-Hand Webcam & Gesture Status Panel */}
            <GestureStatusPanel />
          </div>
        </main>
      </div>
    </div>
  );
};
