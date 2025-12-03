import { Metadata } from "next";
import HeaderSection from "@/components/header-section";
import {
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
} from "react-icons/io5";
import ContactForm from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
};
const ContactPage = () => {
  return (
    <div>
      <HeaderSection
        title="Contact Us"
        subTitle="Lorem ipsum dolor sit amet."
      />
      <div className="max-w-7xl mx-auto py-20 px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-lg text-gray-500 mb-3">Contact Us</h1>
            <h1 className="text-5xl text-gray-900 font-semibold mb-3">
              Get In Touch Today
            </h1>
            <p className="text-gray-700 py-5">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit
              officia, praesentium temporibus modi omnis cupiditate?
            </p>
            <ul className="list-item space-y-6 py-8">
              <li className="flex gap-5 items-center">
                <div className="flex-none bg-gray-300 p-3 shadow-sm rounded-sm">
                  <IoMailOutline className="size-7" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Email</h4>
                  <p>Email@gmail.com</p>
                </div>
              </li>
              <li className="flex gap-5 items-start">
                <div className="flex-none bg-gray-300 p-3 p shadow-sm rounded-sm">
                  <IoCallOutline className="size-7" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Phone Number</h4>
                  <p>+213124124124</p>
                  <p>+0882-1321-9854 000000</p>
                </div>
              </li>
              <li className="flex gap-5 item-center">
                <div className="flex-none bg-gray-300 p-3 shadow-sm rounded-sm">
                  <IoLocationOutline   className="size-7" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Address :</h4>
                  <p>Depok, Indonesia</p>
                </div>
              </li>
            </ul>
          </div>
          {/* Contact Form */}
          <div className="flex flex-col">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
