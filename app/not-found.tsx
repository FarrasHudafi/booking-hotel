import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-extrabold text-gray-800 mb-4">404</h1>
          <div className="w-24 h-1 bg-orange-400 mx-auto"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            Oops! The page you're looking for doesn't exist.
          </p>
          <p className="text-gray-500">
            It might have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="bg-orange-400 text-white hover:bg-orange-500 py-2.5 px-6 md:px-10 text-lg font-semibold rounded-sm hover:scale-105 hover:shadow-lg transition duration-150"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="border border-orange-400 bg-transparent text-orange-400 hover:bg-orange-500 hover:text-white py-2.5 px-6 md:px-10 text-lg font-semibold rounded-sm hover:scale-105 hover:shadow-lg transition duration-150"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}

