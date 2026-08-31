export default function WhyArcSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />

      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-[4vw] pt-[3vh]">
        <div className="flex items-center gap-[0.7vw]">
          <svg className="w-[1.7vw] h-[1.7vw] text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
          <span className="text-[1.5vw] font-semibold tracking-tight text-text">Envelo</span>
        </div>
        <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">Arc Builder Program</span>
      </header>

      <div className="relative h-full px-[4vw] pt-[13vh] pb-[11vh] flex gap-[4vw]">
        <div className="w-[52vw] flex flex-col">
          <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">Why Arc</h2>

          <div className="mt-[3.5vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 rounded-full bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-medium tracking-tight text-text">Gas is USDC</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-muted text-pretty">
                Invoice, fee, and balance are all the same unit — paying is one plain USDC transfer.
              </p>
            </div>
          </div>

          <div className="mt-[2.6vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 rounded-full bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-medium tracking-tight text-text">Nothing extra to acquire</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-muted text-pretty">
                A client needs no second token before they can pay — one less thing to explain.
              </p>
            </div>
          </div>

          <div className="mt-[2.6vh] flex gap-[1.4vw]">
            <span className="mt-[1.2vh] w-[0.7vw] h-[0.7vw] shrink-0 rounded-full bg-primary" />
            <div>
              <h3 className="text-[2.2vw] font-medium tracking-tight text-text">Receipts anyone can open</h3>
              <p className="mt-[0.8vh] text-[2vw] leading-normal text-muted text-pretty">
                Each anchor and payment is a public transaction, so "paid" is checkable rather than claimed.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.8vw]">
            <div className="flex items-center justify-between pb-[1.8vh] border-b border-white/10">
              <span className="text-[1.9vw] font-medium tracking-tight text-text">Network status</span>
              <span className="inline-flex items-center gap-[0.5vw] rounded-full border border-ok/25 bg-ok/10 px-[1vw] py-[0.4vh] font-mono text-[1.5vw] uppercase tracking-[0.14em] text-ok">
                Testnet
              </span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-white/5">
              <span className="font-mono text-[1.5vw] text-muted">Network</span>
              <span className="font-mono text-[1.5vw] text-text/85">Arc Testnet</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-white/5">
              <span className="font-mono text-[1.5vw] text-muted">Chain ID</span>
              <span className="font-mono text-[1.5vw] text-text/85">5042002</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-white/5">
              <span className="font-mono text-[1.5vw] text-muted">Native gas</span>
              <span className="font-mono text-[1.5vw] text-text/85">test USDC</span>
            </div>
            <div className="flex items-center justify-between py-[1.7vh] border-b border-white/5">
              <span className="font-mono text-[1.5vw] text-muted">Explorer</span>
              <span className="font-mono text-[1.5vw] text-text/85">testnet.arcscan.app</span>
            </div>
            <div className="flex items-center justify-between pt-[1.7vh]">
              <span className="font-mono text-[1.5vw] text-muted">Faucet</span>
              <span className="font-mono text-[1.5vw] text-text/85">faucet.circle.com</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">06 / 08</span>
        </div>
      </footer>
    </div>
  );
}
