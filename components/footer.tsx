import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 w-full py-10 md:-16">
        <div className="grid md:grid-cols-3 gap-7">
          {/* Logo */}
          <div>
            <Link href="/" className="mb-10 flex flex-row items-center gap-4">
              <Image src="/vector.png" width={49} height={49} alt="logo" />
              <h2 className="text-2xl font-bold text-white mt-2">HotelKu</h2>
            </Link>
            <p className="text-gray-400">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora
              alias consectetur aut, assumenda distinctio unde?
            </p>
          </div>
          {/*  */}
          <div>
            <div className="flex gap-20">
              <div className="flex-1 md:flex-none">
                <h4 className="mb-8 text-xl font-semibold text-white">Links</h4>
                <ul className="list-item space-y-5 text-gray-400">
                  <li>
                    <Link href="/" className="hover:text-white">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="hover:text-white">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/room" className="hover:text-white">
                      Room
                    </Link>
                  </li>
                  <li>
                    <Link href="/Contact" className="hover:text-white">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
              {/* Legal */}
              <div className="flex-1 md:flex-none">
                <h4 className="mb-8 text-xl font-semibold text-white">Legal</h4>
                <ul className="list-item space-y-5 text-gray-400">
                  <li>
                    <Link href="#" className="hover:text-white">
                      Legal
                    </Link>
                  </li>
                  <li>
                    <Link href="/#" className="hover:text-white">
                      Term & Condition
                    </Link>
                  </li>
                  <li>
                    <Link href="/#" className="hover:text-white">
                      Payment Method
                    </Link>
                  </li>
                  <li>
                    <Link href="/#" className="hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h4 className="mb-8 text-xl font-semibold text-white">
              Newsletter
            </h4>
            <p className="text-gray-400">
              Lorem ipsum dolor sit, amet consectetur adipisicing.
            </p>
            <form action="" className="mt-5">
              <div className="mb-5">
                <input
                  type="text"
                  name="email"
                  id=""
                  className="w-full p-3 rounded-sm bg-white"
                  placeholder="test@gmail.com"
                />
              </div>
              <button className="bg-orange-400 p-3 font-bold text-white w-full text-center rounded-sm hover:bg-orange-500">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 border-t border-gray-500 py-8 text-center text-base text-gray-500">
        &copy; Copyright 2025 | HotelKu. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
