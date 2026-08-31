import { Link } from "wouter";
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
import { Background } from "@/components/marketing/Background";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import {
  rememberExploreSignupIntent,
  trackEvent,
} from "@/lib/analytics";

export default function Explore() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <div className="w-full overflow-hidden bg-transparent selection:bg-primary/30 selection:text-foreground">
      <Background />

      {/* 1. HERO */}
      <section className="relative min-h-[90dvh] flex flex-col items-center justify-center px-4 pt-20">
        <ScrollReveal className="text-center max-w-5xl mx-auto flex flex-col items-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-foreground uppercase tracking-widest mb-8 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Built on Circle&apos;s Arc Testnet
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-[6.5rem] font-light tracking-tight text-foreground text-balance !leading-[1.05] mb-8">
            Private paperwork.<br />
            <span className="text-muted-foreground">Public proof.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground/80 leading-relaxed text-balance max-w-2xl mx-auto mb-12">
            Envelo seals sensitive invoice details in your browser, anchors
            proof on Arc, and settles payments in test USDC.
          </p>

          {isSignedIn ? (
            <div className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
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
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full sm:w-auto rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
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
                className="h-12 w-full sm:w-auto rounded-full px-8 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all backdrop-blur-md text-foreground"
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
        </ScrollReveal>
      </section>

      {/* 2. THE CORE CONCEPT / ENCRYPTION */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="right">
              <div className="space-y-6 max-w-xl">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/5 border border-white/10 mb-2">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground !leading-[1.1]">
                  Sealed shut in<br />your browser.
                </h2>
                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                  Envelo encrypts locally using <strong className="text-foreground font-medium">browser-side AES-256-GCM sealing</strong>. The sealed invoice body is locked before it ever leaves your device.
                </p>
                <div className="h-px w-12 bg-white/10 my-8" />
                <ul className="space-y-6">
                  <li className="flex gap-4 items-start">
                    <Database className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      The invoice body reaches our server as ciphertext. Line items, notes, and other sealed details remain unreadable to Envelo.
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <KeyRound className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      Envelope keys are generated locally and wrapped for each authorized viewer. Limited workflow metadata stays visible so the invoice can be routed and settled.
                    </span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left" delay={0.2} className="relative">
              <div className="aspect-square sm:aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center p-8 relative overflow-hidden backdrop-blur-sm group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,1)_50%,transparent_75%)] bg-[length:4px_4px]" />
                <div className="relative w-full max-w-sm space-y-4">
                  <div className="bg-background/80 backdrop-blur p-4 rounded-2xl border border-white/5 shadow-xl flex items-center justify-between transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="flex items-center gap-3">
                      <FileKey className="h-5 w-5 text-muted-foreground" />
                      <div className="h-3 w-20 bg-white/10 rounded-full animate-pulse" />
                    </div>
                    <div className="h-3 w-10 bg-white/10 rounded-full animate-pulse" />
                  </div>
                  <div className="flex justify-center py-2 relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/20 rounded-full blur-xl" />
                     <Lock className="h-6 w-6 text-primary relative z-10" />
                  </div>
                  <div className="bg-primary/10 text-primary-foreground p-5 rounded-2xl border border-primary/20 flex flex-col gap-2 transition-transform duration-500 group-hover:translate-y-1 backdrop-blur-md">
                    <span className="text-[10px] uppercase tracking-widest text-primary/80 font-mono">
                      Encrypted Payload
                    </span>
                    <span className="text-sm font-mono break-all text-primary-foreground/90">
                      U2FsdGVkX1+v...
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 3. WAX SEAL / ARC ANCHOR */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="right" className="order-2 lg:order-1">
              <div className="aspect-square sm:aspect-[4/3] rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-8 relative overflow-hidden backdrop-blur-sm group">
                <div className="absolute inset-0 bg-gradient-to-bl from-seal/10 to-transparent opacity-50" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.15)] mb-8 transition-transform duration-500 group-hover:scale-110">
                    <Fingerprint className="h-8 w-8 text-seal" />
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-foreground/80 break-all text-center max-w-sm px-4">
                    0x8f3a9b2e4c...
                    <br />
                    <span className="text-seal/80 opacity-70 mt-2 block tracking-widest uppercase text-[10px]">
                      SHA-256 FINGERPRINT
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="left" delay={0.2} className="order-1 lg:order-2">
              <div className="space-y-6 max-w-xl">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/5 border border-white/10 mb-2">
                  <Fingerprint className="h-5 w-5 text-seal" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground !leading-[1.1]">
                  The digital<br />wax seal.
                </h2>
                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                  How do you prove a private document wasn't altered? Before
                  encryption, Envelo generates a SHA-256 fingerprint of the
                  plaintext invoice.
                </p>
                <div className="h-px w-12 bg-white/10 my-6" />
                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                  This exact fingerprint is anchored directly on the{" "}
                  <strong className="text-foreground font-medium">Arc blockchain</strong>. Before
                  payment, Envelo checks that Arc holds the same fingerprint as
                  the sealed invoice record. After an authorized viewer opens
                  and decrypts the invoice, the separate Verify action
                  recomputes its fingerprint against both records.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 4. DEMO IFRAME */}
      <section className="py-32 px-4 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          <ScrollReveal className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              See Envelo in action
            </h2>
            <p className="text-muted-foreground/80 text-lg">
              Press play for a 60-second walkthrough of the complete invoice
              and payment flow.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-sm group">
              <div className="rounded-2xl overflow-hidden relative aspect-[16/10] sm:aspect-video w-full bg-background border border-white/5">
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
                    className="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-6 bg-transparent"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-transform duration-300 group-hover:scale-110">
                      <Play className="h-8 w-8 translate-x-1" fill="currentColor" />
                    </span>
                    <div className="relative text-center space-y-2">
                      <span className="block text-xl font-light tracking-tight text-foreground">
                        Watch the demo
                      </span>
                      <span className="block text-sm text-muted-foreground/80">
                        Seal, anchor, pay, share, and verify — in 60 seconds.
                      </span>
                    </div>
                  </button>
                ) : (
                  <>
                    {!iframeLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
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
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                variant="link"
                className="text-muted-foreground hover:text-foreground font-normal"
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
          </ScrollReveal>
        </div>
      </section>

      {/* 5. SETTLEMENT */}
      <section className="py-24 px-4 relative z-10">
        <div className="absolute inset-0 bg-white/[0.02] border-y border-white/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-1">
              <ScrollReveal>
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">
                  Transparent<br />Settlement.
                </h2>
                <p className="text-muted-foreground/80 text-lg">
                  The math is complex, but the economics are simple. Settle
                  invoices cleanly without exposing sealed line items or notes.
                </p>
              </ScrollReveal>
            </div>

            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
              <ScrollReveal delay={0.1}>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-full space-y-4 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
                  <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-primary flex items-center justify-center">
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Test USDC</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Payments are settled in test USDC directly on Arc. Note:
                    test USDC has no real-world value. The demo still exercises
                    real balances, gas, contract calls, and receipts on Arc
                    Testnet.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 h-full space-y-4 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
                  <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-seal flex items-center justify-center">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Gas Economics</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The sender pays the initial anchor gas. The payer pays the
                    invoice amount plus the settlement gas. Clean and
                    predictable.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST BOUNDARIES & CUSTODY */}
      <section className="py-32 px-4 relative z-10">
        <div className="max-w-5xl mx-auto space-y-16">
          <ScrollReveal className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              The Trust Boundary
            </h2>
            <p className="text-xl text-muted-foreground/80">
              No one layer has the full picture. Your privacy relies on strict
              separation of concerns between your device, our servers, and the
              Arc blockchain.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-6">
            <ScrollReveal delay={0.1}>
              <div className="bg-background/80 p-8 rounded-3xl border border-white/10 h-full space-y-4 shadow-xl">
                <div className="flex items-center gap-3 text-foreground font-medium pb-2 border-b border-white/5">
                  <KeyRound className="h-5 w-5 text-primary" /> 1. Your Browser
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Authorized browsers are where the sealed document is opened
                  and private envelope keys live. We provide a
                  passphrase-locked, browser-generated download for backup. If
                  you lose the backup and passphrase, they cannot be reset.
                  After a key reset, someone who can still open an old invoice
                  must re-share it with your new key.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="bg-background/80 p-8 rounded-3xl border border-white/10 h-full space-y-4 shadow-xl">
                <div className="flex items-center gap-3 text-foreground font-medium pb-2 border-b border-white/5">
                  <Database className="h-5 w-5 text-primary" /> 2. Our Server
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Stores the encrypted invoice body and wrapped keys, plus the
                  invoice number, amount, due date, parties, status, and
                  fingerprint needed to run the workflow. It cannot read sealed
                  fields such as line items or notes. You can grant and revoke
                  viewers, though revocation cannot erase data already read.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="bg-background/80 p-8 rounded-3xl border border-white/10 h-full space-y-4 shadow-xl">
                <div className="flex items-center gap-3 text-foreground font-medium pb-2 border-b border-white/5">
                  <Fingerprint className="h-5 w-5 text-primary" /> 3. Arc
                  Testnet
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Records the fingerprint and anchor time, then wallet
                  addresses, payment status, and amount when settled (Chain ID
                  5042002). The first funded sender activates the shared
                  registry with the first anchor. Users approve fees from their
                  built-in custodial demo wallets; the estimate fallback is 0.1
                  test USDC when Arc cannot return a live fee.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 7. SHIELDED USDC */}
      <section className="py-24 px-4 relative z-10 overflow-hidden">
        <ScrollReveal>
          <div className="max-w-6xl mx-auto bg-primary/5 border border-primary/20 rounded-3xl p-8 sm:p-16 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
            
            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <EyeOff className="h-3.5 w-3.5" />
                Coming Soon
              </div>
              <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-foreground">
                Shielded USDC.
              </h2>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Sealed invoice-body details such as line items and notes remain
                private to authorized viewers, while the settlement stays visible
                on ArcScan. Shielded USDC is coming soon—pending Arc&apos;s
                official support for confidential transfers.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-32 px-4 text-center relative z-10">
        <ScrollReveal className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-foreground">
            Ready to seal your first invoice?
          </h2>
          <p className="text-xl text-muted-foreground/80">
            Join the testnet and experience privacy-first professional billing.
          </p>
          {isSignedIn ? (
            <div className="flex justify-center pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
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
                className="h-14 w-full sm:w-auto rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
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
                variant="outline"
                className="h-14 w-full sm:w-auto rounded-full px-10 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all backdrop-blur-md text-foreground"
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
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}
