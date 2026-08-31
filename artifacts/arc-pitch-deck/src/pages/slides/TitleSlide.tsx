const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-[24vh] -right-[6vw] w-[38vw] h-[38vw] rounded-full bg-primary/10 blur-[6vw]"
        aria-hidden="true"
      />
      <div
        className="absolute top-[4vh] right-[0vw] w-[32vw] h-[46vh] nebula-dots-patch opacity-[0.15]"
        aria-hidden="true"
      />

      <div className="relative h-full flex items-center justify-between px-[6vw]">
        <div className="max-w-[47vw]">
          <div className="inline-flex items-center gap-[0.8vw] rounded-full border border-white/10 bg-white/[0.04] px-[1.4vw] py-[1vh]">
            <span className="w-[0.55vw] h-[0.55vw] rounded-full bg-primary" />
            <span className="font-mono text-[1.5vw] uppercase tracking-[0.2em] text-muted">
              Envelo · Arc Builder Program
            </span>
          </div>
          <h1 className="mt-[4vh] font-display text-[6.2vw] leading-[1.04] font-light tracking-tight text-text/90 text-balance">
            Private paperwork.
            <span className="block text-primary">Public proof.</span>
          </h1>
          <p className="mt-[3.5vh] text-[2.2vw] leading-snug text-muted max-w-[40vw] text-pretty">
            Envelo seals invoices in the sender's browser, anchors proof on
            Arc, and settles payments in test USDC.
          </p>
          <p className="mt-[5vh] font-mono text-[1.5vw] tracking-wide text-muted">
            Arc Testnet · Chain ID 5042002 · testnet.arcscan.app
          </p>
        </div>

        <div className="w-[32vw]">
          <div className="rounded-[1.4vw] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-[1vw] shadow-[0_3vh_9vh_rgba(249,115,22,0.14)]">
            <img
              src={`${base}images/envelope-seal.jpg`}
              crossOrigin="anonymous"
              alt="Paper envelope closed with a wax seal"
              className="w-full h-[44vh] object-cover rounded-[1vw]"
            />
            <div className="flex items-center justify-between px-[0.6vw] pt-[1.8vh] pb-[0.6vh]">
              <span className="font-mono text-[1.5vw] text-muted">
                INV-2026-001
              </span>
              <span className="inline-flex items-center gap-[0.5vw] rounded-full border border-ok/25 bg-ok/10 px-[1vw] py-[0.4vh] font-mono text-[1.5vw] uppercase tracking-[0.14em] text-ok">
                Sealed
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">01 / 08</span>
        </div>
      </footer>
    </div>
  );
}
