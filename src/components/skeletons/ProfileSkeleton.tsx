import { ChevronLeft, Share2 } from 'lucide-react';

interface ProfileSkeletonProps {
  onClose: () => void;
}

export function ProfileSkeletonContent({ onClose }: ProfileSkeletonProps) {
  return (
    <div className="w-full min-h-screen flex flex-col bg-white animate-pulse">
        
        {/* Hero Section Skeleton */}
        <div className="relative h-64 md:h-80 w-full bg-gray-200">
          {/* Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-gray-400" />
            </button>
            <div className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Avatar Skeleton Overlay */}
          <div className="absolute -bottom-16 left-0 right-0 px-6 flex flex-col items-center">
             <div className="w-32 h-32 rounded-full p-1 bg-white shadow-xl relative z-10">
                <div className="w-full h-full rounded-full bg-gray-300"></div>
             </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="pt-20 px-6 pb-24 max-w-2xl mx-auto w-full">
          
          {/* Name & Bio Skeleton */}
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 w-32 bg-gray-100 rounded mb-6"></div>
            
            {/* Action Buttons Skeleton */}
            <div className="flex justify-center gap-3 mb-8 w-full">
              <div className="h-10 w-32 bg-gray-200 rounded-full"></div>
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            </div>

            {/* Stats Row Skeleton */}
            <div className="flex justify-center gap-8 mb-8 w-full border-y border-gray-100 py-4">
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-100 rounded"></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-100 rounded"></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-12 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-100 rounded"></div>
              </div>
            </div>

            {/* Bio Lines */}
            <div className="w-full space-y-2 max-w-lg">
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-100 rounded mx-auto"></div>
              <div className="h-4 w-4/6 bg-gray-100 rounded mx-auto"></div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="mb-6">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* List Skeleton */}
          <div className="space-y-3">
             <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-20 w-full bg-gray-100 rounded-xl"></div>
             ))}
          </div>

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
