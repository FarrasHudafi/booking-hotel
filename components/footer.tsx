"use client";

import Image from "next/image";
import Link from "next/link";
import { FaXTwitter, FaLinkedinIn, FaFacebookF } from "react-icons/fa6";
import { ReactNode } from "react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Room", href: "/room" },
  { label: "Contact Us", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Legal", href: "#" },
  { label: "Terms & Conditions", href: "#" },
  { label: "Payment Method", href: "#" },
  { label: "Privacy Policy", href: "#" },
];

interface SocialLink {
  icon: ReactNode;
  href: string;
}

const Footer = () => {
  const socialLinks: SocialLink[] = [
    { icon: <FaXTwitter className="size-3.5" />, href: "#" },
    { icon: <FaLinkedinIn className="size-3.5" />, href: "#" },
    { icon: <FaFacebookF className="size-3.5" />, href: "#" },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Image
                src="/hotel_booking_logo.svg"
                width={36}
                height={36}
                alt="logo"
                className="transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xl font-bold tracking-tight text-white">
                Hotel<span className="text-yellow-400">Ku</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500 max-w-xs">
              Discover the best rooms and exclusive offers — all in one place.
            </p>

            {/* Social Icons */}
            <div className="flex gap-3 mt-1">
              {socialLinks.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-yellow-400 hover:text-gray-900 transition-all duration-200"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Column */}
          <div className="md:col-start-9 md:col-span-2">
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white">
              Links
            </h4>
            <ul className="space-y-3 text-sm">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="hover:text-yellow-400 hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="md:col-start-11 md:col-span-2">
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white">
              Legal
            </h4>
            <ul className="space-y-3 text-sm">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="hover:text-yellow-400 hover:translate-x-1 inline-block transition-all duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span>&copy; 2025 HotelKu. All rights reserved.</span>
          <span className="hidden md:block">
            Crafted with ♥ for better stays
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
