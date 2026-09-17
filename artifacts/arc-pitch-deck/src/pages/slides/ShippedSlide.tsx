const shipped = [
  {
    title: "Web app, live",
    body: "envelo.online, open sign-up with real accounts since 31 Aug 2026.",
  },
  {
    title: "Mobile app",
    body: "Expo app for iOS and Android. Push built, live once published.",
  },
  {
    title: "The whole loop",
    body: "Seal, anchor, pay, grant, revoke, verify, all on the real chain.",
  },
  {
    title: "Registry v3 on Arc",
    body: "Anchor the fingerprint, then one payable call pays and flips paid.",
  },
  {
    title: "Keys that survive",
    body: "Wrapped keys per recipient, backup and lost-key reset.",
  },
  {
    title: "Tested against the chain",
    body: "End-to-end suite runs the full flow on Arc Testnet, funding included.",
  },
];

export default function ShippedSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 nebula-grid" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-[20vh] -right-[8vw] w-[32vw] h-[32vw] rounded-full bg-primary/10 blur-[6vw]"
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
        <div className="flex items-end justify-between gap-[3vw]">
          <div>
            <h2 className="font-display text-[3.8vw] font-light tracking-tight text-text/90">What is live today</h2>
            <p className="mt-[1.2vh] text-[2vw] text-muted max-w-[60vw] text-pretty">
              A working product on Arc Testnet, on web and mobile.
            </p>
          </div>
          <div className="shrink-0 rounded-[1.2vw] border border-white/10 bg-white/[0.04] px-[1.8vw] py-[1.4vh]">
            <p className="font-mono text-[1.5vw] uppercase tracking-[0.16em] text-muted">Stage</p>
            <p className="mt-[0.5vh] text-[2vw] font-medium tracking-tight text-text">
              Early access · pre-revenue
            </p>
            <p className="mt-[0.6vh] font-mono text-[1.5vw] text-muted">Registry 0x7229…d38E7 · testnet.arcscan.app</p>
          </div>
        </div>

        <div className="mt-[2.6vh] grid grid-cols-3 gap-[1.4vw]">
          {shipped.map((item, index) => (
            <div
              key={item.title}
              className="rounded-[1.3vw] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-[1.6vw] py-[1.6vh]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[1.5vw] text-primary">0{index + 1}</span>
                <span className="inline-flex items-center gap-[0.5vw] rounded-full border border-ok/25 bg-ok/10 px-[0.9vw] py-[0.3vh] font-mono text-[1.5vw] uppercase tracking-[0.14em] text-ok">
                  Shipped
                </span>
              </div>
              <h3 className="mt-[1.2vh] text-[2.1vw] font-medium tracking-tight text-text">{item.title}</h3>
              <p className="mt-[0.8vh] text-[1.6vw] leading-normal text-muted text-pretty">{item.body}</p>
            </div>
          ))}
        </div>

      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-white/10 pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Envelo · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">09 / 12</span>
        </div>
      </footer>
    </div>
  );
}
