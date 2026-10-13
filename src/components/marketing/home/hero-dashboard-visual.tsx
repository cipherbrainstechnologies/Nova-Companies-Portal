export function HeroDashboardVisual() {
  return (
    <div
      className="mkt-dash-tilt overflow-hidden rounded-[1.35rem] border border-white/70 bg-white shadow-[0_30px_70px_-24px_rgb(8_8_32_/_0.55),0_12px_28px_rgb(8_8_32_/_0.12)]"
      role="img"
      aria-label="Illustrative Nova employment operations preview. Not live customer data."
    >
      <div aria-hidden className="bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--nova-border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EF]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EF]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EF]" />
            </span>
            <p className="text-[13px] font-semibold text-[var(--nova-text)]">Employment operations</p>
          </div>
          <span className="rounded-full bg-[var(--nova-purple-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--nova-purple)]">
            Illustrative
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <aside className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-soft)] px-3 py-3 sm:border-b-0 sm:border-r sm:py-4">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nova-muted)]">Nova</p>
            <ul className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:block sm:space-y-1">
              <NavItem active>Team overview</NavItem>
              <NavItem>Onboarding</NavItem>
              <NavItem>Payroll</NavItem>
              <NavItem>Documents</NavItem>
              <NavItem>Benefits</NavItem>
            </ul>
          </aside>

          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-[var(--nova-text)]">India team</p>
                <p className="mt-0.5 text-[12px] text-[var(--nova-muted)]">Sample roles for this preview</p>
              </div>
              <span className="rounded-lg border border-[var(--nova-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--nova-muted)]">
                March cycle
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Sample roles" value="3" />
              <Stat label="Onboarding" value="1" />
              <Stat label="Payroll" value="In review" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 min-[520px]:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-xl border border-[var(--nova-border)] p-3">
                <p className="text-[12px] font-semibold text-[var(--nova-text)]">Cost mix</p>
                <CostBars />
              </div>
              <div className="rounded-xl border border-[var(--nova-border)] p-3">
                <p className="text-[12px] font-semibold text-[var(--nova-text)]">Payroll status</p>
                <ul className="mt-2 space-y-2">
                  <StatusLine label="Gross inputs" state="Approved" width="100%" />
                  <StatusLine label="Statutory review" state="In progress" width="62%" />
                  <StatusLine label="Payslip issue" state="Scheduled" width="38%" />
                </ul>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--nova-border)]">
              <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr] bg-[var(--nova-surface-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--nova-muted)]">
                <span>Role</span>
                <span>Employment</span>
                <span>Payroll</span>
              </div>
              <RosterRow role="Engineer" employment="Active" payroll="In review" />
              <RosterRow role="Designer" employment="Onboarding" payroll="Docs pending" />
              <RosterRow role="Analyst" employment="Active" payroll="Scheduled" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ children, active }: { children: string; active?: boolean }) {
  return (
    <li className="shrink-0">
      <span
        className={`block whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium sm:whitespace-normal ${
          active ? "bg-white text-[var(--nova-purple)] shadow-sm" : "text-[var(--nova-muted)]"
        }`}
      >
        {children}
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--nova-border)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--nova-muted)]">{label}</p>
      <p className="mt-1 text-[15px] font-bold text-[var(--nova-text)]">{value}</p>
    </div>
  );
}

function CostBars() {
  const bars = [
    { label: "Gross", h: 52 },
    { label: "Employer", h: 28 },
    { label: "Benefits", h: 14 },
  ];
  return (
    <div className="mt-3 flex h-24 items-end gap-3">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-end rounded-md bg-[var(--nova-purple-light)]">
            <div className="w-full rounded-md bg-[var(--nova-purple)]" style={{ height: bar.h }} />
          </div>
          <span className="text-[10px] text-[var(--nova-muted)]">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusLine({ label, state, width }: { label: string; state: string; width: string }) {
  return (
    <li>
      <div className="text-[11px] leading-tight">
        <span className="font-medium text-[var(--nova-text)]">{label}</span>
        <span className="text-[var(--nova-muted)]"> · {state}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--nova-purple-light)]">
        <div className="h-full rounded-full bg-[var(--nova-purple)]" style={{ width }} />
      </div>
    </li>
  );
}

function RosterRow({ role, employment, payroll }: { role: string; employment: string; payroll: string }) {
  return (
    <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr] border-t border-[var(--nova-border)] px-3 py-2 text-[12px]">
      <span className="font-semibold text-[var(--nova-text)]">{role}</span>
      <span className="text-[var(--nova-muted)]">{employment}</span>
      <span className="text-[var(--nova-muted)]">{payroll}</span>
    </div>
  );
}
