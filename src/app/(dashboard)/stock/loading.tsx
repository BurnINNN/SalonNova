import React from 'react'

export default function StockLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header section skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="h-8 w-28 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-10 w-36 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          <div className="h-10 w-44 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        </div>
      </div>

      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-6 flex flex-col gap-4 border border-border/40 h-36">
            <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
            <div className="h-8 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg mt-auto" />
          </div>
        ))}
      </div>

      {/* Stock Alerts panel skeleton */}
      <div className="glass-card rounded-3xl p-6 border border-border/40 space-y-4">
        <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-12 w-full bg-stone-100 dark:bg-stone-800/40 rounded-xl" />
      </div>

      {/* Product Table Skeleton */}
      <div className="glass-card rounded-3xl p-6 border border-border/40 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="h-10 w-64 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          <div className="h-10 w-48 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        </div>
        <div className="h-[300px] border border-border/30 rounded-2xl bg-secondary/10 flex flex-col">
          <div className="h-12 bg-stone-100 dark:bg-stone-800/30 border-b border-border/30 flex items-center px-6">
            <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-40 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                <div className="h-4 w-12 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                <div className="h-4 w-16 bg-stone-200 dark:bg-stone-800 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
