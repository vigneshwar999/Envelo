export default function OnchainSlide() {
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
          What touches the chain
        </h2>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          Each layer holds only what it needs. Data minimalism is the design.
        </p>

        <div className="mt-[5vh] grid grid-cols-3 gap-[2vw]">
          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.8vw]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">Your browser</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-text/90 text-pretty">
              The only place the letter is ever open.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-muted">plaintext · encryption keys</p>
          </div>

          <div className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-[1.8vw]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">The server</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-text/90 text-pretty">
              Sealed envelopes it cannot read a word of.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-muted">ciphertext · wrapped keys</p>
          </div>

          <div className="rounded-[1.3vw] border border-primary/25 bg-primary/10 p-[1.8vw] shadow-[0_0_6vh_rgba(249,115,22,0.15)]">
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-primary">Arc Testnet</span>
            <p className="mt-[2vh] text-[2vw] leading-normal text-text text-pretty">
              Proof, and nothing else.
            </p>
            <p className="mt-[2vh] font-mono text-[1.5vw] text-primary/80">SHA-256 fingerprint · payment record</p>
          </div>
        </div>

        <p className="mt-[5vh] text-[2.4vw] font-light tracking-tight text-text/90 max-w-[70vw] text-balance">
          No names, no amounts, no addresses in the wax stamp.{" "}
          <span className="text-primary">Verify without revealing.</span>
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">05 / 08</span>
        </div>
      </footer>
    </div>
  );
}
