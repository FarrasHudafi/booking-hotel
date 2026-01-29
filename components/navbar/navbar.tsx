import Link from "next/link";
import Image from "next/image";
import Navlink from "./navlink";

const Navbar = () => {
  return (
    <div className="fixed top-0 w-full bg-white shadow-sm z-20">
      <div className="w-full mx-auto flex flex-row items-center p-4">
        <Link
          href="/"
          className="text-2xl font-bold flex flex-row items-center gap-4 px-40"
        >
          <Image src="/vector.png" width={49} height={49} alt="logo" priority />
          <h1>RuangKu</h1>
        </Link>
        <div className="flex items-center ml-auto">
          <Navlink />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
