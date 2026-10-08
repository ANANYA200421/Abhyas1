import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { StudioHeader } from '../components/StudioHeader';
import { ToolTabs } from '../features/studio/ToolTabs';
import { CameraPreviewCard } from '../features/studio/CameraPreviewCard';
import type { StudioTab } from '../types/session';

export const StudioPreviewPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('blackboard');

  return (
    <div className="bg-[#FFF7FC] text-[#2F0346] antialiased min-h-screen">
      {/* Left Icon Rail Sidebar */}
      <Sidebar variant="rail" />

      {/* Main Studio Viewport (offset by 20 for the left rail) */}
      <div className="pl-20">
        {/* Top Header */}
        <StudioHeader showTimer={false} roomInfo="Room 402 • Grade 8 Physics" />

        {/* Content Container */}
        <main className="w-full pt-20 px-8 pb-10 bg-[#FFF7FC] min-h-screen flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            {/* Mode Switcher Tabs */}
            <ToolTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Center Workspace: Camera & Spatial Tracking Preview Card */}
            <CameraPreviewCard />
          </div>
        </main>
      </div>
    </div>
  );
};
