export default function SolutionSlide() {
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

      <div className="relative h-full px-[4vw] pt-[13vh] pb-[11vh] flex flex-col">
        <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">
          The sealed envelope
        </h2>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          Paper mail solved this centuries ago. We borrowed its parts.
        </p>

        <div className="flex-1 flex items-center">
        <div className="grid grid-cols-3 gap-[2.5vw] w-full">
          <div>
            <svg className="w-[3vw] h-[3vw] text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
              <path d="M3 6l9 7 9-7" />
            </svg>
            <h3 className="mt-[2.6vh] text-[2.2vw] font-medium tracking-tight text-text">The envelope</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-normal text-muted text-pretty">
              The invoice is encrypted before it leaves the sender's browser. The server holds a sealed envelope it cannot open.
            </p>
          </div>

          <div>
            <svg className="w-[3vw] h-[3vw] text-seal" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.2 2.4" />
              <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            </svg>
            <h3 className="mt-[2.6vh] text-[2.2vw] font-medium tracking-tight text-text">The wax stamp</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-normal text-muted text-pretty">
              A SHA-256 fingerprint of the document is anchored on Arc. Anyone can check the seal without opening the envelope.
            </p>
          </div>

          <div>
            <svg className="w-[3vw] h-[3vw] text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M15.5 8.8c-.8-1-2-1.6-3.5-1.6-2.2 0-3.8 1-3.8 2.6s1.6 2.2 3.8 2.2 3.8.6 3.8 2.2-1.6 2.6-3.8 2.6c-1.5 0-2.7-.6-3.5-1.6" />
              <path d="M12 5.5v13" />
            </svg>
            <h3 className="mt-[2.6vh] text-[2.2vw] font-medium tracking-tight text-text">The payment</h3>
            <p className="mt-[1.4vh] text-[2vw] leading-normal text-muted text-pretty">
              The client pays in test USDC on Arc, and the transaction hash is pinned to the invoice for good.
            </p>
          </div>
        </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">03 / 08</span>
        </div>
      </footer>
    </div>
  );
}
