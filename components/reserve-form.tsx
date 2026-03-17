"use client";
import { useState, useActionState } from "react";
import { addDays } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createReserve } from "@/lib/action";
import { DisableDateProp, RoomDetailProp } from "@/types/room";
import clsx from "clsx";

const ReserveForm = ({
  room,
  disableDate,
}: {
  room: RoomDetailProp;
  disableDate: DisableDateProp[];
}) => {
  const StartDate = new Date();
  const EndDate = addDays(StartDate, 1);

  const [startDate, setStartDate] = useState(StartDate);
  const [endDate, setEndDate] = useState(EndDate);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start ?? StartDate);
    setEndDate(end ?? EndDate);
  };

  const [state, formAction, isPending] = useActionState(
    createReserve.bind(null, room.id, room.price, startDate, endDate),
    null,
  );

  const excludedDates = disableDate.map((item) => {
    return {
      start: item.startDate,
      end: item.endDate,
    };
  });

  return (
    <div>
      <form action={formAction}>
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
            excludeDateIntervals={excludedDates}
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">{state?.messageDate}</p>
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
            <p className="mt-2 text-sm text-red-500">{state?.error?.name}</p>
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
            <p className="mt-2 text-sm text-red-500">{state?.error?.phone}</p>
          </div>
        </div>
        <button
          type="submit"
          className={clsx(
            "py-3 px-10 text-center font-semibold text-white w-full bg-orange-400 rounded-sm cursor-pointer hover:bg-orange-500 ",
            { "opacity-50 cursor-progress": isPending },
          )}
          disabled={isPending}
        >
          {isPending ? "Loading..." : "Reserve"}
        </button>
      </form>
    </div>
  );
};

export default ReserveForm;
