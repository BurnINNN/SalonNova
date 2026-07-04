import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse pb-10">
      {/* Title & Filter bar skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        <div className="h-10 w-44 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-6 flex flex-col gap-4 border-2 border-border/40 h-36">
            <div className="flex justify-between items-start">
              <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
              <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800" />
            </div>
            <div className="mt-2 h-8 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content Area (Chart + Lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="glass-card rounded-3xl p-6 h-[400px] flex flex-col border-2 border-border/40">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded-lg" />
            <div className="h-8 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 pt-10">
            {[60, 40, 80, 50, 70, 30, 90].map((h, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-3">
                <div className="w-full bg-stone-100 dark:bg-stone-800/50 rounded-t-xl h-full flex items-end">
                  <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-t-xl" style={{ height: `${h}%` }} />
                </div>
                <div className="h-3 w-8 bg-stone-200 dark:bg-stone-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming appointments list */}
        <div className="glass-card rounded-3xl p-6 h-[400px] flex flex-col border-2 border-border/40">
          <div className="h-5 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg mb-6" />
          <div className="flex-1 space-y-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-border/30 bg-secondary/20">
                <div className="w-12 h-12 rounded-xl bg-stone-200 dark:bg-stone-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                  <div className="h-3 w-36 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Transactions list */}
        <div className="glass-card rounded-3xl p-6 h-[400px] flex flex-col border-2 border-border/40">
          <div className="h-5 w-44 bg-stone-200 dark:bg-stone-800 rounded-lg mb-6" />
          <div className="flex-1 space-y-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-2xl border border-border/30 bg-secondary/20">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                  <div className="h-3 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                </div>
                <div className="h-5 w-16 bg-stone-200 dark:bg-stone-800 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
