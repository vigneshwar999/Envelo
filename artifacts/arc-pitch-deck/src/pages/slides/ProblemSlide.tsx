export default function ProblemSlide() {
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
            Invoices in the open
          </h2>
        </div>
        <p className="mt-[2vh] text-[2vw] text-muted max-w-[58vw] text-pretty">
          Billing runs on email attachments and shared drive links. Two things break.
        </p>

        <div className="mt-[5vh] grid grid-cols-2 gap-[2vw]">
          <div className="bg-card border border-border rounded-lg p-[2vw]">
            <svg className="w-[2.6vw] h-[2.6vw] text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h3 className="mt-[2.4vh] text-[2.3vw] font-semibold tracking-tight text-primary">
              Private data leaks
            </h3>
            <p className="mt-[1.6vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Rates, client names, and addresses sit in inboxes and forwarded PDFs, readable by everyone in between.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-[2vw]">
            <svg className="w-[2.6vw] h-[2.6vw] text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
              <path d="M9.5 8.5h5M9.5 12.5h5" />
            </svg>
            <h3 className="mt-[2.4vh] text-[2.3vw] font-semibold tracking-tight text-primary">
              Payment records are hearsay
            </h3>
            <p className="mt-[1.6vh] text-[2vw] leading-normal text-text/85 text-pretty">
              Proof of payment lives in screenshots the other side cannot check, and an edited invoice looks exactly like the original.
            </p>
          </div>
        </div>

        <p className="mt-[4.5vh] text-[2.1vw] font-semibold tracking-tight text-primary">
          Freelancers over-share. Clients cannot prove. Auditors cannot trust.
        </p>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 px-[4vw] pb-[2.6vh]">
        <div className="border-t border-border pt-[1.5vh] flex items-center justify-between">
          <span className="font-mono text-[1.5vw] uppercase tracking-[0.18em] text-muted">
            Sealed Invoices · Arc Testnet
          </span>
          <span className="font-mono text-[1.5vw] text-muted">02 / 08</span>
        </div>
      </footer>
    </div>
  );
}
