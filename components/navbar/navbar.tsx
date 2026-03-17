import Link from "next/link";
import Image from "next/image";
import Navlink from "./navlink";

const Navbar = () => {
  return (
    <header className="fixed top-0 w-full z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 group">
          <Image
            src="/hotel_booking_logo.svg"
            width={80}
            height={80}
            alt="logo"
            priority
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Hotel<span className="text-yellow-400">Ku</span>
          </span>
        </Link>

        {/* Nav */}
        <Navlink />
      </div>
    </header>
  );
};

export default Navbar;
