import LeadForm from "./components/LeadForm";
import ThemeToggle from "./components/ThemeToggle";
import Ticker from "./components/Ticker";

const STATS = [
  { value: "0.0pts", label: "Raw spreads from" },
  { value: "9ms", label: "Median fill" },
  { value: "120+", label: "Markets" },
];

const DISCLAIMER =
  "Axiom Markets is a demonstration interface. Trading leveraged products carries a high risk of loss and may not be suitable for all investors.";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Ticker />

      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 sm:px-6 short:py-3">
        <a href="#" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-linear-to-br from-accent to-accent-2 text-accent-fg">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 16l5-5 3 3 6-6" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Axiom Markets</span>
        </a>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 grid-cols-1 items-start gap-12 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[1fr_494px] lg:items-center lg:gap-20 lg:py-6 short:lg:py-3">
        <section className="lg:pt-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px] shadow-accent" />
            Live markets · Low latency
          </p>
          <h1 className="mt-5 font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[56px] short:lg:text-[48px]">
            Trade equities,
            <br />
            FX &amp; crypto on
            <br />
            one <span className="text-accent">precise</span> desk.
          </h1>
          <p className="mt-7 short:mt-5 max-w-[500px] text-[17px] leading-relaxed text-muted">
            Institutional-grade execution, transparent spreads, and real-time risk. Open an account in under a
            minute — just a few details to start.
          </p>
          <dl className="mt-10 flex gap-9 short:mt-7">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-1.5 text-[13px] text-subtle">{s.label}</dt>
                <dd className="font-display text-2xl font-bold tracking-tight">{s.value}</dd>
              </div>
            ))}
          </dl>
          {/* On desktop the disclaimer sits under the hero so the page fits one screen. */}
          <div className="mt-12 hidden max-w-[500px] border-t border-line pt-5 text-[13px] leading-relaxed text-subtle short:mt-7 short:pt-4 lg:block">
            <p>{DISCLAIMER}</p>
            <p className="mt-2">© 2026 Axiom Markets</p>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface/90 p-7 short:sm:p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <LeadForm />
        </section>
      </main>

      <footer className="border-t border-line lg:hidden">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-6 text-[13px] text-subtle sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-[500px] leading-relaxed">{DISCLAIMER}</p>
          <p>© 2026 Axiom Markets</p>
        </div>
      </footer>
    </div>
  );
}
