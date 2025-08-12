export const SkeletonLoader = () => {
  return (
    <div className="container mx-auto px-4 py-4">
      {/* Navigation Skeleton */}
      <div className="flex items-center justify-center border-b border-gray-800 pb-4">
        <div className="flex gap-8">
          <div className="h-8 w-20 rounded-md bg-gray-800"></div>
          <div className="h-8 w-20 rounded-md bg-gray-800"></div>
          <div className="h-8 w-20 rounded-md bg-gray-800"></div>
        </div>
      </div>

      {/* Filter Skeleton */}
      <div className="mt-4 mb-6 flex overflow-x-auto gap-2 px-8">
        <div className="h-10 w-32 flex-shrink-0 rounded-full bg-gray-800"></div>
        <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
        <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
        <div className="h-10 w-28 flex-shrink-0 rounded-full bg-gray-800"></div>
      </div>

      {/* Posts Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-800"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-gray-800"></div>
                <div className="h-3 w-16 rounded bg-gray-800"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-800"></div>
              <div className="h-4 w-full rounded bg-gray-800"></div>
              <div className="h-4 w-3/4 rounded bg-gray-800"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PostSkeleton = () => {
  return (
    <div className="post-card overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-800"></div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-800"></div>
            <div className="h-3 w-16 rounded bg-gray-800"></div>
          </div>
        </div>
        <div className="h-6 w-20 rounded-full bg-gray-800"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-gray-800"></div>
        <div className="h-4 w-full rounded bg-gray-800"></div>
        <div className="h-4 w-3/4 rounded bg-gray-800"></div>
      </div>
      <div className="h-4 w-24 rounded bg-gray-800"></div>
    </div>
  );
};
