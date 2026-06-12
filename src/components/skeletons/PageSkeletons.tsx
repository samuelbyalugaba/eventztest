import type { CSSProperties } from 'react';

function PulseBlock({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} style={style} />;
}

function CircleBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-gray-200 ${className}`} />;
}

function EventCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-md bg-white shadow-sm">
          <PulseBlock className="h-[9.75rem] w-full rounded-none bg-gray-200" />
          <div className="space-y-1 p-1.5">
            <PulseBlock className="h-3.5 w-5/6" />
            <PulseBlock className="h-2.5 w-2/3 bg-gray-100" />
            <PulseBlock className="h-2.5 w-1/2 bg-gray-100" />
            <PulseBlock className="h-2.5 w-4/5 bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="event-discovery-page pb-20">
        <div className="px-3 pb-6 pt-0">
          <div className="sticky top-0 z-50 -mx-3 rounded-b-[24px] bg-gray-50/95 px-3 pb-3 pt-[calc(0.75rem+var(--eventz-safe-area-top))] backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <PulseBlock className="h-6 w-24 bg-gray-300" />
                <PulseBlock className="h-4 w-72 max-w-full bg-gray-100" />
              </div>
              <CircleBlock className="h-10 w-10 bg-white" />
            </div>
          </div>

          <div className="mt-2">
            <div className="-mx-3 overflow-hidden px-3 pb-1">
              <div className="flex w-max items-center gap-1.5">
                {[40, 98, 86, 62, 70, 72, 76, 70].map((width, index) => (
                  <PulseBlock key={`${width}-${index}`} className="h-[1.65rem] shrink-0 rounded-full bg-white" style={{ width }} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0 space-y-2 pr-1">
                <PulseBlock className="h-4 w-32" />
                <PulseBlock className="h-3 w-24 bg-gray-100" />
              </div>
              <PulseBlock className="h-8 w-20 rounded-full bg-white" />
            </div>
            <EventCardsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export { EventCardsSkeleton };

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-white px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CircleBlock className="h-16 w-16" />
          <div className="min-w-0 flex-1 space-y-2">
            <PulseBlock className="h-5 w-40" />
            <PulseBlock className="h-4 w-24 bg-gray-100" />
          </div>
        </div>
        <CircleBlock className="h-10 w-10 bg-gray-100" />
      </div>
      <div className="mb-4 space-y-2">
        <PulseBlock className="h-4 w-64 max-w-full bg-gray-100" />
        <PulseBlock className="h-4 w-48 bg-gray-100" />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl bg-gray-50 px-3 py-3 text-center">
            <PulseBlock className="mx-auto mb-2 h-5 w-8" />
            <PulseBlock className="mx-auto h-3 w-14 bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <PulseBlock className="h-11 rounded-xl" />
        <PulseBlock className="h-11 rounded-xl bg-gray-100" />
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <PulseBlock key={index} className="h-8 rounded-lg bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <PulseBlock key={index} className="aspect-square rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function LivePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 pt-[var(--eventz-safe-area-top)] shadow-sm backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleBlock className="h-2 w-2 bg-red-300" />
              <PulseBlock className="h-5 w-24" />
            </div>
            <PulseBlock className="h-10 w-10 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-5 py-6">
        <LiveFeedContentSkeleton />
      </div>
    </div>
  );
}

export function LiveFeedContentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="mb-5 flex items-center gap-2.5 px-1">
          <PulseBlock className="h-5 w-5 rounded-md" />
          <div className="space-y-2">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="h-3 w-32 bg-gray-100" />
          </div>
        </div>
        <div className="-mx-5 flex gap-3 overflow-hidden px-5 pb-4">
          {[0, 1].map((index) => (
            <PulseBlock key={index} className="w-[70vw] flex-shrink-0 rounded-xl bg-gray-200 sm:w-[300px]" style={{ aspectRatio: '16 / 9' }} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2.5 px-1">
          <PulseBlock className="h-5 w-5 rounded-md" />
          <div className="space-y-2">
            <PulseBlock className="h-4 w-28" />
            <PulseBlock className="h-3 w-32 bg-gray-100" />
          </div>
        </div>
        <div className="-mx-5 flex gap-3 overflow-hidden px-5 pb-4">
          {[0, 1, 2].map((index) => (
            <PulseBlock key={index} className="w-[38vw] flex-shrink-0 rounded-xl bg-gray-200 sm:w-[164px]" style={{ aspectRatio: '3 / 4' }} />
          ))}
        </div>
      </div>

      <div className="pt-2">
        <div className="mb-5 flex items-center gap-2.5 px-1">
          <PulseBlock className="h-5 w-5 rounded-md" />
          <div className="space-y-2">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="h-3 w-32 bg-gray-100" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-4 rounded-2xl border border-gray-50 bg-white p-2.5">
              <PulseBlock className="h-16 w-16 flex-shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <PulseBlock className="h-4 w-3/4" />
                <PulseBlock className="h-3 w-1/2 bg-gray-100" />
                <PulseBlock className="h-3 w-1/3 bg-gray-100" />
              </div>
              <PulseBlock className="h-10 w-10 rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreatePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-4 flex items-center justify-between">
        <CircleBlock className="h-10 w-10 bg-gray-100" />
        <PulseBlock className="h-5 w-32" />
        <PulseBlock className="h-9 w-16 rounded-full bg-gray-100" />
      </div>
      <div className="mb-5 overflow-hidden rounded-2xl bg-white">
        <PulseBlock className="aspect-[16/10] rounded-none bg-gray-300" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-100 bg-white p-4">
            <PulseBlock className="mb-3 h-4 w-28" />
            <PulseBlock className="h-11 w-full rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="fixed inset-0 z-[70] bg-[#F0F2F5]">
      <div className="mx-auto flex h-full max-w-[520px] flex-col bg-[#F0F2F5]">
        <div className="bg-purple-700 px-4 pb-5 pt-[calc(1rem+var(--eventz-safe-area-top))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircleBlock className="h-10 w-10 bg-white/30" />
              <div className="space-y-2">
                <PulseBlock className="h-4 w-32 bg-white/40" />
                <PulseBlock className="h-3 w-20 bg-white/25" />
              </div>
            </div>
            <PulseBlock className="h-9 w-20 rounded-full bg-white/25" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4">
          <PulseBlock className="h-36 rounded-2xl bg-purple-300/60" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <PulseBlock key={index} className="h-28 rounded-2xl bg-white" />
            ))}
          </div>
          <PulseBlock className="h-44 rounded-2xl bg-white" />
        </div>
      </div>
    </div>
  );
}

export function MessagesPageSkeleton() {
  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-white">
      <div className="flex min-h-[calc(4rem+var(--eventz-safe-area-top))] items-center gap-3 border-b border-gray-100 px-5 pt-[var(--eventz-safe-area-top)]">
        <CircleBlock className="h-10 w-10 bg-gray-100" />
        <div className="space-y-2">
          <PulseBlock className="h-4 w-32 bg-gray-100" />
          <PulseBlock className="h-3 w-20 bg-gray-100" />
        </div>
      </div>
      <div className="flex-1 space-y-4 bg-gray-50 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <CircleBlock className="h-14 w-14 bg-white" />
            <div className="flex-1 space-y-2">
              <PulseBlock className="h-4 w-36 bg-white" />
              <PulseBlock className="h-3 w-52 max-w-full bg-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-white pb-24">
      <PulseBlock className="h-72 w-full rounded-none bg-gray-300" />
      <div className="space-y-6 px-6 py-6">
        <div className="space-y-3">
          <PulseBlock className="h-7 w-3/4" />
          <PulseBlock className="h-4 w-32 bg-gray-100" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <CircleBlock className="h-12 w-12 bg-gray-100" />
              <div className="flex-1 space-y-2">
                <PulseBlock className="h-4 w-36" />
                <PulseBlock className="h-3 w-48 max-w-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <PulseBlock className="h-5 w-36" />
          <PulseBlock className="h-3 w-full bg-gray-100" />
          <PulseBlock className="h-3 w-11/12 bg-gray-100" />
          <PulseBlock className="h-3 w-2/3 bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="min-h-screen bg-white px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-5 flex items-center gap-3">
        <CircleBlock className="h-10 w-10 bg-gray-100" />
        <div className="space-y-2">
          <PulseBlock className="h-5 w-32" />
          <PulseBlock className="h-3 w-20 bg-gray-100" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <CircleBlock className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <PulseBlock className="h-4 w-36" />
              <PulseBlock className="h-3 w-24 bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-100 rounded-full" />
            <div className="w-9 h-9 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
      {/* Cards */}
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100">
            <div className="aspect-[4/3] bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
              <div className="flex items-center gap-2 pt-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedPageSkeleton() {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      <div className="fixed left-0 right-0 top-0 z-30 border-b border-gray-100 bg-white pt-[var(--eventz-safe-area-top)] lg:left-64 xl:left-72 xl:right-80">
        <div className="px-3 pb-3 pt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <PulseBlock className="h-6 w-44" />
            <div className="flex items-center gap-2">
              <PulseBlock className="h-9 w-9 rounded-lg bg-gray-100" />
              <PulseBlock className="h-9 w-9 rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
      <div className="h-[100dvh] overflow-hidden" style={{ paddingTop: '7rem' }}>
        <div className="mx-auto max-w-2xl space-y-0 px-3 pb-[calc(6.5rem+var(--eventz-safe-area-bottom))] pt-3 xl:max-w-[640px]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="mb-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <CircleBlock className="h-10 w-10" />
                  <div className="space-y-2">
                    <PulseBlock className="h-4 w-24" />
                    <PulseBlock className="h-3 w-32 bg-gray-100" />
                  </div>
                </div>
                <CircleBlock className="h-8 w-8 bg-gray-100" />
              </div>
              <PulseBlock className="aspect-[4/5] w-full rounded-none sm:aspect-square md:aspect-[4/3]" />
              <div className="px-4 py-3">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <CircleBlock className="h-8 w-8 bg-gray-100" />
                    <CircleBlock className="h-8 w-8 bg-gray-100" />
                    <CircleBlock className="h-8 w-8 bg-gray-100" />
                  </div>
                  <CircleBlock className="h-8 w-8 bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <PulseBlock className="h-4 w-full" />
                  <PulseBlock className="h-4 w-3/4 bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteFallback() {
  return <DetailPageSkeleton />;
}
