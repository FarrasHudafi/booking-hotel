import { date } from "zod";

export const formatDate = (dateStr: string): string => {
  const dateObj = new Date(dateStr);
  const formatte = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  });
  return formatte.format(dateObj);
};
export const formatCurrency = (amount: number) => {
  const formatte = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumSignificantDigits: 3,
  });
  return formatte.format(amount);
};
