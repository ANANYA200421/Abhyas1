import React, { lazy, Suspense, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { StudioHeader } from '../components/StudioHeader';
import { ToolTabs } from '../features/studio/ToolTabs';
import { BlackboardCanvas } from '../features/studio/BlackboardCanvas';
import { GestureStatusPanel } from '../features/studio/GestureStatusPanel';
import { GestureCursor } from '../components/GestureCursor';
import type { StudioTab } from '../types/session';

const ModelViewer = lazy(() =>
  import('../features/models/ModelViewer').then(({ ModelViewer }) => ({
    default: ModelViewer,
  }))
);
const TextbookViewer = lazy(() =>
  import('../features/textbook/TextbookViewer').then(({ TextbookViewer }) => ({
    default: TextbookViewer,
  }))
);
const CircuitLab = lazy(() =>
  import('../features/circuit/CircuitLab').then(({ CircuitLab }) => ({
    default: CircuitLab,
  }))
);
const SlidesViewer = lazy(() =>
  import('../features/slides/SlidesViewer').then(({ SlidesViewer }) => ({
    default: SlidesViewer,
  }))
);

const LoadingStudioModule = () => (
  <div className="flex-1 flex items-center justify-center text-sm text-[#7A6F83]">
    Loading module...
  </div>
);

export const ActiveSessionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('blackboard');
  const [loadedTabs, setLoadedTabs] = useState<Set<StudioTab>>(
    () => new Set(['blackboard'])
  );
  const handleTabChange = (tab: StudioTab) => {
    setActiveTab(tab);
    setLoadedTabs((loaded) => new Set(loaded).add(tab));
  };

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
          <ToolTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Active Session Split: Interactive Pedagogical Tool on Left & Gesture Status on Right */}
          <div className="flex-1 flex gap-5 min-h-0">
            {/* Tab 1: Virtual Blackboard */}
            {loadedTabs.has('blackboard') && (
              <div className={`flex-1 flex min-h-0 ${activeTab === 'blackboard' ? '' : 'hidden'}`}>
                <BlackboardCanvas isActive={activeTab === 'blackboard'} />
              </div>
            )}

            {/* Tab 2: 3D Model Viewer */}
            {loadedTabs.has('3d-model') && (
              <div className={`flex-1 flex min-h-0 ${activeTab === '3d-model' ? '' : 'hidden'}`}>
                <Suspense fallback={<LoadingStudioModule />}>
                  <ModelViewer />
                </Suspense>
              </div>
            )}

            {/* Tab 3: Circuit Lab */}
            {loadedTabs.has('circuit-lab') && (
              <div className={`flex-1 flex min-h-0 ${activeTab === 'circuit-lab' ? '' : 'hidden'}`}>
                <Suspense fallback={<LoadingStudioModule />}>
                  <CircuitLab />
                </Suspense>
              </div>
            )}

            {/* Tab 4: Smart Textbook Viewer */}
            {loadedTabs.has('smart-textbook') && (
              <div className={`flex-1 flex min-h-0 ${activeTab === 'smart-textbook' ? '' : 'hidden'}`}>
                <Suspense fallback={<LoadingStudioModule />}>
                  <TextbookViewer />
                </Suspense>
              </div>
            )}

            {/* Tab 5: Slides */}
            {loadedTabs.has('slides') && (
              <div className={`flex-1 flex min-h-0 ${activeTab === 'slides' ? '' : 'hidden'}`}>
                <Suspense fallback={<LoadingStudioModule />}>
                  <SlidesViewer isActive={activeTab === 'slides'} />
                </Suspense>
              </div>
            )}

            {/* Right-Hand Webcam & Gesture Status Panel - Always Persistent */}
            <GestureStatusPanel />
          </div>
        </main>
      </div>
    </div>
  );
};
