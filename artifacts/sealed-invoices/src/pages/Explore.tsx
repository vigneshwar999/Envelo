import { Link } from "wouter";
import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  Anchor,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  Coins,
  Database,
  EyeOff,
  FileText,
  Fingerprint,
  KeyRound,
  Lock,
  MoreHorizontal,
  Play,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Background } from "@/components/marketing/Background";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import {
  rememberExploreSignupIntent,
  trackEvent,
} from "@/lib/analytics";

const stackMarks = [
  "ARC",
  "CIRCLE",
  "USDC",
  "CLERK",
  "REACT",
  "VITE",
  "DRIZZLE",
  "PLAYWRIGHT",
];

function LogoMarquee() {
  const row = [...stackMarks, ...stackMarks];
  return (
    <div className="marquee-mask overflow-hidden">
      <div className="flex w-max items-center gap-16 animate-marquee-x">
        {row.map((mark, i) => (
          <span
            key={`${mark}-${i}`}
            className="text-lg font-semibold tracking-[0.22em] text-muted-foreground/40 whitespace-nowrap select-none"
            aria-hidden={i >= stackMarks.length}
          >
            {mark}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Explore() {
  const { isSignedIn } = useUser();
  const [demoStarted, setDemoStarted] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="relative">
      <Background />

      {/* 1. HERO */}
      <section className="relative z-10 flex min-h-[92dvh] flex-col items-center justify-center px-4 pt-32 pb-16 text-center">
        <ScrollReveal className="mx-auto max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            New release — Envelo is live on Circle&apos;s Arc Testnet
          </div>

          <h1 className="mb-8 text-5xl font-light tracking-tight text-foreground/90 text-balance !leading-[1.04] sm:text-7xl md:text-[5.6rem]">
            Private paperwork.
            <br />
            <span className="text-neo">Public proof.</span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Envelo seals sensitive invoice details in your browser, anchors
            proof on Arc, and settles payments in test USDC.
          </p>

          {isSignedIn ? (
            <div className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full border border-white/15 bg-white/[0.05] px-8 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground shadow-[0_14px_50px_-12px_rgba(201,206,212,0.55)] transition-all hover:bg-white/10"
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
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-full border border-white/15 bg-white/[0.05] px-8 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground shadow-[0_14px_50px_-12px_rgba(201,206,212,0.55)] transition-all hover:bg-white/10 hover:shadow-[0_14px_60px_-10px_rgba(201,206,212,0.7)] sm:w-auto"
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
                variant="ghost"
                className="h-12 w-full rounded-full px-6 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground sm:w-auto"
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

      {/* 2. TRUSTED STRIP + MARQUEE */}
      <section className="relative z-10 px-4 pb-24">
        <div className="mx-auto max-w-6xl space-y-10">
          <ScrollReveal className="flex flex-col items-center gap-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">
              Built on the modern Arc testnet stack
            </p>
            <Link
              href="/how-it-works"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Read how it works
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <LogoMarquee />
          </ScrollReveal>
        </div>
      </section>

      {/* 3. BIG FEATURE CARD — BROWSER-SIDE SEALING */}
      <section className="relative z-10 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm sm:p-12 lg:p-14">
              <div className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
              <div className="relative grid items-center gap-12 lg:grid-cols-2">
                <div className="max-w-xl space-y-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-3xl font-light tracking-tight text-foreground !leading-[1.1] sm:text-5xl">
                    Sealed shut in
                    <br />
                    your browser.
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Envelo encrypts locally using{" "}
                    <strong className="font-medium text-foreground">
                      browser-side AES-256-GCM sealing
                    </strong>
                    . The sealed invoice body is locked before it ever leaves
                    your device.
                  </p>
                  <div className="h-px w-12 bg-white/10" />
                  <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                      <Database className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        The invoice body reaches our server as ciphertext. Line
                        items, notes, and other sealed details remain
                        unreadable to Envelo.
                      </span>
                    </li>
                    <li className="flex items-start gap-4">
                      <KeyRound className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        Envelope keys are generated locally and wrapped for
                        each authorized viewer. Limited workflow metadata stays
                        visible so the invoice can be routed and settled.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="relative">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070707] shadow-2xl">
                    <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                        seal.ts
                      </span>
                    </div>
                    <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-[1.9] text-muted-foreground sm:text-xs">
                      <code>
                        <span className="text-muted-foreground/40">
                          {"// seal before it leaves the device"}
                        </span>
                        {"\n"}
                        <span className="text-foreground/80">const</span>
                        {" { sealed, fingerprint } = "}
                        <span className="text-foreground/80">await</span>
                        {" envelo."}
                        <span className="text-primary">seal</span>
                        {"({\n  invoice: draft,\n  cipher: "}
                        <span className="text-emerald-400/80">
                          &quot;AES-256-GCM&quot;
                        </span>
                        {",\n});\n\n"}
                        <span className="text-foreground/80">await</span>
                        {" arc."}
                        <span className="text-primary">anchor</span>
                        {"(fingerprint); "}
                        <span className="text-muted-foreground/40">
                          {"// SHA-256 → Arc"}
                        </span>
                        {"\n"}
                        <span className="text-foreground/80">await</span>
                        {" envelo."}
                        <span className="text-primary">send</span>
                        {"(sealed); "}
                        <span className="text-muted-foreground/40">
                          {"// ciphertext only"}
                        </span>
                      </code>
                    </pre>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-4 shadow-2xl backdrop-blur-xl sm:absolute sm:-bottom-8 sm:-right-6 sm:mt-0 sm:w-[290px]">
                    <p className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
                      Envelope status
                    </p>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Sealed body
                        </span>
                        <span className="font-mono text-[10px] text-foreground/70">
                          AES-256-GCM
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Arc anchor
                        </span>
                        <span className="font-mono text-[10px] text-foreground/70">
                          SHA-256 · 14ms
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          Settlement
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          Active
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-[10px] text-muted-foreground/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-status-pulse" />
                      All systems sealed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 4. TWO GLASS CARDS — WAX SEAL / SETTLEMENT */}
      <section className="relative z-10 px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <ScrollReveal delay={0.05}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm sm:p-10">
              <div className="relative mb-10 flex h-44 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full border border-white/5" />
                <div className="absolute h-28 w-28 rounded-full border border-white/10" />
                <div className="absolute h-40 w-40 animate-[spin_24s_linear_infinite]">
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/70" />
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(201,206,212,0.18)]">
                  <Fingerprint className="h-7 w-7 text-seal" />
                </div>
              </div>
              <h3 className="mb-4 text-2xl font-light tracking-tight text-foreground sm:text-3xl">
                The digital wax seal.
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                How do you prove a private document wasn&apos;t altered? Before
                encryption, Envelo generates a{" "}
                <strong className="font-medium text-foreground">
                  SHA-256 fingerprint
                </strong>{" "}
                of the plaintext invoice and anchors it directly on the Arc
                blockchain.
              </p>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Before payment, Envelo checks that Arc holds the same
                fingerprint as the sealed invoice record. After an authorized
                viewer opens and decrypts the invoice, the separate Verify
                action recomputes its fingerprint against both records.
              </p>
              <div className="mt-auto">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  0x8f3a9b2e4c…
                  <span className="uppercase tracking-widest text-seal/80">
                    SHA-256
                  </span>
                </span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm sm:p-10">
              <div className="relative mb-10 flex h-44 items-center justify-center">
                <div className="w-full max-w-[280px] space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0b0b]/90 px-4 py-3 shadow-xl">
                    <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <Coins className="h-4 w-4 text-primary" />
                      Invoice settled
                    </span>
                    <span className="font-mono text-xs text-foreground/80">
                      12.50 tUSDC
                    </span>
                  </div>
                  <div className="ml-8 flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0b0b]/90 px-4 py-3 shadow-xl">
                    <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <Anchor className="h-4 w-4 text-primary" />
                      Anchor gas
                    </span>
                    <span className="font-mono text-xs text-foreground/80">
                      sender pays
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="mb-4 text-2xl font-light tracking-tight text-foreground sm:text-3xl">
                Transparent settlement.
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Payments settle in{" "}
                <strong className="font-medium text-foreground">
                  test USDC
                </strong>{" "}
                directly on Arc — no real-world value, but real balances, gas,
                contract calls, and receipts on Arc Testnet.
              </p>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                The sender pays the initial anchor gas. The payer pays the
                invoice amount plus the settlement gas. Clean and predictable —
                without exposing sealed line items or notes.
              </p>
              <div className="mt-auto">
                <Link
                  href="/how-it-works"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  See the gas economics
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 5. NUMBERED SHOWCASE — PRIVACY & PROOF */}
      <section className="relative z-10 px-4 py-28">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-20 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-8 font-mono text-xs tracking-[0.3em] text-muted-foreground/50">
                  #2 / 04
                </p>
                <h2 className="text-[2.6rem] font-medium uppercase !leading-[0.98] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
                  <span className="block text-foreground">Offering</span>
                  <span className="block text-foreground">Unmatched</span>
                  <span className="block text-muted-foreground/50">
                    Privacy &amp;
                  </span>
                  <span className="block text-primary">Proof.</span>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground lg:pb-2">
                Every sealed invoice keeps its details private while its
                integrity stays publicly checkable on Arc.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr]">
            {/* phone mockup */}
            <ScrollReveal delay={0.1}>
              <div className="mx-auto w-full max-w-[320px] rounded-[44px] border border-white/10 bg-[#0a0a0a] p-3 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
                <div className="rounded-[34px] border border-white/5 bg-[#050505] p-6">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground/60">
                    <span>09:41</span>
                    <div className="h-4 w-16 rounded-full bg-black ring-1 ring-white/10" />
                    <span className="tracking-tighter">●●●</span>
                  </div>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-white/[0.04]">
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Envelo Core
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-white/[0.04]">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>

                  <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60">
                    Total volume
                  </p>
                  <p className="mb-2 text-center text-[2rem] font-semibold tracking-tight text-foreground">
                    $8,245.32
                  </p>
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      +12.4%
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      this week
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 260 84"
                    className="mb-3 h-20 w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="hsl(24 95% 53%)"
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(24 95% 53%)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 64 C 24 58, 36 44, 58 48 S 96 66, 118 56 S 150 26, 175 30 S 214 50, 232 38 L 260 24 L 260 84 L 0 84 Z"
                      fill="url(#chartFill)"
                    />
                    <path
                      d="M0 64 C 24 58, 36 44, 58 48 S 96 66, 118 56 S 150 26, 175 30 S 214 50, 232 38 L 260 24"
                      fill="none"
                      stroke="hsl(24 95% 53%)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="mb-6 flex items-center justify-center gap-1.5">
                    {["1H", "1D", "1W", "1M", "1Y"].map((t) => (
                      <span
                        key={t}
                        className={
                          t === "1W"
                            ? "rounded-md bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground"
                            : "rounded-md px-2.5 py-1 text-[9px] font-medium text-muted-foreground/50"
                        }
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mb-6 flex items-start justify-center gap-7">
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-[0_8px_24px_-6px_rgba(201,206,212,0.6)]">
                        <Plus className="h-4.5 w-4.5 text-primary-foreground" />
                      </span>
                      <span className="text-[9px] font-medium text-muted-foreground">
                        New
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.05]">
                        <Send className="h-4 w-4 text-foreground/80" />
                      </span>
                      <span className="text-[9px] font-medium text-muted-foreground">
                        Pay
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.05]">
                        <BadgeCheck className="h-4 w-4 text-foreground/80" />
                      </span>
                      <span className="text-[9px] font-medium text-muted-foreground">
                        Verify
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60">
                      Active anchor
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Arc Testnet
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-status-pulse" />
                        Synced
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* side cards */}
            <div className="space-y-6">
              <ScrollReveal delay={0.15}>
                <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-7 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/30 to-primary/10 shadow-[0_0_24px_rgba(201,206,212,0.25)]">
                        <Anchor className="h-5 w-5 text-primary" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          Arc Network
                        </h3>
                        <p className="text-xs text-muted-foreground/70">
                          Production · Testnet
                        </p>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-status-pulse" />
                  </div>
                  <div className="mb-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3.5">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                        Uptime
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        99.99%
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3.5">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                        Latency
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        14ms
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.04] p-3.5">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                        Anchors
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        2.4K
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/how-it-works"
                    className="group mb-6 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                  >
                    View how anchoring works
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Privacy-grade sealing with public integrity checks and
                    predictable testnet gas built in.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["AES-256-GCM", "SHA-256", "Test USDC", "Chain 5042002"].map(
                      (chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.25}>
                <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-7 backdrop-blur-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60">
                      Live logs
                    </p>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-status-pulse" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <FileText className="h-4 w-4 text-cyan-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Invoice sealed
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground/60">
                          0x8f3a…42a · just now
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
                        <Anchor className="h-4 w-4 text-violet-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Anchor confirmed
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground/60">
                          block #18,204 · 12s ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Payment settled
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground/60">
                          12.50 tUSDC · 2m ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DEMO IFRAME */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-5xl space-y-12">
          <ScrollReveal className="mx-auto max-w-2xl space-y-4 text-center">
            <h2 className="text-4xl font-light tracking-tight sm:text-5xl">
              See Envelo in action
            </h2>
            <p className="text-lg text-muted-foreground">
              Press play for a 60-second walkthrough of the complete invoice
              and payment flow.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="group rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-2 shadow-2xl backdrop-blur-sm">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[22px] border border-white/5 bg-background sm:aspect-video">
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
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_rgba(201,206,212,0.45)] transition-transform duration-300 group-hover:scale-110">
                      <Play
                        className="h-8 w-8 translate-x-1"
                        fill="currentColor"
                      />
                    </span>
                    <div className="relative space-y-2 text-center">
                      <span className="block text-xl font-light tracking-tight text-foreground">
                        Watch the demo
                      </span>
                      <span className="block text-sm text-muted-foreground">
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
                className="font-normal text-muted-foreground hover:text-foreground"
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

      {/* 7. TRUST BOUNDARIES & CUSTODY */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl space-y-16">
          <ScrollReveal className="mx-auto max-w-2xl space-y-4 text-center">
            <h2 className="text-4xl font-light tracking-tight sm:text-5xl">
              The Trust Boundary
            </h2>
            <p className="text-xl text-muted-foreground">
              No one layer has the full picture. Your privacy relies on strict
              separation of concerns between your device, our servers, and the
              Arc blockchain.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-3">
            <ScrollReveal delay={0.1}>
              <div className="h-full rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm">
                <p className="mb-6 font-mono text-xs tracking-[0.3em] text-primary/80">
                  01
                </p>
                <div className="mb-4 flex items-center gap-3 font-medium text-foreground">
                  <KeyRound className="h-5 w-5 text-primary" /> Your Browser
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
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
              <div className="h-full rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm">
                <p className="mb-6 font-mono text-xs tracking-[0.3em] text-primary/80">
                  02
                </p>
                <div className="mb-4 flex items-center gap-3 font-medium text-foreground">
                  <Database className="h-5 w-5 text-primary" /> Our Server
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Stores the encrypted invoice body and wrapped keys, plus the
                  invoice number, amount, due date, parties, status, and
                  fingerprint needed to run the workflow. It cannot read sealed
                  fields such as line items or notes. You can grant and revoke
                  viewers, though revocation cannot erase data already read.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="h-full rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 backdrop-blur-sm">
                <p className="mb-6 font-mono text-xs tracking-[0.3em] text-primary/80">
                  03
                </p>
                <div className="mb-4 flex items-center gap-3 font-medium text-foreground">
                  <Fingerprint className="h-5 w-5 text-primary" /> Arc Testnet
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
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

      {/* 8. SHIELDED USDC */}
      <section className="relative z-10 overflow-hidden px-4 py-16">
        <ScrollReveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-primary/20 bg-primary/5 p-8 backdrop-blur-sm sm:p-16">
            <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/20 blur-[100px]" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <EyeOff className="h-3.5 w-3.5" />
                Coming Soon
              </div>
              <h2 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                Shielded USDC.
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Sealed invoice-body details such as line items and notes remain
                private to authorized viewers, while the settlement stays
                visible on ArcScan. Shielded USDC is coming soon—pending
                Arc&apos;s official support for confidential transfers.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 9. FINAL CTA */}
      <section className="relative z-10 px-4 py-32 text-center">
        <ScrollReveal className="mx-auto max-w-2xl space-y-8">
          <h2 className="text-4xl font-light tracking-tight text-foreground sm:text-6xl">
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
                className="h-14 rounded-full border border-white/15 bg-white/[0.05] px-10 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground shadow-[0_14px_50px_-12px_rgba(201,206,212,0.55)] transition-all hover:bg-white/10"
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
            <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full border border-white/15 bg-white/[0.05] px-10 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground shadow-[0_14px_50px_-12px_rgba(201,206,212,0.55)] transition-all hover:bg-white/10 hover:shadow-[0_14px_60px_-10px_rgba(201,206,212,0.7)] sm:w-auto"
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
                className="h-14 w-full rounded-full px-8 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground sm:w-auto"
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
