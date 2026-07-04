import React from 'react'

export default function AgendaLoading() {
  return (
    <div className="h-full flex flex-col pb-4 animate-pulse">
      {/* Header section skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          <div className="h-10 w-44 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        </div>
        <div className="h-10 w-48 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>

      {/* Calendar View Placeholder */}
      <div className="flex-1 min-h-[600px] glass-card rounded-3xl p-6 flex flex-col gap-6 border border-border/40">
        {/* Toolbar Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <div className="h-9 w-12 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-9 w-12 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-9 w-16 bg-stone-200 dark:bg-stone-800 rounded-xl ml-2" />
          </div>
          <div className="h-6 w-36 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          <div className="flex gap-1">
            <div className="h-9 w-16 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-9 w-16 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-9 w-16 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          </div>
        </div>
        
        {/* Grid lines skeleton */}
        <div className="flex-1 border border-border/50 rounded-2xl overflow-hidden flex flex-col">
          {/* Header row */}
          <div className="h-12 bg-stone-100 dark:bg-stone-800/40 border-b border-border/50 flex">
            <div className="w-16 border-r border-border/50" />
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 border-r border-border/50 flex items-center justify-center">
                <div className="h-4 w-12 bg-stone-200 dark:bg-stone-800 rounded" />
              </div>
            ))}
          </div>
          
          {/* Grid body slots */}
          <div className="flex-1 grid grid-cols-8 divide-x divide-y divide-border/30">
            {[...Array(32)].map((_, i) => (
              <div key={i} className="h-20 bg-transparent" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
