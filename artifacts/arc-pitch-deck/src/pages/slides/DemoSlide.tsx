export default function DemoSlide() {
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

      <div className="relative h-full px-[4vw] pt-[12.5vh] pb-[11vh] flex flex-col">
        <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">The live demo</h2>
        <p className="mt-[1.5vh] text-[2vw] text-muted max-w-[62vw] text-pretty">
          Running now against Arc Testnet — sign in as each demo account and walk the loop.
        </p>

        <div className="mt-[3vh] grid grid-cols-2 gap-[1.6vw]">
          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-[1.5vw] font-semibold shadow-[0_1vh_3vh_rgba(249,115,22,0.35)]">
              R
            </span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Riya, freelancer, creates an invoice. Her browser seals it and registers the wax stamp on Arc.
            </p>
          </div>

          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-[1.5vw] font-semibold shadow-[0_1vh_3vh_rgba(249,115,22,0.35)]">
              A
            </span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Arjun, client, opens his copy and pays in test USDC. The transaction hash links straight to the explorer.
            </p>
          </div>

          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-[1.5vw] font-semibold shadow-[0_1vh_3vh_rgba(249,115,22,0.35)]">
              M
            </span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Meera, accountant, reads it through a time-limited grant. Revoke ends her access from that moment on.
            </p>
          </div>

          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.6vw] flex gap-[1.2vw]">
            <span className="w-[2.6vw] h-[2.6vw] shrink-0 rounded-full border border-primary/40 bg-white/[0.05] text-primary flex items-center justify-center">
              <svg className="w-[1.5vw] h-[1.5vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Every party runs Verify — the browser recomputes the fingerprint and checks the database and the chain.
            </p>
          </div>
        </div>

        <p className="mt-[2vh] font-mono text-[1.5vw] text-muted">
          Dashboard → Network Status: your wallet, demo payments left, a faucet link when funds run low.
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">07 / 08</span>
        </div>
      </footer>
    </div>
  );
}
