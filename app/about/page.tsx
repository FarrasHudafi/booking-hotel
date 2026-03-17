import { Metadata } from "next";
import Image from "next/image";
import {
  IoEyeOutline,
  IoLocateOutline,
  IoStarOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import HeaderSection from "../../components/header-section";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn more about HotelKu — who we are, our vision, and our mission.",
};

const STATS = [
  { value: "500+", label: "Rooms Available" },
  { value: "10K+", label: "Happy Guests" },
  { value: "4.9", label: "Average Rating" },
  { value: "5+", label: "Years of Service" },
];

const AboutPage = () => {
  return ( 
    <div>
      <HeaderSection
        title="About Us"
        subTitle="Discover the story behind HotelKu."
      />

      {/* Who We Are Section */}
      <div className="max-w-7xl mx-auto py-20 px-6 lg:px-10">
        <div className="flex flex-col md:flex-row gap-14 items-center">
          <div className="md:w-1/2 w-full">
            <Image
              src="/about-image.jpg"
              width={650}
              height={500}
              alt="HotelKu property"
              className="rounded-2xl object-cover w-full shadow-lg"
            />
          </div>

          <div className="md:w-1/2 w-full flex flex-col gap-6">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-yellow-500">
                Our Story
              </span>
              <h1 className="text-4xl font-bold text-gray-900 mt-2 leading-tight">
                Who We Are
              </h1>
            </div>

            <p className="text-gray-600 leading-relaxed">
              HotelKu is a modern hotel booking platform built to make finding
              and reserving the perfect room effortless, comfortable, stylish,
              and affordable accommodations — all in one place.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Founded with a passion for exceptional hospitality, we believe
              every guest deserves a seamless and memorable stay. From budget
              rooms to premium suites, HotelKu is your trusted companion for
              every trip.
            </p>

            <ul className="space-y-6 pt-2">
              <li className="flex gap-4">
                <div className="flex-none mt-1 p-2 bg-yellow-50 rounded-lg text-yellow-500">
                  <IoEyeOutline className="size-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                    Vision
                  </h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    To become the most trusted hotel booking platform in
                    Southeast Asia, connecting guests with world-class
                    accommodations effortlessly.
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex-none mt-1 p-2 bg-yellow-50 rounded-lg text-yellow-500">
                  <IoLocateOutline className="size-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                    Mission
                  </h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    To deliver a seamless, transparent, and enjoyable booking
                    experience that empowers travelers to find their perfect
                    stay at the best value.
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex-none mt-1 p-2 bg-yellow-50 rounded-lg text-yellow-500">
                  <IoStarOutline className="size-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                    Our Values
                  </h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    We are driven by honesty, quality, and guest satisfaction.
                    Every decision we make is rooted in providing genuine value
                    to our customers and partners.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-4xl font-bold text-yellow-400">{value}</p>
                <p className="text-sm text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="max-w-7xl mx-auto py-20 px-6 lg:px-10">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-widest text-yellow-500">
            Why HotelKu
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">
            What Sets Us Apart
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <IoShieldCheckmarkOutline className="size-7" />,
              title: "Verified Properties",
              desc: "Every room listed on HotelKu is verified for quality, cleanliness, and accuracy so you can book with confidence.",
            },
            {
              icon: <IoStarOutline className="size-7" />,
              title: "Best Price Guarantee",
              desc: "We work directly with hotel partners to ensure you always get the most competitive rates available.",
            },
            {
              icon: <IoEyeOutline className="size-7" />,
              title: "Transparent Reviews",
              desc: "Real reviews from real guests. We never filter or hide feedback so you can make informed decisions.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-4 p-6 rounded-2xl border border-gray-100 hover:border-yellow-300 hover:shadow-md transition-all duration-200"
            >
              <div className="p-3 bg-yellow-50 rounded-xl text-yellow-500 w-fit">
                {icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
