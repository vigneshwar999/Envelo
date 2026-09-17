const milestones = [
  {
    when: "Q4 2026",
    title: "Mainnet anchoring",
    proof: "Registry v4 address published · invoices on explorer.arc.io",
  },
  {
    when: "Q1 2027",
    title: "Non-custodial payments",
    proof: "First invoice paid on mainnet from a client's own wallet · v4 reviewed",
  },
  {
    when: "Q2 2027",
    title: "First paying businesses",
    proof: "10 businesses invoicing on mainnet · CCTP funding path live",
  },
];

// Bracketed values are placeholders for the founder to set before sending the deck.
const ask = {
  amount: "[Amount]",
  runway: "[18] months",
};

export default function RoadmapSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-[18vh] -left-[10vw] w-[32vw] h-[32vw] rounded-full bg-primary/10 blur-[6vw]"
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

      <div className="relative h-full px-[4vw] pt-[13vh] pb-[11vh] flex gap-[4vw]">
        <div className="w-[54vw] flex flex-col">
          <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">Milestones you can verify</h2>
          <p className="mt-[1.2vh] text-[2vw] text-muted text-pretty">
            Every milestone leaves a public trace on Arc.
          </p>

          <div className="mt-[3vh] flex flex-col">
            {milestones.map((m, index) => (
              <div
                key={m.when}
                className={`flex gap-[1.8vw] py-[1.6vh] ${index < milestones.length - 1 ? "border-b border-white/10" : ""}`}
              >
                <div className="w-[9vw] shrink-0">
                  <span className="font-mono text-[1.5vw] uppercase tracking-[0.14em] text-primary">{m.when}</span>
                </div>
                <div>
                  <h3 className="text-[2.2vw] font-medium tracking-tight text-text">{m.title}</h3>
                  <p className="mt-[0.6vh] text-[1.6vw] leading-normal text-muted text-pretty">{m.proof}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="relative w-full overflow-hidden rounded-[1.4vw] border border-primary/25 bg-primary/[0.07] px-[2.2vw] py-[3vh]">
            <div
              className="pointer-events-none absolute -right-[6vw] -top-[12vh] w-[22vw] h-[22vw] rounded-full bg-primary/15 blur-[5vw]"
              aria-hidden="true"
            />
            <p className="relative font-mono text-[1.5vw] uppercase tracking-[0.18em] text-primary">The ask</p>
            <p className="relative mt-[1.4vh] font-display text-[4.2vw] leading-none font-light tracking-tight text-text/95">
              {ask.amount}
            </p>
            <p className="relative mt-[1vh] text-[2vw] text-muted">for {ask.runway} of runway</p>

            <div className="relative mt-[3vh] flex flex-col gap-[1.2vh] border-t border-white/10 pt-[2.2vh]">
              <div className="flex items-center justify-between">
                <span className="text-[1.8vw] text-text/90">Engineering for the three milestones</span>
                <span className="font-mono text-[1.5vw] text-muted">[60%]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[1.8vw] text-text/90">Security review of contract and key handling</span>
                <span className="font-mono text-[1.5vw] text-muted">[15%]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[1.8vw] text-text/90">Pilots, onboarding, mainnet operations</span>
                <span className="font-mono text-[1.5vw] text-muted">[25%]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Roadmap
          </span>
          <span className="font-mono text-[1.5vw] text-muted">11 / 12</span>
        </div>
      </footer>
    </div>
  );
}
