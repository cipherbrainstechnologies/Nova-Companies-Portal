import { describe, expect, it } from "vitest";
import {
  calculateSalarySlip,
  calendarDaysInMonth,
  computeAttendance,
  expectedSalaryPaymentDateIso,
  inclusiveCalendarDays,
  PARTH_AUG_2026_CA_DEDUCTION_OVERRIDES,
  PARTH_AUG_2026_CA_EARNING_OVERRIDES,
  prorateEarnings,
} from "@/server/payroll/slip-calculation";
import {
  expectedSalaryPaymentDate,
  paymentSearchWindow,
  payrollPeriodBounds,
} from "@/server/payroll/period-eligibility";

const parthStructure = {
  version: 1,
  effectiveFrom: "2026-08-03",
  monthlyGross: 108334,
  monthlyTds: 5525,
  monthlyPt: 200,
  componentsJson: {
    BASIC: 54000,
    HRA: 27000,
    CONVEYANCE: 2600,
    MEDICAL: 2300,
    SPECIAL: 9400,
    TRAVEL: 2600,
    OTHER_ALLOWANCE: 10434,
    TDS: 5525,
    PT: 200,
  },
};

describe("calendar attendance / Parth August 2026", () => {
  it("counts 3 Aug through 31 Aug inclusive as 29 eligible days", () => {
    expect(
      inclusiveCalendarDays(new Date("2026-08-03T00:00:00Z"), new Date("2026-08-31T00:00:00Z")),
    ).toBe(29);
    expect(calendarDaysInMonth(2026, 8)).toBe(31);
  });

  it("uses DOJ 3 Aug (not CA print 10 Aug): WD 31, PD 29, LWP 0", () => {
    const attendance = computeAttendance({
      year: 2026,
      month: 8,
      dateOfJoining: "2026-08-03",
      basis: "CALENDAR_DAY",
      leave: { leaveWithoutPay: 0 },
      assumeFullAttendance: true,
    });
    expect(attendance.workingDays).toBe(31);
    expect(attendance.presentDays).toBe(29);
    expect(attendance.leaveWithoutPay).toBe(0);
    expect(attendance.eligibleServiceDays).toBe(29);
  });

  it("does not treat pre-joining days as LWP", () => {
    const attendance = computeAttendance({
      year: 2026,
      month: 8,
      dateOfJoining: "2026-08-03",
      basis: "CALENDAR_DAY",
      leave: { leaveWithoutPay: 10 },
    });
    expect(attendance.leaveWithoutPay).toBe(10);
    expect(attendance.presentDays).toBe(19);
  });

  it("rounds uniform proration of ₹108334 × 29/31 to ₹101345", () => {
    const result = prorateEarnings({
      fullMonth: Object.entries({
        BASIC: 54000,
        HRA: 27000,
        CONVEYANCE: 2600,
        MEDICAL: 2300,
        SPECIAL: 9400,
        TRAVEL: 2600,
        OTHER_ALLOWANCE: 10434,
      }).map(([code, amount]) => ({ code, label: code, amount })),
      presentDays: 29,
      workingDays: 31,
    });
    expect(result.fullMonthGross).toBe(108334);
    expect(result.payableGross).toBe(101345);
  });

  it("preserves CA override components totaling ₹101345 and net ₹95620", () => {
    const slip = calculateSalarySlip({
      year: 2026,
      month: 8,
      dateOfJoining: "2026-08-03",
      attendanceBasis: "CALENDAR_DAY",
      assumeFullAttendance: true,
      attendanceConfirmed: true,
      structure: parthStructure,
      earningOverrides: PARTH_AUG_2026_CA_EARNING_OVERRIDES,
      deductionOverrides: PARTH_AUG_2026_CA_DEDUCTION_OVERRIDES,
    });
    expect(slip.attendance.workingDays).toBe(31);
    expect(slip.attendance.presentDays).toBe(29);
    expect(slip.payableGross).toBe(101345);
    expect(slip.grossDeductions).toBe(5725);
    expect(slip.netAmount).toBe(95620);
    expect(slip.expectedPaymentDate).toBe("2026-09-01");
    const basic = slip.earnings.find((e) => e.code === "BASIC");
    expect(basic?.payable).toBe(50500);
    expect(basic?.overrideApplied).toBe(true);
  });
});

describe("month lengths and payment schedule", () => {
  it("handles February leap and non-leap", () => {
    expect(calendarDaysInMonth(2024, 2)).toBe(29);
    expect(calendarDaysInMonth(2025, 2)).toBe(28);
    expect(calendarDaysInMonth(2026, 4)).toBe(30);
    expect(calendarDaysInMonth(2026, 7)).toBe(31);
  });

  it("maps August salary to 1 September expected pay; December to 1 January", () => {
    expect(expectedSalaryPaymentDateIso(2026, 8)).toBe("2026-09-01");
    expect(expectedSalaryPaymentDateIso(2026, 12)).toBe("2027-01-01");
    expect(expectedSalaryPaymentDate(2026, 12).toISOString().startsWith("2027-01-01")).toBe(true);
  });

  it("anchors payment search window on expected pay date", () => {
    const aug = payrollPeriodBounds(2026, 8);
    const window = paymentSearchWindow(aug, { daysBefore: 10, daysAfter: 14 });
    expect(window.expectedPaymentDate.toISOString().startsWith("2026-09-01")).toBe(true);
    expect(window.searchStart.toISOString().startsWith("2026-08-22")).toBe(true);
    expect(window.searchEnd.toISOString().startsWith("2026-09-15")).toBe(true);

    const dec = payrollPeriodBounds(2026, 12);
    const janWindow = paymentSearchWindow(dec, { daysBefore: 10, daysAfter: 14 });
    expect(janWindow.expectedPaymentDate.toISOString().startsWith("2027-01-01")).toBe(true);
  });

  it("fixed-30 policy uses WD=30 without mixing calendar denominator", () => {
    const attendance = computeAttendance({
      year: 2026,
      month: 8,
      dateOfJoining: "2026-08-01",
      basis: "FIXED_30",
      assumeFullAttendance: true,
    });
    expect(attendance.workingDays).toBe(30);
    expect(attendance.presentDays).toBe(30);
  });
});
