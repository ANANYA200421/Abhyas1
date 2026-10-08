import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_SCHEDULE } from '../../types/mockData';

export const ScheduleCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-[#EDE0F1] shadow-[0_4px_24px_rgba(110,40,135,0.03)] p-6 lg:p-7 max-w-4xl">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#F4EAF6]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FAEFFC] flex items-center justify-center text-[#8E2EA7] shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#230F30] tracking-tight">
              Today's Schedule
            </h2>
            <p className="text-xs text-[#7E7487] font-medium mt-0.5">
              Wednesday • 4 Scheduled Sessions
            </p>
          </div>
        </div>

        {/* Wednesday Badge */}
        <div>
          <span className="px-3 py-1 bg-[#FAE8FD] text-[#932DAF] rounded-full text-[10px] font-bold tracking-wider uppercase">
            WEDNESDAY
          </span>
        </div>
      </div>

      {/* Slot Rows List */}
      <div className="divide-y divide-[#F7EDF9]">
        {MOCK_SCHEDULE.map((slot) => (
          <div
            key={slot.id}
            onClick={() => navigate('/preview')}
            className="py-4.5 flex items-center justify-between group hover:bg-[#FAF4FB]/80 px-2 rounded-lg transition-colors cursor-pointer"
            title={`Launch ${slot.subject} preview`}
          >
            {/* Time */}
            <div className="w-48 text-xs font-bold text-[#68237E] tracking-tight">
              {slot.timeRange}
            </div>

            {/* Subject & Topic */}
            <div className="flex-1 pr-4">
              <div className="text-sm font-bold text-[#220D2F] leading-snug group-hover:text-[#813DA2] transition-colors">
                {slot.subject}
              </div>
              <div className="text-xs text-[#7A6F83] font-medium leading-normal">
                {slot.topic}
              </div>
            </div>

            {/* Slot Badge & Go Live affordance */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#FBF5FC] border border-[#EBDCEF] text-[#6D6175] text-[10px] font-bold tracking-wider uppercase rounded-full">
                {slot.slotNumber}
              </span>
              <span className="material-symbols-outlined text-[18px] text-[#A55FC6] opacity-0 group-hover:opacity-100 transition-opacity">
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
