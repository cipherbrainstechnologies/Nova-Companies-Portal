"use client";

import { Label, Select } from "@/components/ui";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

function yearOptions(center = new Date().getFullYear(), span = 6) {
  const years: number[] = [];
  for (let y = center + 1; y >= center - span; y -= 1) years.push(y);
  return years;
}

export function MonthYearPicker({
  year,
  month,
  onYearChange,
  onMonthChange,
  yearLabel = "Year",
  monthLabel = "Month",
  idPrefix = "period",
}: {
  year: string | number;
  month: string | number;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  yearLabel?: string;
  monthLabel?: string;
  idPrefix?: string;
}) {
  const years = yearOptions();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[9rem]">
        <Label htmlFor={`${idPrefix}-month`}>{monthLabel}</Label>
        <Select
          id={`${idPrefix}-month`}
          value={String(month)}
          onChange={(e) => onMonthChange(e.target.value)}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[7rem]">
        <Label htmlFor={`${idPrefix}-year`}>{yearLabel}</Label>
        <Select
          id={`${idPrefix}-year`}
          value={String(year)}
          onChange={(e) => onYearChange(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function monthName(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? String(month);
}
