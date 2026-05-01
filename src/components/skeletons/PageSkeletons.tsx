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
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );
}
