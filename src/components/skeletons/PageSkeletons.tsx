import type { CSSProperties } from 'react';

function PulseBlock({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} style={style} />;
}

function CircleBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-gray-200 ${className}`} />;
}

export function EventsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 pb-28 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-5 space-y-3">
        <PulseBlock className="h-5 w-20 bg-gray-300" />
        <PulseBlock className="h-7 w-72 max-w-full" />
        <div className="flex gap-2 overflow-hidden">
          {[72, 118, 128, 76, 82].map((width) => (
            <PulseBlock key={width} className="h-7 shrink-0 rounded-full" style={{ width }} />
          ))}
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <PulseBlock className="h-5 w-36" />
          <PulseBlock className="h-3 w-20 bg-gray-100" />
        </div>
        <PulseBlock className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <PulseBlock className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <PulseBlock className="h-4 w-4/5" />
              <PulseBlock className="h-3 w-3/5 bg-gray-100" />
              <PulseBlock className="h-3 w-2/3 bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#FAFAFA] px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-5 space-y-2">
        <PulseBlock className="h-6 w-32" />
        <PulseBlock className="h-4 w-56 bg-gray-100" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <PulseBlock className="aspect-video w-full rounded-none bg-gray-300" />
            <div className="flex items-center gap-3 p-3">
              <CircleBlock className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <PulseBlock className="h-4 w-3/4" />
                <PulseBlock className="h-3 w-1/2 bg-gray-100" />
              </div>
              <PulseBlock className="h-8 w-16 rounded-full" />
            </div>
          </div>
        ))}
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
    <div className="min-h-screen bg-black animate-pulse">
      <div className="h-screen w-full bg-neutral-900 flex items-end p-6">
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-800 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-neutral-800 rounded" />
              <div className="h-3 w-20 bg-neutral-800/70 rounded" />
            </div>
          </div>
          <div className="h-4 w-3/4 bg-neutral-800 rounded" />
          <div className="h-4 w-1/2 bg-neutral-800 rounded" />
        </div>
      </div>
    </div>
  );
}

export function RouteFallback() {
  return <DetailPageSkeleton />;
}
