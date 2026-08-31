export default function LimitsSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-[26vh] -left-[8vw] w-[34vw] h-[34vw] rounded-full bg-primary/10 blur-[6vw]"
        aria-hidden="true"
      />

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
        <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">Known limits</h2>
        <p className="mt-[1.5vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          This is a testnet demo, and it says so out loud.
        </p>

        <div className="mt-[3vh]">
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[2vw] font-medium tracking-tight text-text">Testnet only</span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Test USDC has no real-world value. Nothing here touches real funds.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[2vw] font-medium tracking-tight text-text">Custodial demo wallets</span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              Keys sit server-side so the demo runs without extensions — disclosed in the UI, never fit for real money.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[2vw] font-medium tracking-tight text-text">Sharing cannot un-see</span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              A revoked grant blocks the next open — what was already read cannot be taken back.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh]">
            <span className="w-[24vw] shrink-0 text-[2vw] font-medium tracking-tight text-text">One manual step</span>
            <p className="text-[2vw] leading-normal text-muted text-pretty">
              One visit to faucet.circle.com funds the operator wallet.
            </p>
          </div>
        </div>

        <div className="mt-[2.5vh] relative overflow-hidden rounded-[1.4vw] border border-primary/25 bg-primary/[0.07] px-[2.2vw] py-[2.2vh] flex items-center justify-between">
          <div
            className="pointer-events-none absolute -right-[5vw] -top-[10vh] w-[20vw] h-[20vw] rounded-full bg-primary/15 blur-[5vw]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-[2.5vw] font-light tracking-tight text-text/95">
              Private by default.{" "}
              <span className="text-primary">Verifiable when it matters.</span>
            </p>
            <p className="mt-[1vh] font-mono text-[1.5vw] text-muted">
              No mocked receipts — when the chain is not ready, the app says so.
            </p>
          </div>
          <svg className="relative w-[3.4vw] h-[3.4vw] text-primary/80 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">08 / 08</span>
        </div>
      </footer>
    </div>
  );
}
