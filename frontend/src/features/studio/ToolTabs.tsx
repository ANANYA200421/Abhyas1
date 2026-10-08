import React from 'react';
import type { StudioTab } from '../../types/session';

interface ToolTabsProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
}

export const ToolTabs: React.FC<ToolTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: StudioTab; label: string; icon: string }[] = [
    { id: 'blackboard', label: 'Virtual Blackboard', icon: 'draw' },
    { id: '3d-model', label: '3D Model', icon: 'view_in_ar' },
    { id: 'circuit-lab', label: 'Circuit Lab', icon: 'memory' },
    { id: 'smart-textbook', label: 'Smart Textbook', icon: 'menu_book' },
    { id: 'slides', label: 'Slides', icon: 'slideshow' },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isActive
                ? 'bg-[#813DA2] text-white shadow-md scale-[1.02]'
                : 'bg-[#FEEFFF] text-[#4D4350] hover:bg-[#FBE8FF] hover:text-[#2F0346]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-white ml-0.5"></span>
            )}
          </button>
        );
      })}
    </div>
  );
};
