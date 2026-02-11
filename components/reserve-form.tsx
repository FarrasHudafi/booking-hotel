"use client";
import { useState } from "react";
import { addDays } from "date-fns";
import DatePicker from "react-datepicker";

const ReserveForm = () => {
  const StartDate = new Date();
  const EndDate = addDays(StartDate, 1);

  const [startDate, setStartDate] = useState(StartDate);
  const [endDate, setEndDate] = useState(EndDate);

  const handleDateChange = (dates: any) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };
  return (
    <div>
      <form action="">
        <div className="mb-4">
          <label
            htmlFor="checkin"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            Arrival - Departure
          </label>
          <DatePicker
            selected={startDate}
            startDate={startDate}
            endDate={endDate}
            minDate={new Date()}
            selectsRange={true}
            onChange={handleDateChange}
            dateFormat={"dd-MM-yyyy"}
            wrapperClassName="w-full"
            className="py-2 px-4 rounded-md border border-gray-300 w-full"
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">Message</p>
          </div>
        </div>
        <div className="mb-4">
          <label
            htmlFor="checkin"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            Your Name
          </label>
          <input
            type="text"
            name="name"
            className="py-2 px-4 rounded-md border border-gray-300 w-full"
            placeholder="Full Name..."
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">Message</p>
          </div>
        </div>
        <div className="mb-4">
          <label
            htmlFor="checkin"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            Phone Number
          </label>
          <input
            type="text"
            name="phone"
            className="py-2 px-4 rounded-md border border-gray-300 w-full"
            placeholder="Phone Number..."
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">Message</p>
          </div>
        </div>
        <button
          type="submit"
          className=" py-3 px-10 text-center font-semibold text-white w-full bg-orange-400 rounded-sm cursor-pointer hover:bg-orange-500 "
        >
          Reserve Now
        </button>
      </form>
    </div>
  );
};

export default ReserveForm;
