export function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white min-h-screen pb-14 px-4 pt-[calc(0.95rem+var(--eventz-safe-area-top))] sm:px-5 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-500 text-2xl font-bold">!</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load profile</h2>
      <p className="text-gray-500 mb-6 max-w-sm">This profile may not exist or is temporarily unavailable.</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary"
      >
        Try again
      </button>
    </div>
  );
}
