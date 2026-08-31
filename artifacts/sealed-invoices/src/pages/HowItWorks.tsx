import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import {
  LegalPageLayout,
  type LegalSection,
} from "@/components/marketing/LegalPageLayout";
import { trackEvent } from "@/lib/analytics";

const linkClass =
  "font-medium text-foreground underline-offset-4 hover:underline transition-colors";

const sections: LegalSection[] = [
  {
    heading: "Seal the invoice",
    body: (
      <>
        <p>
          When you create an invoice, the sensitive fields &mdash; line items,
          descriptions, and notes &mdash; are encrypted{" "}
          <strong>inside your browser</strong> with AES-256-GCM before anything
          is sent to us.
        </p>
        <p>
          What Envelo receives is the sealed ciphertext plus the workflow
          details needed to run the invoice: its number, amount, due date,
          parties, status, and fingerprint.{" "}
          <strong>The server cannot read the sealed fields.</strong> Not
          &ldquo;does not&rdquo; &mdash; cannot.
        </p>
      </>
    ),
  },
  {
    heading: "Share it privately",
    body: (
      <>
        <p>
          Every invoice has its own document key. To share the invoice, Envelo
          wraps that key separately for each approved viewer using the
          viewer&rsquo;s public key. Only a browser holding the matching
          private key can unseal the contents.
        </p>
        <p>
          Your private envelope key lives in your browser and nowhere else. To
          use a second device, you download a passphrase-protected backup from
          the Dashboard and restore it there.{" "}
          <strong>
            Envelo never receives your private key or your backup passphrase
          </strong>{" "}
          &mdash; which also means we cannot recover them for you if both are
          lost.
        </p>
      </>
    ),
  },
  {
    heading: "Anchor the fingerprint",
    body: (
      <>
        <p>
          Before sealing, Envelo computes a SHA-256 fingerprint of the invoice
          &mdash; a digital wax stamp. Change one character in the document and
          the fingerprint changes completely.
        </p>
        <p>
          That fingerprint is anchored in our registry contract on{" "}
          <strong>Arc Testnet</strong>, a public blockchain. An approved viewer
          can unseal the invoice, recompute the fingerprint locally, and
          compare it with the onchain record. If they match, the document is
          exactly what was sealed &mdash; no trust in Envelo required.
        </p>
      </>
    ),
  },
  {
    heading: "Settle in test USDC",
    body: (
      <>
        <p>
          Payments are ordinary public transactions in test USDC on Arc
          Testnet. When an invoice is paid, Envelo records the transaction hash
          alongside the invoice, so both sides can check the settlement on the
          block explorer.
        </p>
        <ul>
          <li>
            <strong>Test USDC has no real-world value.</strong> Never send real
            funds to any address shown in Envelo.
          </li>
          <li>
            Payment amounts and wallet addresses are visible to anyone on
            ArcScan.
          </li>
          <li>
            Shielded transfers are not available yet &mdash; making the payment
            itself confidential requires official network support, and we will
            adopt it when it exists.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "What's private, what's public",
    body: (
      <>
        <p>One honest picture of where every piece of data sits:</p>
        <ul>
          <li>
            <strong>Private to key holders:</strong> the sealed fields &mdash;
            line items, descriptions, and notes. Readable only by you and the
            viewers you approve.
          </li>
          <li>
            <strong>Visible to Envelo and counterparties:</strong> workflow
            details &mdash; invoice number, amount, due date, parties, and
            status. We need these to run the service.
          </li>
          <li>
            <strong>Visible to everyone:</strong> the onchain records &mdash;
            fingerprints, paid status, and the payment transactions with
            wallet addresses and amounts.
          </li>
        </ul>
        <p>
          The{" "}
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>{" "}
          spell out the same picture in more detail.
        </p>
      </>
    ),
  },
];

export default function HowItWorks() {
  const { isSignedIn } = useUser();

  return (
    <LegalPageLayout
      badgeIcon={ShieldCheck}
      badgeLabel="The Mechanics of Trust"
      title="How Envelo Works"
      titleTestId="text-how-it-works-title"
      intro="Envelo encrypts sensitive invoice details in your browser, then anchors a verifiable fingerprint on Arc Testnet. The document stays sealed; the proof remains public."
      lastUpdated="September 1, 2026"
      summaryItems={[
        <>
          Sensitive fields are <strong>encrypted in your browser</strong>{" "}
          before anything is sent. Envelo stores ciphertext it cannot read.
        </>,
        <>
          Your envelope key stays with you. Sharing an invoice wraps its key
          for each approved viewer &mdash;{" "}
          <strong>we never see private keys</strong>.
        </>,
        <>
          A SHA-256 fingerprint of every invoice is{" "}
          <strong>anchored on Arc Testnet</strong>, so anyone can verify the
          document never changed.
        </>,
        <>
          Payments are public test-USDC transactions on Arc &mdash; amounts
          and addresses are <strong>visible on ArcScan</strong>.
        </>,
      ]}
      sections={sections}
      afterSections={
        <section className="py-24 sm:py-32 px-4 relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_center,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10" />
          <ScrollReveal className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-foreground">
              Ready to seal your first invoice?
            </h2>
            <p className="text-xl text-muted-foreground/80">
              Keep sensitive billing details private while preserving a
              verifiable onchain trail.
            </p>

            {isSignedIn ? (
              <div className="flex justify-center pt-8">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(201,206,212,0.3)]"
                  data-testid="button-cta-dashboard"
                >
                  <Link
                    href="/dashboard"
                    onClick={() =>
                      trackEvent("how_it_works_cta_clicked", {
                        action: "open_dashboard",
                      })
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
                  className="h-14 w-full sm:w-auto rounded-full bg-primary px-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(201,206,212,0.3)] hover:shadow-[0_0_30px_rgba(201,206,212,0.5)]"
                  data-testid="button-cta-signup"
                >
                  <Link
                    href="/sign-up"
                    onClick={() => {
                      trackEvent("how_it_works_cta_clicked", {
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
                      trackEvent("how_it_works_cta_clicked", {
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
      }
    />
  );
}
