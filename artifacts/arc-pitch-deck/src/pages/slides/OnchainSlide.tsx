export default function OnchainSlide() {
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
          <h2 className="font-display text-[3.8vw] font-semibold tracking-tight text-primary">
            What touches the chain
          </h2>
        </div>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          Each layer holds only what it needs. Data minimalism is the design.
        </p>

        <div className="mt-[5vh] grid grid-cols-3 gap-[2vw]">
          <div className="bg-card border border-border rounded-lg p-[1.8vw]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">Your browser</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              The only place the letter is ever open.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-muted">plaintext · encryption keys</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-[1.8vw]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">The server</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Sealed envelopes it cannot read a word of.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-muted">ciphertext · wrapped keys</p>
          </div>

          <div className="bg-primary border border-primary rounded-lg p-[1.8vw]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-bg/70">Arc Testnet</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-bg text-pretty">
              Proof, and nothing else.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-bg/70">SHA-256 fingerprint · payment record</p>
          </div>
        </div>

        <p className="mt-[5vh] text-[2.4vw] font-semibold tracking-tight text-primary max-w-[70vw] text-balance">
          No names, no amounts, no addresses in the wax stamp. Verify without revealing.
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">05 / 08</span>
        </div>
      </footer>
    </div>
  );
}
