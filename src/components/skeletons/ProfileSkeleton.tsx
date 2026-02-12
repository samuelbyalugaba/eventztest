import { X } from 'lucide-react';

interface ProfileSkeletonProps {
  onClose: () => void;
}

export function ProfileSkeleton({ onClose }: ProfileSkeletonProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Skeleton */}
        <div className="relative h-52 bg-gray-200 animate-pulse">
          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <div className="w-10 h-10 bg-white/50 rounded-full"></div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Organizer Info Skeleton */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-48 bg-white/30 rounded-lg backdrop-blur-sm"></div>
            </div>
            <div className="h-10 w-24 bg-white/30 rounded-full backdrop-blur-sm"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6 overflow-y-auto">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>

          {/* Action Button Skeleton */}
          <div className="h-12 w-full bg-gray-100 rounded-xl mb-6 animate-pulse"></div>

          {/* About Skeleton */}
          <div className="mb-6 space-y-2">
            <div className="h-5 w-20 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-50 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-50 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse"></div>
          </div>

          {/* Events Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-gray-100 rounded animate-pulse mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-24 h-24 bg-gray-100 rounded-2xl flex-shrink-0 animate-pulse"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-gray-50 rounded animate-pulse"></div>
                  <div className="h-4 w-1/3 bg-gray-50 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
