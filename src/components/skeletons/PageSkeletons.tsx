
import { Skeleton } from '../ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-md bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

import { cn } from '../ui/utils';

/* ------------------------------------------------------------------ */
/*  Post card skeleton (used inline as feed loading placeholder)        */
/* ------------------------------------------------------------------ */

export function PostSkeleton() {
  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton.Circle className="h-10 w-10" />
          <div className="flex flex-col gap-2">
            <Skeleton.Line className="h-4 w-24" />
            <Skeleton.Line className="h-3 w-32" />
          </div>
        </div>
        <Skeleton.Circle className="h-8 w-8" />
      </div>
      <Skeleton.Image className="aspect-[4/5] sm:aspect-square md:aspect-[4/3]" />
      <div className="px-4 py-3">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton.Circle className="h-8 w-8" />
            <Skeleton.Circle className="h-8 w-8" />
            <Skeleton.Circle className="h-8 w-8" />
          </div>
          <Skeleton.Circle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <Skeleton.Line className="h-4" />
          <Skeleton.Line className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Event card skeleton (used inline as card grid placeholder)          */
/* ------------------------------------------------------------------ */

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <Skeleton.Image className="h-40" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton.Line className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton.Line className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton.Line className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Compact event card grid — matches the Events tab card layout */
export function EventCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index}>
          <Skeleton.Image className="h-[9.75rem]" />
          <div className="space-y-1 p-1.5">
            <Skeleton.Line className="h-3.5 w-5/6" />
            <Skeleton.Line className="h-2.5 w-2/3" />
            <Skeleton.Line className="h-2.5 w-1/2" />
            <Skeleton.Line className="h-2.5 w-4/5" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-level skeletons (used as Suspense fallbacks)                  */
/* ------------------------------------------------------------------ */

export function EventsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="event-discovery-page pb-20">
        <div className="px-3 pb-6 pt-0">
          <div className="sticky top-0 z-50 -mx-3 rounded-b-[24px] bg-gray-50/95 px-3 pb-3 pt-[calc(0.75rem+var(--eventz-safe-area-top))] backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton.Line className="h-6 w-24" />
                <Skeleton.Line className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton.Circle className="h-10 w-10 bg-white" />
            </div>
          </div>

          <div className="mt-2">
            <div className="-mx-3 overflow-hidden px-3 pb-1">
              <div className="flex w-max items-center gap-1.5">
                {[40, 98, 86, 62, 70, 72, 76, 70].map((width, index) => (
                  <Skeleton
                    key={`${width}-${index}`}
                    className="h-[1.65rem] shrink-0 rounded-full bg-white"
                    style={{ width }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0 space-y-2 pr-1">
                <Skeleton.Line className="h-4 w-32" />
                <Skeleton.Line className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full bg-white" />
            </div>
            <EventCardsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-white px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton.Circle className="h-16 w-16" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton.Line className="h-5 w-40" />
            <Skeleton.Line className="h-4 w-24" />
          </div>
        </div>
        <Skeleton.Circle className="h-10 w-10" />
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton.Line className="h-4 w-64 max-w-full" />
        <Skeleton.Line className="h-4 w-48" />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl bg-gray-50 px-3 py-3 text-center">
            <Skeleton className="mx-auto mb-2 h-5 w-8" />
            <Skeleton className="mx-auto h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 rounded-lg bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-none" />
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
              <Skeleton.Circle className="h-2 w-2" />
              <Skeleton.Line className="h-5 w-24" />
            </div>
            <Skeleton.Circle className="h-10 w-10" />
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
    <div className="space-y-8">
      <LiveFeedSection
        icon={<Skeleton className="h-5 w-5 rounded-md" />}
        title="Live Events"
        subtitle="Featured Broadcasts"
      >
        <div className="-mx-5 flex gap-3 overflow-hidden px-5 pb-4">
          {[0, 1].map((index) => (
            <Skeleton
              key={index}
              className="w-[70vw] shrink-0 rounded-xl sm:w-[300px]"
              style={{ aspectRatio: '16 / 9' }}
            />
          ))}
        </div>
      </LiveFeedSection>

      <LiveFeedSection
        icon={<Skeleton className="h-5 w-5 rounded-md" />}
        title="Creators Live"
        subtitle="Stream Community"
      >
        <div className="-mx-5 flex gap-3 overflow-hidden px-5 pb-4">
          {[0, 1, 2].map((index) => (
            <Skeleton
              key={index}
              className="w-[38vw] shrink-0 rounded-xl sm:w-[164px]"
              style={{ aspectRatio: '3 / 4' }}
            />
          ))}
        </div>
      </LiveFeedSection>

      <div className="pt-2">
        <LiveFeedSection
          icon={<Skeleton className="h-5 w-5 rounded-md" />}
          title="Starting Soon"
          subtitle="Scheduled Streams"
        >
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-2xl border border-gray-50 bg-white p-2.5"
              >
                <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton.Line className="h-4 w-3/4" />
                  <Skeleton.Line className="h-3 w-1/2" />
                  <Skeleton.Line className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            ))}
          </div>
        </LiveFeedSection>
      </div>
    </div>
  );
}

