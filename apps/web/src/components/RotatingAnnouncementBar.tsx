'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles } from 'lucide-react';

const announcements = [
  'Kalpak Solutions has been Shortlisted for "Top 10 CRM Solutions Provider 2020"',
  "Kalpak Solutions has been shortlisted to participate in the 'Top 50 Tech Companies' award.",
  'HNIMR Industrial Award in April 2019',
  'TechnologyWidgets - "Top 10 Most Promising E-Commerce Solution Providers in 2019"',
  'Asia Pacific Achievers Award 2018',
  'Kalpak Solutions shortlisted for 20 Most Promising ERP Solution Providers for 2017.',
];

export function RotatingAnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 shadow-inner relative overflow-hidden select-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: 14-Day Free Trial Notice Tag */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            14-DAY FREE TRIAL
          </span>
        </div>

        {/* Center: Clean Auto-Rotating Recognition / Award Item */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 max-w-full truncate transition-all duration-500 text-center">
            <Trophy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-200 shrink-0 inline-block" />
            <span className="truncate text-[11px] sm:text-xs md:text-sm font-semibold tracking-tight text-white drop-shadow-xs">
              {announcements[currentIndex]}
            </span>
          </div>
        </div>

        {/* Right: Balance spacer to keep text centered */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 opacity-0 pointer-events-none">
          <span className="text-[11px] font-bold">14-DAY FREE TRIAL</span>
        </div>
      </div>
    </div>
  );
}
