import { ChevronLeft, Share2 } from 'lucide-react';

interface ProfileSkeletonProps {
  onClose: () => void;
}

export function ProfileSkeletonContent({ onClose }: ProfileSkeletonProps) {
  return (
    <div className="w-full min-h-screen bg-white pb-20 pt-6 px-6 animate-pulse">
      
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="w-14 h-14 rounded-full bg-gray-200 border border-gray-100"></div>
          <div className="flex-1 min-w-0 space-y-2">
             <div className="h-5 w-32 bg-gray-200 rounded"></div>
             <div className="h-3 w-24 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="flex items-center">
           <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Bio Skeleton */}
      <div className="mb-6">
        <div className="flex flex-col gap-2">
           <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
           <div className="space-y-1">
             <div className="h-4 w-full bg-gray-100 rounded"></div>
             <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
             <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
           </div>
           
           {/* Action Buttons */}
           <div className="flex gap-3 mt-4">
             <div className="flex-1 h-11 bg-gray-200 rounded-xl"></div>
             <div className="flex-1 h-11 bg-gray-200 rounded-xl"></div>
           </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="flex items-center justify-between px-4 mb-8">
          <div className="flex-1 flex flex-col items-center gap-1 border-r border-gray-100">
            <div className="h-6 w-8 bg-gray-200 rounded"></div>
            <div className="h-3 w-12 bg-gray-100 rounded"></div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 border-r border-gray-100">
            <div className="h-6 w-10 bg-gray-200 rounded"></div>
            <div className="h-3 w-16 bg-gray-100 rounded"></div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-6 w-8 bg-gray-200 rounded"></div>
            <div className="h-3 w-12 bg-gray-100 rounded"></div>
          </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6">
        <div className="flex-1 h-9 bg-white rounded-xl shadow-sm"></div>
        <div className="flex-1 h-9 bg-transparent"></div>
      </div>

      {/* Grid/List Skeleton */}
      <div className="space-y-3">
         <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
         {[1, 2, 3].map((i) => (
           <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full self-center"></div>
           </div>
         ))}
      </div>

    </div>
  );
}

export function ProfileSkeleton({ onClose }: ProfileSkeletonProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-hidden animate-in slide-in-from-right duration-300">
      <ProfileSkeletonContent onClose={onClose} />
    </div>
  );
}
