import React from 'react';

interface GestureLegendPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureLegendPanel: React.FC<GestureLegendPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const gestures = [
    {
      emoji: '☝️',
      name: 'INDEX_POINT',
      action: 'Air Draw / Point',
      description: 'Point your index finger forward to write smooth curves on the blackboard or highlight objects.',
    },
    {
      emoji: '🤏',
      name: 'PINCH',
      action: 'Select / Click / Zoom',
      description: 'Bring thumb & index tips close to select toolbar buttons or zoom 3D models.',
    },
    {
      emoji: '🖐️',
      name: 'OPEN_PALM',
      action: 'Stop Drawing / Rotate',
      description: 'Open all fingers to lift the pen, rotate 3D models, or swipe pages.',
    },
    {
      emoji: '✌️',
      name: 'TWO_FINGERS',
      action: 'Chalk Eraser',
      description: 'Extend index and middle fingers together to erase blackboard chalk beneath your fingertips.',
    },
    {
      emoji: '✊',
      name: 'FIST',
      action: 'Clear Blackboard',
      description: 'Make a closed fist and hold for 1 second to completely clear the drawing canvas safely.',
    },
    {
      emoji: '👈👉',
      name: 'PALM_SWIPE',
      action: 'Slide / Page Advance',
      description: 'Quickly sweep an open palm left or right over 300ms to navigate slides or textbook pages.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl border border-[#EDDCEF] shadow-2xl max-w-lg w-full p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F5E6F8] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F5E6F8] flex items-center justify-center text-[#813DA2] font-bold text-lg">
              ✨
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2F0346]">
                Gesture Control Guide
              </h3>
              <p className="text-xs text-[#7A6F83]">
                Touchless air interactions via standard laptop webcam
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF4FC] hover:bg-[#F5E6F8] text-[#4A2160] flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Gesture Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {gestures.map((g) => (
            <div
              key={g.name}
              className="p-3.5 rounded-2xl bg-[#FAF4FC] border border-[#EDDCEF]/80 flex flex-col gap-1.5 hover:border-[#A55FC6]/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-[10px] font-mono font-bold text-[#813DA2] bg-[#FBE8FF] px-2 py-0.5 rounded-full">
                  {g.name}
                </span>
              </div>
              <div className="text-xs font-bold text-[#2F0346]">{g.action}</div>
              <p className="text-[11px] text-[#7A6F83] leading-relaxed">
                {g.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F5E6F8] text-xs text-[#7A6F83]">
          <span>Tip: Hover cursor over buttons &amp; pinch to click!</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#813DA2] hover:bg-[#702E91] text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
