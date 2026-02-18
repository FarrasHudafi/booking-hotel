const RoomDetailSkeleton = () => {
  return (
    <div className="max-w-7xl py-16 px-4 grid lg:grid-cols-12 gap-8 mx-auto animate-pulse">
      {/* Image Skeleton */}
      <div className="md:col-span-8">
        <div className="w-full h-96 bg-gray-200 rounded-sm mb-8" />

        {/* Title Skeleton */}
        <div className="h-12 bg-gray-200 rounded w-3/4 mb-8" />

        {/* Description Skeleton */}
        <div className="space-y-3 mb-8">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Amenities Title Skeleton */}
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />

        {/* Amenities Grid Skeleton */}
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Reserve Form Skeleton */}
      <div className="md:col-span-4">
        <div className="bg-gray-50 p-8 rounded-lg space-y-4">
          <div className="h-8 bg-gray-200 rounded w-full mb-6" />

          {/* Form Fields Skeleton */}
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>
          ))}

          {/* Button Skeleton */}
          <div className="h-10 bg-gray-200 rounded w-full mt-6" />
        </div>
      </div>
    </div>
  );
};

export default RoomDetailSkeleton;
