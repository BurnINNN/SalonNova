import React from 'react'

export default function InboxLoading() {
  return (
    <div className="h-full flex flex-col pb-4 animate-pulse">
      {/* Header section skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
          <div className="h-6 w-20 bg-stone-200 dark:bg-stone-800 rounded-full" />
          <div className="h-6 w-24 bg-stone-200 dark:bg-stone-800 rounded-full" />
        </div>
      </div>

      {/* Main Inbox Layout Grid */}
      <div className="flex-1 min-h-[600px] flex gap-6 overflow-hidden">
        {/* Left Side: Conversation List Skeleton */}
        <div className="w-80 glass flex flex-col rounded-3xl border border-border/40 overflow-hidden">
          {/* Filter headers */}
          <div className="p-4 border-b border-border/50 flex gap-2">
            <div className="h-8 flex-1 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-8 w-10 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          </div>
          
          {/* List items */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl bg-secondary/10 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                    <div className="h-3 w-10 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                  </div>
                  <div className="h-3 w-32 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Chat Window Skeleton */}
        <div className="flex-1 glass rounded-3xl border border-border/40 flex flex-col overflow-hidden">
          {/* Header info */}
          <div className="h-20 px-6 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                <div className="h-3 w-20 bg-stone-200 dark:bg-stone-800 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-stone-200 dark:bg-stone-800 rounded-xl" />
              <div className="h-9 w-24 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md rounded-2xl p-4 ${i % 2 === 0 ? 'bg-primary/10 rounded-tr-none' : 'bg-secondary/30 rounded-tl-none'} space-y-2`}>
                  <div className="h-4 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                  <div className="h-3 w-32 bg-stone-200 dark:bg-stone-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer input area */}
          <div className="p-4 border-t border-border/50 flex gap-3">
            <div className="h-12 flex-1 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            <div className="h-12 w-12 bg-stone-200 dark:bg-stone-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
