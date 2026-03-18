"use client";
import { forwardRef, useActionState, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createReserve } from "@/lib/action";
import { DisableDateProp, RoomDetailProp } from "@/types/room";
import clsx from "clsx";
import { IoCalendarOutline } from "react-icons/io5";

const CalendarInput = forwardRef<
  HTMLButtonElement,
  {
    value?: string;
    onClick?: () => void;
    hasError?: boolean;
    placeholder?: string;
    ariaLabel?: string;
  }
>(({ value, onClick, hasError, placeholder, ariaLabel }, ref) => {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      className={clsx(
        "w-full rounded-md border bg-white px-3 py-2 text-left",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400",
        hasError ? "border-red-400" : "border-gray-300 hover:border-gray-400",
      )}
    >
      <span className="flex items-center gap-2">
        <IoCalendarOutline className="size-5 text-gray-500" aria-hidden />
        <span className={clsx("flex-1", value ? "text-gray-900" : "text-gray-400")}>
          {value || placeholder || "Select a date"}
        </span>
      </span>
    </button>
  );
});

CalendarInput.displayName = "CalendarInput";

const ReserveForm = ({
  room,
  disableDate,
}: {
  room: RoomDetailProp;
  disableDate: DisableDateProp[];
}) => {
  const { initialStartDate, initialEndDate } = useMemo(() => {
    const s = new Date();
    const e = addDays(s, 1);
    return { initialStartDate: s, initialEndDate: e };
  }, []);

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientError, setClientError] = useState<{ name?: string; phone?: string }>(
    {},
  );

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

  const nights = Math.max(1, differenceInCalendarDays(endDate, startDate));

  return (
    <div>
      <form action={formAction}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Stay dates
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="checkin"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Check-in
              </label>
              <DatePicker
                id="checkin"
                selected={startDate}
                onChange={(date: Date | null) => {
                  const nextStart = date ?? initialStartDate;
                  setStartDate(nextStart);
                  if (endDate <= nextStart) {
                    setEndDate(addDays(nextStart, 1));
                  }
                }}
                minDate={new Date()}
                dateFormat={"dd-MM-yyyy"}
                wrapperClassName="w-full"
                customInput={
                  <CalendarInput
                    hasError={Boolean(state?.messageDate)}
                    placeholder="Select check-in"
                    ariaLabel="Select check-in date"
                  />
                }
                excludeDateIntervals={excludedDates}
                showPopperArrow={false}
                popperPlacement="bottom-start"
                calendarClassName="react-datepicker--modern"
              />
            </div>
            <div>
              <label
                htmlFor="checkout"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Check-out
              </label>
              <DatePicker
                id="checkout"
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date ?? initialEndDate)}
                minDate={addDays(startDate, 1)}
                dateFormat={"dd-MM-yyyy"}
                wrapperClassName="w-full"
                customInput={
                  <CalendarInput
                    hasError={Boolean(state?.messageDate)}
                    placeholder="Select check-out"
                    ariaLabel="Select check-out date"
                  />
                }
                excludeDateIntervals={excludedDates}
                showPopperArrow={false}
                popperPlacement="bottom-start"
                calendarClassName="react-datepicker--modern"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {nights} {nights === 1 ? "night" : "nights"} • Check-out must be at least 1
            day after check-in.
          </p>
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">{state?.messageDate}</p>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => {
              const raw = e.target.value;
              // allow letters, spaces, apostrophes, hyphens, dots
              const sanitized = raw.replace(/[^a-zA-Z\s.'-]/g, "");
              setName(sanitized);

              const hadNumber = /\d/.test(raw);
              setClientError((prev) => ({
                ...prev,
                name: hadNumber ? "Name cannot contain numbers." : undefined,
              }));
            }}
            onBlur={() => {
              if (name.trim().length === 0) {
                setClientError((prev) => ({
                  ...prev,
                  name: prev.name ?? undefined,
                }));
              }
            }}
            className="py-2 px-4 rounded-md border border-gray-300 w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Full Name..."
            autoComplete="name"
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-xs text-red-500">{clientError.name}</p>
            <p className="mt-2 text-sm text-red-500">{state?.error?.name}</p>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            inputMode="numeric"
            autoComplete="tel"
            onChange={(e) => {
              const raw = e.target.value;
              const sanitized = raw.replace(/[^\d+\s()-]/g, "");
              setPhone(sanitized);

              const hadLetter = /[a-zA-Z]/.test(raw);
              setClientError((prev) => ({
                ...prev,
                phone: hadLetter ? "Phone number must contain digits only." : undefined,
              }));
            }}
            className="py-2 px-4 rounded-md border border-gray-300 w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Phone Number..."
          />
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-xs text-red-500">{clientError.phone}</p>
            <p className="mt-2 text-sm text-red-500">{state?.error?.phone}</p>
          </div>
        </div>
        <button
          type="submit"
          className={clsx(
            "py-3 px-10 text-center font-semibold text-white w-full bg-orange-400 rounded-sm cursor-pointer hover:bg-orange-500 ",
            {
              "opacity-50 cursor-progress": isPending,
              "opacity-60 cursor-not-allowed":
                Boolean(clientError.name) || Boolean(clientError.phone),
            },
          )}
          disabled={isPending || Boolean(clientError.name) || Boolean(clientError.phone)}
        >
          {isPending ? "Loading..." : "Reserve"}
        </button>
      </form>
    </div>
  );
};

export default ReserveForm;
