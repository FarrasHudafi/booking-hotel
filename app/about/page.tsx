import { Metadata } from "next";
import Image from "next/image";
import { IoEyeOutline, IoLocateOutline } from "react-icons/io5";
import HeaderSection from "../../components/header-section";

export const metadata: Metadata = {
    title: "About",
    description: "Who we are.",
};

const AboutPage = () => {
  return (
    <div>
      <HeaderSection title="About Us" subTitle="Lorem ipsum dolor sit amet." />
      <div className="w-full mx-auto py-20 px-4">
        <div className="flex flex-col md:flex-row gap-10">
          <Image
            src="/about-image.jpg"
            width={650}
            height={579}
            alt="about image"
            className="ml-10"
          />
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-4">
              Who we are
            </h1>
            <p className="text-gray-700 py-5">
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Id
              dolores deserunt officiis sint, commodi odit a voluptates hic ad
              qui libero sit assumenda iure optio necessitatibus maiores magni
              sequi, tempore in cum saepe obcaecati? Voluptate magni mollitia
              temporibus accusantium, unde rerum quo in ducimus? Ducimus hic,
              consequuntur fugit quos sequi facere eaque, quaerat quo corporis,
              neque nesciunt atque eligendi quas!
            </p>
            <ul className="list-item space-y-6 pt-5">
              <li className="flex gap-5">
                <div className="flex-none mt-1">
                  <IoEyeOutline className="size-7" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Vision</h4>
                  <p className="text-gray-600">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Ipsam, rerum. Soluta laboriosam quos rem odio.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <div className="flex-none mt-1">
                  <IoLocateOutline className="size-7" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Mision</h4>
                  <p className="text-gray-600">
                    Lorem ipsum dolor sit amet, consectetur adipisicing elit.
                    Harum velit soluta deserunt esse hic enim magnam tenetur
                    eligendi voluptatum qui?
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
