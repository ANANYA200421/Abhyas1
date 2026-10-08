import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';
import { ScheduleCard } from '../features/dashboard/ScheduleCard';

export const DashboardPage: React.FC = () => {
  return (
    <div className="bg-[#FAF4FC] text-[#22102E] min-h-screen antialiased flex selection:bg-purple-200">
      {/* Left Navigation Sidebar */}
      <Sidebar variant="full" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen px-8 lg:px-12 py-6 overflow-y-auto">
        {/* Top Action / Search Bar */}
        <DashboardHeader />

        {/* Welcome Greeting Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-[#21092E]">
            Namaste, Prof. Rajesh Sharma
          </h1>
          <p className="text-xs text-[#706479] mt-0.5 font-medium">
            Here is your teaching schedule and sessions for today.
          </p>
        </div>

        {/* Schedule Card */}
        <ScheduleCard />
      </main>
    </div>
  );
};