function LiveFeedSection({
  icon,
  title: _title,
  subtitle: _subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5 px-1">
        {icon}
        <div className="space-y-2">
          <Skeleton.Line className="h-4 w-24" />
          <Skeleton.Line className="h-3 w-32" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function CreatePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton.Circle className="h-10 w-10" />
        <Skeleton.Line className="h-5 w-32" />
        <Skeleton className="h-9 w-16 rounded-full" />
      </div>
      <div className="mb-5 overflow-hidden rounded-2xl bg-white">
        <Skeleton.Image className="aspect-[16/10]" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-100 bg-white p-4">
            <Skeleton.Line className="mb-3 h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
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
              <Skeleton.Circle className="h-10 w-10 bg-white/30" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-white/40" />
                <Skeleton className="h-3 w-20 bg-white/25" />
              </div>
            </div>
            <Skeleton className="h-9 w-20 rounded-full bg-white/25" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-36 rounded-2xl bg-purple-300/60" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl bg-white" />
            ))}
          </div>
          <Skeleton className="h-44 rounded-2xl bg-white" />
        </div>
      </div>
    </div>
  );
}

export function MessagesPageSkeleton() {
  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-white">
      <div className="flex min-h-[calc(4rem+var(--eventz-safe-area-top))] items-center gap-3 border-b border-gray-100 px-5 pt-[var(--eventz-safe-area-top)]">
        <Skeleton.Circle className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton.Line className="h-4 w-32" />
          <Skeleton.Line className="h-3 w-20" />
        </div>
      </div>
      <div className="flex-1 space-y-4 bg-gray-50 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton.Circle className="h-14 w-14 bg-white" />
            <div className="flex-1 space-y-2">
              <Skeleton.Line className="h-4 w-36 bg-white" />
              <Skeleton.Line className="h-3 w-52 max-w-full bg-white" />
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
      <Skeleton.Image className="h-72" />
      <div className="space-y-6 px-6 py-6">
        <div className="space-y-3">
          <Skeleton.Line className="h-7 w-3/4" />
          <Skeleton.Line className="h-4 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton.Circle className="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton.Line className="h-4 w-36" />
                <Skeleton.Line className="h-3 w-48 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton.Line className="h-5 w-36" />
          <Skeleton.Line className="h-3" />
          <Skeleton.Line className="h-3 w-11/12" />
          <Skeleton.Line className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="min-h-screen bg-white px-4 pb-24 pt-[calc(1rem+var(--eventz-safe-area-top))]">
      <div className="mb-5 flex items-center gap-3">
        <Skeleton.Circle className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton.Line className="h-5 w-32" />
          <Skeleton.Line className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <Skeleton.Circle className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton.Line className="h-4 w-36" />
              <Skeleton.Line className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      <div className="border-b border-gray-100 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-2">
            <Skeleton.Circle className="h-9 w-9" />
            <Skeleton.Circle className="h-9 w-9" />
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
            <Skeleton.Image className="aspect-[4/3]" />
            <div className="space-y-2 p-4">
              <Skeleton.Line className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton.Circle className="h-8 w-8" />
                <Skeleton className="h-3 w-24" />
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
            <Skeleton.Line className="h-6 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
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
                  <Skeleton.Circle className="h-10 w-10" />
                  <div className="space-y-2">
                    <Skeleton.Line className="h-4 w-24" />
                    <Skeleton.Line className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton.Circle className="h-8 w-8" />
              </div>
              <Skeleton.Image className="aspect-[4/5] sm:aspect-square md:aspect-[4/3]" />
              <div className="px-4 py-3">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <Skeleton.Circle className="h-8 w-8" />
                    <Skeleton.Circle className="h-8 w-8" />
                    <Skeleton.Circle className="h-8 w-8" />
                  </div>
                  <Skeleton.Circle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <Skeleton.Line className="h-4" />
                  <Skeleton.Line className="h-4 w-3/4" />
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
