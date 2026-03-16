const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse flex flex-col">
      {/* Image area */}
      <div className="relative h-56 bg-gray-200 w-full">
        {/* Capacity badge placeholder */}
        <div className="absolute top-3 left-3 h-7 w-24 rounded-full bg-gray-300" />
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 p-5">
        {/* Eyebrow label */}
        <div className="h-3 w-16 rounded bg-gray-200 mb-2" />
        {/* Room name */}
        <div className="h-5 w-40 rounded bg-gray-200 mb-4" />
        {/* Divider */}
        <div className="border-t border-dashed border-gray-100 mb-4" />
        {/* Price + Button row */}
        <div className="flex items-center justify-between mt-auto">
          <div className="space-y-1">
            <div className="h-6 w-28 rounded bg-gray-200" />
            <div className="h-3 w-12 rounded bg-gray-100" />
          </div>
          <div className="h-9 w-28 rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

export default CardSkeleton;