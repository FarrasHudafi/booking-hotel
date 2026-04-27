"use client";
import {
  forwardRef,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createReserve, quoteDynamicPrice } from "@/lib/action";
import { DisableDateProp, RoomDetailProp } from "@/types/room";
import clsx from "clsx";
import { IoCalendarOutline } from "react-icons/io5";
import { formatCurrency } from "@/lib/utils";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function isSelectionOverlappingExisting(
  start: Date,
  end: Date,
  disableDate: DisableDateProp[],
) {
  if (end <= start) return true;
  for (const r of disableDate) {
    const occupiedStart = r.startDate;
    const occupiedEndExclusive = r.endDate; // checkout date is not occupied
    if (rangesOverlap(start, end, occupiedStart, occupiedEndExclusive))
      return true;
  }
  return false;
}

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
        <span
          className={clsx("flex-1", value ? "text-gray-900" : "text-gray-400")}
        >
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
    const today = startOfDay(new Date());
    // pick the first available check-in date
    let candidate = today;
    for (let i = 0; i < 365; i++) {
      const next = addDays(today, i);
      const nextEnd = addDays(next, 1);
      if (!isSelectionOverlappingExisting(next, nextEnd, disableDate)) {
        candidate = next;
        break;
      }
    }
    return {
      initialStartDate: candidate,
      initialEndDate: addDays(candidate, 1),
    };
  }, [disableDate]);

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [clientError, setClientError] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const [state, formAction, isPending] = useActionState(
    createReserve.bind(null, room.id, startDate, endDate),
    null,
  );

  const [priceQuote, setPriceQuote] = useState<Awaited<
    ReturnType<typeof quoteDynamicPrice>
  > | null>(null);

  useEffect(() => {
    // if the current selection becomes invalid (or initial was disabled), snap to first available
    if (isSelectionOverlappingExisting(startDate, endDate, disableDate)) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableDate, room.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await quoteDynamicPrice(
        room.id,
        startDate.toISOString(),
        endDate.toISOString(),
        promoCode,
      );
      if (!cancelled) setPriceQuote(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id, startDate, endDate, promoCode]);

  const excludedDates = disableDate.map((item) => {
    return {
      start: item.startDate,
      // endDate is checkout, so the occupied last night is endDate - 1 day
      end: subDays(item.endDate, 1),
    };
  });

  const nights = Math.max(1, differenceInCalendarDays(endDate, startDate));
  const hasDateConflict = isSelectionOverlappingExisting(
    startDate,
    endDate,
    disableDate,
  );

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
                minDate={startOfDay(new Date())}
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
                onChange={(date: Date | null) =>
                  setEndDate(date ?? initialEndDate)
                }
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
            {nights} {nights === 1 ? "night" : "nights"} • Check-out must be at
            least 1 day after check-in.
          </p>
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-2 text-sm text-red-500">{state?.messageDate}</p>
            {state && "message" in state && state.message ? (
              <p className="mt-2 text-sm text-red-500">{state.message}</p>
            ) : null}
            {hasDateConflict ? (
              <p className="mt-2 text-sm text-red-500">
                Selected dates are unavailable. Please choose another date.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
            Dynamic rate (revenue management)
          </p>
          {priceQuote === null ? (
            <p className="text-sm text-gray-600">Calculating price…</p>
          ) : "error" in priceQuote ? (
            <p className="text-sm text-red-600">{priceQuote.error}</p>
          ) : (
            <div className="space-y-2 text-sm text-gray-800">
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">Effective / night</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(priceQuote.quote.effectivePricePerNight)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-gray-600">
                <span>Base rate</span>
                <span>
                  {formatCurrency(priceQuote.quote.basePricePerNight)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-gray-600">
                <span>Est. stay total</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(priceQuote.quote.totalStay)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-xs text-gray-600">
                <span>Promo discount</span>
                <span
                  className={clsx(
                    "font-semibold",
                    priceQuote.quote.discountAmount > 0
                      ? "text-green-600"
                      : "text-gray-500",
                  )}
                >
                  - {formatCurrency(priceQuote.quote.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-700">
                  Total after promo
                </span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(priceQuote.quote.totalAfterDiscount)}
                </span>
              </div>
              {priceQuote.quote.promoCode ? (
                <p className="text-[11px] text-green-700">
                  Promo aktif: <strong>{priceQuote.quote.promoCode}</strong> (
                  {priceQuote.quote.promoDescription})
                </p>
              ) : null}
              {promoCode.trim() && priceQuote.quote.promoError ? (
                <p className="text-[11px] text-red-600">
                  {priceQuote.quote.promoError}
                </p>
              ) : null}
              <div className="pt-2 border-t border-amber-200/80 text-[11px] leading-relaxed text-gray-600">
                {priceQuote.quote.useMLPricing &&
                priceQuote.quote.mlPrediction ? (
                  <>
                    {/* ML Pricing Info */}
                    <p className="font-semibold text-amber-800 mb-1">
                      🤖 ML-Based Dynamic Pricing
                    </p>
                    <p>
                      Confidence:{" "}
                      <strong>
                        {(
                          priceQuote.quote.mlPrediction.confidence * 100
                        ).toFixed(0)}
                        %
                      </strong>
                      {" · "}
                      Combined factor:{" "}
                      <strong>
                        {priceQuote.quote.mlPrediction.breakdown.combinedMultiplier.toFixed(
                          2,
                        )}
                      </strong>
                    </p>
                    {/* Price Factors */}
                    <div className="mt-2 space-y-1">
                      {priceQuote.quote.mlPrediction.factors.map(
                        (factor, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-gray-500">{factor.name}</span>
                            <span
                              className={
                                factor.impact > 1
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }
                            >
                              {factor.impact > 1 ? "+" : ""}
                              {((factor.impact - 1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    {/* Holiday Info */}
                    {priceQuote.quote.holidayInfo &&
                      priceQuote.quote.holidayInfo.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-red-700">
                          <p className="font-semibold">
                            🎉 Holiday Period Detected:
                          </p>
                          {priceQuote.quote.holidayInfo.map((h, idx) => (
                            <p key={idx} className="text-xs">
                              • {h.name} (
                              {new Date(h.date).toLocaleDateString("id-ID")})
                            </p>
                          ))}
                        </div>
                      )}
                  </>
                ) : (
                  <>
                    <p>
                      Avg. occupancy (your stay):{" "}
                      <strong>
                        {(priceQuote.quote.averageOccupancyRate * 100).toFixed(
                          1,
                        )}
                        %
                      </strong>
                      {" · "}
                      Lead-time × peak × demand ={" "}
                      <strong>
                        {priceQuote.quote.combinedFactor.toFixed(2)}
                      </strong>
                    </p>
                    <p className="mt-1">
                      ε ≈ {priceQuote.quote.priceElasticityEstimate.toFixed(2)}{" "}
                      · RevPAR target ADR{" "}
                      {formatCurrency(priceQuote.quote.recommendedRevPARTarget)}
                    </p>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-500 pt-1">
                {priceQuote.quote.useMLPricing
                  ? "Price predicted using ML model based on historical data, holidays, and demand patterns."
                  : "Early booking discounts and last-minute surges apply. Final price is confirmed at checkout."}
              </p>
            </div>
          )}
        </div>

        {/* <div className="mb-4">
          <label
            htmlFor="promoCode"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            Promo Code
          </label>
          <input
            type="text"
            id="promoCode"
            name="promoCode"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="py-2 px-4 rounded-md border border-gray-300 w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Contoh: HEMAT10 / POTONG50"
          />
          <p className="mt-2 text-xs text-gray-500">
            Gunakan kode promo persentase atau nominal saat checkout.
          </p>
        </div> */}

        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
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
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
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
                phone: hadLetter
                  ? "Phone number must contain digits only."
                  : undefined,
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
                Boolean(clientError.name) ||
                Boolean(clientError.phone) ||
                hasDateConflict,
            },
          )}
          disabled={
            isPending ||
            Boolean(clientError.name) ||
            Boolean(clientError.phone) ||
            hasDateConflict
          }
        >
          {isPending ? "Loading..." : "Reserve"}
        </button>
      </form>
    </div>
  );
};

export default ReserveForm;
