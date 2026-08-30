export default function HowItWorksSlide() {
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
            Seal, anchor, pay, grant
          </h2>
        </div>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          Four moves, three people, one document.
        </p>

        <div className="mt-[6vh] flex items-stretch gap-[1vw]">
          <div className="flex-1 bg-card border border-border rounded-lg p-[1.6vw]">
            <span className="font-mono text-[1.5vw] text-accent">01</span>
            <h3 className="mt-[1.2vh] text-[2.1vw] font-semibold tracking-tight text-primary">Seal</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Riya, a freelancer, writes the invoice. Her browser encrypts it before anything is uploaded.
            </p>
          </div>
          <span className="self-center text-[2vw] text-muted">→</span>
          <div className="flex-1 bg-card border border-border rounded-lg p-[1.6vw]">
            <span className="font-mono text-[1.5vw] text-accent">02</span>
            <h3 className="mt-[1.2vh] text-[2.1vw] font-semibold tracking-tight text-primary">Anchor</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              The invoice's fingerprint is written to the registry contract on Arc Testnet.
            </p>
          </div>
          <span className="self-center text-[2vw] text-muted">→</span>
          <div className="flex-1 bg-card border border-border rounded-lg p-[1.6vw]">
            <span className="font-mono text-[1.5vw] text-accent">03</span>
            <h3 className="mt-[1.2vh] text-[2.1vw] font-semibold tracking-tight text-primary">Pay</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Arjun, the client, sends test USDC. The paid flag flips onchain, next to the fingerprint.
            </p>
          </div>
          <span className="self-center text-[2vw] text-muted">→</span>
          <div className="flex-1 bg-card border border-border rounded-lg p-[1.6vw]">
            <span className="font-mono text-[1.5vw] text-accent">04</span>
            <h3 className="mt-[1.2vh] text-[2.1vw] font-semibold tracking-tight text-primary">Grant</h3>
            <p className="mt-[1.2vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Meera, the accountant, gets a temporary key. Revoking it ends her access going forward.
            </p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">04 / 08</span>
        </div>
      </footer>
    </div>
  );
}
