const phases = [
  {
    label: "Phase 1",
    title: "Anchor on mainnet",
    body: "Registry v4 on chain 5042, payment bound to payee and amount. Our operator wallet pays each anchor. No customer funds move.",
    tag: "No custody",
  },
  {
    label: "Phase 2",
    title: "Pay from your own wallet",
    body: "Clients sign payInvoice from their own wallet: Circle Wallets, MetaMask, Rabby. USDC lands with the sender.",
    tag: "Non-custodial",
  },
  {
    label: "Phase 3",
    title: "Harden and disclose selectively",
    body: "KMS-held operator key, audit log, CCTP and Gateway funding, Arc privacy features for the amount when they ship.",
    tag: "Production",
  },
];

export default function MainnetSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-[24vh] right-[10vw] w-[34vw] h-[34vw] rounded-full bg-primary/10 blur-[6vw]"
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
        <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">The road to mainnet</h2>
        <p className="mt-[1.2vh] text-[2vw] text-muted text-pretty">
          Arc mainnet launched on 17 September 2026. Three phases, same code, and Envelo never holds customer money.
        </p>

        <div className="mt-[2.8vh] grid grid-cols-3 gap-[1.4vw]">
          {phases.map((phase) => (
            <div
              key={phase.label}
              className="relative overflow-hidden rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-[1.7vw] py-[1.8vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-primary">{phase.label}</span>
                <span className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-muted">{phase.tag}</span>
              </div>
              <h3 className="mt-[1.4vh] text-[2.2vw] leading-tight font-medium tracking-tight text-text text-balance">
                {phase.title}
              </h3>
              <p className="mt-[1.1vh] text-[1.7vw] leading-normal text-muted text-pretty">{phase.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-[1.4vw]">
          <div className="rounded-[1.1vw] border border-white/10 bg-white/[0.03] px-[1.5vw] py-[1.3vh]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-muted">Anchor cost</p>
            <p className="mt-[0.4vh] text-[2vw] font-medium tracking-tight text-text">≈ $0.001 per invoice</p>
          </div>
          <div className="rounded-[1.1vw] border border-white/10 bg-white/[0.03] px-[1.5vw] py-[1.3vh]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-muted">Finality</p>
            <p className="mt-[0.4vh] text-[2vw] font-medium tracking-tight text-text">Under a second</p>
          </div>
          <div className="rounded-[1.1vw] border border-white/10 bg-white/[0.03] px-[1.5vw] py-[1.3vh]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-muted">Testnet</p>
            <p className="mt-[0.4vh] text-[2vw] font-medium tracking-tight text-text">Stays the free sandbox</p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc mainnet plan
          </span>
          <span className="font-mono text-[1.5vw] text-muted">10 / 12</span>
        </div>
      </footer>
    </div>
  );
}
