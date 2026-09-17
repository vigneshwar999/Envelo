// Bracketed values are placeholders for the founder to fill before sending the deck.
const founder = {
  name: "Adla Vigneshwar",
  role: "Founder",
  background: "[Background: previous work, what you have shipped, and why invoicing]",
  handle: "github.com/vigneshwar999",
};

export default function TeamSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-[26vh] -right-[8vw] w-[34vw] h-[34vw] rounded-full bg-primary/10 blur-[6vw]"
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
        <div className="w-[50vw] flex flex-col">
          <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">Team</h2>
          <p className="mt-[1.2vh] text-[2vw] text-muted text-pretty">
            Built on Arc since August 2026: contract, web, mobile, and the test suite that runs against the chain.
          </p>

          <div className="mt-[3.5vh] rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-[2vw] py-[2.6vh]">
            <div className="flex items-center gap-[1.4vw]">
              <div className="w-[5.2vw] h-[5.2vw] shrink-0 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center">
                <span className="font-display text-[2.2vw] text-primary">AV</span>
              </div>
              <div>
                <h3 className="text-[2.4vw] font-medium tracking-tight text-text">{founder.name}</h3>
                <p className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-primary">{founder.role}</p>
              </div>
            </div>
            <p className="mt-[2vh] text-[1.9vw] leading-normal text-muted text-pretty">{founder.background}</p>
            <p className="mt-[1.4vh] font-mono text-[1.5vw] text-muted">{founder.handle}</p>
          </div>

          <p className="mt-[2.4vh] text-[1.7vw] text-muted text-pretty">
            [Add co-founders, advisors, or contractors here, or delete this line.]
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full rounded-[1.4vw] border border-primary/25 bg-primary/[0.07] px-[2.2vw] py-[3vh]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-primary">Try it, then talk to us</p>
            <div className="mt-[2vh] flex flex-col gap-[1.6vh]">
              <div className="flex items-center justify-between gap-[2vw] border-b border-white/10 pb-[1.4vh]">
                <span className="text-[1.8vw] text-text/90">Live app</span>
                <span className="font-mono text-[1.6vw] text-text">envelo.online</span>
              </div>
              <div className="flex items-center justify-between gap-[2vw] border-b border-white/10 pb-[1.4vh]">
                <span className="text-[1.8vw] text-text/90">X</span>
                <span className="font-mono text-[1.6vw] text-text">@enveloarc</span>
              </div>
              <div className="flex items-center justify-between gap-[2vw] border-b border-white/10 pb-[1.4vh]">
                <span className="text-[1.8vw] text-text/90">GitHub</span>
                <span className="font-mono text-[1.6vw] text-text">vigneshwar999/Envelo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[1.8vw] text-text/90">Email</span>
                <span className="font-mono text-[1.6vw] text-text">[email]</span>
              </div>
            </div>
            <p className="mt-[2.6vh] text-[2.3vw] font-light tracking-tight text-text/95 text-balance">
              Private by default. <span className="text-primary">Verifiable when it matters.</span>
            </p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Team
          </span>
          <span className="font-mono text-[1.5vw] text-muted">12 / 12</span>
        </div>
      </footer>
    </div>
  );
}
