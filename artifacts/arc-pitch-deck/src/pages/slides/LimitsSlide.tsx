export default function LimitsSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_55%,#f1f3f6_100%)]" aria-hidden="true" />
      <svg
        className="absolute -bottom-[20vh] -left-[9vw] w-[40vw] h-[40vw] text-primary opacity-[0.05]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="1" strokeDasharray="4 5" />
        <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="1" />
      </svg>

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
          <h2 className="font-display text-[3.8vw] font-semibold tracking-tight text-primary">Known limits</h2>
        </div>
        <p className="mt-[1.5vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          This is a testnet demo, and it says so out loud.
        </p>

        <div className="mt-[3vh]">
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-border">
            <span className="w-[24vw] shrink-0 text-[2vw] font-semibold tracking-tight text-primary">Testnet only</span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Test USDC has no real-world value. Nothing here touches real funds.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-border">
            <span className="w-[24vw] shrink-0 text-[2vw] font-semibold tracking-tight text-primary">Custodial demo wallets</span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              Keys sit server-side so the demo runs without extensions — disclosed in the UI, never fit for real money.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh] border-b border-border">
            <span className="w-[24vw] shrink-0 text-[2vw] font-semibold tracking-tight text-primary">Sharing cannot un-see</span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              A revoked grant blocks the next open — what was already read cannot be taken back.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.3vh]">
            <span className="w-[24vw] shrink-0 text-[2vw] font-semibold tracking-tight text-primary">One manual step</span>
            <p className="text-[2vw] leading-normal text-text/85 text-pretty">
              One visit to faucet.circle.com funds the operator wallet.
            </p>
          </div>
        </div>

        <div className="mt-[2.5vh] bg-primary rounded-lg px-[2vw] py-[1.8vh] flex items-center justify-between">
          <div>
            <p className="text-[2vw] font-semibold tracking-tight text-bg">
              No mocked receipts — when the chain is not ready, the app says so.
            </p>
            <p className="mt-[0.8vh] font-mono text-[1.5vw] text-bg/70">
              Private by default · Verifiable when it matters
            </p>
          </div>
          <svg className="w-[3.4vw] h-[3.4vw] text-bg/80 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">08 / 08</span>
        </div>
      </footer>
    </div>
  );
}
