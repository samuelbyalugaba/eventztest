import { Skeleton } from "./ui/skeleton"

export function PostSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      {/* Media */}
      <Skeleton className="w-full aspect-[4/5] sm:aspect-square md:aspect-[4/3]" />

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
             <Skeleton className="w-8 h-8 rounded-full" />
             <Skeleton className="w-8 h-8 rounded-full" />
             <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
