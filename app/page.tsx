import Hero from "@/components/hero";
import Main from "@/components/main";

export default function Home() {
  return (
    <div className="font-sans bg-gray-100">
      {/* Hero Section */}
      <Hero />

      <div className="mt-16 px-4 sm:px-8 md:px-16 lg:px-24">
        {/* Section Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold uppercase text-gray-800">
            Room & Rates
          </h1>
          <p className="py-3 text-lg text-gray-600">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore,
            similique?
          </p>
        </div>

        {/* Main Section */}
        <Main />
      </div>
    </div>
  );
}
