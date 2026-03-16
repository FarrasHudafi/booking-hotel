"use client";

import Link from "next/link";
import { useState } from "react";
import { IoClose, IoMenu } from "react-icons/io5";
import { useSession, signOut } from "next-auth/react";
import clsx from "clsx";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/room", label: "Room" },
  { href: "/contact", label: "Contact" },
];

const Navlink = () => {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1">
        <ul className="flex items-center gap-1 text-sm font-medium text-gray-600">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="px-4 py-2 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
              >
                {label}
              </Link>
            </li>
          ))}

          {session && (
            <li>
              <Link
                href="/myreservation"
                className="px-4 py-2 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
              >
                My Reservation
              </Link>
            </li>
          )}

          {session?.user.role === "admin" && (
            <>
              <li>
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/room"
                  className="px-4 py-2 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
                >
                  Manage Room
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-3" />

        {/* Auth Section */}
        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src={session.user.image || "/avatar.svg"}
                width={34}
                height={34}
                alt="avatar"
                className="rounded-full border-2 border-yellow-400 object-cover shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-1.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className="px-5 py-2 text-sm font-semibold bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-all duration-200 shadow-sm"
          >
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <IoClose className="size-6" /> : <IoMenu className="size-6" />}
      </button>

      {/* Mobile Dropdown */}
      <div
        className={clsx(
          "md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-lg transition-all duration-300 overflow-hidden",
          open ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <ul className="flex flex-col px-6 py-4 gap-1 text-sm font-medium text-gray-700">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}

          {session && (
            <li>
              <Link
                href="/myreservation"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                My Reservation
              </Link>
            </li>
          )}

          {session?.user.role === "admin" && (
            <>
              <li>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/room"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Manage Room
                </Link>
              </li>
            </>
          )}

          <li className="pt-3 border-t border-gray-100 mt-2">
            {session ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={session.user.image || "/avatar.svg"}
                    width={32}
                    height={32}
                    alt="avatar"
                    className="rounded-full border-2 border-yellow-400 object-cover"
                  />
                  <span className="text-sm text-gray-600">
                    {session.user.name}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-1.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Sign In
              </Link>
            )}
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navlink;
