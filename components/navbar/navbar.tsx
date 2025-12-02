import Link from "next/link";
import Image from "next/image";
import Navlink from "./navlink";

const Navbar = () => {
  return (
    <div className="fixed top-0 w-full bg-white shadow-sm z-20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
        <Link
          href="/"
          className="text-2xl font-bold flex flex-row items-center gap-4"
        >
          <Image src="/vector.png" width={49} height={49} alt="logo" priority />
          <h1>HotelKu</h1>
        </Link>
        <Navlink />
      </div>
    </div>
  );
};

export default Navbar;
