import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  Coins,
  EyeOff,
  FileKey,
  ArrowRight,
  Database,
  KeyRound,
  Eye,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import {
  rememberExploreSignupIntent,
  trackEvent,
} from "@/lib/analytics";

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Explore() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <div className="w-full overflow-hidden bg-background selection:bg-seal selection:text-white">
      {/* 1. HERO */}
      <section className="relative min-h-[90dvh] flex flex-col items-center justify-center px-4 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10" />

        <FadeIn className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-seal/20 bg-seal/5 px-4 py-1.5 text-sm font-medium text-seal uppercase tracking-widest mb-4">
            <ShieldCheck className="h-4 w-4" />
            Built on Circle&apos;s Arc Testnet
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground text-balance !leading-[1.1]">
            Private paperwork.
            <br />
            <span className="text-primary">Public proof.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto">
            Envelo seals sensitive invoice details in your browser, anchors
            proof on Arc, and settles payments in test USDC.
          </p>

          {isSignedIn ? (
            <div className="flex justify-center pt-8">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90 sm:w-auto"
                data-testid="button-hero-dashboard"
              >
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2"
                  onClick={() =>
                    trackEvent("explore_cta_clicked", {
                      location: "hero",
                      action: "open_dashboard",
                    })
                  }
                >
                  Open your dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90 sm:w-auto"
                data-testid="button-hero-signup"
              >
                <Link
                  href="/sign-up"
                  className="flex items-center gap-2"
                  onClick={() => {
                    rememberExploreSignupIntent("hero");
                    trackEvent("explore_cta_clicked", {
                      location: "hero",
                      action: "sign_up",
                    });
                  }}
                >
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-full px-8 text-base sm:w-auto"
                data-testid="button-hero-signin"
              >
                <Link
                  href="/sign-in"
                  onClick={() =>
                    trackEvent("explore_cta_clicked", {
                      location: "hero",
                      action: "sign_in",
                    })
                  }
                >
                  Sign in
                </Link>
              </Button>
            </div>
          )}
        </FadeIn>
      </section>

      {/* 2. THE CORE CONCEPT / ENCRYPTION */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div className="space-y-6">
                <div className="h-12 w-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-8">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Sealed shut in your browser.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Envelo encrypts locally using{" "}
                  <strong className="text-foreground">
                    browser-side AES-256-GCM sealing
                  </strong>
                  . The sealed invoice body is locked before it ever leaves your
                  device.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex gap-3 text-muted-foreground">
                    <Database className="h-6 w-6 text-seal shrink-0" />
                    <span>
                      The invoice body reaches our server as ciphertext. Line
                      items, notes, and other sealed details remain unreadable
                      to Envelo.
                    </span>
                  </li>
                  <li className="flex gap-3 text-muted-foreground">
                    <KeyRound className="h-6 w-6 text-seal shrink-0" />
                    <span>
                      Envelope keys are generated locally and wrapped for each
                      authorized viewer. Limited workflow metadata stays
                      visible so the invoice can be routed and settled.
                    </span>
                  </li>
                </ul>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="relative">
              <div className="aspect-square sm:aspect-[4/3] rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:4px_4px]" />
                <div className="relative w-full max-w-sm space-y-4">
                  <div className="bg-background p-4 rounded-xl border shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileKey className="h-5 w-5 text-muted-foreground" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex justify-center py-2 text-primary">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg border border-primary-foreground/10 flex flex-col gap-2">
                    <span className="text-xs opacity-70 font-mono">
                      ENCRYPTED PAYLOAD
                    </span>
                    <span className="text-sm font-mono break-all opacity-90">
                      U2FsdGVkX1+v...
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. WAX SEAL / ARC ANCHOR */}
      <section className="py-24 px-4 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-seal/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-2 lg:order-1">
              <div className="aspect-square sm:aspect-[4/3] rounded-3xl bg-background/5 border border-primary-foreground/10 flex flex-col items-center justify-center p-8 relative backdrop-blur-sm">
                <div className="h-24 w-24 rounded-full bg-seal flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.4)] mb-8">
                  <Fingerprint className="h-10 w-10 text-white" />
                </div>
                <div className="font-mono text-sm text-primary-foreground/70 break-all text-center max-w-sm">
                  0x8f3a9b2e4c...
                  <br />
                  <span className="text-seal-foreground opacity-50">
                    SHA-256 FINGERPRINT
                  </span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} className="order-1 lg:order-2">
              <div className="space-y-6">
                <div className="h-12 w-12 bg-seal text-white rounded-2xl flex items-center justify-center mb-8">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
                  The digital wax seal.
                </h2>
                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  How do you prove a private document wasn't altered? Before
                  encryption, Envelo generates a SHA-256 fingerprint of the
                  plaintext invoice.
                </p>
                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  This exact fingerprint is anchored directly on the{" "}
                  <strong className="text-white">Arc blockchain</strong>. Before
                  payment, Envelo checks that Arc holds the same fingerprint as
                  the sealed invoice record. After an authorized viewer opens
                  and decrypts the invoice, the separate Verify action
                  recomputes its fingerprint against both records.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 4. DEMO IFRAME */}
      <section className="py-32 px-4 relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <FadeIn className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              See Envelo in action
            </h2>
            <p className="text-muted-foreground text-lg">
              Press play for a 60-second walkthrough of the complete invoice
              and payment flow.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden relative aspect-[16/10] sm:aspect-video w-full group">
              {!demoStarted ? (
                <button
                  type="button"
                  onClick={() => {
                    setDemoStarted(true);
                    trackEvent("explore_demo_opened", {
                      location: "demo_section",
                      action: "play_inline",
                    });
                  }}
                  aria-label="Play the Envelo demo video"
                  data-testid="button-demo-play"
                  className="group/play absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-5 bg-primary text-primary-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary-foreground/5 blur-3xl"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary-foreground/5 blur-3xl"
                  />
                  <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white text-primary shadow-2xl ring-8 ring-white/10 transition-transform duration-300 group-hover/play:scale-105">
                    <Play
                      className="h-6 w-6 sm:h-8 sm:w-8 translate-x-0.5"
                      fill="currentColor"
                    />
                  </span>
                  <span className="text-lg sm:text-xl font-semibold tracking-tight">
                    Watch the demo
                  </span>
                  <span className="px-6 text-center text-xs sm:text-sm text-primary-foreground/70">
                    Seal, anchor, pay, share, and verify — in 60 seconds.
                  </span>
                </button>
              ) : (
                <>
                  {!iframeLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                        <span className="text-sm font-medium">
                          Loading the demo...
                        </span>
                      </div>
                    </div>
                  )}
                  <iframe
                    src="/demo-video/"
                    title="Envelo Interactive Demo"
                    className={`absolute inset-0 z-10 h-full w-full border-0 transition-opacity duration-500 ${
                      iframeLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    allow="autoplay; clipboard-write"
                    onLoad={() => setIframeLoaded(true)}
                    data-testid="iframe-demo"
                  />
                </>
              )}
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                asChild
                variant="link"
                className="text-muted-foreground hover:text-primary"
              >
                <a
                  href="/demo-video/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-demo-new-tab"
                  onClick={() =>
                    trackEvent("explore_demo_opened", {
                      location: "demo_section",
                      action: "new_tab",
                    })
                  }
                >
                  Open demo in new tab <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 5. SETTLEMENT */}
      <section className="py-24 px-4 bg-secondary/50 border-y relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <FadeIn>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Transparent Settlement.
                </h2>
                <p className="text-muted-foreground text-lg">
                  The math is complex, but the economics are simple. Settle
                  invoices cleanly without exposing sealed line items or notes.
                </p>
              </FadeIn>
            </div>

            <div className="md:col-span-2 grid sm:grid-cols-2 gap-8">
              <FadeIn delay={0.1}>
                <div className="bg-background p-8 rounded-2xl border shadow-sm h-full space-y-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">Test USDC</h3>
                  <p className="text-muted-foreground">
                    Payments are settled in test USDC directly on Arc. Note:
                    test USDC has no real-world value. The demo still exercises
                    real balances, gas, contract calls, and receipts on Arc
                    Testnet.
                  </p>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="bg-background p-8 rounded-2xl border shadow-sm h-full space-y-4">
                  <div className="h-10 w-10 rounded-full bg-seal/10 text-seal flex items-center justify-center">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">Gas Economics</h3>
                  <p className="text-muted-foreground">
                    The sender pays the initial anchor gas. The payer pays the
                    invoice amount plus the settlement gas. Clean and
                    predictable.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST BOUNDARIES & CUSTODY */}
      <section className="py-24 px-4 bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-16">
          <FadeIn className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              The Trust Boundary
            </h2>
            <p className="text-xl text-muted-foreground">
              No one layer has the full picture. Your privacy relies on strict
              separation of concerns between your device, our servers, and the
              Arc blockchain.
            </p>
          </FadeIn>

          <div className="grid lg:grid-cols-3 gap-6">
            <FadeIn delay={0.1}>
              <div className="bg-background p-6 rounded-2xl border shadow-sm h-full space-y-3">
                <div className="flex items-center gap-3 text-foreground font-semibold pb-2">
                  <KeyRound className="h-5 w-5 text-primary" /> 1. Your Browser
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Authorized browsers are where the sealed document is opened
                  and private envelope keys live. We provide a
                  passphrase-locked, browser-generated download for backup. If
                  you lose the backup and passphrase, they cannot be reset.
                  After a key reset, someone who can still open an old invoice
                  must re-share it with your new key.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-background p-6 rounded-2xl border shadow-sm h-full space-y-3">
                <div className="flex items-center gap-3 text-foreground font-semibold pb-2">
                  <Database className="h-5 w-5 text-primary" /> 2. Our Server
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Stores the encrypted invoice body and wrapped keys, plus the
                  invoice number, amount, due date, parties, status, and
                  fingerprint needed to run the workflow. It cannot read sealed
                  fields such as line items or notes. You can grant and revoke
                  viewers, though revocation cannot erase data already read.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="bg-background p-6 rounded-2xl border shadow-sm h-full space-y-3">
                <div className="flex items-center gap-3 text-foreground font-semibold pb-2">
                  <Fingerprint className="h-5 w-5 text-primary" /> 3. Arc
                  Testnet
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Records the fingerprint and anchor time, then wallet
                  addresses, payment status, and amount when settled (Chain ID
                  5042002). The first funded sender activates the shared
                  registry with the first anchor. Users approve fees from their
                  built-in custodial demo wallets; the estimate fallback is 0.1
                  test USDC when Arc cannot return a live fee.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 7. SHIELDED USDC */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto bg-primary text-primary-foreground rounded-3xl p-8 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-seal/10" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-seal/30 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Coming Soon
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Shielded USDC.
            </h2>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              Sealed invoice-body details such as line items and notes remain
              private to authorized viewers, while the settlement stays visible
              on ArcScan. Shielded USDC is coming soon—pending Arc&apos;s
              official support for confidential transfers.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-32 px-4 text-center">
        <FadeIn className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ready to seal your first invoice?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join the testnet and experience privacy-first professional billing.
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
                    trackEvent("explore_cta_clicked", {
                      location: "final",
                      action: "open_dashboard",
                    })
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
                    rememberExploreSignupIntent("final");
                    trackEvent("explore_cta_clicked", {
                      location: "final",
                      action: "sign_up",
                    });
                  }}
                >
                  Create your account
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-14 w-full rounded-full px-10 text-base sm:w-auto"
                data-testid="button-cta-signin"
              >
                <Link
                  href="/sign-in"
                  onClick={() =>
                    trackEvent("explore_cta_clicked", {
                      location: "final",
                      action: "sign_in",
                    })
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
