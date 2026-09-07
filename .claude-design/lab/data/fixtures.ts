export const landingFixture = {
  brand: "Nova Salary Portal",
  frame: "Multi-company payroll",
  title: "Bank transfers are not payslips. Profit is not a bank balance.",
  body: "Nova turns statement chaos into human-approved, hashed salary documents and a mathematically traceable operating-profit sheet — foldered by company, employee, and month.",
  ctaAdmin: "Admin control login",
  ctaEmployee: "Employee payslip login",
  verify: "Verify document",
  login: "Log in",
  points: [
    {
      id: "01",
      title: "Reconcile before issue",
      body: "Match salary vs overtime vs owner draws before any slip is issued.",
    },
    {
      id: "02",
      title: "Foldered PDFs",
      body: "Every PDF lives under company / employee / month with exact names.",
    },
    {
      id: "03",
      title: "Traceable profit",
      body: "Prove earned operating profit with identity-checked arithmetic — never cash-in-bank.",
    },
  ],
  folders: [
    {
      label: "Payslips",
      body: "Admin browses payslips/{company}/{employee}/{YYYY-MM}/. Employees open only their own tree.",
    },
    {
      label: "Profit",
      body: "Profit sheets live at profit/{company}/{YYYY-MM}/ with explicit formulas.",
    },
    {
      label: "Math",
      body: "Revenue − business expenses = earned operating profit, then owner/financing outgoings.",
    },
  ],
};
