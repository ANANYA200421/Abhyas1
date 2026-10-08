import React, { useEffect, useState } from 'react';
import { actionMapper } from '../gestures/actionMapper';
import type { ActionPayload, Point2D } from '../gestures/types';

export const GestureCursor: React.FC = () => {
  const [point, setPoint] = useState<Point2D | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const unsubscribe = actionMapper.subscribe((action: ActionPayload) => {
      setPoint(action.point);

      if (action.type === 'PINCH') {
        setIsPinching(true);
      } else if (action.type === 'PINCH_RELEASE') {
        setIsPinching(false);
      }

      if (action.type === 'ERASE') {
        setIsErasing(true);
      } else {
        setIsErasing(false);
      }

      if (action.type === 'DRAW_START' || action.type === 'DRAW_MOVE') {
        setIsDrawing(true);
      } else if (action.type === 'DRAW_END') {
        setIsDrawing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!point) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${point.x * 100}vw`,
        top: `${point.y * 100}vh`,
      }}
    >
      {/* Dynamic Cursor Ring */}
      <div
        className={`rounded-full transition-all duration-100 flex items-center justify-center ${
          isPinching
            ? 'w-8 h-8 bg-emerald-500/80 ring-4 ring-emerald-300 scale-125'
            : isErasing
            ? 'w-10 h-10 border-2 border-yellow-400 bg-yellow-400/20'
            : isDrawing
            ? 'w-4 h-4 bg-[#813DA2] ring-4 ring-[#D988ED]'
            : 'w-5 h-5 bg-[#D988ED]/60 border-2 border-white shadow-lg'
        }`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
    </div>
  );
};
