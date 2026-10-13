import type { Metadata } from "next";
import Link from "next/link";
import { ClosingBand, PageIntro } from "@/components/marketing/blocks";

export const metadata: Metadata = {
  title: { absolute: "Trust & compliance | Nova Workforce" },
  description:
    "How Nova Workforce handles Indian employment administration, payroll confidentiality, personal data, access, and incident reports. No certification is claimed on this page.",
  alternates: { canonical: "/security" },
};

const SECTIONS = [
  {
    title: "Indian employment compliance",
    body: [
      "People employed through Nova Workforce are employed by a named Nova Group company in India. Your proposal identifies that employing entity.",
      "Registration, payroll treatment, and state rules depend on the employing entity, the employee’s circumstances, and the place of work. Nova checks the position with counsel before employment is activated. Pages on this website are not legal, tax, or immigration advice.",
      "A fuller description of the employment-compliance service is on the India employment compliance page. The hiring guide explains the practical questions we ask before a first hire.",
    ],
  },
  {
    title: "Payroll confidentiality",
    body: [
      "Payslip notification emails do not include salary figures. The message points the employee back to the signed-in portal, where the payslip is available.",
      "Public document verification shows whether a document is valid. It does not show salary or bank details.",
    ],
  },
  {
    title: "Employee personal data",
    body: [
      "Employees sign in to see their own payslips and employment documents. Client users see the employees, costs, and documents for their own organisation.",
      "Contact-form messages are used to reply to the enquiry. The privacy notice describes that handling.",
    ],
  },
  {
    title: "Access and retention",
    body: [
      "Portal modules are permissioned. A user does not receive access to a module unless that permission is granted.",
      "Client organisations are isolated from one another: a client user does not see another client’s employees, costs, or documents.",
      "This page does not publish one retention period for every record. Retention follows the client agreement, the employment records the employing entity must keep, and the privacy notice.",
    ],
  },
  {
    title: "Security controls in the product",
    body: [
      "Employment and payroll files are stored in private object storage. Payslip downloads are written to a download audit record.",
      "Production secrets are supplied through the hosting platform’s environment, not committed to the application repository.",
      "This page does not claim ISO 27001, SOC 2, Cyber Essentials, or a GDPR certification. Those marks are not stated here because they are not evidenced for publication.",
    ],
  },
  {
    title: "Reporting an incident",
    body: [
      "Email thenovaworkforce@gmail.com. Include the organisation affected, what you observed, and when you noticed it. We reply to the address you write from.",
      "This page does not state a response-time guarantee.",
    ],
  },
];

const LINKS = [
  { href: "/india-employment-compliance", label: "India employment compliance" },
  { href: "/india-hiring-guide", label: "India hiring guide" },
  { href: "/privacy", label: "Privacy notice" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookie notice" },
];

export default function TrustPage() {
  return (
    <>
      <PageIntro
        kicker="Trust & compliance"
        title="How employment data and Indian payroll are handled"
        lede="This page describes controls that are in the product today, and the limits of what we publish. It is not a certification, a legal opinion, or a guarantee of a particular statutory outcome."
      />
      <div className="mt-12 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title} className="border-t border-[var(--mkt-border)] pt-8">
            <h2 className="text-xl font-bold text-[var(--nova-ink)]">{section.title}</h2>
            <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-[var(--nova-text-secondary)]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>
                  {paragraph.includes("thenovaworkforce@gmail.com") ? (
                    <>
                      Email{" "}
                      <a className="font-semibold text-[var(--nova-navy)] underline underline-offset-4" href="mailto:thenovaworkforce@gmail.com">
                        thenovaworkforce@gmail.com
                      </a>
                      . Include the organisation affected, what you observed, and when you noticed it. We reply to the address you write from.
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <nav className="mt-12" aria-label="Related policies">
        <h2 className="text-lg font-bold text-[var(--nova-ink)]">Policies and related pages</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-sm font-semibold text-[var(--nova-navy)] underline decoration-[var(--nova-border)] underline-offset-4">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ClosingBand
        title="Ask how a control applies to your engagement"
        body="We will answer from the arrangement in your proposal, not from a generic certificate."
        action="Contact Nova Workforce"
        href="/contact?topic=eor"
      />
    </>
  );
}
