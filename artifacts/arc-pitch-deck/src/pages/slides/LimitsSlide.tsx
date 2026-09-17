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
        <p className="mt-[1.2vh] text-[2vw] text-muted max-w-[72vw] text-pretty">
          A testnet product that says so out loud, with no mocked receipts.
        </p>

        <div className="mt-[3vh]">
          <div className="flex gap-[2vw] py-[1.2vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[1.9vw] font-medium tracking-tight text-text">Testnet only</span>
            <p className="text-[1.9vw] leading-normal text-muted text-pretty">
              Test USDC has no real value. Real money waits for the mainnet plan.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.2vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[1.9vw] font-medium tracking-tight text-text">Custodial demo wallets</span>
            <p className="text-[1.9vw] leading-normal text-muted text-pretty">
              Keys sit server-side so the demo runs without extensions — disclosed in the UI, and retired on mainnet.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.2vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[1.9vw] font-medium tracking-tight text-text">Sharing cannot un-see</span>
            <p className="text-[1.9vw] leading-normal text-muted text-pretty">
              A revoked grant blocks the next open — what was already read cannot be taken back.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.2vh] border-b border-white/10">
            <span className="w-[24vw] shrink-0 text-[1.9vw] font-medium tracking-tight text-text">v3 trusts the payer</span>
            <p className="text-[1.9vw] leading-normal text-muted text-pretty">
              Any positive transfer flips "paid". v4 binds payee and amount before mainnet.
            </p>
          </div>
          <div className="flex gap-[2vw] py-[1.2vh]">
            <span className="w-[24vw] shrink-0 text-[1.9vw] font-medium tracking-tight text-text">One manual step</span>
            <p className="text-[1.9vw] leading-normal text-muted text-pretty">
              One visit to faucet.circle.com funds each demo wallet.
            </p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">08 / 12</span>
        </div>
      </footer>
    </div>
  );
}
