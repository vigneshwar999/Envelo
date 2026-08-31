import { useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Lock,
  KeyRound,
  Database,
  Fingerprint,
  Coins,
  ShieldCheck,
  Wallet,
  Download,
  ArrowRight,
  EyeOff,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Background } from "@/components/marketing/Background";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { trackEvent } from "@/lib/analytics";

export default function HowItWorks() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    document.title = "How Envelo Works | Envelo";
  }, []);

  return (
    <div className="w-full bg-transparent selection:bg-primary/30 selection:text-foreground">
      <Background />
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-32 px-4 flex flex-col items-center text-center overflow-hidden z-10">
        <ScrollReveal className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-foreground uppercase tracking-widest mx-auto backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-primary" />
            The Mechanics of Trust
          </div>
          <h1
            className="text-5xl sm:text-7xl font-light tracking-tight text-foreground text-balance !leading-[1.1]"
            data-testid="text-how-it-works-title"
          >
            How Envelo Works
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground/80 leading-relaxed text-balance">
            Envelo encrypts sensitive invoice details in your browser, then
            anchors a verifiable fingerprint on Arc Testnet. The document stays
            sealed; the proof remains public.
          </p>
        </ScrollReveal>
      </section>

      {/* 2. THE TIMELINE FLOW */}
      <section className="relative px-4 pb-32 max-w-6xl mx-auto z-10">
        {/* Central connecting line for desktop */}
        <div className="absolute left-1/2 top-0 bottom-0 hidden w-px -translate-x-1/2 bg-white/5 md:block" />

        <div className="space-y-32">
          {/* STEP 1: ENCRYPTION */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-primary/20 backdrop-blur-md">
                <Lock className="h-5 w-5" />
              </div>
            </div>
            
            <ScrollReveal direction="right" className="md:col-start-1 md:text-right space-y-6 order-2 md:order-1">
              <div className="space-y-2">
                <div className="text-primary/60 font-mono tracking-widest uppercase text-xs mb-4">Step 01</div>
                <h2 className="text-4xl font-light tracking-tight">Seal the invoice</h2>
              </div>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                When you create an invoice, Envelo encrypts sensitive fields—including
                line items, descriptions, and notes—inside your browser with{" "}
                <strong className="text-foreground font-medium">AES-256-GCM</strong> before
                anything is sent.
              </p>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Envelo receives the sealed ciphertext and only the workflow
                metadata needed to operate the invoice, such as its number,
                amount, due date, parties, status, and fingerprint.{" "}
                <strong className="text-foreground font-medium">
                  The server cannot read the encrypted fields.
                </strong>
              </p>
            </ScrollReveal>

            <ScrollReveal direction="left" delay={0.1} className="order-1 md:order-3 md:col-start-3">
              <div className="relative aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden backdrop-blur-sm group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:4px_4px]" />
                
                <div className="flex items-center gap-4 relative z-10 w-full max-w-sm justify-center">
                  <div className="bg-background/80 backdrop-blur border border-white/5 p-4 rounded-2xl shadow-xl flex flex-col gap-3 w-32 shrink-0 transition-transform duration-500 group-hover:-translate-y-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-white/10 rounded-full" />
                      <div className="h-1.5 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-1.5 w-5/6 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  
                  <ArrowRight className="text-white/20 shrink-0" />
                  
                  <div className="bg-primary/10 text-primary-foreground p-4 rounded-2xl shadow-2xl w-32 shrink-0 flex flex-col items-center gap-3 border border-primary/20 relative backdrop-blur-md transition-transform duration-500 group-hover:translate-y-1">
                    <div className="absolute -top-3 -right-3 h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <Lock className="h-5 w-5 text-primary" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-1.5 w-full bg-primary/30 rounded-full" />
                      <div className="h-1.5 w-3/4 bg-primary/30 rounded-full" />
                      <div className="h-1.5 w-5/6 bg-primary/30 rounded-full" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-2 bg-background/50 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-sm text-muted-foreground shadow-lg relative z-10">
                  <Database className="h-4 w-4" /> Visible workflow metadata
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* STEP 2: KEY DELEGATION */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-white/5 text-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-white/10 backdrop-blur-md">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <ScrollReveal direction="right" delay={0.1} className="order-1 md:order-1 md:col-start-1">
              <div className="relative aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden backdrop-blur-sm group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                <div className="flex flex-col gap-4 relative z-10 w-full max-w-sm items-center">
                  <div className="flex gap-4">
                    <div className="bg-background/80 backdrop-blur border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 w-28 text-center transition-transform duration-500 group-hover:scale-105">
                      <KeyRound className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium text-foreground">Your Key</span>
                    </div>
                    <div className="bg-background/40 backdrop-blur border border-white/5 border-dashed p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 w-28 text-center opacity-70">
                      <KeyRound className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Wrapped Key</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl text-sm text-foreground shadow-xl w-full max-w-[240px]">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium leading-tight text-foreground">Local Backup</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">Passphrase locked</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="left" className="order-2 md:order-3 md:col-start-3 space-y-6">
              <div className="space-y-2">
                <div className="text-primary/60 font-mono tracking-widest uppercase text-xs mb-4">Step 02</div>
                <h2 className="text-4xl font-light tracking-tight">Grant private access</h2>
              </div>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                To share an invoice, Envelo wraps its document key separately
                for each approved viewer using that viewer&apos;s public key.
                Only a browser holding the matching private key can unseal the
                content.
              </p>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Your unencrypted private envelope key stays in your browser. To
                use another device, download a passphrase-protected backup from
                the Dashboard and restore it there.{" "}
                <strong className="text-foreground font-medium">
                  Envelo never receives your private key or backup passphrase.
                </strong>
              </p>
            </ScrollReveal>
          </div>

          {/* STEP 3: FINGERPRINT */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-seal/10 text-seal flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-seal/20 backdrop-blur-md">
                <Fingerprint className="h-5 w-5" />
              </div>
            </div>
            
            <ScrollReveal direction="right" className="order-2 md:order-1 md:col-start-1 md:text-right space-y-6">
              <div className="space-y-2">
                <div className="text-seal/60 font-mono tracking-widest uppercase text-xs mb-4">Step 03</div>
                <h2 className="text-4xl font-light tracking-tight">Anchor the fingerprint</h2>
              </div>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Before encryption, Envelo creates a SHA-256 fingerprint of the
                invoice. Like a digital wax stamp, that fingerprint changes if
                the underlying document changes.
              </p>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                The fingerprint is anchored on{" "}
                <strong className="text-foreground font-medium">Arc Testnet</strong>. An
                approved viewer can unseal the invoice, recompute its fingerprint
                locally, and compare the result with the onchain record to verify
                that the document has not changed.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="left" delay={0.1} className="order-1 md:order-3 md:col-start-3">
              <div className="relative aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden backdrop-blur-sm group">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-seal/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
                
                <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.15)] mb-8 relative z-10 transition-transform duration-500 group-hover:scale-110 backdrop-blur-md">
                  <Fingerprint className="h-8 w-8 text-seal" />
                </div>
                
                <div className="bg-background/60 border border-white/10 rounded-2xl p-5 text-center relative z-10 backdrop-blur-xl w-full max-w-xs shadow-xl">
                  <div className="text-[10px] tracking-widest text-muted-foreground/70 font-mono mb-2 uppercase">
                    Anchored SHA-256 Hash
                  </div>
                  <div className="text-xs sm:text-sm font-mono break-all text-foreground/90">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* STEP 4: PAYMENTS */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-white/5 text-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-white/10 backdrop-blur-md">
                <Coins className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <ScrollReveal direction="right" delay={0.1} className="order-1 md:order-1 md:col-start-1">
              <div className="relative aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden backdrop-blur-sm group">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-50" />
                <div className="flex flex-col items-center gap-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-background/80 border border-white/10 flex items-center justify-center shadow-xl shrink-0 backdrop-blur-md transition-transform duration-500 group-hover:-translate-x-2">
                      <Wallet className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="h-px w-16 bg-white/10 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                    </div>
                    <div className="bg-background/80 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col items-center gap-2 min-w-[140px] backdrop-blur-md transition-transform duration-500 group-hover:translate-x-2">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Settled
                      </div>
                      <div className="text-xl font-light text-foreground">
                        2,500 USDC
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-primary/10 text-primary-foreground/90 text-xs font-medium px-5 py-2.5 rounded-full border border-primary/20 backdrop-blur-md">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Public Arc Testnet Tx
                  </div>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="left" className="order-2 md:order-3 md:col-start-3 space-y-6">
              <div className="space-y-2">
                <div className="text-primary/60 font-mono tracking-widest uppercase text-xs mb-4">Step 04</div>
                <h2 className="text-4xl font-light tracking-tight">Settle in test USDC</h2>
              </div>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Invoice payments use public Arc Testnet transactions in test
                USDC. Envelo records the transaction hash with the invoice
                workflow record so participants can verify the settlement
                amount and transaction onchain.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <p className="text-sm text-foreground font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-primary" /> Important Notes
                </p>
                <ul className="text-sm text-muted-foreground/80 space-y-3 list-disc list-inside ml-2">
                  <li>Test USDC has no real-world value.</li>
                  <li>Payment amounts and wallet addresses are visible on ArcScan.</li>
                  <li>Shielded USDC is not yet available; confidential transfers require official network support.</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 3. CTA SECTION */}
      <section className="py-32 px-4 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_center,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10" />
        <ScrollReveal className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-foreground">
            Ready to seal your first invoice?
          </h2>
          <p className="text-xl text-muted-foreground/80">
            Keep sensitive billing details private while preserving a verifiable
            onchain trail.
          </p>
          
          {isSignedIn ? (
            <div className="flex justify-center pt-8">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                data-testid="button-cta-dashboard"
              >
                <Link
                  href="/dashboard"
                  onClick={() =>
                    trackEvent("how_it_works_cta_clicked", { action: "open_dashboard" })
                  }
                >
                  Open your dashboard
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 w-full sm:w-auto rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                data-testid="button-cta-signup"
              >
                <Link
                  href="/sign-up"
                  onClick={() => {
                    trackEvent("how_it_works_cta_clicked", { action: "sign_up" });
                  }}
                >
                  Create your account
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 w-full sm:w-auto rounded-full px-10 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all backdrop-blur-md text-foreground"
                data-testid="button-cta-signin"
              >
                <Link
                  href="/sign-in"
                  onClick={() =>
                    trackEvent("how_it_works_cta_clicked", { action: "sign_in" })
                  }
                >
                  Sign in
                </Link>
              </Button>
            </div>
          )}
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}