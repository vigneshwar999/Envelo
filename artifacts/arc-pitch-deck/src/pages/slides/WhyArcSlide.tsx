export default function WhyArcSlide() {
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

      <div className="relative h-full px-[4vw] pt-[13vh] pb-[11vh] flex gap-[4vw]">
        <div className="w-[52vw] flex flex-col">
          <div className="flex items-center gap-[1vw]">
            <span className="w-[0.8vw] h-[0.8vw] bg-accent" />
            <h2 className="font-display text-[3.8vw] font-semibold tracking-tight text-primary">Why Arc</h2>
          </div>

          <div className="mt-[3.5vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-semibold tracking-tight text-primary">Gas is USDC</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-text/85 text-pretty">
                Invoice, fee, and balance are all the same unit — paying is one plain USDC transfer.
              </p>
            </div>
          </div>

          <div className="mt-[2.6vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-semibold tracking-tight text-primary">Nothing extra to acquire</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-text/85 text-pretty">
                A client needs no second token before they can pay — one less thing to explain.
              </p>
            </div>
          </div>

          <div className="mt-[2.6vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-semibold tracking-tight text-primary">Receipts anyone can open</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-text/85 text-pretty">
                Each anchor and payment is a public transaction, so "paid" is checkable rather than claimed.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full bg-card border border-border rounded-lg p-[1.8vw]">
            <div className="flex items-center justify-between pb-[1.8vh] border-b border-border">
              <span className="text-[1.9vw] font-semibold tracking-tight text-primary">Network status</span>
              <span className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-ok border border-ok/30 rounded-full px-[1vw] py-[0.4vh]">
                Testnet
              </span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-border">
              <span className="font-mono text-[1.5vw] text-muted">Network</span>
              <span className="font-mono text-[1.5vw] text-primary">Arc Testnet</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-border">
              <span className="font-mono text-[1.5vw] text-muted">Chain ID</span>
              <span className="font-mono text-[1.5vw] text-primary">5042002</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-border">
              <span className="font-mono text-[1.5vw] text-muted">Native gas</span>
              <span className="font-mono text-[1.5vw] text-primary">test USDC</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-border">
              <span className="font-mono text-[1.5vw] text-muted">Explorer</span>
              <span className="font-mono text-[1.5vw] text-primary">testnet.arcscan.app</span>
            </div>
            <div className="flex items-center justify-between pt-[1.7vh]">
              <span className="font-mono text-[1.5vw] text-muted">Faucet</span>
              <span className="font-mono text-[1.5vw] text-primary">faucet.circle.com</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">06 / 08</span>
        </div>
      </footer>
    </div>
  );
}
