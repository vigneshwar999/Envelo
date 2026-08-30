const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_55%,#f1f3f6_100%)]" aria-hidden="true" />
      <svg
        className="absolute -top-[16vh] -right-[7vw] w-[42vw] h-[42vw] text-primary opacity-[0.05]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="1" strokeDasharray="4 5" />
        <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative h-full flex items-center justify-between px-[6vw]">
        <div className="max-w-[46vw]">
          <div className="inline-flex items-center gap-[0.8vw] border border-border bg-card rounded-full px-[1.4vw] py-[1vh]">
            <span className="w-[0.55vw] h-[0.55vw] rounded-full bg-accent" />
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.2em] text-muted">
              Arc Builder Program
            </span>
          </div>
          <h1 className="mt-[4vh] font-display text-[7vw] leading-[0.98] font-semibold tracking-tighter text-primary text-balance">
            Sealed Invoices
          </h1>
          <p className="mt-[3.5vh] text-[2.3vw] leading-snug text-text/85 max-w-[38vw] text-pretty">
            Invoices sealed in the browser, proof anchored on Arc, payment settled in USDC.
          </p>
          <p className="mt-[5vh] font-mono text-[1.5vw] tracking-wide text-muted">
            Arc Testnet · Chain ID 5042002 · testnet.arcscan.app
          </p>
        </div>

        <div className="w-[33vw]">
          <div className="bg-card border border-border rounded-lg p-[1vw] shadow-[0_2vh_6vh_rgba(15,23,41,0.08)]">
            <img
              src={`${base}images/envelope-seal.jpg`}
              crossOrigin="anonymous"
              alt="Paper envelope closed with a wax seal"
              className="w-full h-[48vh] object-cover rounded-md"
            />
            <div className="flex items-center justify-between px-[0.6vw] pt-[1.8vh] pb-[0.5vh]">
              <span className="font-mono text-[1.5vw] text-muted">INV-2026-001</span>
              <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-ok">Sealed</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">01 / 08</span>
        </div>
      </footer>
    </div>
  );
}
