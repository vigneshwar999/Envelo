import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
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
import { trackEvent } from "@/lib/analytics";

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function HowItWorks() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    document.title = "How Envelo Works | Envelo";
  }, []);

  return (
    <div className="w-full bg-background selection:bg-seal selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-32 px-4 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />
        
        <FadeIn className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-seal/20 bg-seal/5 px-4 py-1.5 text-sm font-medium text-seal uppercase tracking-widest mx-auto">
            <ShieldCheck className="h-4 w-4" />
            The Mechanics of Trust
          </div>
          <h1
            className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground text-balance"
            data-testid="text-how-it-works-title"
          >
            How Envelo Works
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed text-balance">
            Envelo encrypts sensitive invoice details in your browser, then
            anchors a verifiable fingerprint on Arc Testnet. The document stays
            sealed; the proof remains public.
          </p>
        </FadeIn>
      </section>

      {/* 2. THE TIMELINE FLOW */}
      <section className="relative px-4 pb-32 max-w-6xl mx-auto">
        {/* Central connecting line for desktop */}
        <div className="absolute left-1/2 top-0 bottom-0 hidden w-px -translate-x-1/2 bg-border md:block" />

        <div className="space-y-32">
          {/* STEP 1: ENCRYPTION */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-primary-foreground/20">
                <Lock className="h-5 w-5" />
              </div>
            </div>
            
            <FadeIn className="md:col-start-1 md:text-right space-y-6 order-2 md:order-1">
              <div className="space-y-2">
                <div className="text-seal font-semibold tracking-wide uppercase text-sm">Step 1</div>
                <h2 className="text-3xl font-bold tracking-tight">Seal the invoice</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                When you create an invoice, Envelo encrypts sensitive fields—including
                line items, descriptions, and notes—inside your browser with{" "}
                <strong className="text-foreground">AES-256-GCM</strong> before
                anything is sent.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Envelo receives the sealed ciphertext and only the workflow
                metadata needed to operate the invoice, such as its number,
                amount, due date, parties, status, and fingerprint.{" "}
                <strong className="text-foreground">
                  The server cannot read the encrypted fields.
                </strong>
              </p>
            </FadeIn>

            <FadeIn delay={0.1} className="order-1 md:order-3 md:col-start-3">
              <div className="relative aspect-[4/3] rounded-3xl bg-secondary/40 border border-border/50 flex flex-col items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.02)_50%,transparent_75%)] bg-[length:4px_4px]" />
                
                <div className="flex items-center gap-4 relative z-10 w-full max-w-sm justify-center">
                  <div className="bg-background border p-4 rounded-xl shadow-sm flex flex-col gap-3 w-32 shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-muted rounded-full" />
                      <div className="h-1.5 w-3/4 bg-muted rounded-full" />
                      <div className="h-1.5 w-5/6 bg-muted rounded-full" />
                    </div>
                  </div>
                  
                  <ArrowRight className="text-muted-foreground shrink-0" />
                  
                  <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-xl w-32 shrink-0 flex flex-col items-center gap-3 border border-primary-foreground/10 relative">
                    <div className="absolute -top-3 -right-3 h-6 w-6 bg-seal rounded-full flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <Lock className="h-5 w-5" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-1.5 w-full bg-primary-foreground/20 rounded-full" />
                      <div className="h-1.5 w-3/4 bg-primary-foreground/20 rounded-full" />
                      <div className="h-1.5 w-5/6 bg-primary-foreground/20 rounded-full" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-2 bg-background border px-4 py-2 rounded-full text-sm text-muted-foreground shadow-sm relative z-10">
                  <Database className="h-4 w-4" /> Visible workflow metadata
                </div>
              </div>
            </FadeIn>
          </div>

          {/* STEP 2: KEY DELEGATION */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-seal text-seal-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-seal-foreground/20">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            <FadeIn delay={0.1} className="order-1 md:order-1 md:col-start-1">
              <div className="relative aspect-[4/3] rounded-3xl bg-seal/5 border border-seal/10 flex flex-col items-center justify-center p-6 overflow-hidden">
                <div className="flex flex-col gap-4 relative z-10 w-full max-w-sm items-center">
                  <div className="flex gap-4">
                    <div className="bg-background border p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 w-28 text-center">
                      <KeyRound className="h-6 w-6 text-seal" />
                      <span className="text-xs font-semibold text-foreground">Your Key</span>
                    </div>
                    <div className="bg-background border border-dashed p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 w-28 text-center opacity-70">
                      <KeyRound className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Wrapped Key</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3 bg-background/80 backdrop-blur border px-4 py-3 rounded-xl text-sm text-foreground shadow-sm w-full max-w-[240px]">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold leading-tight">Local Backup</span>
                      <span className="text-xs text-muted-foreground">Passphrase locked</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn className="order-2 md:order-3 md:col-start-3 space-y-6">
              <div className="space-y-2">
                <div className="text-seal font-semibold tracking-wide uppercase text-sm">Step 2</div>
                <h2 className="text-3xl font-bold tracking-tight">Grant private access</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To share an invoice, Envelo wraps its document key separately
                for each approved viewer using that viewer&apos;s public key.
                Only a browser holding the matching private key can unseal the
                content.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your unencrypted private envelope key stays in your browser. To
                use another device, download a passphrase-protected backup from
                the Dashboard and restore it there.{" "}
                <strong className="text-foreground">
                  Envelo never receives your private key or backup passphrase.
                </strong>
              </p>
            </FadeIn>
          </div>

          {/* STEP 3: FINGERPRINT */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-primary-foreground/20">
                <Fingerprint className="h-5 w-5" />
              </div>
            </div>
            
            <FadeIn className="order-2 md:order-1 md:col-start-1 md:text-right space-y-6">
              <div className="space-y-2">
                <div className="text-seal font-semibold tracking-wide uppercase text-sm">Step 3</div>
                <h2 className="text-3xl font-bold tracking-tight">Anchor the fingerprint</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Before encryption, Envelo creates a SHA-256 fingerprint of the
                invoice. Like a digital wax stamp, that fingerprint changes if
                the underlying document changes.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The fingerprint is anchored on{" "}
                <strong className="text-foreground">Arc Testnet</strong>. An
                approved viewer can unseal the invoice, recompute its fingerprint
                locally, and compare the result with the onchain record to verify
                that the document has not changed.
              </p>
            </FadeIn>

            <FadeIn delay={0.1} className="order-1 md:order-3 md:col-start-3">
              <div className="relative aspect-[4/3] rounded-3xl bg-primary text-primary-foreground flex flex-col items-center justify-center p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-seal/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="h-20 w-20 rounded-full bg-seal flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.6)] mb-8 relative z-10">
                  <Fingerprint className="h-8 w-8 text-white" />
                </div>
                
                <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl p-4 text-center relative z-10 backdrop-blur-sm w-full max-w-xs">
                  <div className="text-[10px] tracking-widest text-primary-foreground/70 font-mono mb-2 uppercase">
                    Anchored SHA-256 Hash
                  </div>
                  <div className="text-xs sm:text-sm font-mono break-all text-primary-foreground opacity-90">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* STEP 4: PAYMENTS */}
          <div className="relative grid md:grid-cols-[1fr,auto,1fr] gap-8 md:gap-16 items-center">
            <div className="hidden md:flex justify-center items-center relative z-10 col-start-2">
              <div className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-[0_0_0_8px_hsl(var(--background))] border border-border">
                <Coins className="h-5 w-5" />
              </div>
            </div>

            <FadeIn delay={0.1} className="order-1 md:order-1 md:col-start-1">
              <div className="relative aspect-[4/3] rounded-3xl bg-secondary/40 border border-border/50 flex flex-col items-center justify-center p-6 overflow-hidden">
                <div className="flex flex-col items-center gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center shadow-sm shrink-0">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="h-px w-12 bg-border relative">
                      <div className="absolute inset-0 bg-primary/20" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="bg-background border rounded-xl p-4 shadow-sm flex flex-col items-center gap-1 min-w-[120px]">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Settled
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        2,500 USDC
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-primary/5 text-primary text-xs font-semibold px-4 py-2 rounded-full border border-primary/10">
                    <ShieldCheck className="h-4 w-4" />
                    Public Arc Testnet Tx
                  </div>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn className="order-2 md:order-3 md:col-start-3 space-y-6">
              <div className="space-y-2">
                <div className="text-seal font-semibold tracking-wide uppercase text-sm">Step 4</div>
                <h2 className="text-3xl font-bold tracking-tight">Settle in test USDC</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Invoice payments use public Arc Testnet transactions in test
                USDC. Envelo records the transaction hash with the invoice
                workflow record so participants can verify the settlement
                amount and transaction onchain.
              </p>
              <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
                <p className="text-sm text-foreground font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-seal" /> Important Notes
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
                  <li>Test USDC has no real-world value.</li>
                  <li>Payment amounts and wallet addresses are visible on ArcScan.</li>
                  <li>Shielded USDC is not yet available; confidential transfers require official network support.</li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. CTA SECTION */}
      <section className="py-24 px-4 bg-muted/30 border-t">
        <FadeIn className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to seal your first invoice?
          </h2>
          <p className="text-xl text-muted-foreground">
            Keep sensitive billing details private while preserving a verifiable
            onchain trail.
          </p>
          
          {isSignedIn ? (
            <div className="flex justify-center pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full bg-primary px-10 text-base text-primary-foreground hover:bg-primary/90 sm:w-auto"
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
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full bg-primary px-10 text-base text-primary-foreground hover:bg-primary/90 sm:w-auto"
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
                className="h-14 w-full rounded-full px-10 text-base sm:w-auto"
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
        </FadeIn>
      </section>

      <SiteFooter />
    </div>
  );
}