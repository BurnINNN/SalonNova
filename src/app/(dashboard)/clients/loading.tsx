import React from 'react'

export default function ClientsLoading() {
  return (
    <div className="space-y-5 animate-pulse pb-10">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>

      {/* Search and Add bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        <div className="h-10 w-36 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 border-2 border-border/40 flex flex-col gap-4 h-32">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                <div className="h-3.5 w-36 bg-stone-200 dark:bg-stone-800 rounded-lg" />
              </div>
              <div className="h-6 w-12 bg-stone-200 dark:bg-stone-800 rounded-full" />
            </div>
            <div className="h-5 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg mt-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
