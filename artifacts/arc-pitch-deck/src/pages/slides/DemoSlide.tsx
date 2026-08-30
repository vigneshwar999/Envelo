export default function DemoSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_55%,#f1f3f6_100%)]" aria-hidden="true" />

      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-[4vw] pt-[3vh]">
        <div className="flex items-center gap-[0.7vw]">
          <svg className="w-[1.7vw] h-[1.7vw] text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" className="text-accent" />
          </svg>
          <span className="text-[1.5vw] font-semibold tracking-tight text-primary">Sealed Invoices</span>
        </div>
        <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">Arc Builder Program</span>
      </header>

      <div className="relative h-full px-[4vw] pt-[13vh] pb-[11vh] flex flex-col">
        <div className="flex items-center gap-[1vw]">
          <span className="w-[0.8vw] h-[0.8vw] bg-accent" />
          <h2 className="font-display text-[3.8vw] font-semibold tracking-tight text-primary">The live demo</h2>
        </div>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[62vw] text-pretty">
          Running now against Arc Testnet — sign in as each demo account and walk the loop.
        </p>

        <div className="mt-[3.5vh] grid grid-cols-2 gap-[1.6vw]">
          <div className="bg-card border border-border rounded-lg p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-bg flex items-center justify-center text-[1.5vw] font-semibold">
              R
            </span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Riya, freelancer, creates an invoice. Her browser seals it and registers the wax stamp on Arc.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-bg flex items-center justify-center text-[1.5vw] font-semibold">
              A
            </span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Arjun, client, opens his copy and pays in test USDC. The transaction hash links straight to the explorer.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-bg flex items-center justify-center text-[1.5vw] font-semibold">
              M
            </span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Meera, accountant, reads it through a time-limited grant. Revoke ends her access from that moment on.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full border border-primary text-primary flex items-center justify-center">
              <svg className="w-[1.5vw] h-[1.5vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Every party runs Verify. The fingerprint is recomputed in the browser and compared against the database and the chain.
            </p>
          </div>
        </div>

        <p className="mt-[2.5vh] font-mono text-[1.5vw] text-muted">
          Dashboard → Network Status: your wallet, demo payments left, a faucet link when funds run low.
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">07 / 08</span>
        </div>
      </footer>
    </div>
  );
}
